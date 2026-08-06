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
          backgroundColor: category.color + "15",
          borderRadius: 16,
          padding: 16,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 110,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: 32, marginBottom: 8 }}>{category.icon}</Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: category.color,
          textAlign: "center",
        }}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}
