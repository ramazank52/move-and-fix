import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";

import type { RequestRouteCoordinate, RequestRouteMapProps } from "./request-route-map.types";

function getRegion(
  pickupCoordinate: RequestRouteCoordinate | null,
  destinationCoordinate: RequestRouteCoordinate | null,
) {
  const coordinates = [pickupCoordinate, destinationCoordinate].filter(
    (coordinate): coordinate is RequestRouteCoordinate => coordinate !== null,
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
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.8, 0.02),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.8, 0.02),
  };
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
  const region = getRegion(pickupCoordinate, destinationCoordinate);
  if (!region) {
    return (
      <View style={[styles.fallback, { backgroundColor: surfaceColor, borderColor }]}> 
        <Text style={[styles.fallbackTitle, { color: foregroundColor }]}>Rota konumu bekleniyor</Text>
        <Text style={[styles.fallbackText, { color: mutedColor }]}>Başlangıç ve varış adreslerini doğrulayın.</Text>
      </View>
    );
  }

  const route = [pickupCoordinate, destinationCoordinate].filter(
    (coordinate): coordinate is RequestRouteCoordinate => coordinate !== null,
  );

  return (
    <MapView style={StyleSheet.absoluteFill} region={region} showsCompass showsUserLocation={false}>
      {pickupCoordinate ? (
        <Marker coordinate={pickupCoordinate} title="Başlangıç" description={pickupLabel} pinColor={primaryColor} />
      ) : null}
      {destinationCoordinate ? (
        <Marker coordinate={destinationCoordinate} title="Varış" description={destinationLabel} />
      ) : null}
      {route.length === 2 ? <Polyline coordinates={route} strokeColor={primaryColor} strokeWidth={4} /> : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fallbackTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6, textAlign: "center" },
  fallbackText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
