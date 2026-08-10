"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Pause, AlertTriangle, CheckCircle2, MapPin, Truck, Phone, 
  Wifi, WifiOff, ShieldCheck, Camera, Navigation, Clock, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import DeliveryPod from "@/components/delivery-pod";
import { useToast } from "@/hooks/use-toast";

export default function DriverMobileMissionPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [activeMission, setActiveMission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [missionState, setMissionState] = useState<"not_started" | "in_progress" | "paused" | "completed">("not_started");
  const [isOnline, setIsOnline] = useState(true);
  const [offlinePendingEvents, setOfflinePendingEvents] = useState<number>(0);
  const [podOpen, setPodOpen] = useState(false);

  // Network listener for offline sync mode
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      if (offlinePendingEvents > 0) {
        setOfflinePendingEvents(0);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlinePendingEvents]);

  // REAL FIRESTORE LISTENERS FOR DRIVER'S ACTIVE MISSION
  useEffect(() => {
    if (!user) return;
    const reqRef = collection(db, "requests");
    const q = query(
      reqRef,
      where("status", "in", ["En cours", "En attente", "Attribué"]),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
        setActiveMission(docData);
        if (docData.status === "En cours") setMissionState("in_progress");
      } else {
        setActiveMission(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore driver mission error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleStateChange = async (newState: "in_progress" | "paused") => {
    setMissionState(newState);
    if (!isOnline) {
      setOfflinePendingEvents(prev => prev + 1);
    }

    if (activeMission?.id) {
      try {
        await updateDoc(doc(db, "requests", activeMission.id), {
          status: newState === "in_progress" ? "En cours" : "En Pause",
          updatedAt: Timestamp.now()
        });
        toast({
          title: newState === "in_progress" ? "Trajet Démarré !" : "Trajet Mis en Pause",
          description: "Le statut a été mis à jour dans Firestore."
        });
      } catch (err) {
        console.error("Update mission status error:", err);
      }
    }
  };

  const handleReportIncident = async () => {
    if (activeMission?.id) {
      try {
        await updateDoc(doc(db, "requests", activeMission.id), {
          incidentReported: true,
          incidentTime: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast({
          variant: "destructive",
          title: "Alerte Incident Transmise !",
          description: "Le centre de contrôle et le client ont été notifiés."
        });
      } catch (err) {
        console.error("Incident report error:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-lg mx-auto space-y-5">
      {/* ONLINE / OFFLINE NETWORK BAR */}
      <div className={cn(
        "p-2.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all border",
        isOnline 
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
      )}>
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
          <span>{isOnline ? "Connecté au réseau (Sync 100%)" : "Mode Hors Connexion Activé"}</span>
        </div>
        {!isOnline && (
          <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">
            {offlinePendingEvents} en attente
          </Badge>
        )}
      </div>

      {/* MISSION CARD HEADER */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
        </div>
      ) : (
        <Card className="border-2 border-indigo-500/40 bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl">
          <CardHeader className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="bg-indigo-500 text-white font-black text-[10px] uppercase mb-1">
                  Mission Actuelle #{activeMission?.id ? activeMission.id.substring(0, 8) : "TC-452"}
                </Badge>
                <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                  {activeMission?.from || "Conakry"} <Navigation size={16} className="text-indigo-400" /> {activeMission?.to || "Bamako"}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  Cargaison : {activeMission?.nature || "20T Ciment"} • {activeMission?.vehicleType || "Camion TG-240-B"}
                </CardDescription>
              </div>
              <a 
                href="tel:+224612000102"
                className="p-3 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center shadow-lg"
              >
                <Phone size={18} />
              </a>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Arrivée Estimée (ETA)</span>
                <span className="font-black text-amber-400 text-sm">Aujourd'hui • 14:35</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Statut Firestore</span>
                <span className={cn(
                  "font-black text-xs uppercase block",
                  missionState === "not_started" && "text-slate-400",
                  missionState === "in_progress" && "text-emerald-400",
                  missionState === "paused" && "text-amber-400",
                  missionState === "completed" && "text-sky-400"
                )}>
                  {missionState === "not_started" && "⚪ Non Démarré"}
                  {missionState === "in_progress" && "🟢 En Transit"}
                  {missionState === "paused" && "🟠 En Pause / Arrêt"}
                  {missionState === "completed" && "🔵 Terminé"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GIANT DRIVER ACTION BUTTONS */}
      <div className="space-y-3.5 pt-2">
        {missionState !== "in_progress" && missionState !== "completed" && (
          <Button
            onClick={() => handleStateChange("in_progress")}
            className="w-full h-20 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/20 gap-3 border-0"
          >
            <Play className="w-8 h-8 fill-current" /> DÉMARRER LE TRAJET
          </Button>
        )}

        {missionState === "in_progress" && (
          <Button
            onClick={() => handleStateChange("paused")}
            className="w-full h-16 rounded-3xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base shadow-xl gap-3 border-0"
          >
            <Pause className="w-6 h-6 fill-current" /> PAUSE / ARRÊT EN ROUTE
          </Button>
        )}

        {missionState === "paused" && (
          <Button
            onClick={() => handleStateChange("in_progress")}
            className="w-full h-16 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-base shadow-xl gap-3 border-0"
          >
            <Play className="w-6 h-6 fill-current" /> REPRENDRE LA ROUTE
          </Button>
        )}

        {/* INCIDENT BUTTON */}
        <Button
          variant="outline"
          onClick={handleReportIncident}
          className="w-full h-14 rounded-3xl border-2 border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-black text-sm gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-rose-500" /> SIGNALER UN INCIDENT / PANNE
        </Button>

        {/* POD DELIVERY CONFIRMATION BUTTON */}
        <Button
          onClick={() => setPodOpen(true)}
          className="w-full h-20 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-600/30 gap-3 border-0 mt-4"
        >
          <CheckCircle2 className="w-8 h-8" /> LIVRAISON EFFECTUÉE (POD)
        </Button>
      </div>

      {/* DELIVERY POD MODAL */}
      <DeliveryPod
        shipmentId={activeMission?.id || "shipment-452"}
        requestId={activeMission?.id || "req-452"}
        isOpen={podOpen}
        onClose={() => setPodOpen(false)}
        onSuccess={() => {
          setPodOpen(false);
          setMissionState("completed");
        }}
      />
    </div>
  );
}
