import { Text, View, ScrollView, Switch, Pressable } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [messageNotif, setMessageNotif] = useState(true);
  const [offerNotif, setOfferNotif] = useState(true);
  const [paymentNotif, setPaymentNotif] = useState(true);
  const [campaignNotif, setCampaignNotif] = useState(false);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
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
          Bildirim Ayarları
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {[
          { label: "Push Bildirimleri", value: pushEnabled, setter: setPushEnabled },
          { label: "Mesaj Bildirimleri", value: messageNotif, setter: setMessageNotif },
          { label: "Teklif Bildirimleri", value: offerNotif, setter: setOfferNotif },
          { label: "Ödeme Bildirimleri", value: paymentNotif, setter: setPaymentNotif },
          { label: "Kampanya Bildirimleri", value: campaignNotif, setter: setCampaignNotif },
        ].map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 15, color: colors.foreground }}>{item.label}</Text>
            <Switch value={item.value} onValueChange={item.setter} trackColor={{ true: colors.primary }} />
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
