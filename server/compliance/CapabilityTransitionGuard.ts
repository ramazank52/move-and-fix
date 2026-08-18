import type { CapabilityDecision } from "./CapabilityPolicyService";
import { matchCapabilityScopeConstraints, type CapabilityScopeContext } from "./CapabilityScopeConstraintMatcher";

export type CapabilityTransition = "offer" | "accept" | "job_start";
export type LegacyComplianceRequirementState = "not_required" | "required" | "blocked" | "legal_review_required";
export type ComplianceRequirementState = "REQUIRED" | "NOT_REQUIRED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN" | "LEGAL_REVIEW_REQUIRED" | "JURISDICTION_UNRESOLVED" | "CAPABILITY_UNMAPPED";
type AnyRequirementState = ComplianceRequirementState | LegacyComplianceRequirementState;

function normalizeRequirementState(state: AnyRequirementState | null | undefined): ComplianceRequirementState {
  switch (state) {
    case "required": return "REQUIRED";
    case "not_required": return "NOT_REQUIRED";
    case "legal_review_required": return "LEGAL_REVIEW_REQUIRED";
    case "blocked": return "UNKNOWN";
    case "REQUIRED":
    case "NOT_REQUIRED":
    case "CONDITIONAL":
    case "PROHIBITED":
    case "UNKNOWN":
    case "LEGAL_REVIEW_REQUIRED":
    case "JURISDICTION_UNRESOLVED":
    case "CAPABILITY_UNMAPPED":
      return state;
    default:
      return "UNKNOWN";
  }
}

export type TransitionCapabilityContext = {
  enforcementEnabled: boolean;
  complianceRequirementState?: AnyRequirementState | null;
  requirementState?: ComplianceRequirementState | null;
  requiredCapabilityId: number | null;
  jurisdictionId: number | null;
  providerCapabilityDecision: CapabilityDecision | null;
  providerCapabilityExpiresAt?: Date | null;
  providerScopeConstraintsJson?: unknown | null;
  scopeContext?: CapabilityScopeContext | null;
  now?: Date;
};

export type TransitionCapabilityResult =
  | { allowed: true; reason: "NOT_REQUIRED" | "VERIFIED" | "VERIFIED_LIMITED_SCOPE" }
  | { allowed: false; code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" | "COMPLIANCE_REQUIREMENT_STATE_BLOCKED" | "LEGAL_REVIEW_REQUIRED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN" | "JURISDICTION_UNRESOLVED" | "CAPABILITY_UNMAPPED" | "PROVIDER_CAPABILITY_NOT_ELIGIBLE" | "PROVIDER_CAPABILITY_EXPIRED" | "PROVIDER_CAPABILITY_SCOPE_NOT_ELIGIBLE" };

export type ServiceRequestCapabilityContext = Pick<
  TransitionCapabilityContext,
  "enforcementEnabled" | "complianceRequirementState" | "requirementState" | "requiredCapabilityId" | "jurisdictionId"
>;

export type ServiceRequestCapabilityResult =
  | { allowed: true; reason: "NOT_REQUIRED" | "COMPLIANCE_CONTEXT_BOUND" }
  | { allowed: false; code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" | "COMPLIANCE_REQUIREMENT_STATE_BLOCKED" | "LEGAL_REVIEW_REQUIRED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN" | "JURISDICTION_UNRESOLVED" | "CAPABILITY_UNMAPPED" };

/**
 * A request can be created before a provider is selected. When a jurisdiction
 * has made a capability mandatory, its authoritative capability/jurisdiction
 * context must nevertheless be bound to the request at creation time.
 */
export function evaluateServiceRequestCapabilityContext(
  input: ServiceRequestCapabilityContext,
): ServiceRequestCapabilityResult {
  if (input.requirementState == null && (input.complianceRequirementState == null || input.complianceRequirementState === "blocked")) {
    return { allowed: false, code: "COMPLIANCE_REQUIREMENT_STATE_BLOCKED" };
  }
  const requirementState = normalizeRequirementState(input.requirementState ?? input.complianceRequirementState);
  if (requirementState === "NOT_REQUIRED") return { allowed: true, reason: "NOT_REQUIRED" };
  if (requirementState !== "REQUIRED") return { allowed: false, code: requirementState };
  if (input.requiredCapabilityId === null) return { allowed: false, code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" };
  if (input.jurisdictionId === null) return { allowed: false, code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" };
  return { allowed: true, reason: "COMPLIANCE_CONTEXT_BOUND" };
}

export function assertServiceRequestCapabilityContext(input: ServiceRequestCapabilityContext): void {
  const result = evaluateServiceRequestCapabilityContext(input);
  if (!result.allowed) throw new Error(result.code);
}

/**
 * Server-side capability gate. A rollout may be explicitly disabled for
 * pre-existing requests that have no authoritative jurisdiction/capability
 * context. Once enabled, any absent or unverified context fails closed.
 */
export function evaluateCapabilityTransition(input: TransitionCapabilityContext): TransitionCapabilityResult {
  if (input.requirementState == null && (input.complianceRequirementState == null || input.complianceRequirementState === "blocked")) {
    return { allowed: false, code: "COMPLIANCE_REQUIREMENT_STATE_BLOCKED" };
  }
  const requirementState = normalizeRequirementState(input.requirementState ?? input.complianceRequirementState);
  if (requirementState === "NOT_REQUIRED") return { allowed: true, reason: "NOT_REQUIRED" };
  if (requirementState !== "REQUIRED") return { allowed: false, code: requirementState };
  if (input.requiredCapabilityId === null) return { allowed: false, code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" };
  if (input.jurisdictionId === null || input.providerCapabilityDecision === null) {
    return { allowed: false, code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" };
  }
  if (input.providerCapabilityExpiresAt && input.providerCapabilityExpiresAt <= (input.now ?? new Date())) {
    return { allowed: false, code: "PROVIDER_CAPABILITY_EXPIRED" };
  }
  if (input.providerCapabilityDecision === "VERIFIED") {
    return { allowed: true, reason: "VERIFIED" };
  }
  if (input.providerCapabilityDecision === "VERIFIED_LIMITED_SCOPE") {
    const scopeResult = matchCapabilityScopeConstraints(input.providerScopeConstraintsJson, input.scopeContext);
    if (!scopeResult.matched) return { allowed: false, code: "PROVIDER_CAPABILITY_SCOPE_NOT_ELIGIBLE" };
    return { allowed: true, reason: "VERIFIED_LIMITED_SCOPE" };
  }
  return { allowed: false, code: "PROVIDER_CAPABILITY_NOT_ELIGIBLE" };
}

export function assertCapabilityTransition(input: TransitionCapabilityContext): void {
  const result = evaluateCapabilityTransition(input);
  if (!result.allowed) throw new Error(result.code);
}
