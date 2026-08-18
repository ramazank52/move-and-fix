export type MoveAiClientFallbackResponse = {
  text: string;
  suggestions: string[];
  category?: "plumbing" | "towing" | "hvac" | "courier";
};

const neutralSuggestions = ["Talebi ayrıntılandır", "Tekrar dene"];

/**
 * This fallback deliberately never makes commercial, availability, payment,
 * capability, legal, or safety approval claims. The authoritative action is
 * always the server-side MoveAiResponsePolicy after connectivity is restored.
 */
export function getMoveAiClientFallbackResponse(text: string): MoveAiClientFallbackResponse {
  const lower = text.toLocaleLowerCase("tr-TR");
  const responseBase = "Açıklamanızı aldım. İşlem, ayrıntılar sunucuda doğrulandıktan sonra devam edebilir.";

  if (lower.includes("su") && (lower.includes("akıyo") || lower.includes("akıyor") || lower.includes("patla"))) {
    return { text: `${responseBase} Hizmet türünü ve durumu gözden geçirip yeniden deneyin.`, suggestions: neutralSuggestions, category: "plumbing" };
  }
  if (lower.includes("araba") && (lower.includes("kal") || lower.includes("bozul")) || lower.includes("çekici")) {
    return { text: `${responseBase} Konum ve araç durumunu tekrar göndererek doğrulanmış akışa devam edin.`, suggestions: neutralSuggestions, category: "towing" };
  }
  if (lower.includes("klima") && (lower.includes("soğut") || lower.includes("çalış"))) {
    return { text: `${responseBase} Arıza belirtisini ve uygun zamanı ekleyerek yeniden deneyin.`, suggestions: neutralSuggestions, category: "hvac" };
  }
  if (lower.includes("kurye")) {
    return { text: `${responseBase} Paket ve teslimat ayrıntılarını ekleyerek yeniden deneyin.`, suggestions: neutralSuggestions, category: "courier" };
  }

  return {
    text: "Şu anda güvenli bir işlem oluşturamıyorum. Hizmet türünü ve ihtiyacınızı ayrıntılandırıp yeniden deneyin. Acil bir güvenlik riski varsa yerel acil hizmetlere başvurun.",
    suggestions: neutralSuggestions,
  };
}
