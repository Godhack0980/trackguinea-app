"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Zap, DollarSign, ArrowRight, ShieldCheck, Star, Clock, Truck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransporterOption {
  id: string;
  name: string;
  rating: number;
  completedMissions: number;
  reliabilityRate: number; // 0-100%
  vehicleModel: string;
  vehicleCapacityTonnes: number;
  priceGNF: number;
  estimatedDays: number;
  insuranceIncluded: boolean;
}

interface SmartMatchingRecommenderProps {
  origin: string;
  destination: string;
  cargoType: string;
  weightTonnes: number;
  pickupDate: string;
  transporters: TransporterOption[];
  onSelectOption?: (option: TransporterOption, matchType: "recommended" | "economic" | "fastest") => void;
}

export default function SmartMatchingRecommender({
  origin,
  destination,
  cargoType,
  weightTonnes,
  pickupDate,
  transporters,
  onSelectOption
}: SmartMatchingRecommenderProps) {

  // Calculate matching & categorize into Gold (Recommended), Silver (Economic), Bronze (Fastest)
  const matches = useMemo(() => {
    if (!transporters || transporters.length === 0) return null;

    // Filter vehicles that can handle the weight
    const valid = transporters.filter(t => t.vehicleCapacityTonnes >= weightTonnes);
    const pool = valid.length > 0 ? valid : transporters;

    // 1. Economic: Lowest price
    const sortedByPrice = [...pool].sort((a, b) => a.priceGNF - b.priceGNF);
    const economic = sortedByPrice[0];

    // 2. Fastest: Lowest days (break ties by rating)
    const sortedBySpeed = [...pool].sort((a, b) => a.estimatedDays - b.estimatedDays || b.rating - a.rating);
    const fastest = sortedBySpeed[0];

    // 3. Recommended: Highest composite score (Quality/Price/Reliability)
    const minPrice = Math.min(...pool.map(p => p.priceGNF));
    const maxPrice = Math.max(...pool.map(p => p.priceGNF));
    const priceRange = maxPrice - minPrice || 1;

    const scored = pool.map(p => {
      const priceScore = 1 - (p.priceGNF - minPrice) / priceRange; // 0 to 1
      const speedScore = p.estimatedDays === 1 ? 1 : p.estimatedDays === 2 ? 0.8 : 0.6;
      const qualityScore = (p.rating / 5) * 0.4 + (p.reliabilityRate / 100) * 0.6;
      const compositeScore = (qualityScore * 0.45) + (priceScore * 0.35) + (speedScore * 0.20);
      return { option: p, score: compositeScore };
    }).sort((a, b) => b.score - a.score);

    const recommended = scored[0].option;

    return {
      recommended,
      economic: economic.id === recommended.id && pool.length > 1 ? sortedByPrice[1] : economic,
      fastest: fastest.id === recommended.id && pool.length > 1 ? sortedBySpeed[1] : fastest
    };
  }, [transporters, weightTonnes]);

  if (!matches) return null;

  return (
    <Card className="border-indigo-500/20 dark:border-indigo-500/30 bg-white dark:bg-slate-950 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-gradient-to-r dark:from-slate-950 dark:to-indigo-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Matching Intelligent TransConnekt
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[9px] uppercase font-bold">
                  Algorithme IA
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Propositions optimales pour {origin} → {destination} ({weightTonnes}T, {cargoType})
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🥇 RECOMMENDED */}
        <div className="rounded-2xl border-2 border-amber-400/60 dark:border-amber-400/40 bg-amber-50/30 dark:bg-gradient-to-b dark:from-amber-500/10 dark:to-slate-900/60 p-4 relative flex flex-col justify-between shadow-sm">
          <div className="absolute -top-3 left-4 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
            <Trophy size={12} /> 🥇 Meilleur Choix IA
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {matches.recommended.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {matches.recommended.vehicleModel} ({matches.recommended.vehicleCapacityTonnes}T)
                </p>
              </div>
              <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 font-black text-xs">
                ⭐ {matches.recommended.rating.toFixed(1)}
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Prix :</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{matches.recommended.priceGNF.toLocaleString("fr-FR")} GNF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Délai estimé :</span>
                <span className="font-bold text-slate-900 dark:text-white">{matches.recommended.estimatedDays} jour(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Fiabilité :</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{matches.recommended.reliabilityRate}% de livraisons à temps</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-900 dark:text-amber-300 font-medium">
              💡 <strong>Raison :</strong> Excellent équilibre qualité-prix, fiabilité éprouvée ({matches.recommended.completedMissions} missions réussies).
            </div>
          </div>

          <Button
            onClick={() => onSelectOption?.(matches.recommended, "recommended")}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl h-9 gap-1 shadow border-0"
          >
            Sélectionner <ArrowRight size={12} />
          </Button>
        </div>

        {/* 🥈 ECONOMIC */}
        <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 relative flex flex-col justify-between shadow-sm">
          <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
            <DollarSign size={12} /> 🥈 Alternative Économique
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {matches.economic.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {matches.economic.vehicleModel} ({matches.economic.vehicleCapacityTonnes}T)
                </p>
              </div>
              <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 font-bold text-xs">
                ⭐ {matches.economic.rating.toFixed(1)}
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Prix le plus bas :</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{matches.economic.priceGNF.toLocaleString("fr-FR")} GNF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Délai estimé :</span>
                <span className="font-bold text-slate-900 dark:text-white">{matches.economic.estimatedDays} jour(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Économie vs Recommandé :</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  -{(matches.recommended.priceGNF - matches.economic.priceGNF).toLocaleString("fr-FR")} GNF
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-900 dark:text-emerald-300 font-medium">
              💡 <strong>Raison :</strong> Tarif le plus avantageux pour réduire votre budget fret.
            </div>
          </div>

          <Button
            onClick={() => onSelectOption?.(matches.economic, "economic")}
            variant="outline"
            className="w-full mt-4 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl h-9 gap-1"
          >
            Choisir l'Économie <ArrowRight size={12} />
          </Button>
        </div>

        {/* 🥉 FASTEST */}
        <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 relative flex flex-col justify-between shadow-sm">
          <div className="absolute -top-3 left-4 bg-sky-600 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full shadow flex items-center gap-1">
            <Zap size={12} /> 🥉 Alternative Rapide
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {matches.fastest.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {matches.fastest.vehicleModel} ({matches.fastest.vehicleCapacityTonnes}T)
                </p>
              </div>
              <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 font-bold text-xs">
                ⭐ {matches.fastest.rating.toFixed(1)}
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Délai express :</span>
                <span className="font-black text-sky-600 dark:text-sky-400">{matches.fastest.estimatedDays} jour(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Prix :</span>
                <span className="font-bold text-slate-900 dark:text-white">{matches.fastest.priceGNF.toLocaleString("fr-FR")} GNF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Fiabilité :</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">{matches.fastest.reliabilityRate}%</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-900 dark:text-sky-300 font-medium">
              💡 <strong>Raison :</strong> Livraison prioritaire la plus rapide pour vos urgences.
            </div>
          </div>

          <Button
            onClick={() => onSelectOption?.(matches.fastest, "fastest")}
            variant="outline"
            className="w-full mt-4 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl h-9 gap-1"
          >
            Choisir l'Express <ArrowRight size={12} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
