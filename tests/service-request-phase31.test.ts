import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  createServiceRequest: vi.fn(),
  createServiceRequestMedia: vi.fn(),
  getActiveServiceCategories: vi.fn(),
  getActiveServiceSubcategories: vi.fn(),
  getProviderProfile: vi.fn(),
  getServiceCategoryBySlug: vi.fn(),
  getServiceRequestById: vi.fn(),
  getServiceRequestDetails: vi.fn(),
  getServiceRequestMedia: vi.fn(),
  getUserServiceRequests: vi.fn(),
}));

vi.mock("../server/storage", () => ({
  storagePut: vi.fn(),
}));

import * as requestDb from "../server/db";
import { appRouter } from "../server/routers";
import { storagePut } from "../server/storage";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 55): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `request-user-${id}`,
    email: `request-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: "Request Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const movingCategory = {
  id: 8,
  name: "Nakliye",
  slug: "moving",
  icon: "truck.box.fill",
  color: "#0EA5E9",
  pricingType: "km_based" as const,
  basePrice: 500,
  pricePerKm: 30,
  kmRate: 30,
  professionalCount: 4,
  description: null,
  isActive: 1,
  sortOrder: 80,
  createdAt: new Date(),
  updatedAt: new Date(),
  subcategories: [
    {
      id: 81,
      categoryId: 8,
      name: "Evden Eve Nakliyat",
      slug: "house-moving",
      description: "Ev eşyalarının paketli taşınması",
      isActive: 1,
      sortOrder: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

describe("phase 31 service request contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requestDb.getActiveServiceCategories).mockResolvedValue([movingCategory]);
    vi.mocked(requestDb.getActiveServiceSubcategories).mockResolvedValue(movingCategory.subcategories);
  });

  it("lists active subcategories through the public category contract", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.categories.subcategories({ categoryId: 8 })).resolves.toEqual(
      movingCategory.subcategories,
    );
    expect(requestDb.getActiveServiceSubcategories).toHaveBeenCalledWith(8);
  });

  it("creates a route-based request with normalized details and session ownership", async () => {
    vi.mocked(requestDb.createServiceRequest).mockResolvedValue(501);
    const caller = appRouter.createCaller(createContext(73));
    const details = {
      subcategoryId: 81,
      serviceType: "moving" as const,
      pickupAddress: "Kadıköy, İstanbul",
      destinationAddress: "Beşiktaş, İstanbul",
      pickupFloor: 2,
      destinationFloor: 4,
      pickupHasElevator: true,
      destinationHasElevator: false,
      distanceKm: 18,
      attributes: { roomCount: "2+1", packingRequested: true },
    };

    await expect(
      caller.requests.create({
        categoryId: 8,
        title: "Evden eve nakliyat",
        description: "Eşyalar paketlenecek",
        budgetMin: 4000,
        budgetMax: 7000,
        details,
      }),
    ).resolves.toBe(501);

    expect(requestDb.createServiceRequest).toHaveBeenCalledWith({
      categoryId: 8,
      title: "Evden eve nakliyat",
      description: "Eşyalar paketlenecek",
      budgetMin: 4000,
      budgetMax: 7000,
      details,
      userId: 73,
    });
  });

  it("rejects category, subcategory and route-detail mismatches before persistence", async () => {
    const caller = appRouter.createCaller(createContext(73));

    await expect(
      caller.requests.create({
        categoryId: 8,
        title: "Geçersiz alt kategori",
        details: {
          subcategoryId: 999,
          serviceType: "moving",
          pickupAddress: "Kadıköy",
          destinationAddress: "Beşiktaş",
          attributes: {},
        },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      caller.requests.create({
        categoryId: 8,
        title: "Yanlış hizmet türü",
        details: { serviceType: "electrical", attributes: {} },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      caller.requests.create({
        categoryId: 8,
        title: "Eksik rota",
        details: { serviceType: "moving", pickupAddress: "Kadıköy", attributes: {} },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(requestDb.createServiceRequest).not.toHaveBeenCalled();
  });

  it("derives media ownership from the session and rejects cross-account upload", async () => {
    vi.mocked(requestDb.getServiceRequestById).mockResolvedValue({
      id: 501,
      userId: 99,
      status: "pending",
    } as Awaited<ReturnType<typeof requestDb.getServiceRequestById>>);
    const caller = appRouter.createCaller(createContext(73));

    await expect(
      caller.requests.uploadMedia({
        requestId: 501,
        originalName: "kanit.png",
        mimeType: "image/png",
        base64: validPng.toString("base64"),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(requestDb.getServiceRequestMedia).not.toHaveBeenCalled();
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects spoofed media content before storage", async () => {
    vi.mocked(requestDb.getServiceRequestById).mockResolvedValue({
      id: 501,
      userId: 73,
      status: "pending",
    } as Awaited<ReturnType<typeof requestDb.getServiceRequestById>>);
    vi.mocked(requestDb.getServiceRequestMedia).mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext(73));

    await expect(
      caller.requests.uploadMedia({
        requestId: 501,
        originalName: "sahte.png",
        mimeType: "image/png",
        base64: Buffer.from("this is not a png file").toString("base64"),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(storagePut).not.toHaveBeenCalled();
    expect(requestDb.createServiceRequestMedia).not.toHaveBeenCalled();
  });

  it("stores valid media under an owner-scoped key with immutable integrity metadata", async () => {
    vi.mocked(requestDb.getServiceRequestById).mockResolvedValue({
      id: 501,
      userId: 73,
      status: "pending",
    } as Awaited<ReturnType<typeof requestDb.getServiceRequestById>>);
    vi.mocked(requestDb.getServiceRequestMedia).mockResolvedValue([]);
    vi.mocked(storagePut).mockResolvedValue({
      key: "service-requests/501/73/generated.png",
      url: "https://storage.example/service-requests/501/73/generated.png",
    });
    vi.mocked(requestDb.createServiceRequestMedia).mockResolvedValue(901);
    const caller = appRouter.createCaller(createContext(73));

    await expect(
      caller.requests.uploadMedia({
        requestId: 501,
        originalName: "kanit.png",
        mimeType: "image/png",
        base64: validPng.toString("base64"),
      }),
    ).resolves.toEqual({
      id: 901,
      kind: "image",
      mimeType: "image/png",
      sizeBytes: validPng.length,
      sha256: createHash("sha256").update(validPng).digest("hex"),
      url: "https://storage.example/service-requests/501/73/generated.png",
    });

    expect(storagePut).toHaveBeenCalledWith(
      expect.stringMatching(/^service-requests\/501\/73\/[0-9a-f-]+\.png$/),
      validPng,
      "image/png",
    );
    expect(requestDb.createServiceRequestMedia).toHaveBeenCalledWith({
      requestId: 501,
      ownerUserId: 73,
      purpose: "request",
      kind: "image",
      storageKey: "service-requests/501/73/generated.png",
      originalName: "kanit.png",
      mimeType: "image/png",
      sizeBytes: validPng.length,
      sha256: createHash("sha256").update(validPng).digest("hex"),
    });
  });
});
