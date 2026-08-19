import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";
import * as db from "../server/db";
import { appRouter } from "../server/routers";

function createUserContext(userId = 318): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `legal-preference-${userId}`,
      email: `legal-${userId}@example.test`,
      phone: null,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: null,
      name: "Legal Preference Test",
      loginMethod: "local",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    sessionFingerprint: "legal-preference-session",
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("P15 legal consent preference router", () => {
  it("exposes document version metadata and an explicit legal release block without inventing approval", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.auth.legalDocumentManifest();

    expect(result.releaseGate).toMatchObject({ ready: false, reason: "LEGAL_APPROVAL_REQUIRED" });
    expect(result.documents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "privacy", locale: "tr", contentHash: expect.any(String) }),
      expect.objectContaining({ id: "privacy", locale: "en", approvalStatus: "LEGAL_APPROVAL_REQUIRED" }),
    ]));
  });

  it("returns marketing off by default and never treats it as legal consent", async () => {
    const preference = { enabled: false, documentVersion: null, updatedAt: null };
    const getPreference = vi.spyOn(db, "getMarketingConsentPreference").mockResolvedValue(preference);
    const caller = appRouter.createCaller(createUserContext(319));

    await expect(caller.auth.marketingConsent({})).resolves.toEqual(preference);
    expect(getPreference).toHaveBeenCalledWith(319);
  });

  it("allows only the signed-in owner to set an independent marketing opt-in", async () => {
    const setPreference = vi.spyOn(db, "setMarketingConsentPreference").mockResolvedValue({
      enabled: true,
      documentVersion: "1.0",
      updatedAt: new Date("2026-08-20T00:00:00.000Z"),
      idempotent: false,
    });
    const caller = appRouter.createCaller(createUserContext(320));

    await expect(caller.auth.setMarketingConsent({ enabled: true })).resolves.toMatchObject({ enabled: true, idempotent: false });
    expect(setPreference).toHaveBeenCalledWith({
      userId: 320,
      enabled: true,
      source: "privacy_center_marketing_preference",
    });
  });

  it("rejects anonymous preference mutations", async () => {
    const caller = appRouter.createCaller({ ...createUserContext(), user: null });
    await expect(caller.auth.setMarketingConsent({ enabled: true })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
