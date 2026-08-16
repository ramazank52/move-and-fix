import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", async () => {
  const actual = await vi.importActual<typeof import("../server/db")>("../server/db");
  return {
    ...actual,
    listSafetyTrustedContacts: vi.fn(),
    createSafetyTrustedContact: vi.fn(),
    revokeSafetyTrustedContact: vi.fn(),
    listMySafetyIncidents: vi.fn(),
    createSafetyIncident: vi.fn(),
  };
});

import * as safetyDb from "../server/db";
import { appRouter } from "../server/routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(id = 41): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `safety-user-${id}`,
    email: `safety-${id}@example.com`,
    phone: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    name: `Safety User ${id}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("safety center router security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous reads and safety mutations before database access", async () => {
    const caller = appRouter.createCaller({ ...createContext(), user: null });

    await expect(caller.safety.trustedContacts()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.safety.createTrustedContact({ name: "Ayşe", phone: "+905551112233" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.safety.incidents.report({ category: "other", severity: "low", description: "Yeterince ayrıntılı olay metni" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(safetyDb.listSafetyTrustedContacts).not.toHaveBeenCalled();
    expect(safetyDb.createSafetyTrustedContact).not.toHaveBeenCalled();
    expect(safetyDb.createSafetyIncident).not.toHaveBeenCalled();
  });

  it("derives trusted-contact ownership solely from the active session", async () => {
    vi.mocked(safetyDb.createSafetyTrustedContact).mockResolvedValue({ id: 301 } as never);
    const caller = appRouter.createCaller(createContext(41));

    await expect(caller.safety.createTrustedContact({ name: "Ayşe Y.", phone: "+905551112233", label: "Aile" })).resolves.toEqual({ id: 301 });
    expect(safetyDb.createSafetyTrustedContact).toHaveBeenCalledWith({ userId: 41, name: "Ayşe Y.", phone: "+905551112233", label: "Aile" });
  });

  it("keeps incident reporting session-bound and validates minimum details", async () => {
    vi.mocked(safetyDb.createSafetyIncident).mockResolvedValue({ id: 91 } as never);
    const caller = appRouter.createCaller(createContext(77));

    await expect(caller.safety.incidents.report({ category: "unsafe_condition", severity: "high", description: "Çalışma alanında açık elektrik kablosu bulundu." })).resolves.toEqual({ id: 91 });
    expect(safetyDb.createSafetyIncident).toHaveBeenCalledWith({ reporterUserId: 77, category: "unsafe_condition", severity: "high", description: "Çalışma alanında açık elektrik kablosu bulundu." });
    await expect(caller.safety.incidents.report({ category: "other", severity: "low", description: "kısa" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(safetyDb.createSafetyIncident).toHaveBeenCalledTimes(1);
  });

  it("maps foreign contact revocation to a forbidden outcome", async () => {
    vi.mocked(safetyDb.revokeSafetyTrustedContact).mockRejectedValue(new Error("SAFETY_CONTACT_FORBIDDEN"));
    const caller = appRouter.createCaller(createContext(88));

    await expect(caller.safety.revokeTrustedContact({ id: 301 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(safetyDb.revokeSafetyTrustedContact).toHaveBeenCalledWith({ id: 301, userId: 88 });
  });
});
