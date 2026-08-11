"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTranslation } from "@/lib/translations";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, AlertTriangle, Landmark, ShieldAlert, ArrowRight, Loader2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { FRENCH_FALLBACKS } from "@/lib/translations";

export interface Recommendation {
  id: string;
  type: "attention" | "alert" | "saving" | "tracking" | "compliance" | "opportunity";
  priority: number; // 1 = Critical, 2 = High, 3 = Medium, 4 = Info
  message: string;
  actionText: string;
  actionPath: string;
}

const LOCAL_INTEL_MAP: Record<string, string> = {
  intel_title: "TransConnekt Intelligence",
  intel_subtitle: "Analyses prédictives et aide à la décision en temps réel.",
  intel_active_badge: "Moteur IA Actif",
  intel_attention: "Attention",
  intel_alert: "Alerte",
  intel_saving: "Économie",
  intel_tracking: "Suivi",
  intel_compliance: "Conformité",
  intel_opportunity: "Opportunité",
  intel_action_validate: "Vérifier",
  intel_action_view_offer: "Voir l'offre",
  intel_action_track: "Suivre",
  intel_action_manage_fleet: "Gérer la flotte",
  intel_action_view_requests: "Voir les demandes",
  intel_action_view_missions: "Voir les missions",
  msg_admin_verification: "🔴 {count} inscription(s) d'entreprise(s) nécessite(nt) votre validation administrative.",
  msg_admin_stalled: "📍 Le camion {truck} ({driver}) n'a émis aucun signal GPS depuis {minutes} minutes.",
  msg_admin_pending_requests: "⚠️ {count} demande(s) de transport en attente d'attribution par les transporteurs.",
  msg_client_savings: "💰 Économie potentielle de {amount} GNF calculée en sélectionnant la meilleure offre pour '{nature}'.",
  msg_client_delay_risk: "⚠️ Signalement d'incident ou retard potentiel détecté pour la livraison '{nature}'.",
  msg_client_new_offers: "💡 {count} offre(s) de transporteur reçue(s) pour votre demande '{nature}'.",
  msg_transporter_matches: "💡 {count} demande(s) de fret disponible(s) correspondent à vos axes de transport.",
  msg_transporter_insurance: "📄 Le document '{truck}' ({registration}) expire dans {days} jour(s).",
  msg_transporter_demand: "📈 Forte demande de fret enregistrée sur l'axe {route} ({count} cargaison(s) en attente)."
};

export default function TransconnektIntelligence() {
  const { user, userData, loadingAuth } = useAuth();
  const { lang } = useTranslation();
  const router = useRouter();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const getTranslation = (key: string, vars?: Record<string, string | number>) => {
    const lk = key.toLowerCase();
    let raw: string = LOCAL_INTEL_MAP[lk] || (FRENCH_FALLBACKS && (FRENCH_FALLBACKS as any)[lk]) || key;

    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        raw = raw.replace(`{${k}}`, String(v));
      });
    }
    return raw;
  };

  useEffect(() => {
    if (loadingAuth || !user || !userData) return;

    setLoading(true);
    const role = userData.role || "client";
    const unsubscribes: Array<() => void> = [];
    const insightsMap = new Map<string, Recommendation>();

    const updateInsights = () => {
      const sorted = Array.from(insightsMap.values())
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 4);
      setRecommendations(sorted);
      setLoading(false);
    };

    try {
      if (role === "admin") {
        const unverifiedQ = query(collection(db, "users"), where("isVerified", "==", false), limit(25));
        const unsubUnverified = onSnapshot(unverifiedQ, (snap) => {
          if (snap.size > 0) {
            insightsMap.set("admin-unverified", {
              id: "admin-unverified",
              type: "attention",
              priority: 1,
              message: getTranslation("msg_admin_verification", { count: snap.size }),
              actionText: getTranslation("intel_action_validate"),
              actionPath: "/dashboard/admin/verification"
            });
          } else {
            insightsMap.delete("admin-unverified");
          }
          updateInsights();
        }, (err) => console.error("Intel Admin unverified error:", err));
        unsubscribes.push(unsubUnverified);

        const pendingQ = query(collection(db, "requests"), where("status", "==", "En attente"), limit(25));
        const unsubPending = onSnapshot(pendingQ, (snap) => {
          if (snap.size > 0) {
            insightsMap.set("admin-pending", {
              id: "admin-pending",
              type: "alert",
              priority: 2,
              message: getTranslation("msg_admin_pending_requests", { count: snap.size }),
              actionText: getTranslation("intel_action_view_requests"),
              actionPath: "/dashboard/admin/requests"
            });
          } else {
            insightsMap.delete("admin-pending");
          }
          updateInsights();
        }, (err) => console.error("Intel Admin pending error:", err));
        unsubscribes.push(unsubPending);

        const activeQ = query(collection(db, "requests"), where("status", "==", "En cours"), limit(10));
        const unsubActive = onSnapshot(activeQ, (snap) => {
          let foundStalled = false;
          snap.docs.forEach((docSnap) => {
            const req = docSnap.data();
            const lastTs = req.currentLocation?.timestamp || req.updatedAt?.seconds * 1000 || req.lastUpdated;
            if (lastTs) {
              const mins = Math.floor((Date.now() - Number(lastTs)) / 60000);
              if (mins > 45) {
                foundStalled = true;
                const truck = req.vehicleRegistration || req.vehicleType || req.nature || "Camion";
                const driver = req.driverName || req.transporterName || "Chauffeur";
                insightsMap.set(`admin-stalled-${docSnap.id}`, {
                  id: `admin-stalled-${docSnap.id}`,
                  type: "tracking",
                  priority: 1,
                  message: getTranslation("msg_admin_stalled", { truck, driver, minutes: mins }),
                  actionText: getTranslation("intel_action_track"),
                  actionPath: "/dashboard/admin/tracking"
                });
              }
            }
          });
          if (!foundStalled) {
            Array.from(insightsMap.keys()).forEach((k) => {
              if (k.startsWith("admin-stalled-")) insightsMap.delete(k);
            });
          }
          updateInsights();
        }, (err) => console.error("Intel Admin active error:", err));
        unsubscribes.push(unsubActive);

      } else if (role === "client" || role === "client-company") {
        const clientReqQ = query(collection(db, "requests"), where("clientId", "==", user.uid), limit(25));
        const unsubClientReq = onSnapshot(clientReqQ, (snap) => {
          if (snap.empty) {
            insightsMap.set("client-empty", {
              id: "client-empty",
              type: "opportunity",
              priority: 4,
              message: "💡 Publiez votre première demande de transport pour recevoir des offres de nos transporteurs vérifiés.",
              actionText: "Créer une demande",
              actionPath: "/dashboard/client/requests"
            });
          } else {
            insightsMap.delete("client-empty");
            
            snap.docs.forEach((docSnap) => {
              const req = docSnap.data();
              const reqId = docSnap.id;

              if (req.status === "En cours" || req.status === "en_route") {
                insightsMap.set(`client-transit-${reqId}`, {
                  id: `client-transit-${reqId}`,
                  type: "tracking",
                  priority: 2,
                  message: `🚚 Votre cargaison '${req.nature || 'Marchandises'}' (${req.from || 'Départ'} → ${req.to || 'Arrivée'}) est actuellement en transit.`,
                  actionText: getTranslation("intel_action_track"),
                  actionPath: `/tracking/${reqId}`
                });
              }

              if (req.status === "incident" || req.incidentReport) {
                insightsMap.set(`client-incident-${reqId}`, {
                  id: `client-incident-${reqId}`,
                  type: "attention",
                  priority: 1,
                  message: `🔴 Signalement d'incident enregistré sur votre course '${req.nature || 'Marchandises'}'.`,
                  actionText: "Voir détails",
                  actionPath: `/tracking/${reqId}`
                });
              }
            });
          }
          updateInsights();
        }, (err) => console.error("Intel Client req error:", err));
        unsubscribes.push(unsubClientReq);

      } else if (role === "transporter" || role === "transporter-company") {
        const availableQ = query(collection(db, "requests"), where("status", "==", "En attente"), limit(25));
        const unsubAvailable = onSnapshot(availableQ, (snap) => {
          if (snap.size > 0) {
            const routes: Record<string, number> = {};
            snap.docs.forEach((d) => {
              const req = d.data();
              if (req.from && req.to) {
                const key = `${req.from} - ${req.to}`;
                routes[key] = (routes[key] || 0) + 1;
              }
            });

            insightsMap.set("transporter-matches-1", {
              id: "transporter-matches-1",
              type: "opportunity",
              priority: 3,
              message: getTranslation("msg_transporter_matches", { count: snap.size }),
              actionText: getTranslation("intel_action_view_missions"),
              actionPath: role === "transporter" ? "/dashboard/transporter/offers" : "/dashboard/transporter-company/offers"
            });

            const topRoute = Object.entries(routes).sort((a, b) => b[1] - a[1])[0];
            if (topRoute && topRoute[1] >= 2) {
              insightsMap.set("transporter-demand-1", {
                id: "transporter-demand-1",
                type: "saving",
                priority: 3,
                message: getTranslation("msg_transporter_demand", { route: topRoute[0], count: topRoute[1] }),
                actionText: getTranslation("intel_action_view_requests"),
                actionPath: role === "transporter" ? "/dashboard/transporter/offers" : "/dashboard/transporter-company/offers"
              });
            }
          } else {
            insightsMap.delete("transporter-matches-1");
            insightsMap.delete("transporter-demand-1");
          }
          updateInsights();
        }, (err) => console.error("Intel Transporter market error:", err));
        unsubscribes.push(unsubAvailable);

        let foundExpiringDoc = false;
        const docs = userData.documents || userData.companyDocuments || {};
        for (const [key, dInfo] of Object.entries(docs)) {
          const info = dInfo as any;
          if (info?.expiryDate) {
            const expDate = info.expiryDate.toDate ? info.expiryDate.toDate() : new Date(info.expiryDate);
            const diffMs = expDate.getTime() - Date.now();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays < 45) {
              foundExpiringDoc = true;
              const docTitle = key === "license" ? "Permis de conduire" : key === "fleetInsurance" ? "Assurance Flotte" : "Attestation transport";
              insightsMap.set("transporter-expiry-1", {
                id: "transporter-expiry-1",
                type: "compliance",
                priority: 2,
                message: getTranslation("msg_transporter_insurance", { truck: docTitle, registration: info.docNumber || "N/A", days: diffDays }),
                actionText: getTranslation("intel_action_manage_fleet"),
                actionPath: role === "transporter" ? "/dashboard/transporter/fleet" : "/dashboard/transporter-company/fleet"
              });
              break;
            }
          }
        }

        if (!foundExpiringDoc) {
          insightsMap.set("transporter-expiry-ok", {
            id: "transporter-expiry-ok",
            type: "compliance",
            priority: 4,
            message: "✅ Vos documents administratifs et de conformité sont 100% à jour.",
            actionText: getTranslation("intel_action_manage_fleet"),
            actionPath: role === "transporter" ? "/dashboard/transporter/fleet" : "/dashboard/transporter-company/fleet"
          });
        }
        updateInsights();
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error setting up intelligence engine listeners:", err);
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, userData, loadingAuth]);

  if (loadingAuth || loading) {
    return (
      <Card className="rounded-3xl border border-indigo-950/20 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-slate-400">Analyse des données Firestore en temps réel...</span>
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
                typeLabel = "Attention";
                break;
              case "alert":
                badgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
                typeLabel = "Alerte";
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
                badgeStyle = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                icon = <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0" />;
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
