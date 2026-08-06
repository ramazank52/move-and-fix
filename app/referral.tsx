import { Text, View, Pressable, ScrollView, Share, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const REFERRAL_CODE = "MOVEFIX2026";

const REWARDS = [
  { friends: 1, reward: "₺50 İndirim Kuponu", icon: "🎁", unlocked: true },
  { friends: 3, reward: "₺150 İndirim Kuponu", icon: "🎉", unlocked: true },
  { friends: 5, reward: "1 Ay Premium Üyelik", icon: "⭐", unlocked: false },
  { friends: 10, reward: "₺500 İndirim + Premium", icon: "🏆", unlocked: false },
];

const INVITED_FRIENDS = [
  { name: "Ayşe K.", date: "2026-08-01", status: "completed", earned: "₺50" },
  { name: "Mehmet A.", date: "2026-07-28", status: "completed", earned: "₺50" },
  { name: "Fatma S.", date: "2026-07-25", status: "pending", earned: "-" },
];

export default function ReferralScreen() {
  const colors = useColors();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Move&Fix'e katıl ve ilk hizmetinde ₺50 indirim kazan! Referans kodum: ${REFERRAL_CODE}\n\nİndir: https://movefix.app/ref/${REFERRAL_CODE}`,
        title: "Move&Fix - Arkadaşını Davet Et",
      });
    } catch (error) {
      // User cancelled
    }
  };

  const handleCopy = () => {
    setCopied(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Kopyalandı!", "Referans kodunuz panoya kopyalandı.");
    setTimeout(() => setCopied(false), 3000);
  };

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
          Arkadaşını Davet Et
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Hero Section */}
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.primary + "08",
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.primary + "20",
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🎁</Text>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.foreground, textAlign: "center", marginBottom: 8 }}>
            Arkadaşını Davet Et,{"\n"}₺50 Kazan!
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 }}>
            Her arkadaşın ilk hizmetini aldığında sen ₺50, arkadaşın da ₺50 indirim kazanır!
          </Text>
        </View>

        {/* Referral Code */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>Referans Kodun</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1.5,
                borderColor: colors.primary + "40",
                borderStyle: "dashed",
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary, textAlign: "center", letterSpacing: 2 }}>
                {REFERRAL_CODE}
              </Text>
            </View>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                {
                  marginLeft: 10,
                  backgroundColor: copied ? colors.success : colors.primary,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>
                {copied ? "✓" : "Kopyala"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Share Button */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 24,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>📤 Paylaş ve Kazan</Text>
        </Pressable>

        {/* Rewards Ladder */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Ödül Basamakları
        </Text>
        <View style={{ gap: 10, marginBottom: 24 }}>
          {REWARDS.map((reward, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: reward.unlocked ? colors.success + "08" : colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: reward.unlocked ? colors.success + "30" : colors.border,
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{reward.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                  {reward.friends} Arkadaş Davet Et
                </Text>
                <Text style={{ fontSize: 13, color: reward.unlocked ? colors.success : colors.muted }}>
                  {reward.reward}
                </Text>
              </View>
              {reward.unlocked && (
                <View style={{ backgroundColor: colors.success + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: colors.success, fontWeight: "600" }}>✓ Kazanıldı</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Invited Friends */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
          Davet Ettiklerin ({INVITED_FRIENDS.length})
        </Text>
        <View style={{ gap: 8 }}>
          {INVITED_FRIENDS.map((friend, index) => (
            <View
              key={index}
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
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.primary + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>
                  {friend.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: colors.foreground }}>{friend.name}</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{friend.date}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: friend.status === "completed" ? colors.success : colors.warning,
                  }}
                >
                  {friend.status === "completed" ? friend.earned : "Bekliyor"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Coupon Section */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground, marginBottom: 12 }}>
            Kuponlarım
          </Text>
          <View
            style={{
              backgroundColor: colors.primary + "08",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.primary + "20",
              borderStyle: "dashed",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>₺100</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Toplam kazanılan indirim</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>Kullan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
