import { describe, expect, it } from "vitest";

import { evaluateReverification, mayReturnEvidenceLink } from "../server/compliance/ComplianceReverificationService";

const NOW = new Date("2026-08-15T09:00:00.000Z");
const credential = {
  id: 1,
  status: "verified" as const,
  revocationStatus: "clear" as const,
  expiresAt: null,
  nextCheckAt: null,
};

describe("compliance reverification contract", () => {
  it("blocks capability use when a registry recheck is due rather than assuming verification remains valid", () => {
    expect(evaluateReverification({ ...credential, nextCheckAt: NOW }, NOW)).toMatchObject({
      action: "BLOCK_CAPABILITIES",
      reason: "REVERIFICATION_DUE",
    });
  });

  it("blocks expired or revoked credentials", () => {
    expect(evaluateReverification({ ...credential, expiresAt: new Date("2026-08-14T09:00:00.000Z") }, NOW).action).toBe("BLOCK_CAPABILITIES");
    expect(evaluateReverification({ ...credential, revocationStatus: "revoked" }, NOW).action).toBe("BLOCK_CAPABILITIES");
  });

  it("raises the 90-day expiry warning and never exposes due or erased evidence", () => {
    expect(evaluateReverification({ ...credential, expiresAt: new Date("2026-11-13T09:00:00.000Z") }, NOW)).toMatchObject({
      action: "WARN_EXPIRY",
      warningDays: 90,
    });
    expect(mayReturnEvidenceLink({ evidencePurgedAt: null, retentionDueAt: NOW }, NOW)).toBe(false);
    expect(mayReturnEvidenceLink({ evidencePurgedAt: NOW, retentionDueAt: null }, NOW)).toBe(false);
  });
});
