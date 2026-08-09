import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";

import type { JobTrackingMapProps, TrackingCoordinate } from "./job-tracking-map.types";

function getRegion(
  providerCoordinate: TrackingCoordinate | null,
  customerCoordinate: TrackingCoordinate | null,
) {
  const coordinates = [providerCoordinate, customerCoordinate].filter(
    (coordinate): coordinate is TrackingCoordinate => coordinate !== null,
  );

  if (coordinates.length === 0) return null;

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.8, 0.015),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.8, 0.015),
  };
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
  const region = getRegion(providerCoordinate, customerCoordinate);

  if (!region) {
    return (
      <View style={[styles.fallback, { backgroundColor: surfaceColor, borderColor }]}>
        <Text style={[styles.fallbackTitle, { color: foregroundColor }]}>Canlı konum bekleniyor</Text>
        <Text style={[styles.fallbackText, { color: mutedColor }]}>
          {address || "Profesyonel konum paylaşmaya başladığında harita burada görünecek."}
        </Text>
      </View>
    );
  }

  const route = [providerCoordinate, customerCoordinate].filter(
    (coordinate): coordinate is TrackingCoordinate => coordinate !== null,
  );

  return (
    <MapView style={StyleSheet.absoluteFill} region={region} showsCompass showsUserLocation={false}>
      {providerCoordinate ? (
        <Marker
          coordinate={providerCoordinate}
          title={providerName}
          description="Profesyonelin son paylaştığı konum"
          pinColor={primaryColor}
        />
      ) : null}
      {customerCoordinate ? (
        <Marker coordinate={customerCoordinate} title="Hizmet adresi" description={address ?? undefined} />
      ) : null}
      {route.length === 2 ? (
        <Polyline coordinates={route} strokeColor={primaryColor} strokeWidth={4} />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  fallbackText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
