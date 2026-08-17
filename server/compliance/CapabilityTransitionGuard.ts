import type { CapabilityDecision } from "./CapabilityPolicyService";
import { matchCapabilityScopeConstraints, type CapabilityScopeContext } from "./CapabilityScopeConstraintMatcher";

export type CapabilityTransition = "offer" | "accept" | "job_start";

export type TransitionCapabilityContext = {
  enforcementEnabled: boolean;
  requiredCapabilityId: number | null;
  jurisdictionId: number | null;
  providerCapabilityDecision: CapabilityDecision | null;
  providerCapabilityExpiresAt?: Date | null;
  providerScopeConstraintsJson?: unknown | null;
  scopeContext?: CapabilityScopeContext | null;
  now?: Date;
};

export type TransitionCapabilityResult =
  | { allowed: true; reason: "LEGACY_ROLLOUT_DISABLED" | "NOT_REQUIRED" | "VERIFIED" | "VERIFIED_LIMITED_SCOPE" }
  | { allowed: false; code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" | "PROVIDER_CAPABILITY_NOT_ELIGIBLE" | "PROVIDER_CAPABILITY_EXPIRED" | "PROVIDER_CAPABILITY_SCOPE_NOT_ELIGIBLE" };

export type ServiceRequestCapabilityContext = Pick<
  TransitionCapabilityContext,
  "enforcementEnabled" | "requiredCapabilityId" | "jurisdictionId"
>;

export type ServiceRequestCapabilityResult =
  | { allowed: true; reason: "LEGACY_ROLLOUT_DISABLED" | "NOT_REQUIRED" | "COMPLIANCE_CONTEXT_BOUND" }
  | { allowed: false; code: "COMPLIANCE_CONTEXT_NOT_CONFIGURED" };

/**
 * A request can be created before a provider is selected. When a jurisdiction
 * has made a capability mandatory, its authoritative capability/jurisdiction
 * context must nevertheless be bound to the request at creation time.
 */
export function evaluateServiceRequestCapabilityContext(
  input: ServiceRequestCapabilityContext,
): ServiceRequestCapabilityResult {
  if (!input.enforcementEnabled) return { allowed: true, reason: "LEGACY_ROLLOUT_DISABLED" };
  if (input.requiredCapabilityId === null) return { allowed: true, reason: "NOT_REQUIRED" };
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
  if (!input.enforcementEnabled) return { allowed: true, reason: "LEGACY_ROLLOUT_DISABLED" };
  if (input.requiredCapabilityId === null) return { allowed: true, reason: "NOT_REQUIRED" };
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
