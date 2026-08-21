import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../server/_core/context";

vi.mock("../server/db", () => ({
  getProviderCapabilityProfile: vi.fn(),
  saveProviderCapabilityProfile: vi.fn(),
  getProviderProfile: vi.fn(),
}));

import * as providerDb from "../server/db";
import { appRouter } from "../server/routers";
import { evaluateCapabilityProfileActivationState } from "../server/compliance/ProviderCapabilityProfilePolicy";
import { decideProviderOnboardingActivation } from "../server/compliance/ProviderOnboardingPolicy";

function createContext(id = 811): TrpcContext {
  return {
    user: {
      id,
      openId: `faz8a-provider-${id}`,
      email: `faz8a-provider-${id}@example.test`,
      phone: null,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      name: "Faz 8-A Profesyonel",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", hostname: "localhost", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const saveInput = {
  capabilityKey: "towing.roadside" as const,
  jurisdictionCode: "TR" as const,
  operatingModel: "individual" as const,
  vehicleType: "çekici",
  profileStatus: "pending_legal_review" as const,
};

describe("Faz 8-A capability profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("profile kaydını yalnız oturum sahibi profesyonel kimliğiyle yazar", async () => {
    vi.mocked(providerDb.saveProviderCapabilityProfile).mockResolvedValue({ id: 91, ...saveInput } as never);
    const caller = appRouter.createCaller(createContext(812));

    await expect(caller.provider.setCapabilityProfile(saveInput)).resolves.toMatchObject({ id: 91 });
    expect(providerDb.saveProviderCapabilityProfile).toHaveBeenCalledWith({ userId: 812, ...saveInput });

    const anonymous = appRouter.createCaller({ ...createContext(), user: null });
    await expect(anonymous.provider.setCapabilityProfile(saveInput)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(providerDb.saveProviderCapabilityProfile).toHaveBeenCalledTimes(1);
  });

  it("provider sahibinin legal approval veya active profile statüsü yazmasını girişte reddeder", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.provider.setCapabilityProfile({ ...saveInput, profileStatus: "active" as never }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.provider.setCapabilityProfile({ ...saveInput, profileStatus: "legal_approved" as never }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(providerDb.saveProviderCapabilityProfile).not.toHaveBeenCalled();
  });

  it("iki bağımsız onay kaydı olmadan active satırı source_unverified kabul eder", () => {
    const state = evaluateCapabilityProfileActivationState({
      scope: { profileKey: "towing.roadside" },
      profile: {
        profileStatus: "active",
        legalSourceApprovalRef: "LEGAL-TR-001",
        productReleaseApprovalRef: null,
      },
    });
    expect(state).toBe("source_unverified");

    const decision = decideProviderOnboardingActivation({
      profileComplete: true,
      canonicalServiceSelected: true,
      verifiedJurisdictionCount: 1,
      verifiedCapabilityCount: 1,
      dynamicCredentialsVerified: true,
      documentsApproved: true,
      countryLaunchEligible: true,
      serviceAreaConfigured: true,
      capabilityProfileStatus: state,
    });
    expect(decision).toEqual({ status: "BLOCKED", blockers: ["CAPABILITY_PROFILE_SOURCE_UNVERIFIED"] });
  });

  it("serbest metin referansını değil, yalnız aynı sürümde geçerli immutable ledger grantlerini kabul eder", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const baseProfile = {
      profileStatus: "active" as const,
      sourceVerificationState: "verified" as const,
      requiredRulePackVersion: "TR-GOLD-2026-08-13-v1.0",
      requiredRequirementVersion: "requirements-v1",
      legalSourceApprovalRef: "SAHTE-REF",
      productReleaseApprovalRef: "PRODUCT-REF",
    };
    const grant = (approvalType: "legal_source" | "product_release", createdAt: string) => ({
      approvalType,
      eventType: "granted" as const,
      rulePackVersion: "TR-GOLD-2026-08-13-v1.0",
      requirementVersion: "requirements-v1",
      approverRole: approvalType === "legal_source" ? "turkiye_legal_compliance_officer" : "product_release_authority",
      authorityScope: "TR:towing.roadside",
      evidenceHash: "a".repeat(64),
      evidenceStatus: "present" as const,
      validFrom: null,
      validUntil: null,
      createdAt: new Date(createdAt),
    });

    expect(evaluateCapabilityProfileActivationState({
      scope: { profileKey: "towing.roadside" }, profile: {
        ...baseProfile,
        approvalLedgerEvents: [grant("legal_source", "2026-08-21T11:00:00.000Z"), grant("product_release", "2026-08-21T11:01:00.000Z")],
      }, now,
    })).toBe("active");

    expect(evaluateCapabilityProfileActivationState({
      scope: { profileKey: "towing.roadside" }, profile: {
        ...baseProfile,
        approvalLedgerEvents: [
          grant("legal_source", "2026-08-21T11:00:00.000Z"),
          grant("product_release", "2026-08-21T11:01:00.000Z"),
          { ...grant("legal_source", "2026-08-21T11:02:00.000Z"), eventType: "revoked" as const },
        ],
      }, now,
    })).toBe("approval_invalid");

    expect(evaluateCapabilityProfileActivationState({
      scope: { profileKey: "towing.roadside" }, profile: {
        ...baseProfile,
        approvalLedgerEvents: [
          { ...grant("legal_source", "2026-08-21T11:00:00.000Z"), validUntil: new Date("2026-08-21T11:59:59.000Z") },
          { ...grant("product_release", "2026-08-21T11:01:00.000Z"), rulePackVersion: "TR-GOLD-OLD" },
        ],
      }, now,
    })).toBe("approval_invalid");

    expect(evaluateCapabilityProfileActivationState({
      scope: { profileKey: "towing.roadside" }, profile: {
        ...baseProfile,
        approvalLedgerEvents: [
          { ...grant("legal_source", "2026-08-21T11:00:00.000Z"), evidenceStatus: "deleted" as const },
          { ...grant("product_release", "2026-08-21T11:01:00.000Z"), requirementVersion: "requirements-v0" },
        ],
      }, now,
    })).toBe("approval_invalid");
  });

  it("sistem askısı ve stale-write reddini provider API üzerinden aşmaya izin vermez", async () => {
    const caller = appRouter.createCaller(createContext());
    vi.mocked(providerDb.saveProviderCapabilityProfile)
      .mockRejectedValueOnce(new Error("CAPABILITY_PROFILE_ENFORCEMENT_LOCKED"))
      .mockRejectedValueOnce(new Error("CAPABILITY_PROFILE_STALE_WRITE"));

    await expect(caller.provider.setCapabilityProfile({
      ...saveInput,
      operatingModelCode: "owner_driver",
      expectedStateVersion: 4,
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    await expect(caller.provider.setCapabilityProfile({
      ...saveInput,
      operatingModelCode: "owner_driver",
      expectedStateVersion: 4,
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(providerDb.saveProviderCapabilityProfile).toHaveBeenNthCalledWith(1, {
      userId: 811,
      ...saveInput,
      operatingModelCode: "owner_driver",
      expectedStateVersion: 4,
    });
  });

  it("sahte veya süresi dolmuş zorunlu belge sinyali activation kararını fail-closed engeller", () => {
    const decision = decideProviderOnboardingActivation({
      profileComplete: true,
      canonicalServiceSelected: true,
      verifiedJurisdictionCount: 1,
      verifiedCapabilityCount: 1,
      dynamicCredentialsVerified: false,
      documentsApproved: false,
      countryLaunchEligible: true,
      serviceAreaConfigured: true,
      capabilityProfileStatus: "active",
    });
    expect(decision.status).toBe("BLOCKED");
    expect(decision.blockers).toEqual(expect.arrayContaining([
      "DYNAMIC_CREDENTIALS_NOT_VERIFIED",
      "DOCUMENTS_NOT_APPROVED",
    ]));
  });

  it("Blok 1 capability profile eksikken onboarding activation kararını engeller", () => {
    const decision = decideProviderOnboardingActivation({
      profileComplete: true,
      canonicalServiceSelected: true,
      verifiedJurisdictionCount: 1,
      verifiedCapabilityCount: 1,
      dynamicCredentialsVerified: true,
      documentsApproved: true,
      countryLaunchEligible: true,
      serviceAreaConfigured: true,
      capabilityProfileStatus: "missing",
    });
    expect(decision).toEqual({ status: "BLOCKED", blockers: ["CAPABILITY_PROFILE_MISSING"] });
  });
});
