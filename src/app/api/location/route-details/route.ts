import { NextRequest, NextResponse } from 'next/server';
import { getGuineanCityCoords } from '@/lib/guinea-cities';
import axios from 'axios';

interface RouteDetailsResponse {
  distance: number; // in km
  duration: number; // in seconds
  source?: 'mapbox' | 'road_model';
}

/**
 * Calcul de distance à vol d'oiseau (formule de Haversine)
 */
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
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
 * POST /api/location/route-details
 * Calcule la distance et la durée pour un itinéraire entre deux localités guinéennes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Corps de requête invalide (JSON attendu)." },
        { status: 400 }
      );
    }

    const { origin, destination } = body;

    if (!origin || typeof origin !== 'string' || origin.trim().length === 0) {
      return NextResponse.json(
        { error: "Le paramètre 'origin' est requis et doit être une chaîne non vide." },
        { status: 400 }
      );
    }

    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      return NextResponse.json(
        { error: "Le paramètre 'destination' est requis et doit être une chaîne non vide." },
        { status: 400 }
      );
    }

    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();

    if (trimmedOrigin.length > 200 || trimmedDestination.length > 200) {
      return NextResponse.json(
        { error: "Les noms de localités ne peuvent pas dépasser 200 caractères." },
        { status: 400 }
      );
    }

    const originCoords = getGuineanCityCoords(trimmedOrigin);
    const destinationCoords = getGuineanCityCoords(trimmedDestination);

    if (!originCoords || !destinationCoords) {
      return NextResponse.json(
        { error: "Impossible d'identifier les coordonnées géographiques pour l'origine ou la destination." },
        { status: 404 }
      );
    }

    if (originCoords.lat === destinationCoords.lat && originCoords.lng === destinationCoords.lng) {
      return NextResponse.json(
        { error: "Le lieu de départ et le lieu de destination ne peuvent pas être identiques." },
        { status: 400 }
      );
    }

    // 1. Tentative avec l'API Mapbox Directions v5 si un token est configuré
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    if (mapboxToken) {
      // Ordre Mapbox impératif : {longitude},{latitude}
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originCoords.lng},${originCoords.lat};${destinationCoords.lng},${destinationCoords.lat}?overview=false&access_token=${mapboxToken}`;

      try {
        const response = await axios.get(url, { timeout: 7000 });
        const route = response.data?.routes?.[0];

        if (route && typeof route.distance === 'number' && typeof route.duration === 'number') {
          const distanceInMeters = route.distance;
          const durationInSeconds = route.duration;

          // Facteur de ralentissement poids lourds (25%) identique au contrat historique
          const heavyVehicleDuration = durationInSeconds * 1.25;

          const result: RouteDetailsResponse = {
            distance: Math.round(distanceInMeters / 1000),
            duration: Math.round(heavyVehicleDuration),
            source: 'mapbox',
          };

          return NextResponse.json(result);
        }
      } catch (apiError: any) {
        // En cas d'erreur ou d'indisponibilité réseau, bascule silencieuse sur le modèle routier sans exposer de token
        console.warn(
          "[api/location/route-details] Mapbox Directions indisponible, bascule sur modèle routier :",
          apiError?.message || "Requête échouée"
        );
      }
    }

    // 2. Modèle de secours haute disponibilité : distance géodésique × coefficient de sinuosité routière Guinée (1.30)
    const directDist = calculateHaversineKm(
      originCoords.lat,
      originCoords.lng,
      destinationCoords.lat,
      destinationCoords.lng
    );
    const roadDistanceKm = Math.max(1, Math.round(directDist * 1.30));

    // Vitesse moyenne estimée 45 km/h pour convoi de transport lourd
    const durationSec = Math.round((roadDistanceKm / 45) * 3600);

    const fallbackResult: RouteDetailsResponse = {
      distance: roadDistanceKm,
      duration: durationSec,
      source: 'road_model',
    };

    return NextResponse.json(fallbackResult);
  } catch (error) {
    console.error("[api/location/route-details] Erreur interne :", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors du calcul de l'itinéraire." },
      { status: 500 }
    );
  }
}
