import type { User } from "@/lib/_core/auth";

export const ENTRY_ROUTES = {
  unauthenticated: "/onboarding",
  customer: "/(tabs)",
  provider: "/provider-dashboard",
  admin: "/admin",
} as const;

export type EntryRoute = (typeof ENTRY_ROUTES)[keyof typeof ENTRY_ROUTES];

export function resolveEntryRoute(user: User | null): EntryRoute {
  if (!user) return ENTRY_ROUTES.unauthenticated;
  if (user.accountType === "admin" || user.role === "admin") return ENTRY_ROUTES.admin;
  if (user.accountType === "provider") return ENTRY_ROUTES.provider;
  return ENTRY_ROUTES.customer;
}
