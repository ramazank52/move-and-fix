import { Text, View, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface MonthlyStats {
  month: string;
  services: number;
  spent: number;
  avgRating: number;
}

const MONTHLY_STATS: MonthlyStats[] = [
  { month: "Ocak", services: 3, spent: 450, avgRating: 4.8 },
  { month: "Şubat", services: 5, spent: 720, avgRating: 4.9 },
  { month: "Mart", services: 4, spent: 580, avgRating: 4.7 },
  { month: "Nisan", services: 6, spent: 890, avgRating: 4.9 },
  { month: "Mayıs", services: 8, spent: 1200, avgRating: 4.8 },
  { month: "Haziran", services: 7, spent: 1050, avgRating: 4.9 },
];

const YEARLY_STATS = {
  totalServices: 33,
  totalSpent: 4890,
  avgRating: 4.83,
  favoriteCategory: "Su Tesisatı",
  mostUsedProvider: "Ahmet Yılmaz",
  topRatedProvider: "Mehmet Demir",
};

const CATEGORY_BREAKDOWN = [
  { category: "Su Tesisatı", count: 8, spent: 1200, icon: "🔧" },
  { category: "Elektrik", count: 6, spent: 900, icon: "⚡" },
  { category: "Boya", count: 5, spent: 750, icon: "🎨" },
  { category: "Klima", count: 4, spent: 600, icon: "❄️" },
  { category: "Tadilat", count: 5, spent: 840, icon: "🏠" },
  { category: "Diğer", count: 5, spent: 600, icon: "📦" },
];

export default function HistoryReportScreen() {
  const colors = useColors();
  const router = useRouter();
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  const maxSpent = Math.max(...MONTHLY_STATS.map((s) => s.spent));

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>
          Hizmet Geçmişi Raporu
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Period Toggle */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          <Pressable
            onPress={() => setPeriod("monthly")}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: period === "monthly" ? colors.primary : colors.surface,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: period === "monthly" ? colors.primary : colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: period === "monthly" ? "#FFF" : colors.foreground, fontWeight: "600", fontSize: 13 }}>
              Aylık
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPeriod("yearly")}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: period === "yearly" ? colors.primary : colors.surface,
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: period === "yearly" ? colors.primary : colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={{ color: period === "yearly" ? "#FFF" : colors.foreground, fontWeight: "600", fontSize: 13 }}>
              Yıllık
            </Text>
          </Pressable>
        </View>

        {period === "yearly" ? (
          <>
            {/* Yearly Stats */}
            <View style={{ gap: 12, marginBottom: 24 }}>
              <View
                style={{
                  backgroundColor: colors.primary + "15",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.primary + "30",
                }}
              >
                <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>Toplam Harcama</Text>
                <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>
                  ₺{YEARLY_STATS.totalSpent.toLocaleString("tr-TR")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.success + "15",
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.success + "30",
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Toplam Hizmet</Text>
                  <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.success }}>
                    {YEARLY_STATS.totalServices}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: colors.warning + "15",
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.warning + "30",
                  }}
                >
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Ort. Puan</Text>
                  <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.warning }}>
                    {YEARLY_STATS.avgRating.toFixed(2)} ⭐
                  </Text>
                </View>
              </View>
            </View>

            {/* Category Breakdown */}
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              Kategori Dağılımı
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
              {CATEGORY_BREAKDOWN.map((cat, index) => (
                <View
                  key={cat.category}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderBottomWidth: index < CATEGORY_BREAKDOWN.length - 1 ? 0.5 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>{cat.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{cat.category}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {cat.count} hizmet • ₺{cat.spent}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 20,
                      width: 40,
                      backgroundColor: colors.primary + "20",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${(cat.spent / YEARLY_STATS.totalSpent) * 100}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Top Providers */}
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              En Çok Kullanılan Ustalar
            </Text>
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>👤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                    {YEARLY_STATS.mostUsedProvider}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>En çok kullanılan</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>8 kez</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>
                    {YEARLY_STATS.topRatedProvider}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>En yüksek puanlı</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.warning }}>4.9 ⭐</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Monthly Chart */}
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              Aylık Harcama Grafiği
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 150, gap: 6 }}>
                {MONTHLY_STATS.map((stat) => (
                  <View key={stat.month} style={{ flex: 1, alignItems: "center" }}>
                    <View
                      style={{
                        width: "100%",
                        height: (stat.spent / maxSpent) * 120,
                        backgroundColor: colors.primary + "40",
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    />
                    <Text style={{ fontSize: 10, color: colors.muted, fontWeight: "500" }}>
                      {stat.month.substring(0, 3)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Monthly Details */}
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
              Aylık Detaylar
            </Text>
            <View style={{ gap: 8 }}>
              {MONTHLY_STATS.map((stat) => (
                <View
                  key={stat.month}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{stat.month}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {stat.services} hizmet • ⭐ {stat.avgRating}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>
                    ₺{stat.spent}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
