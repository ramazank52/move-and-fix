export type CapabilityScopeConstraints = {
  jurisdictionCodes?: string[];
  categoryIds?: number[];
  serviceKeys?: string[];
  activityTypes?: string[];
  validUntil?: string;
};

export type CapabilityScopeContext = {
  jurisdictionCode?: string | null;
  categoryId?: number | null;
  serviceKey?: string | null;
  activityType?: string | null;
  now?: Date;
};

export type CapabilityScopeMatch =
  | { matched: true }
  | { matched: false; code: "SCOPE_CONSTRAINTS_MISSING" | "SCOPE_CONSTRAINTS_INVALID" | "SCOPE_CONSTRAINTS_NOT_MATCHED" | "SCOPE_CONSTRAINTS_EXPIRED" };

function nonEmptyStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || item.trim().length === 0)) return null;
  return value.map((item) => item.trim());
}

/**
 * Parses only a small, explicit scope language. Unknown keys and malformed
 * values are rejected so a reviewer note can never become an implicit grant.
 */
export function parseCapabilityScopeConstraints(value: unknown): CapabilityScopeConstraints | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const allowedKeys = new Set(["jurisdictionCodes", "categoryIds", "serviceKeys", "activityTypes", "validUntil"]);
  if (Object.keys(raw).some((key) => !allowedKeys.has(key))) return null;

  const parsed: CapabilityScopeConstraints = {};
  if (raw.jurisdictionCodes !== undefined) {
    const items = nonEmptyStringArray(raw.jurisdictionCodes);
    if (!items) return null;
    parsed.jurisdictionCodes = items.map((item) => item.toUpperCase());
  }
  if (raw.categoryIds !== undefined) {
    if (!Array.isArray(raw.categoryIds) || raw.categoryIds.length === 0 || raw.categoryIds.some((item) => !Number.isSafeInteger(item) || (item as number) <= 0)) return null;
    parsed.categoryIds = raw.categoryIds as number[];
  }
  if (raw.serviceKeys !== undefined) {
    const items = nonEmptyStringArray(raw.serviceKeys);
    if (!items) return null;
    parsed.serviceKeys = items;
  }
  if (raw.activityTypes !== undefined) {
    const items = nonEmptyStringArray(raw.activityTypes);
    if (!items) return null;
    parsed.activityTypes = items;
  }
  if (raw.validUntil !== undefined) {
    if (typeof raw.validUntil !== "string" || Number.isNaN(Date.parse(raw.validUntil))) return null;
    parsed.validUntil = raw.validUntil;
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

export function matchCapabilityScopeConstraints(constraintsValue: unknown, context: CapabilityScopeContext | null | undefined): CapabilityScopeMatch {
  const constraints = parseCapabilityScopeConstraints(constraintsValue);
  if (!constraints) return { matched: false, code: constraintsValue == null ? "SCOPE_CONSTRAINTS_MISSING" : "SCOPE_CONSTRAINTS_INVALID" };
  if (!context) return { matched: false, code: "SCOPE_CONSTRAINTS_NOT_MATCHED" };
  if (constraints.validUntil && new Date(constraints.validUntil) <= (context.now ?? new Date())) return { matched: false, code: "SCOPE_CONSTRAINTS_EXPIRED" };
  if (constraints.jurisdictionCodes && (!context.jurisdictionCode || !constraints.jurisdictionCodes.includes(context.jurisdictionCode.toUpperCase()))) return { matched: false, code: "SCOPE_CONSTRAINTS_NOT_MATCHED" };
  if (constraints.categoryIds && (!context.categoryId || !constraints.categoryIds.includes(context.categoryId))) return { matched: false, code: "SCOPE_CONSTRAINTS_NOT_MATCHED" };
  if (constraints.serviceKeys && (!context.serviceKey || !constraints.serviceKeys.includes(context.serviceKey))) return { matched: false, code: "SCOPE_CONSTRAINTS_NOT_MATCHED" };
  if (constraints.activityTypes && (!context.activityType || !constraints.activityTypes.includes(context.activityType))) return { matched: false, code: "SCOPE_CONSTRAINTS_NOT_MATCHED" };
  return { matched: true };
}
