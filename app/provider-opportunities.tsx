import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export default function ProviderOpportunitiesScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(() => {
    const parsed = Number(params.requestId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [price, setPrice] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [message, setMessage] = useState("");

  const profileQuery = trpc.providers.myProfile.useQuery();
  const jobsQuery = trpc.providers.newJobs.useQuery();
  const opportunities = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item.id === selectedRequestId) ?? null,
    [opportunities, selectedRequestId],
  );

  const createOffer = trpc.offers.create.useMutation({
    onSuccess: async () => {
      Alert.alert("Teklif Gönderildi", "Müşteri teklifiniz hakkında bilgilendirildi.");
      setSelectedRequestId(null);
      setPrice("");
      setEstimatedTime("");
      setMessage("");
      await jobsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert("Teklif Gönderilemedi", error.message || "Lütfen tekrar deneyin.");
    },
  });

  const submitOffer = () => {
    const amount = Number(price.replace(",", "."));

    if (!selectedOpportunity || !profileQuery.data?.id) {
      Alert.alert("Profil Gerekli", "Teklif verebilmek için profesyonel profiliniz bulunmalıdır.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Geçersiz Tutar", "Lütfen sıfırdan büyük bir teklif tutarı girin.");
      return;
    }
    if (!estimatedTime.trim()) {
      Alert.alert("Süre Gerekli", "Tahmini varış veya tamamlama süresini girin.");
      return;
    }

    createOffer.mutate({
      requestId: selectedOpportunity.id,
      price: Math.round(amount),
      estimatedTime: estimatedTime.trim(),
      message: message.trim() || undefined,
    });
  };

  if (jobsQuery.isLoading || profileQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 text-sm text-muted">İş fırsatları yükleniyor…</Text>
      </ScreenContainer>
    );
  }

  if (jobsQuery.isError || profileQuery.isError) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]} className="items-center justify-center px-8">
        <IconSymbol name="wifi.exclamationmark" size={42} color={colors.error} />
        <Text className="mt-4 text-center text-lg font-bold text-foreground">Fırsatlar alınamadı</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">
          Bağlantınızı kontrol edip yeniden deneyin.
        </Text>
        <Pressable
          onPress={() => {
            profileQuery.refetch();
            jobsQuery.refetch();
          }}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 12,
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text className="font-semibold text-white">Yeniden Dene</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View
        style={{
          height: 58,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          accessibilityLabel="Geri dön"
          onPress={() => router.back()}
          style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.55 : 1 })}
        >
          <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 6 }}>
          <Text className="text-lg font-bold text-foreground">Yeni İş Fırsatları</Text>
          <Text className="text-xs text-muted">Hizmet bölgenizdeki güncel talepler</Text>
        </View>
        <View
          style={{
            minWidth: 30,
            height: 30,
            borderRadius: 15,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${colors.primary}18`,
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: "800" }}>{opportunities.length}</Text>
        </View>
      </View>

      <FlatList
        data={opportunities}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: opportunities.length ? undefined : 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 }}>
            <IconSymbol name="briefcase.fill" size={44} color={colors.muted} />
            <Text className="mt-4 text-center text-lg font-bold text-foreground">Yeni fırsat bulunmuyor</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              Kategorinize uygun yeni müşteri talepleri burada görünecek.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedRequestId === item.id;
          return (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: isSelected ? 1.5 : 0.5,
                borderColor: isSelected ? colors.primary : colors.border,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: `${colors.primary}16`,
                  }}
                >
                  <IconSymbol name="briefcase.fill" size={21} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text className="text-base font-bold text-foreground" numberOfLines={2}>{item.title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <IconSymbol name="location.fill" size={13} color={colors.muted} />
                    <Text className="ml-1 flex-1 text-xs text-muted" numberOfLines={1}>
                      {item.address || "Konum belirtilmedi"}
                    </Text>
                    {item.distanceKm ? (
                      <Text className="text-xs font-semibold text-muted">{item.distanceKm} km</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {item.description ? (
                <Text className="mt-3 text-sm leading-5 text-muted" numberOfLines={3}>{item.description}</Text>
              ) : null}

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                <View>
                  <Text className="text-xs text-muted">Müşteri bütçesi</Text>
                  <Text className="mt-1 text-base font-extrabold text-foreground">
                    {item.budgetMin || item.budgetMax
                      ? `₺${item.budgetMin ?? 0} – ₺${item.budgetMax ?? item.budgetMin}`
                      : "Teklife açık"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedRequestId(isSelected ? null : item.id)}
                  style={({ pressed }) => ({
                    borderRadius: 12,
                    backgroundColor: isSelected ? `${colors.primary}18` : colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    opacity: pressed ? 0.82 : 1,
                  })}
                >
                  <Text style={{ color: isSelected ? colors.primary : "#FFFFFF", fontWeight: "700" }}>
                    {isSelected ? "Kapat" : "Teklif Ver"}
                  </Text>
                </Pressable>
              </View>

              {isSelected ? (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: colors.border }}>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    placeholder="Teklif tutarı (₺)"
                    placeholderTextColor={colors.muted}
                    style={{
                      minHeight: 48,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      paddingHorizontal: 14,
                    }}
                  />
                  <TextInput
                    value={estimatedTime}
                    onChangeText={setEstimatedTime}
                    placeholder="Tahmini süre, örn. 30 dakika"
                    placeholderTextColor={colors.muted}
                    style={{
                      minHeight: 48,
                      marginTop: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      paddingHorizontal: 14,
                    }}
                  />
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Müşteriye kısa not (isteğe bağlı)"
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={500}
                    style={{
                      minHeight: 82,
                      marginTop: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      padding: 14,
                      textAlignVertical: "top",
                    }}
                  />
                  <Pressable
                    disabled={createOffer.isPending}
                    onPress={submitOffer}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      marginTop: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.primary,
                      opacity: createOffer.isPending ? 0.55 : pressed ? 0.85 : 1,
                    })}
                  >
                    {createOffer.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="font-bold text-white">Teklifi Gönder</Text>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}
