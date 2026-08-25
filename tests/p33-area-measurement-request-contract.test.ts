import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  createServiceRequest: vi.fn(),
  getActiveServiceCategories: vi.fn(),
  assertServiceRequestDetailCatalog: vi.fn(),
  getServiceRequestMeasurementForOwner: vi.fn(),
  replaceServiceRequestMeasurementForOwner: vi.fn(),
  deleteServiceRequestMeasurementForOwner: vi.fn(),
}));

import * as requestDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 73): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `p33-measurement-${id}`,
    email: `p33-measurement-${id}@example.invalid`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "P33 Synthetic User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const category = {
  id: 8,
  name: "Nakliye",
  slug: "moving",
  icon: "truck.box.fill",
  color: "#0EA5E9",
  pricingType: "km_based" as const,
  basePrice: 500,
  pricePerKm: 30,
  kmRate: 30,
  professionalCount: 0,
  description: null,
  isActive: 1,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  subcategories: [],
};

const validMeasurement = {
  version: 1 as const,
  idempotencyKey: "area_p33_contract_123456",
  method: "manual_rectangle" as const,
  unit: "m" as const,
  width: 4,
  height: 2.5,
  capabilityClass: "manual" as const,
  qualityWarning: "estimated" as const,
};

function validCreateInput() {
  return {
    categoryId: 8,
    countryCode: "TR",
    title: "Ölçümlü eşya taşıma",
    details: {
      serviceType: "moving" as const,
      pickupAddress: "Kadıköy, İstanbul",
      destinationAddress: "Beşiktaş, İstanbul",
      attributes: {},
      measurement: validMeasurement,
    },
  };
}

describe("P33 area measurement request contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requestDb.getActiveServiceCategories).mockResolvedValue([category]);
    vi.mocked(requestDb.assertServiceRequestDetailCatalog).mockResolvedValue(undefined);
  });

  it("hands a bounded versioned estimate to the canonical request writer with session ownership", async () => {
    vi.mocked(requestDb.createServiceRequest).mockResolvedValue(901);
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.requests.create(validCreateInput())).resolves.toBe(901);
    expect(requestDb.createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 73,
      details: expect.objectContaining({ measurement: validMeasurement }),
    }));
  });

  it("rejects malformed capability/method input before request persistence", async () => {
    const caller = appRouter.createCaller(createContext(73));
    const malformed = validCreateInput();
    malformed.details.measurement = { ...validMeasurement, method: "ar_plane", capabilityClass: "manual" } as unknown as typeof validMeasurement;

    await expect(caller.requests.create(malformed)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(requestDb.createServiceRequest).not.toHaveBeenCalled();
  });

  it("rejects client-supplied AR results until a verified server-owned adapter is configured", async () => {
    const caller = appRouter.createCaller(createContext(73));
    const arInput = validCreateInput();
    arInput.details.measurement = {
      ...validMeasurement,
      method: "ar_plane",
      capabilityClass: "ar_plane",
      confidence: 0.95,
    } as unknown as typeof validMeasurement;

    await expect(caller.requests.create(arInput)).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(requestDb.createServiceRequest).not.toHaveBeenCalled();
  });

  it("derives get ownership from session and fails closed for cross-account measurement access", async () => {
    vi.mocked(requestDb.getServiceRequestMeasurementForOwner).mockRejectedValue(new Error("AREA_MEASUREMENT_FORBIDDEN"));
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.requests.getMeasurement({ requestId: 901 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(requestDb.getServiceRequestMeasurementForOwner).toHaveBeenCalledWith({ requestId: 901, ownerUserId: 73 });
  });

  it("uses a session-derived owner and preserves an idempotent replace result", async () => {
    vi.mocked(requestDb.replaceServiceRequestMeasurementForOwner).mockResolvedValue({ id: 12, idempotent: true });
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.requests.replaceMeasurement({ requestId: 901, measurement: validMeasurement })).resolves.toEqual({ id: 12, idempotent: true });
    expect(requestDb.replaceServiceRequestMeasurementForOwner).toHaveBeenCalledWith({
      requestId: 901,
      ownerUserId: 73,
      measurement: validMeasurement,
    });
  });

  it("does not report create success when the unapplied measurement migration blocks atomic persistence", async () => {
    vi.mocked(requestDb.createServiceRequest).mockRejectedValue(new Error("MIGRATION_REQUIRED_AREA_MEASUREMENT"));
    const caller = appRouter.createCaller(createContext(73));

    await expect(caller.requests.create(validCreateInput())).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("keeps request and measurement writes in one source-level transaction with duplicate-key recovery", () => {
    const source = readFileSync("server/db.ts", "utf8");
    const createBlock = source.slice(source.indexOf("export async function createServiceRequest"), source.indexOf("export async function getServiceRequestMeasurementForOwner"));
    expect(createBlock).toContain("await db.transaction");
    expect(createBlock).toContain("tx.insert(serviceRequests)");
    expect(createBlock).toContain("tx.insert(serviceRequestMeasurements)");
    expect(createBlock).toContain("MIGRATION_REQUIRED_AREA_MEASUREMENT");
    expect(createBlock).toContain("isDuplicateMeasurementIdempotency");
  });

  it("uses measurement CRUD from the real job-detail runtime controller rather than a fixture-only screen", () => {
    const source = readFileSync("app/job/[id].tsx", "utf8");
    expect(source).toContain("trpc.requests.getMeasurement.useQuery");
    expect(source).toContain("trpc.requests.replaceMeasurement.useMutation");
    expect(source).toContain("trpc.requests.deleteMeasurement.useMutation");
    expect(source).toContain("isRequestOwner && request.status === \"pending\"");
    expect(source).toContain("<AreaMeasurementForm");
  });
});
