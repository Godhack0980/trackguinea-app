import axios from 'axios';
import { getGuineanCityCoordsStrict, guineanCities } from '@/lib/guinea-cities';
import { GeocodingPrecision, RouteSource } from './pricing/types';

export interface ResolvedLocation {
  name: string;
  coords: { lat: number; lng: number };
  precision: GeocodingPrecision;
}

export interface RoutingResult {
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  originPrecision: GeocodingPrecision;
  destinationPrecision: GeocodingPrecision;
  distanceKm: number;
  rawMapboxDurationSec: number | null; // Strictly null if road_model fallback
  routeSource: RouteSource;
  corridorId: string;
}

/**
 * Haversine formula for air-distance (geodesic distance) in kilometers.
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks whether a location name corresponds to an identifiable logistics hub.
 */
function isLogisticsHub(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('port') ||
    lower.includes('madina') ||
    lower.includes('kagbelen') ||
    lower.includes('kagbélen') ||
    lower.includes('km36') ||
    lower.includes('dapilon') ||
    lower.includes('kamsar')
  );
}

/**
 * Derives a normalized corridor identifier from origin and destination names.
 */
export function resolveCorridorId(origin: string, destination: string): string {
  const norm = (str: string) => str.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const origKey = norm(origin) || 'ORI';
  const destKey = norm(destination) || 'DES';
  return `CORR_${origKey}_${destKey}`;
}

/**
 * Resolves geographical coordinates for a Guinean locality without ever silently falling back to Conakry.
 */
export async function resolveLocation(
  name: string,
  explicitCoords?: { lat: number; lng: number } | null
): Promise<ResolvedLocation | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  // 1. Explicit coordinates provided by user GPS or map pin
  if (
    explicitCoords &&
    Number.isFinite(explicitCoords.lat) &&
    Number.isFinite(explicitCoords.lng)
  ) {
    return {
      name: trimmed,
      coords: { lat: explicitCoords.lat, lng: explicitCoords.lng },
      precision: 'exact_coordinates',
    };
  }

  // 2. Synchronous resolution in local dictionary (strict - no Conakry fallback)
  const syncCoords = getGuineanCityCoordsStrict(trimmed);
  if (syncCoords) {
    const precision: GeocodingPrecision = isLogisticsHub(trimmed) ? 'hub' : 'city_centroid';
    return {
      name: trimmed,
      coords: syncCoords,
      precision,
    };
  }

  // 3. Asynchronous lookup with online Mapbox Geocoding fallback
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) {
    try {
      const cleanName = trimmed.split('(')[0].split(',')[0].trim();
      const queryTerm = cleanName.includes("Guinée") || cleanName.includes("Guinea") 
        ? cleanName 
        : `${cleanName}, Guinea`;

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(queryTerm)}.json?access_token=${token}&country=gn&limit=1`;
      const res = await axios.get(url, { timeout: 5000 });
      if (res.data?.features && res.data.features.length > 0) {
        const [lng, lat] = res.data.features[0].center;
        if (typeof lat === 'number' && typeof lng === 'number') {
          return {
            name: trimmed,
            coords: { lat, lng },
            precision: 'city_centroid',
          };
        }
      }
    } catch (err: any) {
      console.warn("[RoutingService] Geocoding lookup error:", err?.message || err);
    }
  }

  // 4. Locality not found anywhere — return null (NO silent default to Conakry)
  return null;
}

/**
 * Calculates road routing using Mapbox Directions v5 with resilient road_model fallback.
 *
 * Fallback triggers:
 * - Token absent or invalid
 * - Network timeout (> 7000 ms)
 * - HTTP error (4xx/5xx)
 * - Invalid Mapbox response payload
 */
export async function calculateRoute(
  origin: string,
  destination: string,
  originExplicitCoords?: { lat: number; lng: number } | null,
  destinationExplicitCoords?: { lat: number; lng: number } | null
): Promise<RoutingResult> {
  const trimmedOrigin = origin?.trim();
  const trimmedDestination = destination?.trim();

  if (!trimmedOrigin || !trimmedDestination) {
    throw new Error("Le point de départ et la destination sont obligatoires.");
  }

  const [originResolved, destResolved] = await Promise.all([
    resolveLocation(trimmedOrigin, originExplicitCoords),
    resolveLocation(trimmedDestination, destinationExplicitCoords),
  ]);

  if (!originResolved) {
    const err: any = new Error(`La localité de départ "${trimmedOrigin}" n'a pas pu être géolocalisée.`);
    err.code = "LOCATION_NOT_FOUND";
    err.param = "origin";
    throw err;
  }

  if (!destResolved) {
    const err: any = new Error(`La localité d'arrivée "${trimmedDestination}" n'a pas pu être géolocalisée.`);
    err.code = "LOCATION_NOT_FOUND";
    err.param = "destination";
    throw err;
  }

  // Protect against identical coordinates
  if (
    originResolved.coords.lat === destResolved.coords.lat &&
    originResolved.coords.lng === destResolved.coords.lng
  ) {
    const err: any = new Error("Le lieu de départ et le lieu de destination ne peuvent pas être identiques.");
    err.code = "IDENTICAL_LOCATIONS";
    throw err;
  }

  const corridorId = resolveCorridorId(trimmedOrigin, trimmedDestination);

  // Mapbox Directions v5 attempt
  const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  if (token) {
    // Mapbox standard coordinates order: {longitude},{latitude}
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originResolved.coords.lng},${originResolved.coords.lat};${destResolved.coords.lng},${destResolved.coords.lat}?overview=false&access_token=${token}`;

    try {
      const response = await axios.get(url, { timeout: 7000 });
      const route = response.data?.routes?.[0];

      if (
        route &&
        typeof route.distance === 'number' &&
        route.distance > 0 &&
        typeof route.duration === 'number' &&
        route.duration > 0
      ) {
        return {
          origin: trimmedOrigin,
          destination: trimmedDestination,
          originCoords: originResolved.coords,
          destinationCoords: destResolved.coords,
          originPrecision: originResolved.precision,
          destinationPrecision: destResolved.precision,
          distanceKm: Math.max(1, Math.round(route.distance / 1000)),
          rawMapboxDurationSec: Math.round(route.duration),
          routeSource: 'mapbox',
          corridorId,
        };
      }
    } catch (apiErr: any) {
      console.warn(
        "[RoutingService] Échec Mapbox Directions, bascule sur modèle routier de secours :",
        apiErr?.message || "Erreur réseau"
      );
    }
  }

  // Fallback road_model (Haversine * 1.30 sinuosity factor)
  const airDist = calculateHaversineKm(
    originResolved.coords.lat,
    originResolved.coords.lng,
    destResolved.coords.lat,
    destResolved.coords.lng
  );
  const roadDist = Math.max(1, Math.round(airDist * 1.30));

  return {
    origin: trimmedOrigin,
    destination: trimmedDestination,
    originCoords: originResolved.coords,
    destinationCoords: destResolved.coords,
    originPrecision: 'road_model',
    destinationPrecision: 'road_model',
    distanceKm: roadDist,
    rawMapboxDurationSec: null, // Strictly null: no fake Mapbox duration
    routeSource: 'road_model',
    corridorId,
  };
}
