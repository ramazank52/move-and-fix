import { View, Text, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SAMPLE_CONVERSATIONS } from "@/lib/data/messages";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function MessagesScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 pt-6">
      {/* Title */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>
          Mesajlar
        </Text>
        <Pressable
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <IconSymbol name="square.and.pencil" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={SAMPLE_CONVERSATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}` as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 18,
                backgroundColor: pressed ? colors.card : colors.background,
                borderWidth: 0.5,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: colors.primary + "15",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 18 }}>
                {item.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 15 }}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{item.time}</Text>
              </View>
              <Text
                style={{ color: colors.muted, fontSize: 14, marginTop: 3 }}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>
            {item.unread > 0 && (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 8,
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>
                  {item.unread}
                </Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 0.5,
                borderColor: colors.border,
              }}
            >
              <IconSymbol name="message.fill" size={30} color={colors.muted} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground, marginBottom: 6 }}>
              Henüz mesajınız yok
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: "center" }}>
              Bir usta ile iletişime geçtiğinizde mesajlarınız burada görünecek
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
