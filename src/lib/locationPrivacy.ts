/**
 * Location privacy helpers for SAVIS public map / discovery.
 * Default: approximate (fuzzed) coordinates so home-based providers are not pin-pointed.
 */

export type LocationPrecision = "approximate" | "exact";

const FUZZ_MIN_M = 200;
const FUZZ_MAX_M = 250;

/** Deterministic offset from provider id so the pin is stable across reloads */
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Offset lat/lng by ~200–250 meters in a stable direction derived from id.
 * 1 degree latitude ≈ 111_320 m; longitude scales by cos(lat).
 */
export function fuzzCoordinates(
  latitude: number,
  longitude: number,
  providerId: string
): { latitude: number; longitude: number } {
  const seed = hashSeed(providerId || "savis");
  const meters = FUZZ_MIN_M + (seed % (FUZZ_MAX_M - FUZZ_MIN_M + 1));
  const angle = ((seed % 360) * Math.PI) / 180;
  const dLat = (meters * Math.cos(angle)) / 111320;
  const cosLat = Math.cos((latitude * Math.PI) / 180) || 0.01;
  const dLng = (meters * Math.sin(angle)) / (111320 * cosLat);
  return {
    latitude: latitude + dLat,
    longitude: longitude + dLng,
  };
}

export function publicMapPosition(
  latitude: number,
  longitude: number,
  providerId: string,
  precision: LocationPrecision = "approximate"
): { latitude: number; longitude: number } {
  if (precision === "exact") return { latitude, longitude };
  return fuzzCoordinates(latitude, longitude, providerId);
}

const PREF_KEY = "savis_location_precision_v1";

/** Consumer/provider preference stored locally until profile field is wired */
export function getLocationPrecisionPref(): LocationPrecision {
  if (typeof window === "undefined") return "approximate";
  const v = localStorage.getItem(PREF_KEY);
  return v === "exact" ? "exact" : "approximate";
}

export function setLocationPrecisionPref(value: LocationPrecision) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, value);
}
