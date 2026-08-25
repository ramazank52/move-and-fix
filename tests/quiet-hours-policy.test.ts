import { describe, expect, it } from "vitest";
import { decideQuietHours, DEFAULT_NOTIFICATION_TIME_ZONE, resolveNotificationTimeZone } from "../server/notifications/QuietHoursPolicy";

describe("quiet-hours IANA policy", () => {
  const nightly = { start: "22:00", end: "08:00" };

  it("defers overnight quiet-hours and computes the next local end without UTC offsets", () => {
    const decision = decideQuietHours({
      now: new Date("2026-08-25T20:30:00.000Z"), // 23:30 Europe/Istanbul
      timeZone: "Europe/Istanbul",
      quietHours: nightly,
      notificationType: "message_received",
      marketing: false,
    });
    expect(decision).toMatchObject({ deferred: true, reason: "QUIET_HOURS_DEFERRED", timeZone: "Europe/Istanbul" });
    expect(decision.deliverAfter?.toISOString()).toBe("2026-08-26T05:00:00.000Z");
  });

  it("respects boundaries and never lets marketing use the urgent exception", () => {
    expect(decideQuietHours({ now: new Date("2026-08-25T05:00:00.000Z"), timeZone: "Europe/Istanbul", quietHours: nightly, notificationType: "message_received", marketing: false }).deferred).toBe(false);
    expect(decideQuietHours({ now: new Date("2026-08-25T19:00:00.000Z"), timeZone: "Europe/Istanbul", quietHours: nightly, notificationType: "safety_emergency", marketing: false }).reason).toBe("URGENT_SECURITY_EXCEPTION");
    expect(decideQuietHours({ now: new Date("2026-08-25T19:00:00.000Z"), timeZone: "Europe/Istanbul", quietHours: nightly, notificationType: "safety_emergency", marketing: true }).deferred).toBe(true);
  });

  it("uses the safe Türkiye default for null or invalid timezone preferences", () => {
    expect(resolveNotificationTimeZone(null)).toEqual({ timeZone: DEFAULT_NOTIFICATION_TIME_ZONE, defaulted: true });
    expect(resolveNotificationTimeZone("UTC+3")).toEqual({ timeZone: DEFAULT_NOTIFICATION_TIME_ZONE, defaulted: true });
  });

  it("keeps DST-region decisions IANA-based", () => {
    const decision = decideQuietHours({
      now: new Date("2026-03-08T06:30:00.000Z"),
      timeZone: "America/New_York",
      quietHours: { start: "01:00", end: "08:00" },
      notificationType: "message_received",
      marketing: false,
    });
    expect(decision.deferred).toBe(true);
    expect(decision.deliverAfter?.getTime()).toBeGreaterThan(new Date("2026-03-08T06:30:00.000Z").getTime());
  });
});
