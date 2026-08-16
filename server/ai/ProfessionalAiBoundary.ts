export type ProfessionalAiCapability =
  | "job_summary"
  | "schedule_checklist"
  | "safety_checklist"
  | "communication_draft";

export type ProfessionalAiDeniedCapability =
  | "price_quote"
  | "payment_instruction"
  | "provider_ranking"
  | "eligibility_decision"
  | "contract_change"
  | "customer_contact_disclosure"
  | "automated_action";

export type ProfessionalAiBoundaryInput = {
  actorRole: "customer" | "provider" | "admin" | null;
  isAssignedProvider: boolean;
  jobStatus: "pending" | "active" | "completed" | "cancelled" | null;
  requestedCapability: ProfessionalAiCapability | ProfessionalAiDeniedCapability;
  containsCustomerContactData: boolean;
  attemptsExternalAction: boolean;
};

export type ProfessionalAiBoundaryDecision =
  | { allowed: true; scope: "assigned_active_job"; canExecute: false; canSetPrice: false; canAccessCustomerContact: false }
  | { allowed: false; reason: string };

const ALLOWED_CAPABILITIES = new Set<ProfessionalAiCapability>([
  "job_summary",
  "schedule_checklist",
  "safety_checklist",
  "communication_draft",
]);

const ACTIVE_JOB_STATUSES = new Set<NonNullable<ProfessionalAiBoundaryInput["jobStatus"]>>([
  "active",
]);

/**
 * Fail-closed policy for professional-facing AI assistance.
 * The AI may prepare a non-binding, redacted draft for an assigned active job;
 * it can never set price, decide eligibility, reveal direct contact information,
 * or execute an action on behalf of a professional.
 */
export function evaluateProfessionalAiBoundary(input: ProfessionalAiBoundaryInput): ProfessionalAiBoundaryDecision {
  if (input.actorRole !== "provider") return { allowed: false, reason: "PROFESSIONAL_AI_PROVIDER_REQUIRED" };
  if (!input.isAssignedProvider) return { allowed: false, reason: "PROFESSIONAL_AI_ASSIGNED_JOB_REQUIRED" };
  if (!input.jobStatus || !ACTIVE_JOB_STATUSES.has(input.jobStatus)) {
    return { allowed: false, reason: "PROFESSIONAL_AI_ACTIVE_JOB_REQUIRED" };
  }
  if (input.containsCustomerContactData) return { allowed: false, reason: "PROFESSIONAL_AI_CONTACT_DATA_FORBIDDEN" };
  if (input.attemptsExternalAction) return { allowed: false, reason: "PROFESSIONAL_AI_AUTOMATION_FORBIDDEN" };
  if (!ALLOWED_CAPABILITIES.has(input.requestedCapability as ProfessionalAiCapability)) {
    return { allowed: false, reason: "PROFESSIONAL_AI_CAPABILITY_FORBIDDEN" };
  }
  return {
    allowed: true,
    scope: "assigned_active_job",
    canExecute: false,
    canSetPrice: false,
    canAccessCustomerContact: false,
  };
}
