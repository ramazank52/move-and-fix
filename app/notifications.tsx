import { Text, View, FlatList, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "offer" | "message" | "payment" | "system";
  read: boolean;
}

const NOTIFICATIONS: Notification[] = [
  { id: "1", title: "Yeni Teklif", message: "Ahmet Usta klima bakımı için ₺750 teklif verdi", time: "5 dk önce", type: "offer", read: false },
  { id: "2", title: "Mesaj", message: "Yıldız Nakliyat size mesaj gönderdi", time: "1 saat önce", type: "message", read: false },
  { id: "3", title: "Ödeme Onayı", message: "₺600 tutarındaki ödemeniz onaylandı", time: "3 saat önce", type: "payment", read: true },
  { id: "4", title: "Kampanya", message: "İlk hizmetinize %20 indirim! Kod: HOSGELDIN", time: "Dün", type: "system", read: true },
  { id: "5", title: "İş Tamamlandı", message: "Su tesisatı tamiri başarıyla tamamlandı", time: "2 gün önce", type: "system", read: true },
];

const typeIcons: Record<string, any> = {
  offer: "dollarsign.circle.fill",
  message: "message.fill",
  payment: "creditcard.fill",
  system: "bell.fill",
};

const typeColors: Record<string, string> = {
  offer: "#10B981",
  message: "#3B82F6",
  payment: "#F59E0B",
  system: "#6366F1",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();

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
          Bildirimler
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: !item.read ? colors.primary + "08" : pressed ? colors.surface : "transparent",
              },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: typeColors[item.type] + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name={typeIcons[item.type]} size={18} color={typeColors[item.type]} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: item.read ? "400" : "600", color: colors.foreground }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                {item.message}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.muted }}>{item.time}</Text>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}
