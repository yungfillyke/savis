export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt: string;
};

const KEY = "savis_user_location";

export function getSavedLocation(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

export function saveLocation(location: UserLocation) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(location));
  window.dispatchEvent(new Event("savis-location-updated"));
}

export function clearSavedLocation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("savis-location-updated"));
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  from: Pick<UserLocation, "latitude" | "longitude">,
  to: Pick<UserLocation, "latitude" | "longitude">
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function requestCurrentLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: new Date().toISOString(),
        };
        saveLocation(location);
        resolve(location);
      },
      (error) => {
        reject(new Error(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. You can continue with manual location."
            : "We could not get your location. Please try again."
        ));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}
