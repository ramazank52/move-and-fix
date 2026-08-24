export type OpportunityNotificationIntent = {
  requestId: number;
  providerId: number;
  type: "opportunity_available" | "opportunity_revoked";
  reasonCode: string;
};

export function buildOpportunityNotificationIntent(input: OpportunityNotificationIntent) {
  if (!Number.isInteger(input.requestId) || input.requestId <= 0) throw new Error("OPPORTUNITY_REQUEST_ID_INVALID");
  if (!Number.isInteger(input.providerId) || input.providerId <= 0) throw new Error("OPPORTUNITY_PROVIDER_ID_INVALID");
  const normalizedReason = input.reasonCode.trim().slice(0, 160);
  if (!normalizedReason) throw new Error("OPPORTUNITY_REASON_REQUIRED");
  return {
    ...input,
    reasonCode: normalizedReason,
    idempotencyKey: `opportunity:${input.type}:${input.requestId}:${input.providerId}`,
    // The provider must pass protected route authorization and a fresh
    // eligibility check before receiving any job details.
    deepLink: `/provider-opportunities?requestId=${input.requestId}`,
  } as const;
}
