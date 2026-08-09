import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import type { RequestRouteMapProps } from "./request-route-map.types";

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function RequestRouteMap({
  pickupCoordinate,
  destinationCoordinate,
  pickupLabel,
  destinationLabel,
  primaryColor,
  surfaceColor,
  borderColor,
  foregroundColor,
  mutedColor,
}: RequestRouteMapProps) {
  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}> 
      <MaterialIcons name="route" size={30} color={primaryColor} />
      <Text style={[styles.title, { color: foregroundColor }]}>Rota önizlemesi</Text>
      <View style={styles.row}>
        <View style={[styles.card, { borderColor }]}> 
          <Text style={[styles.label, { color: mutedColor }]}>Başlangıç</Text>
          <Text style={[styles.value, { color: foregroundColor }]} numberOfLines={2}>{pickupLabel || "Adres bekleniyor"}</Text>
          <Text style={[styles.coordinate, { color: mutedColor }]}> 
            {pickupCoordinate
              ? `${formatCoordinate(pickupCoordinate.latitude)}, ${formatCoordinate(pickupCoordinate.longitude)}`
              : "Koordinat bekleniyor"}
          </Text>
        </View>
        <View style={[styles.card, { borderColor }]}> 
          <Text style={[styles.label, { color: mutedColor }]}>Varış</Text>
          <Text style={[styles.value, { color: foregroundColor }]} numberOfLines={2}>{destinationLabel || "Adres bekleniyor"}</Text>
          <Text style={[styles.coordinate, { color: mutedColor }]}> 
            {destinationCoordinate
              ? `${formatCoordinate(destinationCoordinate.latitude)}, ${formatCoordinate(destinationCoordinate.longitude)}`
              : "Koordinat bekleniyor"}
          </Text>
        </View>
      </View>
      <Text style={[styles.note, { color: mutedColor }]}>Etkileşimli harita iOS ve Android uygulamasında gösterilir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 82, paddingHorizontal: 10, paddingVertical: 9 },
  container: { ...StyleSheet.absoluteFillObject, alignItems: "center", borderWidth: 1, justifyContent: "center", padding: 14 },
  coordinate: { fontSize: 9, lineHeight: 14, marginTop: 5 },
  label: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  note: { fontSize: 9, marginTop: 8, textAlign: "center" },
  row: { flexDirection: "row", gap: 8, marginTop: 10, width: "100%" },
  title: { fontSize: 15, fontWeight: "700", marginTop: 5 },
  value: { fontSize: 11, fontWeight: "600", lineHeight: 15 },
});
