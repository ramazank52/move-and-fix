import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(process.cwd(), "app");

const referenceScreens = {
  "01 Ana Sayfa": "(tabs)/index.tsx",
  "02 Keşfet": "(tabs)/explore.tsx",
  "03 MoveAI": "ai-assistant.tsx",
  "04 Hizmet Talebi": "create-service.tsx",
  "05 Profesyonel": "provider/[id].tsx",
  "06 Teklifler": "job/[id].tsx",
  "07 Ödeme": "payment/checkout.tsx",
  "08 Aktif İş": "tracking/live.tsx",
  "09 İşlemler": "(tabs)/my-jobs.tsx",
  "10 Mesajlar": "(tabs)/messages.tsx",
  "11 MoveWallet": "(tabs)/wallet.tsx",
  "12 Profil": "(tabs)/profile.tsx",
  "13 Profesyonel Dashboard": "provider-dashboard.tsx",
  "14 Yeni İş Fırsatları": "provider-opportunities.tsx",
} as const;

const criticalNavigationTargets = [
  "index.tsx",
  "onboarding.tsx",
  "login.tsx",
  "oauth/callback.tsx",
  "admin.tsx",
  "chat/[id].tsx",
  "wallet/transactions.tsx",
  "wallet/withdraw.tsx",
  "wallet/add-money.tsx",
  "settings/profile-edit.tsx",
  "settings/addresses.tsx",
  "settings/favorites.tsx",
  "settings/payments.tsx",
  "settings/notifications.tsx",
  "settings/notification-sounds.tsx",
  "settings/general.tsx",
  "settings/help.tsx",
  "verify/email.tsx",
  "referral.tsx",
  "compare-providers.tsx",
  "chat/voice-message.tsx",
  "history-report.tsx",
  "explore/filter.tsx",
  "calendar.tsx",
  "legal/index.tsx",
  "premium.tsx",
] as const;

const backNavigableScreens = [
  "job/[id].tsx",
  "provider/[id].tsx",
  "chat/[id].tsx",
  "payment/checkout.tsx",
  "tracking/live.tsx",
  "wallet/transactions.tsx",
  "wallet/withdraw.tsx",
  "wallet/add-money.tsx",
  "settings/profile-edit.tsx",
  "settings/addresses.tsx",
] as const;

describe("Expo Router screen manifest", () => {
  it.each(Object.entries(referenceScreens))("exposes reference screen %s", (_name, path) => {
    expect(existsSync(resolve(appRoot, path)), `Missing app/${path}`).toBe(true);
  });

  it.each(criticalNavigationTargets)("exposes navigation target /%s", (path) => {
    expect(existsSync(resolve(appRoot, path)), `Missing app/${path}`).toBe(true);
  });

  it.each(backNavigableScreens)("provides back navigation on /%s", (path) => {
    const source = readFileSync(resolve(appRoot, path), "utf8");
    expect(source, `Missing router.back() in app/${path}`).toMatch(/router\.back\(\)/);
  });
});
