import { Text, View, Pressable } from "react-native";
import { ServiceCategory } from "@/lib/data/categories";
import { router } from "expo-router";

interface Props {
  category: ServiceCategory;
}

export function ServiceCategoryCard({ category }: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/category/${category.id}` as any)}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: category.gradientColors[0],
          borderRadius: 20,
          padding: 16,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 130,
          opacity: pressed ? 0.85 : 1,
          shadowColor: category.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 3,
          borderWidth: 0.5,
          borderColor: category.color + "20",
        },
      ]}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
          shadowColor: category.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 26 }}>{category.icon}</Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: "#1A1A1A",
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        {category.name}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: "#8B8B8B",
          textAlign: "center",
        }}
      >
        {category.serviceCount} hizmet
      </Text>
    </Pressable>
  );
}
