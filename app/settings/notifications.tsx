import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type PreferenceKey = "push" | "message" | "offer" | "payment" | "campaign";

const rows: { key: PreferenceKey; label: string; hint: string }[] = [
  { key: "push", label: "Push Bildirimleri", hint: "Cihazınıza anlık bildirim gönderilir." },
  { key: "message", label: "Mesaj Bildirimleri", hint: "Yeni mesajlardan haberdar olun." },
  { key: "offer", label: "Teklif ve İş Fırsatları", hint: "Yeni teklif ve iş eşleşmelerini alın." },
  { key: "payment", label: "Ödeme Bildirimleri", hint: "Ödeme ve iade durumları için bildirim alın." },
  { key: "campaign", label: "Kampanya Bildirimleri", hint: "İsteğe bağlı fırsat duyurularını alın." },
];

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.notifications.preferences.useQuery();
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => utils.notifications.preferences.invalidate(),
    onError: (error) => Alert.alert("Bildirim ayarı güncellenemedi", error.message || "Lütfen tekrar deneyin."),
  });
  const [values, setValues] = useState<Record<PreferenceKey, boolean>>({
    push: true, message: true, offer: true, payment: true, campaign: false,
  });

  useEffect(() => {
    const preference = preferencesQuery.data;
    if (!preference) return;
    setValues({
      push: preference.channels.push?.enabled ?? true,
      message: preference.notificationTypes.message_received?.enabled ?? true,
      offer: preference.notificationTypes.order_created?.enabled ?? true,
      payment: preference.notificationTypes.payment_received?.enabled ?? true,
      campaign: preference.notificationTypes.promotion?.enabled ?? false,
    });
  }, [preferencesQuery.data]);

  const update = (key: PreferenceKey, enabled: boolean) => {
    setValues((current) => ({ ...current, [key]: enabled }));
    if (key === "push") {
      updatePreferences.mutate({ channels: { push: { enabled } } });
      return;
    }
    const typeByKey = {
      message: "message_received",
      offer: "order_created",
      payment: "payment_received",
      campaign: "promotion",
    } as const;
    updatePreferences.mutate({ notificationTypes: { [typeByKey[key]]: { enabled } } });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Geri dön" accessibilityHint="Önceki ekrana döner" onPress={() => router.back()} style={{ padding: 6 }}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: colors.foreground }}>Bildirim Ayarları</Text>
        <View style={{ width: 32 }} />
      </View>

      {preferencesQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.muted }}>Bildirim ayarları yükleniyor…</Text>
        </View>
      ) : preferencesQuery.isError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
          <Text style={{ color: colors.error, textAlign: "center" }}>Bildirim ayarları yüklenemedi.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarlarını yeniden dene" onPress={() => preferencesQuery.refetch()} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 10 }}>Tercihler hesabınıza kaydedilir. Eksik cihaz veya sağlayıcı yapılandırması bildirim teslimatını başarı gibi göstermez.</Text>
          {rows.map((item) => (
            <View key={item.key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: colors.foreground, fontWeight: "600" }}>{item.label}</Text>
                <Text style={{ marginTop: 3, fontSize: 12, color: colors.muted, lineHeight: 17 }}>{item.hint}</Text>
              </View>
              <Switch
                value={values[item.key]}
                disabled={updatePreferences.isPending}
                accessibilityLabel={item.label}
                accessibilityHint={item.hint}
                accessibilityRole="switch"
                accessibilityState={{ checked: values[item.key], disabled: updatePreferences.isPending }}
                onValueChange={(enabled) => update(item.key, enabled)}
                trackColor={{ true: colors.primary }}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
