"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "@/lib/translations";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, AlertTriangle, Landmark, ShieldAlert, ArrowRight, Loader2, Navigation, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntelligenceInsight } from "@/lib/intelligence/types";
import { initializeIntelligenceEngine } from "@/lib/intelligence/engine";

export default function TransconnektIntelligence() {
  const { user, userData, loadingAuth } = useAuth();
  const { lang } = useTranslation();
  const router = useRouter();
  
  const [recommendations, setRecommendations] = useState<IntelligenceInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth || !user || !userData) return;

    setLoading(true);
    const userCtx = {
      uid: user.uid,
      role: (userData.role || "client") as any,
      companyId: userData.companyId,
      companyRole: userData.companyRole,
      documents: userData.documents || userData.companyDocuments,
      currentPrefecture: userData.currentPrefecture || userData.headquartersPrefecture || "Conakry"
    };

    const cleanup = initializeIntelligenceEngine(userCtx, (insights) => {
      setRecommendations(insights);
      setLoading(false);
    });

    return () => cleanup();
  }, [user, userData, loadingAuth]);

  if (loadingAuth || loading) {
    return (
      <Card className="rounded-3xl border border-indigo-950/20 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-slate-400">Analyse des données logistiques Firestore en temps réel...</span>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-slate-900/95 to-indigo-950/40 p-6 shadow-2xl backdrop-blur-md">
        <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <CardTitle className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-sky-300 to-emerald-400">
              TransConnekt Intelligence
            </CardTitle>
          </div>
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] uppercase tracking-widest px-3 py-1 font-bold shrink-0 flex items-center gap-1.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Moteur IA Actif
          </Badge>
        </CardHeader>
        <CardContent className="p-0 pt-3">
          <p className="text-xs text-slate-400">
            Moteur d'intelligence métier actif — Vos opérations logistiques sont sous contrôle. Aucun événement urgent détecté.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderMessage = (msg: string) => {
    if (msg.includes("🔴")) {
      const parts = msg.split("🔴");
      return (
        <>
          {parts[0]}
          <span className="inline-flex animate-pulse mr-1 text-[13px] leading-none select-none">🔴</span>
          {parts.slice(1).join("🔴")}
        </>
      );
    }
    return msg;
  };

  const pref = userData?.currentPrefecture || userData?.headquartersPrefecture || "Conakry";

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-slate-900/95 to-indigo-950/40 p-6 shadow-2xl backdrop-blur-md">
      <div className="absolute -right-32 -top-32 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -left-32 -bottom-32 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <CardHeader className="p-0 pb-5 flex flex-row items-center justify-between border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <CardTitle className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-sky-300 to-emerald-400">
              TransConnekt Intelligence
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Analyses prédictives et aide à la décision en temps réel.
          </CardDescription>
        </div>

        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] uppercase tracking-widest px-3 py-1 font-bold shrink-0 flex items-center gap-1.5 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          Moteur IA Actif
        </Badge>
      </CardHeader>

      <CardContent className="p-0 pt-5">
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((rec) => {
            let badgeStyle = "";
            let icon: React.ReactNode = null;
            let typeLabel = "";

            switch (rec.type) {
              case "attention":
                badgeStyle = "bg-red-500/10 text-red-400 border border-red-500/20";
                icon = <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
                typeLabel = rec.priorityLevel;
                break;
              case "alert":
                badgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
                typeLabel = rec.priorityLevel;
                break;
              case "saving":
                badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                icon = <Landmark className="w-4 h-4 text-emerald-400 shrink-0" />;
                typeLabel = "Économie";
                break;
              case "tracking":
                badgeStyle = "bg-sky-500/10 text-sky-400 border border-sky-500/20";
                icon = <Navigation className="w-4 h-4 text-sky-400 shrink-0" />;
                typeLabel = "Suivi";
                break;
              case "compliance":
                badgeStyle = rec.priorityLevel === "POSITIF" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                icon = rec.priorityLevel === "POSITIF" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />;
                typeLabel = "Conformité";
                break;
              default:
                badgeStyle = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
                icon = <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />;
                typeLabel = "Opportunité";
            }

            return (
              <div
                key={rec.id}
                className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-800/80 bg-[#0B0F19]/80 hover:bg-[#0D1527]/90 hover:border-indigo-500/30 transition-all duration-300 gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">{icon}</span>
                  <div className="space-y-1.5">
                    <Badge className={cn("text-[9px] uppercase tracking-wider px-2 py-0.5 font-bold rounded", badgeStyle)}>
                      {typeLabel}
                    </Badge>
                    <p className="text-xs text-slate-100 font-medium leading-relaxed">
                      {renderMessage(rec.message)}
                    </p>
                    {rec.id === "transporter-available-market" && (
                      <div className="mt-2 grid grid-cols-2 gap-2 pl-1 text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1 w-1 rounded-full bg-emerald-400" />
                          Localisation ({pref}) ✓
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1 w-1 rounded-full bg-emerald-400" />
                          Type de véhicule ✓
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1 w-1 rounded-full bg-emerald-400" />
                          Capacité de charge ✓
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <span className="h-1 w-1 rounded-full bg-emerald-400" />
                          Disponibilité & Profil ✓
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const target = rec.actionPath.startsWith('/') ? `/${lang}${rec.actionPath}` : rec.actionPath;
                      router.push(target);
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl gap-1 py-1 h-8 group-hover:translate-x-0.5 transition-all"
                  >
                    {rec.actionText}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
