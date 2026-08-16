import { ENV } from "./env";

export type ObservabilityLevel = "debug" | "info" | "warn" | "error";

export type ObservabilityEvent = {
  timestamp: string;
  level: ObservabilityLevel;
  message: string;
  requestId?: string;
  context?: Record<string, unknown>;
};

export type ApmDeliveryResult =
  | { delivered: true }
  | { delivered: false; reason: "NOT_CONFIGURED" | "UNAVAILABLE" | "REJECTED" };

const sensitiveKeyPattern = /authorization|cookie|password|passcode|token|secret|api[_-]?key|email|phone|iban|card|cvv|address/i;
const bearerPattern = /\b(?:bearer|basic)\s+[a-z0-9._~+/=-]+/gi;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?:\+?90|0)?\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g;
const ibanPattern = /\bTR\d{2}(?:\s?\d{4}){5}(?:\s?\d{2})?\b/gi;

function redactText(value: string): string {
  return value
    .replace(bearerPattern, "[REDACTED_CREDENTIAL]")
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(phonePattern, "[REDACTED_PHONE]")
    .replace(ibanPattern, "[REDACTED_IBAN]")
    .slice(0, 512);
}

/**
 * Produces bounded, JSON-safe diagnostic context. Secret-like keys and common
 * Turkish customer identifiers are removed before either console or APM output.
 */
export function redactObservabilityData(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED_DEPTH]";
  if (typeof value === "string") return redactText(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return { name: value.name, message: redactText(value.message) };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactObservabilityData(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactObservabilityData(item, depth + 1),
      ]),
    );
  }
  return String(value);
}

export function createObservabilityEvent(event: Omit<ObservabilityEvent, "timestamp" | "context"> & { context?: unknown }): ObservabilityEvent {
  const sanitizedContext = event.context === undefined ? undefined : redactObservabilityData(event.context);
  return {
    timestamp: new Date().toISOString(),
    level: event.level,
    message: redactText(event.message),
    requestId: event.requestId,
    context: sanitizedContext && typeof sanitizedContext === "object" && !Array.isArray(sanitizedContext)
      ? sanitizedContext as Record<string, unknown>
      : sanitizedContext === undefined ? undefined : { value: sanitizedContext },
  };
}

export function writeObservabilityEvent(event: ObservabilityEvent): void {
  const line = JSON.stringify(event);
  if (event.level === "error") console.error(line);
  else if (event.level === "warn") console.warn(line);
  else if (event.level === "debug") console.debug(line);
  else console.info(line);
}

export async function deliverApmEvent(
  event: ObservabilityEvent,
  fetchImpl: typeof fetch = fetch,
): Promise<ApmDeliveryResult> {
  if (!ENV.apmEndpoint || !ENV.apmApiKey) return { delivered: false, reason: "NOT_CONFIGURED" };

  try {
    const response = await fetchImpl(ENV.apmEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.apmApiKey}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok ? { delivered: true } : { delivered: false, reason: "REJECTED" };
  } catch {
    // Observability must never change business outcome or disclose delivery errors.
    return { delivered: false, reason: "UNAVAILABLE" };
  }
}

export function emitObservabilityEvent(event: ObservabilityEvent): void {
  writeObservabilityEvent(event);
  void deliverApmEvent(event);
}

export function getApmConfigurationStatus(): "not_configured" | "configured_unverified" {
  return ENV.apmEndpoint && ENV.apmApiKey ? "configured_unverified" : "not_configured";
}
