import { Text, View, TextInput, FlatList, Pressable } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ServiceCategoryCard } from "@/components/service-category-card";
import { CATEGORIES } from "@/lib/data/categories";

export default function ExploreScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = CATEGORIES.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScreenContainer className="px-4 pt-4">
      <Text className="text-2xl font-bold text-foreground mb-4">Keşfet</Text>
      <View className="mb-4">
        <TextInput
          className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
          placeholder="Hizmet veya usta ara..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={filteredCategories}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        renderItem={({ item }) => <ServiceCategoryCard category={item} />}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}
