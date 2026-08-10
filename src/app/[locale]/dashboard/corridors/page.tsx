"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Navigation, MapPin, Fuel, ShieldAlert, ShieldCheck, Clock, DollarSign, 
  Building2, AlertTriangle, Search, CheckCircle2, ChevronRight, Truck, Info, Loader2, Plus 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Corridor {
  id: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number;
  avgDurationHours: number;
  avgPriceGNF: number;
  borderCrossings: string[];
  tolls: { name: string; costGNF: number }[];
  checkpointsCount: number;
  safeParkings: string[];
  recentIncidentsCount: number;
  riskLevel: "Faible" | "Modéré" | "Élevé";
  historicalTripsCount: number;
}

const SEED_CORRIDORS: Omit<Corridor, "id">[] = [
  {
    name: "Corridor Conakry → Bamako (Mali)",
    from: "Conakry",
    to: "Bamako",
    distanceKm: 985,
    avgDurationHours: 32,
    avgPriceGNF: 12500000,
    borderCrossings: ["Kourremalé (Guinée - Mali)"],
    tolls: [
      { name: "Péage Coyah", costGNF: 50000 },
      { name: "Péage Linsan", costGNF: 50000 },
    ],
    checkpointsCount: 8,
    safeParkings: ["Parking Sécurisé Kankan", "Aire de Repos Siguiri", "Station Total Kourremalé"],
    recentIncidentsCount: 2,
    riskLevel: "Modéré",
    historicalTripsCount: 1420
  },
  {
    name: "Corridor Conakry → Dakar (Sénégal)",
    from: "Conakry",
    to: "Dakar",
    distanceKm: 1240,
    avgDurationHours: 38,
    avgPriceGNF: 16800000,
    borderCrossings: ["Poste Frontière Bhoundou-Fourdou (Guinée - Sénégal)"],
    tolls: [
      { name: "Péage Coyah", costGNF: 50000 },
      { name: "Péage Mamou", costGNF: 50000 },
    ],
    checkpointsCount: 11,
    safeParkings: ["Parking Poids Lourd Labé", "Station Shell Tambacounda"],
    recentIncidentsCount: 1,
    riskLevel: "Faible",
    historicalTripsCount: 890
  },
  {
    name: "Corridor Conakry → Abidjan (Côte d'Ivoire)",
    from: "Conakry",
    to: "Abidjan",
    distanceKm: 1450,
    avgDurationHours: 44,
    avgPriceGNF: 19500000,
    borderCrossings: ["Poste Gbapleu (Guinée - Côte d'Ivoire)"],
    tolls: [
      { name: "Péage Coyah", costGNF: 50000 },
      { name: "Péage Nzérékoré", costGNF: 50000 }
    ],
    checkpointsCount: 14,
    safeParkings: ["Parking Logistique Man", "Aire Sécurisée Yamoussoukro"],
    recentIncidentsCount: 3,
    riskLevel: "Modéré",
    historicalTripsCount: 650
  },
  {
    name: "Corridor Conakry → Freetown (Sierra Leone)",
    from: "Conakry",
    to: "Freetown",
    distanceKm: 310,
    avgDurationHours: 9,
    avgPriceGNF: 4800000,
    borderCrossings: ["Poste Pamelap (Guinée - Sierra Leone)"],
    tolls: [
      { name: "Péage Pamelap", costGNF: 35000 }
    ],
    checkpointsCount: 4,
    safeParkings: ["Parking Douane Pamelap", "Aire Kambia"],
    recentIncidentsCount: 0,
    riskLevel: "Faible",
    historicalTripsCount: 2150
  }
];

export default function RegionalCorridorsPage() {
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCorridor, setSelectedCorridor] = useState<Corridor | null>(null);

  // REAL FIRESTORE LISTENERS & SEEDING
  useEffect(() => {
    const corridorsRef = collection(db, "corridors");

    const unsub = onSnapshot(corridorsRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const seed of SEED_CORRIDORS) {
          await addDoc(corridorsRef, {
            ...seed,
            createdAt: Timestamp.now()
          });
        }
      } else {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Corridor[];
        setCorridors(list);
        if (list.length > 0 && !selectedCorridor) {
          setSelectedCorridor(list[0]);
        }
        setLoading(false);
      }
    }, (err) => {
      console.error("Firestore corridors listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredCorridors = corridors.filter(c =>
    (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.from || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.to || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Navigation className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Corridors Logistiques TransConnekt
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-bold uppercase">
                  Sous-Région (Firestore Sync)
                </Badge>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Base de données des axes routiers internationaux : péages, douanes, temps de transit & sécurité.
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CORRIDORS LIST */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un corridor (ex: Bamako, Dakar)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-3">
              {filteredCorridors.map((c) => {
                const isSelected = selectedCorridor?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCorridor(c)}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer transition-all space-y-2 select-none shadow-sm",
                      isSelected
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/50"
                        : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {c.name}
                      </h3>
                      <Badge className={cn(
                        "text-[9px] font-bold uppercase px-2 py-0.5",
                        c.riskLevel === "Faible" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
                        c.riskLevel === "Modéré" && "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
                        c.riskLevel === "Élevé" && "bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400"
                      )}>
                        Risque {c.riskLevel}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Distance</span>
                        <span className="font-bold text-slate-900 dark:text-white">{c.distanceKm} km</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Durée Moy.</span>
                        <span className="font-bold text-slate-900 dark:text-white">{c.avgDurationHours}h</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Prix Moy.</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{(c.avgPriceGNF / 1000000).toFixed(1)}M GNF</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CORRIDOR DETAILS SHOWCASE */}
          {selectedCorridor && (
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedCorridor.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Fiche Technique Officielle & Métriques Logistiques (Firestore Sync)
                    </p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 font-mono text-xs font-bold">
                    {selectedCorridor.historicalTripsCount} voyages enregistrés
                  </Badge>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 block">Distance Totale</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{selectedCorridor.distanceKm} km</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 block">Temps Moyen Transit</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{selectedCorridor.avgDurationHours} heures</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 block">Tarif Moyen Fret</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{(selectedCorridor.avgPriceGNF / 1000000).toFixed(1)}M GNF</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 block">Contrôles Routiers</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{selectedCorridor.checkpointsCount} postes</span>
                  </div>
                </div>

                {/* Border Crossings & Tolls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={14} className="text-indigo-500" /> Postes Douaniers & Frontières
                    </h4>
                    <div className="space-y-1">
                      {(selectedCorridor.borderCrossings || []).map((b, i) => (
                        <p key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {b}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Fuel size={14} className="text-amber-500" /> Péages Identifiés
                    </h4>
                    <div className="space-y-1">
                      {(selectedCorridor.tolls || []).map((t, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <span>🛣️ {t.name}</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{t.costGNF.toLocaleString("fr-FR")} GNF</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Safe Parkings & Rest Areas */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" /> Parkings & Aides au Repos Sécurisés
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(selectedCorridor.safeParkings || []).map((p, i) => (
                      <Badge key={i} className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/20 text-xs font-semibold px-2.5 py-1">
                        🅿️ {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
