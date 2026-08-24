export type ThemeFixture = {
  id: string;
  screenName: string;
  role: "customer" | "provider";
  state: string;
  sourceRoute: string;
  evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS";
};

/**
 * Static, non-sensitive gallery metadata. This intentionally describes the
 * existing visual fixture scope without importing product screens, auth, tRPC,
 * a database, or an external integration.
 */
export const THEME_FIXTURES: readonly ThemeFixture[] = [
  { id: "01", screenName: "Ana Sayfa", role: "customer", state: "normal / hızlı erişim", sourceRoute: "/", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "02", screenName: "Keşfet", role: "customer", state: "kategori / loading / empty", sourceRoute: "/explore", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "03", screenName: "MoveAI", role: "customer", state: "normal / input", sourceRoute: "/ai-assistant", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "04", screenName: "Hizmet Talebi", role: "customer", state: "form / disabled", sourceRoute: "/create-service", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "05", screenName: "Profesyonel Listesi", role: "customer", state: "liste / empty", sourceRoute: "/category/[id]", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "06", screenName: "Teklifler", role: "customer", state: "karşılaştırma / warning", sourceRoute: "/compare-providers", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "07", screenName: "Ödeme", role: "customer", state: "özet / disabled", sourceRoute: "/payment/checkout", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "08", screenName: "Aktif İş / Canlı Takip", role: "customer", state: "aktif durum / ETA", sourceRoute: "/tracking/live", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "09", screenName: "İşlerim", role: "customer", state: "sekme / empty", sourceRoute: "/my-jobs", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "10", screenName: "Mesajlar", role: "customer", state: "konuşma / unread", sourceRoute: "/messages", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "11", screenName: "MoveWallet", role: "customer", state: "bakiye / işlem özeti", sourceRoute: "/wallet", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "12", screenName: "Profil", role: "customer", state: "hesap menüsü", sourceRoute: "/profile", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "13", screenName: "Profesyonel Dashboard", role: "provider", state: "kazanç / durum", sourceRoute: "/provider-dashboard", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
  { id: "14", screenName: "Yeni İş Fırsatları", role: "provider", state: "fırsat / CTA", sourceRoute: "/provider-opportunities", evidenceStatus: "WAITING_FOR_OWNER_PHYSICAL_SCREENSHOTS" },
] as const;
