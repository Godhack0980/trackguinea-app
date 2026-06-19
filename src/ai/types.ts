
import { z } from "zod";
import type { Timestamp } from "firebase/firestore";

/**
 * @fileOverview Types and schemas for AI flows.
 */

// Represents a location document from Firestore
export interface Location {
    id: string;
    name: string;
    distance: number;
}


// Schema for the price simulation flow input.
export const SimulatePriceInputSchema = z.object({
  from: z.string().min(1, "Le point de départ est requis.").describe('Le point de départ.'),
  to: z.string().min(1, "La ville d'arrivée est requise.").describe("La ville d'arrivée en Guinée."),
  weight: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Le poids doit être un nombre positif.")
  ),
  weightUnit: z.enum(['kg', 'tonne']).default('tonne').describe("L'unité de poids (kg ou tonne)."),
  cargoType: z.enum(['normale', 'fragile', 'frigorifique', 'liquide', 'dangereuse']).default('normale').describe('Le type de marchandise.'),
  season: z.enum(['seche', 'pluvieuse']).default('seche').describe('La saison actuelle.'),
}).refine(data => data.from !== data.to, {
  message: "La ville de départ et d'arrivée doivent être différentes.",
  path: ["to"],
});
export type SimulatePriceInput = z.infer<typeof SimulatePriceInputSchema>;

// Schema for the price simulation flow output.
export const SimulatePriceOutputSchema = z.object({
  minPrice: z.number().describe('Le prix minimum estimé en Francs Guinéens (GNF).'),
  maxPrice: z.number().describe('Le prix maximum estimé en Francs Guinéens (GNF).'),
  distance: z.number().describe('La distance approximative du trajet en kilomètres (km).'),
  duration: z.number().describe('La durée approximative du trajet en secondes.'),
  explanation: z.string().describe("Une brève explication de l'estimation, incluant les facteurs pris en compte."),
  calculationDetails: z.object({
    basePrice: z.number(),
    surcharges: z.object({
        cargo: z.number(),
        season: z.number()
    }),
    discount: z.number(),
    finalPrice: z.number(),
    warning: z.string().optional()
  }).optional()
});
export type SimulatePriceOutput = z.infer<typeof SimulatePriceOutputSchema>;

// Schema for the Price Calculator Tool
export const PriceCalculatorOutputSchema = z.object({
  basePrice: z.number(),
  totalPrice: z.number(),
  distance: z.number(),
  duration: z.number(),
  surcharges: z.object({
    cargo: z.number(),
    season: z.number(),
  }),
  discount: z.number(),
  warning: z.string().optional().describe("Un avertissement si le calcul est approximatif."),
});
export type PriceCalculatorOutput = z.infer<typeof PriceCalculatorOutputSchema>;

// Schema for creating a transport request.
export const CreateTransportRequestSchema = z.object({
  nature: z.string().min(3, { message: "La nature du colis est requise." }),
  from: z.string().min(1, "Le lieu de départ est requis."),
  to: z.string().min(1, "Le lieu d'arrivée est requis."),
  weight: z.number().positive({ message: "Le poids doit être un nombre positif."}),
  weightUnit: z.enum(['kg', 'tonne']),
  date: z.date({ required_error: "La date d'enlèvement est requise." }),
}).refine(data => data.from !== data.to, {
  message: "Le départ et l'arrivée ne peuvent pas être identiques.",
  path: ["to"],
});
export type CreateTransportRequestInput = z.infer<typeof CreateTransportRequestSchema>;


// Represents a transport request document in Firestore.
export interface TransportRequest {
  id: string;
  from: string;
  to: string;
  nature: string;
  weight: number;
  weightUnit: 'kg' | 'tonne';
  date: Timestamp;
  status: 'En attente' | 'En cours' | 'Livré' | 'Terminé' | 'Annulé' | 'Annulation demandée';
  clientId: string;
  clientName: string;
  createdAt: Timestamp;
  distance?: number;
  duration?: number;
  applicants?: string[];
  assignedTo?: string;
  transporterName?: string;
  rating?: number;
  comment?: string;
  cancellationReason?: string;
  cancellationDocumentUrl?: string;
  previousStatus?: 'En attente' | 'En cours';
}
