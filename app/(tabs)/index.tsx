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

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-3xl font-bold text-foreground">
            Merhaba {userName} 👋
          </Text>
          <Text className="text-sm text-muted mt-1">
            Bugün sana nasıl yardımcı olabilirim?
          </Text>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-3">
          <View className="flex-row items-center bg-surface border border-border rounded-lg px-3 py-3">
            <IconSymbol size={18} name="magnifyingglass" color={colors.muted} />
            <TextInput
              placeholder="Ne arıyorsun?"
              placeholderTextColor={colors.muted}
              className="flex-1 ml-2 text-foreground text-sm"
            />
          </View>
        </View>

        {/* MoveAI CTA Banner */}
        <View className="px-4 py-2">
          <Pressable
            onPress={() => router.push("/ai-assistant" as any)}
            className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-2xl">🤖</Text>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">MoveAI ile anlat</Text>
                <Text className="text-xs text-white/80 mt-1">Doğal dille söyle, biz halledelim</Text>
              </View>
            </View>
            <IconSymbol size={20} name="chevron.right" color="white" />
          </Pressable>
        </View>

        {/* Quick Access Categories */}
        <View className="px-4 py-4">
          <Text className="text-sm font-semibold text-foreground mb-3">Hızlı Erişim</Text>
          <View className="flex-row gap-3">
            {[
              { name: "Acil Yardım", icon: "🚨", color: "#FF6A00" },
              { name: "Temizlik", icon: "🧹", color: "#8A5CFF" },
              { name: "Su Tesisatı", icon: "🔧", color: "#FF6A00" },
              { name: "Elektrik", icon: "⚡", color: "#8A5CFF" },
            ].map((cat, idx) => (
              <Pressable
                key={idx}
                onPress={() => router.push("/explore" as any)}
                className="flex-1 bg-surface border border-border rounded-lg p-3 items-center justify-center"
              >
                <Text className="text-2xl mb-1">{cat.icon}</Text>
                <Text className="text-xs font-semibold text-foreground text-center">{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Active Job Card */}
        {activeJob && (
          <View className="px-4 py-2">
            <Pressable
              onPress={() => router.push(`/job/${activeJob.id}` as any)}
              className="bg-surface border border-border rounded-lg p-4"
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-sm text-muted">Aktif İş</Text>
                  <Text className="text-base font-semibold text-foreground mt-1">Hizmet Talebi</Text>
                </View>
                <View className="bg-primary/10 px-2 py-1 rounded">
                  <Text className="text-xs font-semibold text-primary">Yolda</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center">
                    <Text className="text-sm">👤</Text>
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

        {/* Nearby Professionals */}
        <View className="px-4 py-4">
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
                  className="bg-surface border border-border rounded-lg p-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                      <Text className="text-sm">👤</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">{provider.displayName}</Text>
                      <View className="flex-row items-center gap-1 mt-1">
                        <Text className="text-xs text-muted">⭐ {provider.rating || 0}</Text>
                        <Text className="text-xs text-muted">• Yakında</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable className="bg-primary rounded px-3 py-2">
                    <Text className="text-xs font-semibold text-white">Teklif Gör</Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="bg-surface border border-border rounded-lg p-4 items-center justify-center py-6">
              <Text className="text-sm text-muted">Yakında profesyonel bulunamadı</Text>
            </View>
          )}
        </View>

        {/* Popular Services */}
        <View className="px-4 py-4 pb-8">
          <Text className="text-sm font-semibold text-foreground mb-3">Popüler Hizmetler</Text>
          <View className="gap-2">
            {[
              { name: "Temizlik", count: 234 },
              { name: "Su Tesisatı", count: 156 },
              { name: "Elektrik", count: 189 },
              { name: "Klima", count: 142 },
            ].map((service, idx) => (
              <Pressable
                key={idx}
                onPress={() => router.push("/explore" as any)}
                className="bg-surface border border-border rounded-lg px-4 py-3 flex-row items-center justify-between"
              >
                <View>
                  <Text className="text-sm font-semibold text-foreground">{service.name}</Text>
                  <Text className="text-xs text-muted mt-1">{service.count} hizmet</Text>
                </View>
                <IconSymbol size={16} name="chevron.right" color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
