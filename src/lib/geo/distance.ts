function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function hasCoordinate(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function haversineDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined,
): number | null {
  if (!hasCoordinate(lat1) || !hasCoordinate(lon1) || !hasCoordinate(lat2) || !hasCoordinate(lon2)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latDelta = toRadians(lat2 - lat1);
  const lonDelta = toRadians(lon2 - lon1);
  const fromLat = toRadians(lat1);
  const toLat = toRadians(lat2);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
