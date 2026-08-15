import {
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTranslation } from "@/lib/i18n";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Fetch data
  const { data: activeJobs } = trpc.requests.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: nearbyProviders, isLoading: providersLoading } = trpc.providers.nearby.useQuery(
    { lat: "41.0082", lng: "28.9784" },
    { enabled: !!user }
  );

  const activeJob = activeJobs?.find((j) => j.status === "active");
  const userName = user?.name?.split(" ")[0] || t("home.defaultName");

  // Quick access categories — referans görsele göre
  const quickAccess = [
    { name: t("home.quickAccess_emergency"), icon: "exclamationmark.triangle.fill" as const, color: colors.error },
    { name: t("home.quickAccess_vehicle"), icon: "car.fill" as const, color: colors.primary },
    { name: t("home.quickAccess_home"), icon: "house.fill" as const, color: colors.accentBlue },
    { name: t("home.quickAccess_moving"), icon: "shippingbox.fill" as const, color: colors.accentPurple },
  ];

  // Popular services — referans görsele göre
  const popularServices = [
    { name: t("home.service.cleaning"), count: 234, icon: "sparkles" as const },
    { name: t("home.service.plumbing"), count: 156, icon: "wrench.fill" as const },
    { name: t("home.service.electricity"), count: 189, icon: "bolt.fill" as const },
    { name: t("home.service.airConditioning"), count: 142, icon: "sun.max.fill" as const },
  ];

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Karşılama Başlığı */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>
            {t("home.greeting", { name: userName })}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 20 }}>
            {t("home.subtitle")}
          </Text>
        </View>

        {/* 2. Arama Alanı */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderWidth: 0.5,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 11,
            }}
          >
            <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
            <TextInput
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                marginLeft: 10,
                color: colors.foreground,
                fontSize: 14,
              }}
            />
            <IconSymbol size={14} name="location.fill" color={colors.muted} />
          </View>
        </View>

        {/* 3. MoveAI Mor Gradient Banner */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.moveAITitle")}
            accessibilityHint={t("home.moveAISubtitle")}
            onPress={() => router.push("/ai-assistant" as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 16,
                padding: 16,
                backgroundColor: colors.accentPurple,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSymbol name="sparkles" size={24} color="#FFFFFF" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
                  {t("home.moveAITitle")}
                </Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>
                  {t("home.moveAISubtitle")}
                </Text>
              </View>
            </View>
            <IconSymbol size={20} name="chevron.right" color="#FFFFFF" />
          </Pressable>
        </View>

        {/* 4. Hızlı Erişim — 4 renkli kart */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>
            {t("home.quickAccess")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {quickAccess.map((cat, idx) => (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                onPress={() => router.push("/explore" as any)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    borderRadius: 14,
                    padding: 12,
                    alignItems: "center",
                    backgroundColor: colors.surface,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: cat.color + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                  }}
                >
                  <IconSymbol size={20} name={cat.icon} color={cat.color} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.foreground, textAlign: "center" }}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 5. Aktif İş Kartı */}
        {activeJob && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.activeJob")}
              onPress={() => router.push(`/job/${activeJob.id}` as any)}
              style={({ pressed }) => [
                {
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 0.5,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>{t("home.activeJob")}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, marginTop: 4 }}>
                    Hizmet Talebi #{activeJob.id}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: colors.primary + "15",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>Yolda</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol size={16} name="person.fill" color={colors.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.foreground }}>Profesyonel</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>5 km uzakta</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: colors.muted }}>ETA: 10 dk</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* 6. Yakındaki Ustalar */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
              {t("home.nearbyProviders")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t("home.nearbyProviders")} ${t("common.seeAll")}`}
              onPress={() => router.push("/explore" as any)}
            >
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>{t("common.seeAll")}</Text>
            </Pressable>
          </View>

          {providersLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : nearbyProviders && nearbyProviders.length > 0 ? (
            <View style={{ gap: 10 }}>
              {nearbyProviders.slice(0, 3).map((provider) => (
                <Pressable
                  key={provider.id}
                  accessibilityRole="button"
                  accessibilityLabel={provider.displayName}
                  onPress={() => router.push(`/provider/${provider.id}` as any)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 14,
                      padding: 12,
                      backgroundColor: colors.surface,
                      borderWidth: 0.5,
                      borderColor: colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.primary + "15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconSymbol size={20} name="person.fill" color={colors.primary} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
                          {provider.displayName}
                        </Text>
                        {provider.isVerified ? (
                          <IconSymbol size={12} name="checkmark.seal.fill" color={colors.accentBlue} />
                        ) : null}
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <IconSymbol size={10} name="star.fill" color={colors.warning} />
                          <Text style={{ fontSize: 11, color: colors.muted }}>{provider.rating || 0}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.muted }}>• Yakında</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>₺6.500</Text>
                    <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Başlangıç</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ fontSize: 14, color: colors.muted }}>{t("home.noNearbyProviders")}</Text>
            </View>
          )}
        </View>

        {/* 7. Popüler Hizmetler */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
              {t("home.popularServices")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t("home.popularServices")} ${t("common.seeAll")}`}
              onPress={() => router.push("/explore" as any)}
            >
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>{t("common.seeAll")}</Text>
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            {popularServices.map((service, idx) => (
              <Pressable
                key={idx}
                accessibilityRole="button"
                accessibilityLabel={service.name}
                onPress={() => router.push("/explore" as any)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: colors.surface,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colors.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <IconSymbol size={18} name={service.icon} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
                      {service.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {t("home.serviceCount", { count: service.count })}
                    </Text>
                  </View>
                </View>
                <IconSymbol size={18} name="chevron.right" color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
