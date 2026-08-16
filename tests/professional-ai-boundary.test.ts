import { describe, expect, it } from "vitest";
import { evaluateProfessionalAiBoundary } from "../server/ai/ProfessionalAiBoundary";

describe("Professional AI boundary", () => {
  const activeAssignedJob = {
    actorRole: "provider" as const,
    isAssignedProvider: true,
    jobStatus: "active" as const,
    containsCustomerContactData: false,
    attemptsExternalAction: false,
  };

  it("permits only a non-binding checklist for the assigned active provider job", () => {
    expect(evaluateProfessionalAiBoundary({ ...activeAssignedJob, requestedCapability: "safety_checklist" })).toEqual({
      allowed: true,
      scope: "assigned_active_job",
      canExecute: false,
      canSetPrice: false,
      canAccessCustomerContact: false,
    });
  });

  it("fails closed for unassigned, completed, price and automation requests", () => {
    expect(evaluateProfessionalAiBoundary({ ...activeAssignedJob, isAssignedProvider: false, requestedCapability: "job_summary" })).toMatchObject({ allowed: false });
    expect(evaluateProfessionalAiBoundary({ ...activeAssignedJob, jobStatus: "completed", requestedCapability: "job_summary" })).toMatchObject({ allowed: false });
    expect(evaluateProfessionalAiBoundary({ ...activeAssignedJob, requestedCapability: "price_quote" })).toMatchObject({ allowed: false });
    expect(evaluateProfessionalAiBoundary({ ...activeAssignedJob, requestedCapability: "communication_draft", attemptsExternalAction: true })).toMatchObject({ allowed: false });
  });

  it("never permits customer contact data in a professional AI request", () => {
    expect(evaluateProfessionalAiBoundary({ ...activeAssignedJob, requestedCapability: "communication_draft", containsCustomerContactData: true })).toEqual({
      allowed: false,
      reason: "PROFESSIONAL_AI_CONTACT_DATA_FORBIDDEN",
    });
  });
});
