import { VehicleProfile, VehicleType } from './types';

/**
 * TransConnekt Pricing Configuration (V1)
 * All Class C parameters are configurable here without altering the core mathematical engine.
 */

export const PRICING_CONFIG = {
  // Fuel parameters (Classe C)
  fuel: {
    unitPriceGnf: 12000,
    source: "À vérifier — référence documentaire à renseigner",
    category: "CLASSE_C",
    lastUpdatedAt: "2026-09-20",
  },

  // Toll rates (Classe C)
  tolls: {
    coyahRates: {
      pickup_3t: 0,
      truck_10t: 150000,
      truck_20t: 200000,
      semi_trailer_35t: 250000,
    } as Record<VehicleType, number>,
    source: "À vérifier — référence documentaire à renseigner",
    category: "CLASSE_C",
    lastUpdatedAt: "2026-09-20",
  },

  // Vehicle profiles (Classe C / Classe B)
  vehicles: {
    pickup_3t: {
      type: 'pickup_3t',
      capacityTons: 3.0,
      consumptionLoadedLPer100Km: 14.0,
      emptyRatio: 0.80, // Classe B: 80% consumption when empty
      tyreCostPerKm: 400,
      maintenanceCostPerKm: 500,
      crewCostPerDay: 120000,
      depreciationCostPerDay: 100000,
      loadingDurationSec: 5400, // 1h30
      unloadingDurationSec: 3600, // 1h00
      controlDurationSec: 0,
    },
    truck_10t: {
      type: 'truck_10t',
      capacityTons: 10.0,
      consumptionLoadedLPer100Km: 30.0,
      emptyRatio: 0.80, // Classe B: 80% consumption when empty (24 L/100km)
      tyreCostPerKm: 1000,
      maintenanceCostPerKm: 800,
      crewCostPerDay: 250000,
      depreciationCostPerDay: 250000,
      loadingDurationSec: 14400, // 4h00
      unloadingDurationSec: 10800, // 3h00
      controlDurationSec: 2700, // 45m (Coyah weigh scale & toll queue)
    },
    truck_20t: {
      type: 'truck_20t',
      capacityTons: 20.0,
      consumptionLoadedLPer100Km: 38.0,
      emptyRatio: 0.80,
      tyreCostPerKm: 1600,
      maintenanceCostPerKm: 1200,
      crewCostPerDay: 280000,
      depreciationCostPerDay: 350000,
      loadingDurationSec: 21600, // 6h00
      unloadingDurationSec: 14400, // 4h00
      controlDurationSec: 2700, // 45m
    },
    semi_trailer_35t: {
      type: 'semi_trailer_35t',
      capacityTons: 35.0,
      consumptionLoadedLPer100Km: 46.0,
      emptyRatio: 0.80,
      tyreCostPerKm: 2400,
      maintenanceCostPerKm: 1800,
      crewCostPerDay: 320000,
      depreciationCostPerDay: 500000,
      loadingDurationSec: 21600, // 6h00
      unloadingDurationSec: 14400, // 4h00
      controlDurationSec: 2700, // 45m
    },
  } as Record<VehicleType, VehicleProfile>,

  // Market Return & Margin Scenarios (Classe C)
  scenarios: {
    MIN: {
      scenario: 'MIN' as const,
      alphaReturn: 0.20,
      marginRate: 0.12,
    },
    TARGET: {
      scenario: 'TARGET' as const,
      alphaReturn: 0.60,
      marginRate: 0.18,
    },
    MAX: {
      scenario: 'MAX' as const,
      alphaReturn: 1.00,
      marginRate: 0.25,
    },
  },

  // Platform & Escrow fees (Classe A)
  platform: {
    commissionRate: 0.10, // 10%
    insuranceRate: 0.02,  // 2%
    totalFeeRate: 0.12,   // 12%
    netDivisor: 0.88,     // 1 - 0.12 = 0.88
  },

  // Operational shifts and thresholds (Classe C / Classe B)
  operations: {
    dailyShiftHours: 12, // 12h operational shift threshold for 1 day
    fallbackAverageSpeedKmH: 45, // Used only when routeSource === 'road_model'
    displayRoundingStepGnf: 50000, // Rounding step for clientDisplayedPrice
    capacityWarningThresholdTons: 35.0, // Informative threshold warning
    highConfidenceThresholdMissions: 10, // Minimum verified missions for HIGH confidence
    defaultInitialCorridorFactor: 1.57, // Initial business hypothesis (Classe B)
  },
};
