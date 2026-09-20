import { NextRequest, NextResponse } from 'next/server';
import { calculateRoute } from '@/services/routing-service';
import { calculatePricing } from '@/services/pricing/engine';
import { VehicleType } from '@/services/pricing/types';

/**
 * POST /api/simulate-price
 *
 * Unified route handler for TransConnekt pricing simulation.
 * Pure orchestrator: validates input, retrieves routing, executes PricingEngineCore, and responds.
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

    const {
      origin,
      destination,
      originCoords,
      destinationCoords,
      weight,
      weightTons: rawWeightTons,
      vehicleType: rawVehicleType,
    } = body;

    // 1. Origin & Destination validation
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

    // 2. Weight validation (handles number or string format e.g. "10", "10t", "10.5")
    let weightTons = 10; // Default reasonable tonnage if unspecified
    const candidateWeight = rawWeightTons ?? weight;

    if (candidateWeight !== undefined && candidateWeight !== null) {
      const parsedWeight =
        typeof candidateWeight === 'number'
          ? candidateWeight
          : parseFloat(String(candidateWeight).replace(',', '.').replace(/[^0-9.]/g, ''));

      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        return NextResponse.json(
          { error: "Le tonnage doit être un nombre strictement supérieur à 0." },
          { status: 400 }
        );
      }
      weightTons = parsedWeight;
    }

    // 3. Vehicle Type validation (optional)
    let vehicleType: VehicleType | undefined = undefined;
    const allowedVehicleTypes: VehicleType[] = [
      'pickup_3t',
      'truck_10t',
      'truck_20t',
      'semi_trailer_35t',
    ];
    if (rawVehicleType && allowedVehicleTypes.includes(rawVehicleType as VehicleType)) {
      vehicleType = rawVehicleType as VehicleType;
    }

    // 4. Calculate route and geocoding precision
    let routing;
    try {
      routing = await calculateRoute(
        trimmedOrigin,
        trimmedDestination,
        originCoords,
        destinationCoords
      );
    } catch (routeErr: any) {
      if (routeErr.code === 'LOCATION_NOT_FOUND') {
        return NextResponse.json(
          { error: routeErr.message, code: 'LOCATION_NOT_FOUND', param: routeErr.param },
          { status: 404 }
        );
      }
      if (routeErr.code === 'IDENTICAL_LOCATIONS') {
        return NextResponse.json(
          { error: routeErr.message, code: 'IDENTICAL_LOCATIONS' },
          { status: 400 }
        );
      }
      throw routeErr;
    }

    // 5. Execute pure deterministic Pricing Engine Core
    const pricingOutput = calculatePricing({
      origin: routing.origin,
      destination: routing.destination,
      originCoords: routing.originCoords,
      destinationCoords: routing.destinationCoords,
      distanceKm: routing.distanceKm,
      rawMapboxDurationSec: routing.rawMapboxDurationSec,
      routeSource: routing.routeSource,
      originPrecision: routing.originPrecision,
      destinationPrecision: routing.destinationPrecision,
      weightTons,
      vehicleType,
      corridorId: routing.corridorId,
    });

    return NextResponse.json(pricingOutput, { status: 200 });
  } catch (error: any) {
    console.error("[api/simulate-price] Erreur interne :", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de la simulation tarifaire." },
      { status: 500 }
    );
  }
}
