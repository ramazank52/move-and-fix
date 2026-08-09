export type RequestRouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RequestRouteMapProps = {
  pickupCoordinate: RequestRouteCoordinate | null;
  destinationCoordinate: RequestRouteCoordinate | null;
  pickupLabel: string;
  destinationLabel: string;
  primaryColor: string;
  surfaceColor: string;
  borderColor: string;
  foregroundColor: string;
  mutedColor: string;
};
