
'use server';
/**
 * @fileOverview A flow to generate a hero image for the landing page.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// A high-quality, relevant fallback image in case generation fails.
const FALLBACK_IMAGE_URL = "https://i.ibb.co/3YvVyvM/truck-hero.jpg";

export const generateHeroImageFlow = ai.defineFlow(
  {
    name: 'generateHeroImageFlow',
    outputSchema: z.string(),
  },
  async () => {
    try {
      const { media } = await ai.generate({
        model: googleAI.model('imagen-4.0-fast-generate-001'),
        prompt:
          "Une photo cinématique d'un camion poids lourd moderne de couleur vive traversant un pont enjambant un fleuve dans un paysage luxuriant de la Guinée, au lever du soleil, avec une lumière chaude et dorée.",
        config: {
          aspectRatio: "16:9",
        }
      });
      // Genkit returns a data URI which can be used directly in the `src` of an image.
      return media.url;
    } catch (error) {
      console.error("Hero image generation failed, returning fallback:", error);
      // If there's any error (e.g., billing not enabled), return the reliable fallback URL.
      return FALLBACK_IMAGE_URL;
    }
  }
);

export async function generateHeroImage(): Promise<string> {
    return generateHeroImageFlow();
}
