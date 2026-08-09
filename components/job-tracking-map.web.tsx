import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import type { JobTrackingMapProps } from "./job-tracking-map.types";

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function JobTrackingMap({
  providerCoordinate,
  customerCoordinate,
  providerName,
  address,
  primaryColor,
  surfaceColor,
  borderColor,
  foregroundColor,
  mutedColor,
}: JobTrackingMapProps) {
  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}18` }]}>
        <MaterialIcons name="map" size={30} color={primaryColor} />
      </View>
      <Text style={[styles.title, { color: foregroundColor }]}>Canlı konum</Text>
      <Text style={[styles.address, { color: mutedColor }]} numberOfLines={2}>
        {address || "Hizmet adresi bilgisi bekleniyor"}
      </Text>

      <View style={styles.coordinateRow}>
        <View style={[styles.coordinateCard, { borderColor }]}>
          <Text style={[styles.coordinateLabel, { color: mutedColor }]}>{providerName}</Text>
          <Text style={[styles.coordinateValue, { color: foregroundColor }]}>
            {providerCoordinate
              ? `${formatCoordinate(providerCoordinate.latitude)}, ${formatCoordinate(providerCoordinate.longitude)}`
              : "Konum paylaşımı bekleniyor"}
          </Text>
        </View>
        <View style={[styles.coordinateCard, { borderColor }]}>
          <Text style={[styles.coordinateLabel, { color: mutedColor }]}>Hizmet adresi</Text>
          <Text style={[styles.coordinateValue, { color: foregroundColor }]}>
            {customerCoordinate
              ? `${formatCoordinate(customerCoordinate.latitude)}, ${formatCoordinate(customerCoordinate.longitude)}`
              : "Koordinat bulunmuyor"}
          </Text>
        </View>
      </View>

      <Text style={[styles.webNote, { color: mutedColor }]}>
        Etkileşimli harita iOS ve Android uygulamasında gösterilir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  address: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 290,
    textAlign: "center",
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  coordinateCard: {
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  coordinateLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  coordinateRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    width: "100%",
  },
  coordinateValue: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  webNote: {
    fontSize: 10,
    marginTop: 10,
    textAlign: "center",
  },
});
