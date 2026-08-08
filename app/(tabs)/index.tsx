import { ScrollView, Text, View, Pressable, TextInput, ActivityIndicator } from "react-native";
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">
            Merhaba {userName}
          </Text>
          <Text className="text-sm text-muted mt-1">
            Bugün sana nasıl yardımcı olabilirim?
          </Text>
        </View>

        {/* Search Bar */}
        <View className="px-5 py-3">
          <View className="flex-row items-center bg-surface border border-border rounded-xl px-3 py-3">
            <IconSymbol size={18} name="magnifyingglass" color={colors.muted} />
            <TextInput
              placeholder="Ne arıyorsun?"
              placeholderTextColor={colors.muted}
              className="flex-1 ml-2 text-foreground text-sm"
            />
          </View>
        </View>

        {/* MoveAI Banner — Mor gradient, belirgin kart */}
        <View className="px-5 py-3">
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
            <View className="flex-row items-center flex-1">
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
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-white">MoveAI ile anlat</Text>
                <Text className="text-xs text-white/80 mt-1">
                  Doğal dille söyle, biz halledelim
                </Text>
              </View>
            </View>
            <IconSymbol size={20} name="chevron.right" color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Quick Access — Profesyonel ikon container'ları */}
        <View className="px-5 py-4">
          <Text className="text-sm font-semibold text-foreground mb-3">Hızlı Erişim</Text>
          <View className="flex-row gap-3">
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
                <Text className="text-xs font-semibold text-foreground text-center">
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Active Job Card */}
        {activeJob && (
          <View className="px-5 py-2">
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
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-xs text-muted">Aktif İş</Text>
                  <Text className="text-base font-semibold text-foreground mt-1">
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
                  <Text className="text-xs font-semibold text-primary">Yolda</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
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
                    <Text className="text-xs font-semibold text-foreground">Profesyonel</Text>
                    <Text className="text-xs text-muted">5 km uzakta</Text>
                  </View>
                </View>
                <Text className="text-xs text-muted">ETA: 10 dk</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Nearby Professionals — Gerçek kart yapısı */}
        <View className="px-5 py-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-semibold text-foreground">Yakındaki Ustalar</Text>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text className="text-xs text-primary font-semibold">Tümü</Text>
            </Pressable>
          </View>

          {providersLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : nearbyProviders && nearbyProviders.length > 0 ? (
            <View className="gap-3">
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
                  <View className="flex-row items-center flex-1">
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
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm font-semibold text-foreground">
                          {provider.displayName}
                        </Text>
                        {provider.isVerified ? (
                          <IconSymbol size={12} name="checkmark.seal.fill" color={colors.accentBlue} />
                        ) : null}
                      </View>
                      <View className="flex-row items-center gap-2 mt-1">
                        <View className="flex-row items-center gap-1">
                          <IconSymbol size={10} name="star.fill" color={colors.warning} />
                          <Text className="text-xs text-muted">{provider.rating || 0}</Text>
                        </View>
                        <Text className="text-xs text-muted">• Yakında</Text>
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
                    <Text className="text-xs font-semibold text-white">Teklif Gör</Text>
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
              <Text className="text-sm font-semibold text-foreground text-center">
                Yakında profesyonel bulunamadı
              </Text>
              <Text className="text-xs text-muted text-center mt-1">
                Konumunuzu değiştirin veya farklı bir hizmet arayın
              </Text>
            </View>
          )}
        </View>

        {/* Popular Services — Kart yapısı */}
        <View className="px-5 py-4">
          <Text className="text-sm font-semibold text-foreground mb-3">Popüler Hizmetler</Text>
          <View className="flex-row flex-wrap gap-3">
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
                <View className="flex-row items-center justify-between mb-2">
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
                  <IconSymbol size={14} name="chevron.right" color={colors.muted} />
                </View>
                <Text className="text-sm font-semibold text-foreground">{service.name}</Text>
                <Text className="text-xs text-muted mt-1">{service.count} hizmet</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
