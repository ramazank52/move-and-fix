import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

function displayRating(value: number | null) {
  if (value == null || value <= 0) return "Yeni";
  return (value > 5 ? value / 10 : value).toFixed(1);
}

export default function CompareProvidersScreen() {
  const { requestId: rawRequestId } = useLocalSearchParams<{ requestId?: string }>();
  const requestId = Number(rawRequestId);
  const isValidId = Number.isInteger(requestId) && requestId > 0;
  const colors = useColors();
  const router = useRouter();
  const offersQuery = trpc.offers.forRequest.useQuery({ requestId }, { enabled: isValidId });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const offers = useMemo(() => offersQuery.data ?? [], [offersQuery.data]);
  const activeIds = selectedIds.length > 0 ? selectedIds : offers.slice(0, 3).map((offer) => offer.id);
  const selectedOffers = offers.filter((offer) => activeIds.includes(offer.id));

  const toggle = (offerId: number) => {
    setSelectedIds((current) => {
      const base = current.length > 0 ? current : offers.slice(0, 3).map((offer) => offer.id);
      if (base.includes(offerId)) return base.filter((id) => id !== offerId);
      if (base.length >= 3) return base;
      return [...base, offerId];
    });
  };

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.55 : 1 })}>
        <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={{ flex: 1, textAlign: "center", fontSize: 17, lineHeight: 22, fontWeight: "800", color: colors.foreground }}>
        Teklif Karşılaştır
      </Text>
      <View style={{ width: 30 }} />
    </View>
  );

  if (!isValidId) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <IconSymbol name="exclamationmark.triangle.fill" size={38} color={colors.error} />
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16, marginTop: 12 }}>Geçersiz talep bağlantısı</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (offersQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted }}>Teklifler karşılaştırılıyor...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (offersQuery.error || offers.length === 0) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        {header}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 }}>
          <IconSymbol name="text.bubble.fill" size={36} color={colors.muted} />
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
            {offersQuery.error ? "Teklifler alınamadı" : "Karşılaştırılacak teklif yok"}
          </Text>
          {offersQuery.error ? (
            <Pressable onPress={() => offersQuery.refetch()} style={({ pressed }) => ({ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ color: "#FFF", fontWeight: "800" }}>Yeniden Dene</Text>
            </Pressable>
          ) : null}
        </View>
      </ScreenContainer>
    );
  }

  const rows = [
    { label: "Puan", value: (offer: (typeof offers)[number]) => displayRating(offer.providerRating) },
    { label: "Yorum", value: (offer: (typeof offers)[number]) => String(offer.providerReviewCount ?? 0) },
    { label: "Tamamlanan İş", value: (offer: (typeof offers)[number]) => String(offer.providerCompletedJobs ?? 0) },
    { label: "Tahmini Süre", value: (offer: (typeof offers)[number]) => offer.estimatedTime || "Belirtilmedi" },
    { label: "Teklif", value: (offer: (typeof offers)[number]) => `₺${offer.price.toLocaleString("tr-TR")}` },
  ];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
        <Text style={{ color: colors.foreground, fontSize: 18, lineHeight: 23, fontWeight: "900" }}>Profesyonelleri seç</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3, marginBottom: 12 }}>
          En fazla 3 gerçek teklifi yan yana karşılaştırabilirsin.
        </Text>

        <View style={{ gap: 8 }}>
          {offers.map((offer) => {
            const selected = activeIds.includes(offer.id);
            return (
              <Pressable
                key={offer.id}
                onPress={() => toggle(offer.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: selected ? `${colors.primary}12` : colors.card,
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  opacity: pressed ? 0.78 : 1,
                })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: `${colors.primary}18`, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "900" }}>{offer.providerName.charAt(0).toLocaleUpperCase("tr-TR")}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 19, fontWeight: "800", flexShrink: 1 }} numberOfLines={1}>{offer.providerName}</Text>
                    {offer.providerVerified ? <IconSymbol name="checkmark.seal.fill" size={14} color={colors.primary} style={{ marginLeft: 4 }} /> : null}
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 }}>
                    ★ {displayRating(offer.providerRating)} · ₺{offer.price.toLocaleString("tr-TR")}
                  </Text>
                </View>
                <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.primary : colors.border }}>
                  {selected ? <IconSymbol name="checkmark" size={13} color="#FFF" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {selectedOffers.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <Text style={{ color: colors.foreground, fontSize: 17, lineHeight: 22, fontWeight: "900", marginBottom: 10 }}>Karşılaştırma</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 110 + selectedOffers.length * 132, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 110, padding: 11, justifyContent: "center" }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>KRİTER</Text>
                  </View>
                  {selectedOffers.map((offer) => (
                    <View key={offer.id} style={{ width: 132, padding: 11, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                      <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 16, fontWeight: "800", textAlign: "center" }} numberOfLines={2}>{offer.providerName}</Text>
                    </View>
                  ))}
                </View>
                {rows.map((row, rowIndex) => (
                  <View key={row.label} style={{ flexDirection: "row", borderBottomWidth: rowIndex === rows.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                    <View style={{ width: 110, padding: 11, justifyContent: "center", backgroundColor: colors.surface }}>
                      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: "700" }}>{row.label}</Text>
                    </View>
                    {selectedOffers.map((offer) => (
                      <View key={offer.id} style={{ width: 132, padding: 11, justifyContent: "center", borderLeftWidth: 1, borderLeftColor: colors.border }}>
                        <Text style={{ color: colors.foreground, fontSize: 11, lineHeight: 15, fontWeight: "700", textAlign: "center" }}>{row.value(offer)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={{ gap: 9, marginTop: 14 }}>
              {selectedOffers.map((offer) => (
                <Pressable
                  key={offer.id}
                  onPress={() => router.push(`/provider/${offer.providerId}` as never)}
                  style={({ pressed }) => ({ minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 })}
                >
                  <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "800" }}>{offer.providerName} Profilini Gör</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
