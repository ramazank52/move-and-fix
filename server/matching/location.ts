export const DEFAULT_PROVIDER_SERVICE_RADIUS_KM = 50;

type CoordinateValue = string | number | null | undefined;

export interface LocationCandidate {
  latitude: CoordinateValue;
  longitude: CoordinateValue;
  createdAt?: Date | string | null;
}

export type LocationRanked<T> = T & { matchDistanceKm: number | null };

function normalizeCoordinate(value: CoordinateValue, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export function calculateHaversineDistanceKm(
  fromLatitude: CoordinateValue,
  fromLongitude: CoordinateValue,
  toLatitude: CoordinateValue,
  toLongitude: CoordinateValue,
): number | null {
  const lat1 = normalizeCoordinate(fromLatitude, -90, 90);
  const lon1 = normalizeCoordinate(fromLongitude, -180, 180);
  const lat2 = normalizeCoordinate(toLatitude, -90, 90);
  const lon2 = normalizeCoordinate(toLongitude, -180, 180);
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distance = 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(distance * 10) / 10;
}

export function rankServiceOpportunitiesByLocation<T extends LocationCandidate>(
  requests: T[],
  providerLatitude: CoordinateValue,
  providerLongitude: CoordinateValue,
  radiusKm = DEFAULT_PROVIDER_SERVICE_RADIUS_KM,
): Array<LocationRanked<T>> {
  const providerHasCoordinates =
    normalizeCoordinate(providerLatitude, -90, 90) !== null &&
    normalizeCoordinate(providerLongitude, -180, 180) !== null;

  return requests
    .map((request): LocationRanked<T> => ({
      ...request,
      matchDistanceKm: calculateHaversineDistanceKm(
        providerLatitude,
        providerLongitude,
        request.latitude,
        request.longitude,
      ),
    }))
    .filter((request) => {
      if (!providerHasCoordinates || request.matchDistanceKm === null) return true;
      return request.matchDistanceKm <= radiusKm;
    })
    .sort((left, right) => {
      if (left.matchDistanceKm !== null && right.matchDistanceKm !== null) {
        return left.matchDistanceKm - right.matchDistanceKm;
      }
      if (left.matchDistanceKm !== null) return -1;
      if (right.matchDistanceKm !== null) return 1;
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}
