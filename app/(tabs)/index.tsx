import { ScrollView, Text, View, Pressable, Image, ActivityIndicator } from "react-native";
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

  // Fetch active jobs
  const { data: activeJobs, isLoading: jobsLoading } = trpc.requests.list.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch nearby providers
  const { data: nearbyProviders, isLoading: providersLoading } = trpc.providers.nearby.useQuery(
    { lat: "41.0082", lng: "28.9784" },
    { enabled: !!user }
  );

  const activeJob = activeJobs?.find((j) => j.status === "active");
  const userName = user?.name?.split(" ")[0] || "Kullanıcı";

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-4 pt-4 pb-3">
          {/* Greeting */}
          <Text className="text-2xl font-bold text-foreground">Merhaba {userName} 👋</Text>
          <Text className="text-sm text-muted mt-1">Bugün nasıl yardımcı olabilirim?</Text>

          {/* Search Bar */}
          <Pressable
            onPress={() => router.push("/explore" as any)}
            className="mt-4 bg-surface border border-border rounded-lg px-4 py-3 flex-row items-center"
          >
            <IconSymbol size={18} name="magnifyingglass" color={colors.muted} />
            <Text className="text-muted ml-3 flex-1">Ne arıyorsun?</Text>
          </Pressable>

          {/* MoveAI Button */}
          <Pressable
            onPress={() => router.push("/ai-assistant" as any)}
            className="mt-3 bg-gradient-to-r from-primary to-purple-600 rounded-lg px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-lg">🤖</Text>
              <Text className="text-white font-semibold">MoveAI ile anlat</Text>
            </View>
            <IconSymbol size={18} name="chevron.right" color="#FFF" />
          </Pressable>
        </View>

        {/* Quick Access */}
        <View className="px-4 py-4">
          <View className="flex-row justify-between">
            <Pressable
              onPress={() => router.push("/create-service" as any)}
              className="items-center flex-1"
            >
              <View className="w-12 h-12 bg-primary rounded-lg items-center justify-center">
                <IconSymbol size={24} name="plus" color="#FFF" />
              </View>
              <Text className="text-xs text-foreground mt-2 text-center">Yeni Talep</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/explore" as any)} className="items-center flex-1">
              <View className="w-12 h-12 bg-surface border border-border rounded-lg items-center justify-center">
                <IconSymbol size={24} name="magnifyingglass" color={colors.primary} />
              </View>
              <Text className="text-xs text-foreground mt-2 text-center">Keşfet</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/(tabs)/my-jobs" as any)} className="items-center flex-1">
              <View className="w-12 h-12 bg-surface border border-border rounded-lg items-center justify-center">
                <IconSymbol size={24} name="briefcase.fill" color={colors.primary} />
              </View>
              <Text className="text-xs text-foreground mt-2 text-center">İşlerim</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/(tabs)/messages" as any)} className="items-center flex-1">
              <View className="w-12 h-12 bg-surface border border-border rounded-lg items-center justify-center">
                <IconSymbol size={24} name="message.fill" color={colors.primary} />
              </View>
              <Text className="text-xs text-foreground mt-2 text-center">Mesajlar</Text>
            </Pressable>
          </View>
        </View>

        {/* Active Job Card */}
        {activeJob ? (
          <View className="px-4 py-2">
            <Text className="text-sm font-semibold text-foreground mb-3">Aktif İş</Text>
            <Pressable
              onPress={() => router.push(`/job/${activeJob.id}` as any)}
              className="bg-surface border border-border rounded-lg p-4"
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-sm text-muted">Hizmet</Text>
                  <Text className="text-base font-semibold text-foreground">Hizmet Talebi</Text>
                </View>
                <View className="bg-primary/10 px-2 py-1 rounded">
                  <Text className="text-xs font-semibold text-primary">Yolda</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3 mb-3 pb-3 border-b border-border">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                  <Text className="text-sm">👤</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Profesyonel Adı</Text>
                  <Text className="text-xs text-muted">⭐ 4.8 (127)</Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-xs text-muted">Tahmini Varış</Text>
                  <Text className="text-sm font-semibold text-foreground">15 dakika</Text>
                </View>
                <Pressable className="bg-primary/10 px-3 py-2 rounded">
                  <Text className="text-xs font-semibold text-primary">Takip Et</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Nearby Professionals */}
        <View className="px-4 py-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm font-semibold text-foreground">Yakındaki Ustalar</Text>
            <Pressable onPress={() => router.push("/explore" as any)}>
              <Text className="text-xs text-primary font-semibold">Tümünü Gör</Text>
            </Pressable>
          </View>

          {providersLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : nearbyProviders && nearbyProviders.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
              {nearbyProviders.slice(0, 3).map((provider) => (
                <Pressable
                  key={provider.id}
                  onPress={() => router.push(`/provider/${provider.id}` as any)}
                  className="w-40 bg-surface border border-border rounded-lg p-3"
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                      <Text className="text-sm">👤</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-foreground">{provider.displayName}</Text>
                      <Text className="text-xs text-muted">⭐ {provider.rating || 0}</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted mb-2">Yakında</Text>
                  <Pressable className="bg-primary rounded px-3 py-2 items-center">
                    <Text className="text-xs font-semibold text-white">Teklif Gör</Text>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text className="text-sm text-muted text-center py-4">Yakında profesyonel bulunamadı</Text>
          )}
        </View>

        {/* Popular Services */}
        <View className="px-4 py-4 pb-8">
          <Text className="text-sm font-semibold text-foreground mb-3">Popüler Hizmetler</Text>
          <View className="gap-2">
            {["Temizlik", "Su Tesisatı", "Elektrik", "Klima"].map((service) => (
              <Pressable
                key={service}
                onPress={() => router.push("/explore" as any)}
                className="bg-surface border border-border rounded-lg px-4 py-3 flex-row items-center justify-between"
              >
                <Text className="text-sm font-semibold text-foreground">{service}</Text>
                <IconSymbol size={16} name="chevron.right" color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
