/**
 * Type definitions for the TransConnekt Pricing & Operational Engine (V1)
 * Pure TypeScript — No UI or runtime dependencies.
 */

export type RouteSource = 'mapbox' | 'road_model';

export type GeocodingPrecision =
  | 'exact_coordinates'
  | 'hub'
  | 'city_centroid'
  | 'road_model';

export type VehicleType =
  | 'pickup_3t'
  | 'truck_10t'
  | 'truck_20t'
  | 'semi_trailer_35t';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type CorridorFactorSource =
  | 'initial_business_hypothesis'
  | 'gps_calibration';

export interface VehicleProfile {
  type: VehicleType;
  capacityTons: number;
  consumptionLoadedLPer100Km: number;
  emptyRatio: number; // typically 0.80 (80% of loaded consumption)
  tyreCostPerKm: number; // in GNF
  maintenanceCostPerKm: number; // in GNF
  crewCostPerDay: number; // in GNF
  depreciationCostPerDay: number; // in GNF
  loadingDurationSec: number;
  unloadingDurationSec: number;
  controlDurationSec: number;
}

export interface ScenarioPricing {
  scenario: 'MIN' | 'TARGET' | 'MAX';
  alphaReturn: number;
  marginRate: number;
  economicDistanceKm: number;
  fuelCost: number;
  tyreCost: number;
  maintenanceCost: number;
  tollCost: number;
  crewCost: number;
  depreciationCost: number;
  transportCost: number;
  targetNet: number;
  netTransporter: number;
  clientFinalPriceExact: number;
  clientAmount: number;
  clientDisplayedPrice: number;
  commissionAmount: number;
  insuranceAmount: number;
  payoutAmount: number;
}

export interface PricingEngineInput {
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number };
  destinationCoords: { lat: number; lng: number };
  distanceKm: number;
  rawMapboxDurationSec: number | null; // null if routeSource === 'road_model'
  routeSource: RouteSource;
  originPrecision?: GeocodingPrecision;
  destinationPrecision?: GeocodingPrecision;
  weightTons: number;
  vehicleType?: VehicleType;
  corridorId?: string;
  customCorridorFactor?: number;
  calibratedMissionCount?: number;
  corridorFactorSource?: CorridorFactorSource;
}

export interface PricingEngineOutput {
  route: {
    origin: string;
    destination: string;
    originCoords: { lat: number; lng: number };
    destinationCoords: { lat: number; lng: number };
    distanceKm: number;
    economicDistanceKm: number; // TARGET scenario economic distance
    routeSource: RouteSource;
    geocodingPrecision: GeocodingPrecision;
    corridorId: string;
  };
  duration: {
    rawMapboxDurationSec: number | null;
    corridorFactor: number;
    corridorFactorSource: CorridorFactorSource;
    calibratedMissionCount: number;
    estimatedDrivingDurationSec: number;
    loadingDurationSec: number;
    unloadingDurationSec: number;
    controlDurationSec: number;
    totalMissionDurationSec: number;
    missionDays: number;
    display: {
      drivingRangeText: string;
      missionDaysText: string;
    };
  };
  vehicle: {
    vehicleType: VehicleType;
    payloadTons: number;
    capacityTons: number;
    consumptionLoadedLPer100Km: number;
    consumptionEmptyLPer100Km: number;
  };
  costs: {
    fuelCost: number;
    tyreCost: number;
    maintenanceCost: number;
    tollCost: number;
    crewCost: number;
    depreciationCost: number;
    totalTransportCost: number;
  };
  pricing: {
    currency: 'GNF';
    min: ScenarioPricing;
    target: ScenarioPricing;
    max: ScenarioPricing;
  };
  confidence: {
    level: ConfidenceLevel;
    reasons: string[];
  };
  warnings: string[];
}
