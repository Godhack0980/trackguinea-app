
'use server';
/**
 * @fileOverview Tool for calculating deterministic transport prices.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { SimulatePriceInputSchema, PriceCalculatorOutputSchema, type PriceCalculatorOutput } from '@/ai/types';
import { getRouteDetails } from '@/services/location-service';


// Pricing constants
const BASE_RATE_PER_TON_KM = 400; // GNF
const SPECIAL_CARGO_SURCHARGE = 0.20; // 20%
const RAINY_SEASON_SURCHARGE = 0.15; // 15%
const VOLUME_DISCOUNT_THRESHOLD_TONNES = 30;
const VOLUME_DISCOUNT = 0.05; // 5%


export const priceCalculatorTool = ai.defineTool(
  {
    name: 'priceCalculatorTool',
    description: 'Calcule le prix du transport en fonction de règles métier définies.',
    inputSchema: SimulatePriceInputSchema,
    outputSchema: PriceCalculatorOutputSchema,
  },
  async (input): Promise<PriceCalculatorOutput> => {
    const { from, to, weight, weightUnit, cargoType, season } = input;

    // 1. Get distance and duration from the location service
    const routeDetails = await getRouteDetails(from, to);

    let distance, duration, warning;
    if (routeDetails) {
        distance = routeDetails.distance;
        duration = routeDetails.duration;
    } else {
        // Fallback calculation
        distance = 350; // Average distance as a fallback
        duration = 350 * 1.5 * 60; // Approximate duration
        warning = `Le service de cartographie n'a pas pu calculer l'itinéraire précis. L'estimation est basée sur une distance approximative de ${distance} km.`;
    }

    // 2. Normalize weight to tonnes
    const weightInTonnes = weightUnit === 'kg' ? weight / 1000 : weight;

    // 3. Calculate base price
    const basePrice = distance * weightInTonnes * BASE_RATE_PER_TON_KM;

    // 4. Calculate surcharges
    let cargoSurcharge = 0;
    if (['frigorifique', 'dangereuse', 'liquide'].includes(cargoType)) {
      cargoSurcharge = SPECIAL_CARGO_SURCHARGE;
    }

    let seasonSurcharge = 0;
    if (season === 'pluvieuse') {
      seasonSurcharge = RAINY_SEASON_SURCHARGE;
    }

    // 5. Calculate discount
    let discount = 0;
    if (weightInTonnes > VOLUME_DISCOUNT_THRESHOLD_TONNES) {
      discount = VOLUME_DISCOUNT;
    }
    
    // 6. Calculate final price
    const surchargeMultiplier = 1 + cargoSurcharge + seasonSurcharge;
    const discountMultiplier = 1 - discount;
    const totalPrice = basePrice * surchargeMultiplier * discountMultiplier;

    return {
      basePrice: Math.round(basePrice),
      totalPrice: Math.round(totalPrice),
      distance,
      duration,
      surcharges: {
        cargo: cargoSurcharge * 100,
        season: seasonSurcharge * 100,
      },
      discount: discount * 100,
      warning,
    };
  }
);
