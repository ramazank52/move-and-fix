import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();

  // Fetch data
  const { data: activeJobs, isLoading: jobsLoading } = trpc.requests.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: nearbyProviders, isLoading: providersLoading } = trpc.providers.nearby.useQuery(
    { lat: "41.0082", lng: "28.9784" },
    { enabled: !!user }
  );

  const activeJob = activeJobs?.find((j) => j.status === "active");
  const userName = user?.name?.split(" ")[0] || "Kullanıcı";

  // Quick access categories — profesyonel ikonlar, emoji DEĞİL
  const quickAccess = [
    { name: "Acil Yardım", icon: "exclamationmark.triangle.fill" as const, color: colors.error },
    { name: "Araç", icon: "car.fill" as const, color: colors.primary },
    { name: "Ev", icon: "house.fill" as const, color: colors.accentBlue },
    { name: "Taşıma", icon: "shippingbox.fill" as const, color: colors.accentPurple },
  ];

  // Popular services — profesyonel ikonlar
  const popularServices = [
    { name: "Temizlik", count: 234, icon: "sparkles" as const },
    { name: "Su Tesisatı", count: 156, icon: "wrench.fill" as const },
    { name: "Elektrik", count: 189, icon: "bolt.fill" as const },
    { name: "Klima", count: 142, icon: "sun.max.fill" as const },
  ];

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground }}>
            Merhaba {userName}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
            Bugün sana nasıl yardımcı olabilirim?
          </Text>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderWidth: 0.5,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <IconSymbol size={16} name="magnifyingglass" color={colors.muted} />
            <TextInput
              placeholder="Ne arıyorsun?"
              placeholderTextColor={colors.muted}
              style={{
                flex: 1,
                marginLeft: 8,
                color: colors.foreground,
                fontSize: 14,
              }}
            />
          </View>
        </View>

        {/* MoveAI Banner — Mor gradient, belirgin kart */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable
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
                shadowColor: colors.accentPurple,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              {/* MoveAI ikon container */}
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
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>MoveAI ile anlat</Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                  Doğal dille söyle, biz halledelim
                </Text>
              </View>
            </View>
            <IconSymbol size={20} name="chevron.right" color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Quick Access — Profesyonel ikon container'ları */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>
            Hızlı Erişim
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {quickAccess.map((cat, idx) => (
              <Pressable
                key={idx}
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

        {/* Active Job Card */}
        {activeJob && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Pressable
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
                  <Text style={{ fontSize: 11, color: colors.muted }}>Aktif İş</Text>
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

        {/* Nearby Professionals — Gerçek kart yapısı */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>Yakındaki Ustalar</Text>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>Tümü</Text>
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
                    {/* Avatar */}
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
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>Teklif Gör</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            /* Professional empty state — gerçek kart yapısında */
            <View
              style={{
                borderRadius: 14,
                padding: 24,
                backgroundColor: colors.surface,
                borderWidth: 0.5,
                borderColor: colors.border,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.muted + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <IconSymbol size={24} name="magnifyingglass" color={colors.muted} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
                Yakında profesyonel bulunamadı
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 4 }}>
                Konumunuzu değiştirin veya farklı bir hizmet arayın
              </Text>
            </View>
          )}
        </View>

        {/* Popular Services — Kart yapısı */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, marginBottom: 10 }}>
            Popüler Hizmetler
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {popularServices.map((service, idx) => (
              <Pressable
                key={idx}
                onPress={() => router.push("/explore" as any)}
                style={({ pressed }) => [
                  {
                    width: "47%",
                    borderRadius: 14,
                    padding: 14,
                    backgroundColor: colors.surface,
                    borderWidth: 0.5,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colors.primary + "15",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol size={18} name={service.icon} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted }}>{service.count}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>
                  {service.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
