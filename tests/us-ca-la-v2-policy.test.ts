import { describe, expect, it } from "vitest";

import {
  activeProviderTransitionWindowBlockReason,
  countryCoverageActivationBlockReasons,
} from "../server/compliance/CountryDeploymentPolicy";

const researchDefaultOffCoverage = {
  mappingState: "MAPPED_BLOCKED" as const,
  productionState: "BLOCKED_PENDING_GATES" as const,
  sourceState: "AI_RESEARCHED_UNVERIFIED" as const,
  legalState: "NOT_REVIEWED" as const,
  connectorState: "NOT_IMPLEMENTED_OR_NOT_AUTHORIZED" as const,
  decision: "BLOCKED" as const,
  assuranceLevel: "SELF_ASSERTED" as const,
  legalApprovalState: "NOT_REVIEWED" as const,
  productReleaseState: "PENDING" as const,
};

describe("US-CA-LOS_ANGELES v2 default-off coverage policy", () => {
  it("blocks every research-seeded coverage row without source, counsel, connector and release evidence", () => {
    const result = countryCoverageActivationBlockReasons(researchDefaultOffCoverage);

    expect(result.allowed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "COVERAGE_PRODUCTION_STATE_BLOCKED_PENDING_GATES",
      "COVERAGE_SOURCE_AI_RESEARCHED_UNVERIFIED",
      "COVERAGE_LEGAL_STATE_NOT_REVIEWED",
      "COVERAGE_CONNECTOR_NOT_IMPLEMENTED_OR_NOT_AUTHORIZED",
      "COVERAGE_DECISION_BLOCKED",
      "COVERAGE_ASSURANCE_SELF_ASSERTED",
      "LOCAL_LEGAL_APPROVAL_NOT_REVIEWED",
      "PRODUCT_RELEASE_APPROVAL_PENDING",
    ]));
  });

  it("does not create an active-provider transition window from a blocked coverage row", () => {
    expect(activeProviderTransitionWindowBlockReason({
      coverageProductionState: "BLOCKED_PENDING_GATES",
      coverageDecision: "BLOCKED",
      ownerApprovalLedgerValid: false,
      notificationEvidencePresent: false,
    })).toBe("ACTIVE_PROVIDER_TRANSITION_BLOCKED:COVERAGE_BLOCKED_PENDING_GATES");
  });

  it("requires a valid owner ledger and notice evidence even after an eligible decision", () => {
    expect(activeProviderTransitionWindowBlockReason({
      coverageProductionState: "ACTIVE",
      coverageDecision: "POLICY_ELIGIBLE",
      ownerApprovalLedgerValid: false,
      notificationEvidencePresent: false,
    })).toBe("ACTIVE_PROVIDER_TRANSITION_BLOCKED:OWNER_APPROVAL_LEDGER_MISSING");
  });
});
