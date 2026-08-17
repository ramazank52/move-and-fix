import { describe, expect, it } from "vitest";
import { evaluateInsuranceCapability } from "../server/compliance/InsuranceCapabilityPolicy";
import { evaluateWorkerClassification } from "../server/compliance/WorkerClassificationPolicy";
import { evaluateJobSafety } from "../server/compliance/JobSafetyEngine";

describe("P11 insurance, classification and job-safety policies", () => {
  const now = new Date("2026-08-17T09:00:00.000Z");

  it("fails closed for missing, unreviewed, cross-jurisdiction and expired insurance", () => {
    expect(evaluateInsuranceCapability({ jurisdictionCode: "TR", policies: [], now })).toMatchObject({ allowed: false, reason: "INSURANCE_VERIFICATION_REQUIRED" });
    expect(evaluateInsuranceCapability({
      jurisdictionCode: "TR",
      now,
      policies: [{ jurisdictionCode: "TR", verificationStatus: "pending", expiryDate: new Date("2027-01-01") }],
    }).allowed).toBe(false);
    expect(evaluateInsuranceCapability({
      jurisdictionCode: "TR",
      now,
      policies: [{ jurisdictionCode: "DE", verificationStatus: "verified", expiryDate: new Date("2027-01-01") }],
    }).allowed).toBe(false);
    expect(evaluateInsuranceCapability({
      jurisdictionCode: "TR",
      now,
      policies: [{ jurisdictionCode: "TR", verificationStatus: "verified", expiryDate: new Date("2026-08-17T08:59:59.000Z") }],
    }).allowed).toBe(false);
  });

  it("permits only verified, current insurance and a reviewed non-unresolved operating model", () => {
    expect(evaluateInsuranceCapability({
      jurisdictionCode: "TR",
      now,
      policies: [{ jurisdictionCode: "TR", verificationStatus: "manual_approved", expiryDate: new Date("2027-01-01") }],
    })).toMatchObject({ allowed: true, reason: "INSURANCE_VERIFIED" });
    expect(evaluateWorkerClassification({ jurisdictionCode: "TR", model: null })).toMatchObject({ allowed: false, reason: "OPERATING_MODEL_REQUIRED" });
    expect(evaluateWorkerClassification({
      jurisdictionCode: "TR",
      model: { jurisdictionCode: "TR", operatingModel: "unresolved", reviewStatus: "verified" },
    })).toMatchObject({ allowed: false, reason: "OPERATING_MODEL_REVIEW_REQUIRED" });
    expect(evaluateWorkerClassification({
      jurisdictionCode: "TR",
      model: { jurisdictionCode: "TR", operatingModel: "self_employed", reviewStatus: "verified" },
    })).toMatchObject({ allowed: true, reason: "OPERATING_MODEL_VERIFIED" });
  });

  it("keeps prohibited, emergency-only, prerequisite and restricted safety rules fail-closed", () => {
    expect(evaluateJobSafety({ rules: [], isEmergency: false, insuranceEligible: false, classificationEligible: false }))
      .toMatchObject({ allowed: true, reason: "NO_ACTIVE_SAFETY_RULE" });
    expect(evaluateJobSafety({
      rules: [{ id: 1, activityStatus: "prohibited", prerequisitesJson: {} }],
      isEmergency: true,
      insuranceEligible: true,
      classificationEligible: true,
    })).toMatchObject({ allowed: false, reason: "JOB_SAFETY_PROHIBITED", matchedRuleId: 1 });
    expect(evaluateJobSafety({
      rules: [{ id: 2, activityStatus: "emergency_only", prerequisitesJson: {} }],
      isEmergency: false,
      insuranceEligible: true,
      classificationEligible: true,
    })).toMatchObject({ allowed: false, reason: "JOB_SAFETY_EMERGENCY_ONLY" });
    expect(evaluateJobSafety({
      rules: [{ id: 3, activityStatus: "allowed", prerequisitesJson: { requiresVerifiedInsurance: true } }],
      isEmergency: false,
      insuranceEligible: false,
      classificationEligible: true,
    })).toMatchObject({ allowed: false, reason: "JOB_SAFETY_INSURANCE_REQUIRED" });
    expect(evaluateJobSafety({
      rules: [{ id: 4, activityStatus: "allowed", prerequisitesJson: { requiresVerifiedOperatingModel: true } }],
      isEmergency: false,
      insuranceEligible: true,
      classificationEligible: false,
    })).toMatchObject({ allowed: false, reason: "JOB_SAFETY_CLASSIFICATION_REQUIRED" });
    expect(evaluateJobSafety({
      rules: [{ id: 5, activityStatus: "high_risk", prerequisitesJson: {} }],
      isEmergency: false,
      insuranceEligible: true,
      classificationEligible: true,
    })).toMatchObject({ allowed: false, reason: "JOB_SAFETY_RESTRICTED_REVIEW_REQUIRED" });
  });
});
