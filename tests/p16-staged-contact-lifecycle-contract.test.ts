import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("../server/db.ts", import.meta.url), "utf8");
const routerSource = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");
const profileEditSource = readFileSync(new URL("../app/settings/profile-edit.tsx", import.meta.url), "utf8");
const verifyEmailSource = readFileSync(new URL("../app/verify-email.tsx", import.meta.url), "utf8");
const verifyPhoneSource = readFileSync(new URL("../app/verify-phone.tsx", import.meta.url), "utf8");
const contactChangeEventsMarker = "export const contactChangeEvents = mysqlTable(";
const contactChangeEventsSchema = schemaSource.slice(
  schemaSource.indexOf(contactChangeEventsMarker),
  schemaSource.indexOf("export const", schemaSource.indexOf(contactChangeEventsMarker) + 1),
);

describe("P16 staged contact lifecycle contract", () => {
  it("keeps pending email and phone separate from primary contacts and records privacy-preserving audit events", () => {
    expect(schemaSource).toContain('pendingEmailChange: varchar("pendingEmailChange", { length: 320 })');
    expect(schemaSource).toContain('pendingPhoneChange: varchar("pendingPhoneChange", { length: 32 })');
    expect(schemaSource).toContain(contactChangeEventsMarker);
    expect(contactChangeEventsSchema).toContain('contactValueHash: varchar("contactValueHash", { length: 128 }).notNull()');
    expect(contactChangeEventsSchema).not.toContain('contactValue: varchar("contactValue"');
  });

  it("uses an expiry-bound, consumed-once atomic promotion and writes initiated/confirmed audit events", () => {
    expect(dbSource).toContain("export async function initiateStagedContactChange");
    expect(dbSource).toContain("export async function confirmStagedContactChange");
    expect(dbSource).toContain("STAGED_CONTACT_CHANGE_INVALID_OR_EXPIRED");
    expect(dbSource).toContain("STAGED_CONTACT_CHANGE_ALREADY_CONSUMED");
    expect(dbSource).toContain("eventType: \"initiated\"");
    expect(dbSource).toContain("eventType: \"confirmed\"");
    expect(dbSource).toContain("isNull(authChallenges.consumedAt)");
    expect(dbSource).toContain("gte(authChallenges.expiresAt, now)");
  });

  it("keeps client-supplied profile contacts staged and uses pending destinations for OTP resend", () => {
    expect(routerSource).toContain("db.initiateStagedContactChange");
    expect(routerSource).toContain("db.confirmStagedContactChange");
    expect(routerSource).toContain("db.getPendingStagedContactDestination");
    expect(routerSource).toContain("stagedContactChange: Boolean(pendingDestination && contactType)");
    expect(routerSource).not.toContain("updateUserProfile({ userId: ctx.user.id, name: input.name, email: input.email");
  });

  it("shows pending contact actions in profile editing and returns each successful OTP flow there", () => {
    expect(profileEditSource).toContain("trpc.auth.getStagedContactChangeStatus.useQuery");
    expect(profileEditSource).toContain('router.push("/verify/email" as never)');
    expect(profileEditSource).toContain('router.push("/verify-phone" as never)');
    expect(verifyEmailSource).toContain('router.replace("/settings/profile-edit" as never)');
    expect(verifyPhoneSource).toContain('router.replace("/settings/profile-edit" as never)');
  });
});
