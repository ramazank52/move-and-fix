const allowedCategories = [
  "plumbing",
  "electrical",
  "cleaning",
  "hvac",
  "towing",
  "courier",
  "roadside",
  "locksmith",
  "painting",
  "gardening",
  "moving",
  "appliance",
] as const;

export type MoveAiCategory = (typeof allowedCategories)[number] | "general";

const categoryLabels: Record<Exclude<MoveAiCategory, "general">, string> = {
  plumbing: "Su tesisatı",
  electrical: "Elektrik",
  cleaning: "Temizlik",
  hvac: "Klima ve ısıtma",
  towing: "Çekici",
  courier: "Kurye",
  roadside: "Yol yardımı",
  locksmith: "Çilingir",
  painting: "Boya ve badana",
  gardening: "Bahçe",
  moving: "Nakliyat",
  appliance: "Beyaz eşya",
};

export function resolveMoveAiCategory(value: unknown): MoveAiCategory {
  return typeof value === "string" && (allowedCategories as readonly string[]).includes(value)
    ? value as MoveAiCategory
    : "general";
}

/**
 * The model can classify intent but cannot make availability, capability,
 * pricing, payment, legal, regulatory, insurance, or completion claims.
 * All user-facing text is generated from this deterministic policy.
 */
export function createPolicyBoundMoveAiResponse(input: {
  category: unknown;
  draftCreated: boolean;
  riskBlocked?: boolean;
}) {
  const category = resolveMoveAiCategory(input.category);
  const label = category === "general" ? null : categoryLabels[category];

  if (input.riskBlocked) {
    return {
      category,
      response: "Bu talep güvenlik incelemesi gerektiriyor. Acil tehlike varsa yerel acil yardım hattını arayın.",
      suggestions: ["Güvenlik bilgilerini kontrol et", "Destek ekibiyle iletişime geç"],
    };
  }

  if (input.draftCreated && label) {
    return {
      category,
      response: `${label} için bir hizmet taslağı hazırladım. Ayrıntıları kontrol edip onaylayabilirsiniz.`,
      suggestions: ["Talebi gözden geçir", "Ayrıntı ekle", "Taslağı onayla"],
    };
  }

  return {
    category,
    response: "Size uygun bir hizmet taslağı hazırlayabilmem için ihtiyacınızla ilgili biraz daha ayrıntı paylaşın.",
    suggestions: ["Hizmet türünü belirt", "Konumu ekle", "Zaman tercihini paylaş"],
  };
}
