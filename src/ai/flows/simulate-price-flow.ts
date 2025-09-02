
'use server';
/**
 * @fileOverview Un agent IA pour simuler les coûts de transport en Guinée.
 *
 * - simulatePrice - Une fonction qui gère le processus de simulation de prix.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import { SimulatePriceInputSchema, SimulatePriceOutputSchema, type SimulatePriceInput, type SimulatePriceOutput, PriceCalculatorOutputSchema } from '@/ai/types';
import { priceCalculatorTool } from '@/ai/tools/price-calculator';
import { formatDurationFromSeconds } from '@/lib/utils';

const prompt = ai.definePrompt({
  name: 'simulatePricePrompt',
  input: {schema: PriceCalculatorOutputSchema },
  output: {schema: z.object({ explanation: z.string().describe("Une brève explication de l'estimation, incluant les facteurs pris en compte.") })},
  tools: [priceCalculatorTool],
  prompt: `Vous êtes un expert en logistique et transport pour la Guinée.
En vous basant sur les détails du calcul fournis, rédigez une brève explication pour le client.
Mettez en avant les facteurs qui ont influencé le prix (type de marchandise, saison, etc.) ainsi que la durée estimée du trajet. La durée est fournie en secondes, vous devez la convertir dans un format lisible (heures, minutes).

{{#if warning}}
Commencez votre explication par cet avertissement important : "{{warning}}"
Puis continuez avec l'analyse des coûts.
{{/if}}

Les détails du calcul sont les suivants :
- Prix de base: {{basePrice}} GNF
- Prix final: {{totalPrice}} GNF
- Distance: {{distance}} km
- Durée en secondes: {{duration}}
- Surcharge Marchandise: {{surcharges.cargo}}%
- Surcharge Saison: {{surcharges.season}}%
- Remise Volume: {{discount}}%

Ne retournez que l'explication au format JSON, sans aucun texte supplémentaire avant ou après.`,
});

const simulatePriceFlow = ai.defineFlow(
  {
    name: 'simulatePriceFlow',
    inputSchema: SimulatePriceInputSchema,
    outputSchema: SimulatePriceOutputSchema,
  },
  async (input) => {
    // 1. Calculate the price using the deterministic tool
    const calculation = await priceCalculatorTool(input);

    let explanation = `L'estimation est basée sur la distance, le poids, le type de marchandise et la saison. Le trajet est d'environ ${formatDurationFromSeconds(calculation.duration)}. Les prix finaux peuvent varier.`;

    try {
        // 2. Try to generate a friendly explanation using the LLM
        // We pass the raw calculation data, including duration as a number
        const { output } = await prompt(calculation);

        if (output?.explanation) {
            explanation = output.explanation;
        }
    } catch (error) {
        console.warn("AI explanation generation failed, using default explanation.", error);
        // If AI fails, we proceed with the default explanation generated above.
    }
    
    // 3. Combine results and return
    return {
      minPrice: calculation.totalPrice, // Using a single price for now
      maxPrice: calculation.totalPrice,
      distance: calculation.distance,
      duration: calculation.duration,
      explanation: explanation,
      calculationDetails: {
        basePrice: calculation.basePrice,
        surcharges: calculation.surcharges,
        discount: calculation.discount,
        finalPrice: calculation.totalPrice,
        warning: calculation.warning,
      },
    };
  }
);

export async function simulatePrice(input: SimulatePriceInput): Promise<SimulatePriceOutput> {
  return simulatePriceFlow(input);
}
