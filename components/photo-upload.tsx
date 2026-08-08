import { Text, View, Pressable, Image, Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
}

export function PhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  label = "Fotoğraf Ekle",
}: PhotoUploadProps) {
  const colors = useColors();

  const requestPermission = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "İzin Gerekli",
          "Fotoğraf çekmek için kamera izni gereklidir."
        );
        return false;
      }
    }
    return true;
  };

  const pickFromLibrary = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limit", `En fazla ${maxPhotos} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      onPhotosChange([...photos, ...newPhotos].slice(0, maxPhotos));
    }
  };

  const takePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limit", `En fazla ${maxPhotos} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const showOptions = () => {
    if (Platform.OS === "web") {
      pickFromLibrary();
      return;
    }
    Alert.alert("Fotoğraf Ekle", "Fotoğraf kaynağını seçin", [
      { text: "Kamera", onPress: takePhoto },
      { text: "Galeri", onPress: pickFromLibrary },
      { text: "İptal", style: "cancel" },
    ]);
  };

  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 10 }}>
        {label} ({photos.length}/{maxPhotos})
      </Text>

      {/* Photo Grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {photos.map((uri, index) => (
          <View key={index} style={{ position: "relative" }}>
            <Image
              source={{ uri }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 10,
                backgroundColor: colors.surface,
              }}
            />
            <Pressable
              onPress={() => removePhoto(index)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.error,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}>×</Text>
            </Pressable>
          </View>
        ))}

        {/* Add Photo Button */}
        {photos.length < maxPhotos && (
          <Pressable
            onPress={showOptions}
            style={({ pressed }) => [
              {
                width: 80,
                height: 80,
                borderRadius: 10,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: colors.primary + "60",
                backgroundColor: colors.primary + "08",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <IconSymbol name="camera.fill" size={22} color={colors.primary} />
            <Text style={{ fontSize: 10, color: colors.primary, marginTop: 4, fontWeight: "500" }}>
              Ekle
            </Text>
          </Pressable>
        )}
      </View>

      {photos.length === 0 && (
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>
          Arıza veya sorun fotoğrafı ekleyerek ustanın daha iyi değerlendirme yapmasını sağlayın.
        </Text>
      )}
    </View>
  );
}
