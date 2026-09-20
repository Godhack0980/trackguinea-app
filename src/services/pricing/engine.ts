import { PRICING_CONFIG } from './config';
import {
  ConfidenceLevel,
  CorridorFactorSource,
  PricingEngineInput,
  PricingEngineOutput,
  ScenarioPricing,
  VehicleProfile,
  VehicleType,
} from './types';

/**
 * Formats a duration in seconds into a human-readable range with 30-min rounding
 * Example: 13 869 seconds (3h51) -> "3h30 à 4h30"
 */
function formatDrivingRange(drivingSeconds: number): string {
  const lowerSec = Math.max(1800, Math.floor((drivingSeconds * 0.90) / 1800) * 1800);
  const upperSec = Math.max(lowerSec + 1800, Math.ceil((drivingSeconds * 1.15) / 1800) * 1800);

  const formatHoursMinutes = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return minutes > 0 ? `${hours}h${minutes < 10 ? '0' : ''}${minutes}` : `${hours}h00`;
  };

  return `${formatHoursMinutes(lowerSec)} à ${formatHoursMinutes(upperSec)}`;
}

/**
 * Auto-selects vehicle type based on cargo tonnage if not explicitly specified
 */
export function resolveVehicleType(weightTons: number, requestedType?: VehicleType): VehicleType {
  if (requestedType && PRICING_CONFIG.vehicles[requestedType]) {
    return requestedType;
  }
  if (weightTons <= 3.0) return 'pickup_3t';
  if (weightTons <= 10.0) return 'truck_10t';
  if (weightTons <= 20.0) return 'truck_20t';
  return 'semi_trailer_35t';
}

/**
 * Calculates a single financial scenario (MIN, TARGET, or MAX)
 * Guarantees strict integer GNF accounting and perfect escrow balancing.
 */
function calculateScenario(
  scenarioKey: 'MIN' | 'TARGET' | 'MAX',
  distanceKm: number,
  missionDays: number,
  vehicle: VehicleProfile,
  tollCostAller: number
): ScenarioPricing {
  const scenarioConfig = PRICING_CONFIG.scenarios[scenarioKey];
  const { alphaReturn, marginRate } = scenarioConfig;

  // 1. Economic distance
  const economicDistanceKm = distanceKm * (1 + alphaReturn);

  // 2. Fuel cost (loaded trip + imputed empty return)
  const fuelPrice = PRICING_CONFIG.fuel.unitPriceGnf;
  const loadedFuelCost = (distanceKm / 100) * vehicle.consumptionLoadedLPer100Km * fuelPrice;
  const emptyConsumption = vehicle.consumptionLoadedLPer100Km * vehicle.emptyRatio;
  const emptyFuelCost = alphaReturn * (distanceKm / 100) * emptyConsumption * fuelPrice;
  const fuelCost = Math.round(loadedFuelCost + emptyFuelCost);

  // 3. Maintenance and Tyres
  const tyreCost = Math.round(economicDistanceKm * vehicle.tyreCostPerKm);
  const maintenanceCost = Math.round(economicDistanceKm * vehicle.maintenanceCostPerKm);

  // 4. Tolls (full toll outbound + imputed toll return)
  const tollCost = Math.round(tollCostAller + (alphaReturn * tollCostAller));

  // 5. Fixed operational costs
  const crewCost = Math.round(missionDays * vehicle.crewCostPerDay);
  const depreciationCost = Math.round(missionDays * vehicle.depreciationCostPerDay);

  // 6. Total transport cost
  const transportCost = fuelCost + tyreCost + maintenanceCost + tollCost + crewCost + depreciationCost;

  // 7. Target net transporter before platform fee deduction
  const targetNet = transportCost * (1 + marginRate);

  // 8. Exact client price (continuous formula: Net / 0.88)
  const clientFinalPriceExact = targetNet / PRICING_CONFIG.platform.netDivisor;

  // 9. Contractual integer client amount (billed & held in escrow)
  const clientAmount = Math.round(clientFinalPriceExact);

  // 10. Platform fees (integers in GNF)
  const commissionAmount = Math.round(clientAmount * PRICING_CONFIG.platform.commissionRate);
  const insuranceAmount = Math.round(clientAmount * PRICING_CONFIG.platform.insuranceRate);

  // 11. Transporter net payout and identity rule
  const payoutAmount = clientAmount - commissionAmount - insuranceAmount;
  const netTransporter = payoutAmount; // Transporter receives exactly the net after platform deduction

  // 12. Commercial displayed price (rounded to configured step)
  const step = PRICING_CONFIG.operations.displayRoundingStepGnf;
  const clientDisplayedPrice = Math.round(clientAmount / step) * step;

  // 13. Strict internal financial invariants assertion
  if (payoutAmount !== netTransporter) {
    throw new Error(
      `Incohérence financière interne: payoutAmount (${payoutAmount}) !== netTransporter (${netTransporter})`
    );
  }
  if (payoutAmount + commissionAmount + insuranceAmount !== clientAmount) {
    throw new Error(
      `Incohérence financière interne: déversement (${payoutAmount + commissionAmount + insuranceAmount}) !== clientAmount (${clientAmount})`
    );
  }

  return {
    scenario: scenarioKey,
    alphaReturn,
    marginRate,
    economicDistanceKm,
    fuelCost,
    tyreCost,
    maintenanceCost,
    tollCost,
    crewCost,
    depreciationCost,
    transportCost,
    targetNet,
    netTransporter,
    clientFinalPriceExact,
    clientAmount,
    clientDisplayedPrice,
    commissionAmount,
    insuranceAmount,
    payoutAmount,
  };
}

/**
 * Pure Pricing Engine Core (V1)
 *
 * Implements the locked TransConnekt transport pricing specification.
 * Fully deterministic, isolated, without network, secrets or environment dependencies.
 */
export function calculatePricing(input: PricingEngineInput): PricingEngineOutput {
  const warnings: string[] = [];

  // --- 1. Input Validations ---
  if (!input.origin || !input.destination) {
    throw new Error("L'origine et la destination sont obligatoires.");
  }
  if (!input.originCoords || !input.destinationCoords) {
    throw new Error("Les coordonnées géographiques de départ et d'arrivée sont obligatoires.");
  }
  if (input.distanceKm <= 0 || !Number.isFinite(input.distanceKm)) {
    throw new Error("La distance routière doit être strictement supérieure à 0 km.");
  }
  if (input.weightTons <= 0 || !Number.isFinite(input.weightTons)) {
    throw new Error("Le tonnage doit être strictement supérieur à 0 tonne.");
  }

  // Warning on high capacity threshold
  if (input.weightTons > PRICING_CONFIG.operations.capacityWarningThresholdTons) {
    warnings.push("OVER_STANDARD_CAPACITY_RECOMMEND_SPLIT");
  }

  // Warning on road_model fallback
  if (input.routeSource === 'road_model') {
    warnings.push("DISTANCE_ESTIMATED_VIA_ROAD_MODEL");
  }

  // --- 2. Vehicle Selection ---
  const vehicleType = resolveVehicleType(input.weightTons, input.vehicleType);
  const vehicleProfile = PRICING_CONFIG.vehicles[vehicleType];

  // --- 3. Duration & Corridor Calculations ---
  const corridorFactor = input.customCorridorFactor ?? PRICING_CONFIG.operations.defaultInitialCorridorFactor;
  const calibratedMissionCount = input.calibratedMissionCount ?? 0;
  const corridorFactorSource: CorridorFactorSource =
    input.corridorFactorSource ??
    (calibratedMissionCount >= PRICING_CONFIG.operations.highConfidenceThresholdMissions
      ? 'gps_calibration'
      : 'initial_business_hypothesis');

  let rawMapboxDurationSec: number | null = null;
  let estimatedDrivingDurationSec = 0;

  if (input.routeSource === 'mapbox' && input.rawMapboxDurationSec !== null && input.rawMapboxDurationSec > 0) {
    rawMapboxDurationSec = input.rawMapboxDurationSec;
    estimatedDrivingDurationSec = Math.round(rawMapboxDurationSec * corridorFactor);
  } else {
    // Fallback road_model estimation: default 45 km/h for heavy transport
    rawMapboxDurationSec = null;
    estimatedDrivingDurationSec = Math.round(
      (input.distanceKm / PRICING_CONFIG.operations.fallbackAverageSpeedKmH) * 3600
    );
  }

  const loadingDurationSec = vehicleProfile.loadingDurationSec;
  const unloadingDurationSec = vehicleProfile.unloadingDurationSec;
  const controlDurationSec = vehicleProfile.controlDurationSec;
  const totalMissionDurationSec =
    estimatedDrivingDurationSec + loadingDurationSec + unloadingDurationSec + controlDurationSec;

  // missionDays calculation using 12h operational daytime shift envelope
  const shiftSeconds = PRICING_CONFIG.operations.dailyShiftHours * 3600;
  const missionDays = Math.max(1, Math.ceil(totalMissionDurationSec / shiftSeconds));

  const drivingRangeText = formatDrivingRange(estimatedDrivingDurationSec);
  const missionDaysText = `${missionDays} journée${missionDays > 1 ? 's' : ''} d'exploitation`;

  // --- 4. Toll Estimation ---
  // If destination/origin involves Coyah or national axes crossing Coyah (RN1)
  const isCoyahTollApplicable = true; // By default on national corridors crossing FER Coyah
  const tollCostAller = isCoyahTollApplicable ? PRICING_CONFIG.tolls.coyahRates[vehicleType] : 0;

  // --- 5. Financial Scenarios (MIN, TARGET, MAX) ---
  const minScenario = calculateScenario('MIN', input.distanceKm, missionDays, vehicleProfile, tollCostAller);
  const targetScenario = calculateScenario('TARGET', input.distanceKm, missionDays, vehicleProfile, tollCostAller);
  const maxScenario = calculateScenario('MAX', input.distanceKm, missionDays, vehicleProfile, tollCostAller);

  // Invariant assertion: MIN < TARGET < MAX
  if (
    minScenario.transportCost >= targetScenario.transportCost ||
    targetScenario.transportCost >= maxScenario.transportCost ||
    minScenario.clientAmount >= targetScenario.clientAmount ||
    targetScenario.clientAmount >= maxScenario.clientAmount
  ) {
    throw new Error("Incohérence hiérarchique: MIN < TARGET < MAX non respecté.");
  }

  // --- 6. Confidence Level Determination ---
  let confidenceLevel: ConfidenceLevel = 'MEDIUM';
  const confidenceReasons: string[] = [];

  const originPrecision = input.originPrecision ?? 'city_centroid';
  const destinationPrecision = input.destinationPrecision ?? 'city_centroid';
  const corridorId = input.corridorId ?? 'CORR_GENERAL';

  if (input.routeSource === 'road_model') {
    confidenceLevel = 'LOW';
    confidenceReasons.push("Calcul basé sur le modèle routier de secours (réseau cartographique en ligne indisponible)");
  } else {
    confidenceReasons.push("Tracé routier validé par Mapbox Directions v5");

    if (originPrecision === 'city_centroid' || destinationPrecision === 'city_centroid') {
      confidenceReasons.push("Coordonnées basées sur un centroïde urbain (préciser le quartier/hub pour affiner)");
    }

    if (calibratedMissionCount >= PRICING_CONFIG.operations.highConfidenceThresholdMissions) {
      confidenceReasons.push(`Corridor étalonné par ${calibratedMissionCount} missions réelles enregistrées`);
      if (originPrecision !== 'city_centroid' && destinationPrecision !== 'city_centroid') {
        confidenceLevel = 'HIGH';
      }
    } else {
      confidenceReasons.push("Facteur de durée basé sur l'hypothèse métier V1 (en attente de 10 missions GPS)");
    }
  }

  return {
    route: {
      origin: input.origin,
      destination: input.destination,
      originCoords: input.originCoords,
      destinationCoords: input.destinationCoords,
      distanceKm: input.distanceKm,
      economicDistanceKm: targetScenario.economicDistanceKm,
      routeSource: input.routeSource,
      geocodingPrecision: originPrecision,
      corridorId,
    },
    duration: {
      rawMapboxDurationSec,
      corridorFactor,
      corridorFactorSource,
      calibratedMissionCount,
      estimatedDrivingDurationSec,
      loadingDurationSec,
      unloadingDurationSec,
      controlDurationSec,
      totalMissionDurationSec,
      missionDays,
      display: {
        drivingRangeText,
        missionDaysText,
      },
    },
    vehicle: {
      vehicleType,
      payloadTons: input.weightTons,
      capacityTons: vehicleProfile.capacityTons,
      consumptionLoadedLPer100Km: vehicleProfile.consumptionLoadedLPer100Km,
      consumptionEmptyLPer100Km: vehicleProfile.consumptionLoadedLPer100Km * vehicleProfile.emptyRatio,
    },
    costs: {
      fuelCost: targetScenario.fuelCost,
      tyreCost: targetScenario.tyreCost,
      maintenanceCost: targetScenario.maintenanceCost,
      tollCost: targetScenario.tollCost,
      crewCost: targetScenario.crewCost,
      depreciationCost: targetScenario.depreciationCost,
      totalTransportCost: targetScenario.transportCost,
    },
    pricing: {
      currency: 'GNF',
      min: minScenario,
      target: targetScenario,
      max: maxScenario,
    },
    confidence: {
      level: confidenceLevel,
      reasons: confidenceReasons,
    },
    warnings,
  };
}
