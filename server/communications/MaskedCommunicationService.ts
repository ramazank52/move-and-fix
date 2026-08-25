import { ENV } from "../_core/env";

export type MaskedCommunicationChannel = "phone" | "message";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// Intentionally conservative: redact Turkish/international telephone shapes
// without attempting to parse or retain their original values.
const PHONE_PATTERN = /(?<!\w)(?:\+?90\s?)?(?:0?5\d{2}|0?\d{3})[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\w)/g;

export function containsDirectContactData(content: string): boolean {
  const normalized = content.normalize("NFKC").replace(/[\s._()\-–—]/g, "");
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(content)
    || /(?<!\w)(?:\+?90\s?)?(?:0?5\d{2}|0?\d{3})[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\w)/.test(content)
    || /(?:https?:\/\/|www\.)/i.test(content)
    || /(?:\+?90)?0?5\d{8,9}/.test(normalized);
}

export function sanitizeMaskedMessageContent(content: string): string {
  return content
    .replace(EMAIL_PATTERN, "[e-posta gizlendi]")
    .replace(PHONE_PATTERN, "[telefon gizlendi]");
}

/**
 * No outbound request is attempted until both configuration values are set.
 * The adapter boundary prevents a local, temporary or customer number from
 * being presented as a proxy number.
 */
export function getMaskedCommunicationReadiness() {
  const configured = Boolean(ENV.proxyCommProviderBaseUrl && ENV.proxyCommProviderApiKey);
  return {
    configured,
    code: configured ? "CONFIGURED" : "NOT_CONFIGURED",
  } as const;
}
