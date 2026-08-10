"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, TrendingUp, Clock, Shield, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bid {
  id: string;
  transporterName: string;
  transporterId: string;
  amount: number;
  estimatedDuration?: string;
  rating?: number;
  completedJobs?: number;
  totalJobs?: number;
  vehicleType?: string;
  status: string;
}

interface OfferComparatorProps {
  bids: Bid[];
  onSelectBid: (bidId: string, transporterId: string) => void;
}

export default function OfferComparator({ bids, onSelectBid }: OfferComparatorProps) {
  const scoredBids = useMemo(() => {
    if (bids.length === 0) return [];

    const maxPrice = Math.max(...bids.map(b => b.amount));
    const minPrice = Math.min(...bids.map(b => b.amount));
    const priceRange = maxPrice - minPrice || 1;

    return bids.map(bid => {
      const rating = bid.rating || 4.0;
      const reliability = bid.totalJobs && bid.totalJobs > 0
        ? Math.round((bid.completedJobs || 0) / bid.totalJobs * 100)
        : 85;
      const priceFactor = 1 - ((bid.amount - minPrice) / priceRange); // lower price = higher score
      const etaFactor = bid.estimatedDuration ? (bid.estimatedDuration.includes("1") ? 1 : bid.estimatedDuration.includes("2") ? 0.7 : 0.5) : 0.6;

      const score = (rating / 5 * 0.3) + (reliability / 100 * 0.3) + (priceFactor * 0.25) + (etaFactor * 0.15);

      return {
        ...bid,
        rating,
        reliability,
        score: Math.round(score * 100),
      };
    }).sort((a, b) => b.score - a.score);
  }, [bids]);

  if (scoredBids.length < 2) return null;

  const bestBid = scoredBids[0];
  const secondBest = scoredBids[1];

  // Generate recommendation reason
  const getRecommendationReason = () => {
    const reasons: string[] = [];
    if (bestBid.reliability > secondBest.reliability) {
      reasons.push(`taux de livraison à temps ${bestBid.reliability - secondBest.reliability}% plus élevé`);
    }
    if (bestBid.rating > secondBest.rating) {
      reasons.push(`note client supérieure (${bestBid.rating.toFixed(1)} vs ${secondBest.rating.toFixed(1)})`);
    }
    if (bestBid.amount < secondBest.amount) {
      const savings = secondBest.amount - bestBid.amount;
      reasons.push(`économie de ${savings.toLocaleString("fr-FR")} GNF`);
    }
    if (bestBid.amount > secondBest.amount && reasons.length > 0) {
      reasons.unshift("prix légèrement supérieur");
    }
    return reasons.length > 0
      ? reasons.join(", mais ")
      : "meilleur équilibre qualité-prix-fiabilité";
  };

  return (
    <Card className="rounded-3xl border-indigo-500/20 bg-gradient-to-br from-slate-950 via-slate-900/95 to-indigo-950/40 shadow-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
              Comparateur d&apos;Offres TransConnekt
            </CardTitle>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">
            {scoredBids.length} offres
          </Badge>
        </div>
        <CardDescription className="text-[10px] text-slate-400">
          Algorithme IA de scoring multicritère : Note (30%) • Fiabilité (30%) • Prix (25%) • Délai (15%)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* Recommendation Banner */}
        <div className="mx-4 mt-4 mb-3 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-emerald-400">
                🏆 Recommandé : {bestBid.transporterName}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed capitalize">
                {getRecommendationReason()}.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left p-3 text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Transporteur</th>
                <th className="text-center p-3 text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Prix</th>
                <th className="text-center p-3 text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Délai</th>
                <th className="text-center p-3 text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Note</th>
                <th className="text-center p-3 text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Fiabilité</th>
                <th className="text-center p-3 text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Score</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {scoredBids.map((bid, idx) => {
                const isBest = idx === 0;
                return (
                  <tr
                    key={bid.id}
                    className={cn(
                      "border-b border-slate-800/30 transition-all hover:bg-slate-800/20",
                      isBest && "bg-emerald-500/5 border-l-2 border-l-emerald-500"
                    )}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center text-[10px] font-black text-white border border-slate-700 shrink-0">
                          {bid.transporterName.substring(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className={cn("font-bold text-slate-100", isBest && "text-emerald-300")}>
                            {bid.transporterName}
                          </p>
                          {bid.vehicleType && (
                            <p className="text-[9px] text-slate-500">{bid.vehicleType}</p>
                          )}
                        </div>
                        {isBest && (
                          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ml-1">
                            🏆 Meilleur
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold text-emerald-400">
                        {(bid.amount / 1000000).toFixed(1)} M
                      </span>
                      <span className="text-[9px] text-slate-500 block">GNF</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold text-slate-200 flex items-center justify-center gap-1">
                        <Clock size={11} className="text-slate-400" />
                        {bid.estimatedDuration || "2-3j"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold text-amber-400 flex items-center justify-center gap-0.5">
                        <Star size={11} fill="currentColor" />
                        {bid.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        "font-bold",
                        bid.reliability >= 95 ? "text-emerald-400" : bid.reliability >= 85 ? "text-sky-400" : "text-amber-400"
                      )}>
                        {bid.reliability}%
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              bid.score >= 80 ? "bg-emerald-500" : bid.score >= 60 ? "bg-sky-500" : "bg-amber-500"
                            )}
                            style={{ width: `${bid.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">{bid.score}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => onSelectBid(bid.id, bid.transporterId)}
                        className={cn(
                          "h-7 rounded-lg text-[10px] font-bold border-0 gap-1",
                          isBest
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        )}
                      >
                        Choisir <ArrowRight size={10} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
