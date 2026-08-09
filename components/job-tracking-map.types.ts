export type TrackingCoordinate = {
  latitude: number;
  longitude: number;
};

export type JobTrackingMapProps = {
  providerCoordinate: TrackingCoordinate | null;
  customerCoordinate: TrackingCoordinate | null;
  providerName: string;
  address: string | null;
  primaryColor: string;
  surfaceColor: string;
  borderColor: string;
  foregroundColor: string;
  mutedColor: string;
};
