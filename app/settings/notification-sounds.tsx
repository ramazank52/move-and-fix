import { Text, View, Pressable, ScrollView, Switch, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DEFAULT_SOUND_SETTINGS, type NotificationType } from "@/lib/notification-sounds";
import * as Haptics from "expo-haptics";

const NOTIFICATION_TYPES: { type: NotificationType; label: string; icon: string }[] = [
  { type: "new_offer", label: "Yeni Teklif", icon: "📋" },
  { type: "new_message", label: "Yeni Mesaj", icon: "💬" },
  { type: "provider_approaching", label: "Usta Yaklaşıyor", icon: "🚗" },
  { type: "provider_arrived", label: "Usta Geldi", icon: "📍" },
  { type: "job_completed", label: "İş Tamamlandı", icon: "✅" },
  { type: "payment_received", label: "Ödeme Alındı", icon: "💰" },
  { type: "review_received", label: "Yeni Değerlendirme", icon: "⭐" },
  { type: "promotion", label: "Kampanya", icon: "🎁" },
];

export default function NotificationSoundsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SOUND_SETTINGS);

  const toggleGlobalSound = () => {
    setSettings({ ...settings, enabled: !settings.enabled });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleGlobalVibration = () => {
    setSettings({ ...settings, vibrationEnabled: !settings.vibrationEnabled });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const toggleQuietHours = () => {
    setSettings({ ...settings, quietHoursEnabled: !settings.quietHoursEnabled });
  };

  const toggleTypeSound = (type: NotificationType) => {
    const current = settings.perTypeSettings[type];
    setSettings({
      ...settings,
      perTypeSettings: {
        ...settings.perTypeSettings,
        [type]: { ...current, sound: !current.sound },
      },
    });
  };

  const toggleTypeVibration = (type: NotificationType) => {
    const current = settings.perTypeSettings[type];
    setSettings({
      ...settings,
      perTypeSettings: {
        ...settings.perTypeSettings,
        [type]: { ...current, vibration: !current.vibration },
      },
    });
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
          Bildirim Sesleri
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Global Settings */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Genel Ayarlar
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>🔔</Text>
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Bildirim Sesleri</Text>
            <Switch
              value={settings.enabled}
              onValueChange={toggleGlobalSound}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>📳</Text>
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Titreşim</Text>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={toggleGlobalVibration}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 14 }}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>🌙</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: colors.foreground }}>Sessiz Saatler</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>23:00 - 07:00 arası sessiz</Text>
            </View>
            <Switch
              value={settings.quietHoursEnabled}
              onValueChange={toggleQuietHours}
              trackColor={{ true: colors.primary }}
            />
          </View>
        </View>

        {/* Volume Slider */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Ses Seviyesi
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: colors.muted }}>🔈</Text>
            <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, marginHorizontal: 12 }}>
              <View
                style={{
                  width: `${settings.soundVolume * 100}%`,
                  height: 6,
                  backgroundColor: colors.primary,
                  borderRadius: 3,
                }}
              />
            </View>
            <Text style={{ fontSize: 14, color: colors.muted }}>🔊</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 8 }}>
            %{Math.round(settings.soundVolume * 100)}
          </Text>
        </View>

        {/* Per-Type Settings */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10, textTransform: "uppercase" }}>
          Bildirim Türleri
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}>
          {NOTIFICATION_TYPES.map((item, index) => {
            const typeSettings = settings.perTypeSettings[item.type];
            return (
              <View
                key={item.type}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderBottomWidth: index < NOTIFICATION_TYPES.length - 1 ? 0.5 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 12 }}>{item.icon}</Text>
                <Text style={{ flex: 1, fontSize: 14, color: colors.foreground }}>{item.label}</Text>
                <Pressable
                  onPress={() => toggleTypeSound(item.type)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: typeSettings.sound ? colors.primary + "15" : colors.border + "30",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{typeSettings.sound ? "🔔" : "🔕"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleTypeVibration(item.type)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: typeSettings.vibration ? colors.primary + "15" : colors.border + "30",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{typeSettings.vibration ? "📳" : "📴"}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Test Button */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          style={({ pressed }) => [
            {
              marginTop: 20,
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600" }}>🔔 Test Bildirimi Gönder</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
