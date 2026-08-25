export const DEFAULT_NOTIFICATION_TIME_ZONE = "Europe/Istanbul";

export type QuietHours = { start: string; end: string };

export type QuietHoursDecision = {
  deferred: boolean;
  deliverAfter: Date | null;
  reason: "NOT_IN_QUIET_HOURS" | "QUIET_HOURS_DEFERRED" | "URGENT_SECURITY_EXCEPTION" | "INVALID_PREFERENCE_DEFAULTED";
  timeZone: string;
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const URGENT_SECURITY_NOTIFICATION_TYPES = new Set(["account_security_alert", "safety_emergency"]);

export function resolveNotificationTimeZone(value: string | null | undefined): { timeZone: string; defaulted: boolean } {
  if (!value) return { timeZone: DEFAULT_NOTIFICATION_TIME_ZONE, defaulted: true };
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return { timeZone: value, defaulted: false };
  } catch {
    return { timeZone: DEFAULT_NOTIFICATION_TIME_ZONE, defaulted: true };
  }
}

function parseMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    minuteOfDay: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

function localDateTimeToInstant(year: number, month: number, day: number, minuteOfDay: number, timeZone: string): Date {
  // Find the first real instant whose authoritative IANA local clock has reached
  // the requested minute. This avoids hard-coded offsets and remains deterministic
  // across DST gaps/repeats.
  const target = Date.UTC(year, month - 1, day, 0, minuteOfDay, 0);
  const from = target - 18 * 60 * 60 * 1000;
  const until = target + 30 * 60 * 60 * 1000;
  for (let epoch = from; epoch <= until; epoch += 60 * 1000) {
    const local = localParts(new Date(epoch), timeZone);
    if (local.year === year && local.month === month && local.day === day && local.minuteOfDay >= minuteOfDay) {
      return new Date(epoch);
    }
  }
  return new Date(until);
}

export function decideQuietHours(input: {
  now: Date;
  timeZone: string | null | undefined;
  quietHours: QuietHours | undefined;
  notificationType: string;
  marketing: boolean;
}): QuietHoursDecision {
  const resolved = resolveNotificationTimeZone(input.timeZone);
  const start = input.quietHours ? parseMinutes(input.quietHours.start) : null;
  const end = input.quietHours ? parseMinutes(input.quietHours.end) : null;
  if (start == null || end == null || start === end) {
    return {
      deferred: false,
      deliverAfter: null,
      reason: resolved.defaulted ? "INVALID_PREFERENCE_DEFAULTED" : "NOT_IN_QUIET_HOURS",
      timeZone: resolved.timeZone,
    };
  }

  const local = localParts(input.now, resolved.timeZone);
  const inQuietHours = start < end
    ? local.minuteOfDay >= start && local.minuteOfDay < end
    : local.minuteOfDay >= start || local.minuteOfDay < end;
  if (!inQuietHours) {
    return { deferred: false, deliverAfter: null, reason: "NOT_IN_QUIET_HOURS", timeZone: resolved.timeZone };
  }
  if (!input.marketing && URGENT_SECURITY_NOTIFICATION_TYPES.has(input.notificationType)) {
    return { deferred: false, deliverAfter: null, reason: "URGENT_SECURITY_EXCEPTION", timeZone: resolved.timeZone };
  }

  const crossesMidnight = start > end;
  const endDayOffset = crossesMidnight && local.minuteOfDay >= start ? 1 : 0;
  const target = new Date(Date.UTC(local.year, local.month - 1, local.day + endDayOffset, 0, 0, 0));
  return {
    deferred: true,
    deliverAfter: localDateTimeToInstant(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), end, resolved.timeZone),
    reason: "QUIET_HOURS_DEFERRED",
    timeZone: resolved.timeZone,
  };
}
