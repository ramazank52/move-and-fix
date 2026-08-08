import { describe, expect, it } from "vitest";

import type { User } from "../lib/_core/auth";
import { ENTRY_ROUTES, resolveEntryRoute } from "../lib/navigation";

function user(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-open-id",
    name: "Test Kullanıcı",
    email: "test@example.com",
    loginMethod: "oauth",
    role: "user",
    accountType: "customer",
    lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("resolveEntryRoute", () => {
  it("sends unauthenticated users to onboarding", () => {
    expect(resolveEntryRoute(null)).toBe(ENTRY_ROUTES.unauthenticated);
  });

  it("sends customers to the customer tab navigator", () => {
    expect(resolveEntryRoute(user())).toBe(ENTRY_ROUTES.customer);
  });

  it("sends providers to the professional dashboard", () => {
    expect(resolveEntryRoute(user({ accountType: "provider" }))).toBe(ENTRY_ROUTES.provider);
  });

  it("sends admins to the admin entry regardless of a stale accountType", () => {
    expect(resolveEntryRoute(user({ role: "admin", accountType: "customer" }))).toBe(
      ENTRY_ROUTES.admin,
    );
  });
});
