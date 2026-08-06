import { Text, View, FlatList, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SAMPLE_CONVERSATIONS } from "@/lib/data/messages";
import { useRouter } from "expo-router";

export default function MessagesScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer className="px-4 pt-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Mesajlar</Text>
      <FlatList
        data={SAMPLE_CONVERSATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 2, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}` as any)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                padding: 14,
                borderRadius: 12,
                backgroundColor: pressed ? colors.surface : "transparent",
              },
            ]}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 18 }}>
                {item.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 15 }}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{item.time}</Text>
              </View>
              <Text
                style={{ color: colors.muted, fontSize: 14, marginTop: 2 }}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>
            {item.unread > 0 && (
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "bold" }}>
                  {item.unread}
                </Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-base">Henüz mesajınız yok</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
