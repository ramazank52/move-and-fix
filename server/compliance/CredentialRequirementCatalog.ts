import type { CredentialAssurance } from "./CredentialEligibilityGuard";

export const PROVIDER_REQUIREMENT_TYPES = [
  "employee",
  "self_employed",
  "sole_trader",
  "company_owner",
  "company_worker",
] as const;

export type ProviderRequirementType = (typeof PROVIDER_REQUIREMENT_TYPES)[number];
export type CredentialRequirementState = "required" | "conditional" | "not_required" | "prohibited" | "unknown";

/** Immutable, source-provenanced requirement snapshot used at transition time. */
export type CredentialRequirementSnapshot = {
  requirementId: number;
  jurisdictionId: number;
  categoryId: number;
  subcategoryId: number;
  capabilityId: number;
  providerType: ProviderRequirementType;
  credentialType: string;
  requirementState: CredentialRequirementState;
  minimumAssurance: CredentialAssurance;
  requiresHumanReview: boolean;
  officialSourceId: number | null;
  sourceReferenceIds: string[];
  sourceVersion: string;
  ruleVersion: string;
  provenance: Record<string, unknown>;
};

export type CredentialRequirementResolution =
  | { status: "RESOLVED"; requirements: CredentialRequirementSnapshot[] }
  | { status: "PROVIDER_TYPE_UNRESOLVED"; requirements: [] }
  | { status: "MISSING_CREDENTIAL_REQUIREMENT_CATALOG"; requirements: [] }
  | { status: "CREDENTIAL_REQUIREMENT_BLOCKED"; requirements: CredentialRequirementSnapshot[] };

export type CredentialRequirementScope = Pick<
  CredentialRequirementSnapshot,
  "jurisdictionId" | "categoryId" | "capabilityId"
>;

/**
 * Resolves only requirements that exactly match all authoritative dimensions.
 * Conditional, unknown and prohibited source states must never become a silent
 * document checklist fallback.
 */
export function resolveCredentialRequirements(input: {
  providerType: ProviderRequirementType | null;
  requirements: CredentialRequirementSnapshot[];
  /**
   * Transitions must pass this authoritative scope.  Kept optional only for
   * backwards-compatible callers that already pre-filter the immutable
   * snapshot; callers must not use it to synthesize a category fallback.
   */
  scope?: CredentialRequirementScope;
}): CredentialRequirementResolution {
  if (!input.providerType) return { status: "PROVIDER_TYPE_UNRESOLVED", requirements: [] };
  const matched = input.requirements.filter((requirement) =>
    requirement.providerType === input.providerType &&
    (!input.scope || (
      requirement.jurisdictionId === input.scope.jurisdictionId &&
      requirement.categoryId === input.scope.categoryId &&
      requirement.capabilityId === input.scope.capabilityId
    )),
  );
  if (matched.length === 0) return { status: "MISSING_CREDENTIAL_REQUIREMENT_CATALOG", requirements: [] };
  if (matched.some((requirement) => requirement.requirementState !== "required" && requirement.requirementState !== "not_required")) {
    return { status: "CREDENTIAL_REQUIREMENT_BLOCKED", requirements: matched };
  }
  return { status: "RESOLVED", requirements: matched };
}
