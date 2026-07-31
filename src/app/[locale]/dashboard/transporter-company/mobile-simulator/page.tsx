"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, query, where, onSnapshot, updateDoc, doc, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, MapPin, Camera, Wifi, WifiOff, RefreshCw, Landmark, ArrowRight, Loader2, Sparkles, CheckCircle } from "lucide-react";

export default function MobileSimulatorPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Mobile Stats
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  // Mobile Money
  const [walletBalance, setWalletBalance] = useState(380000); // 380 000 GNF
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [momoOperator, setMomoOperator] = useState("Orange"); // Orange vs MTN

  // POD uploading
  const [podFile, setPodFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const companyId = userData?.companyId || user?.uid;

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineQueue]);

  // Load offline queue from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem("tg_offline_queue");
    if (cached) {
      setOfflineQueue(JSON.parse(cached));
    }
  }, []);

  // Listen to active missions
  useEffect(() => {
    if (!companyId) return;

    const bidsQuery = query(
      collection(db, "bids"),
      where("transporterId", "==", companyId),
      where("status", "==", "Accepté")
    );

    const unsubBids = onSnapshot(bidsQuery, (bidsSnap) => {
      const requestIds = bidsSnap.docs.map(d => d.data().requestId);
      if (requestIds.length === 0) {
        setMissions([]);
        setLoading(false);
        return;
      }

      const qReq = query(collection(db, "requests"));
      const unsubReq = onSnapshot(qReq, (reqSnap) => {
        const list = reqSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((req: any) => requestIds.includes(req.id) && req.status !== "Terminé");
        setMissions(list);
        setLoading(false);
      });
      return () => unsubReq();
    });

    return () => unsubBids();
  }, [companyId]);

  // Trigger real browser Geolocation API
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Non supporté", description: "La géolocalisation n'est pas supportée par ce navigateur." });
      return;
    }

    setTrackingActive(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);

        if (selectedMission) {
          if (onlineStatus) {
            // Update Firestore document directly
            try {
              await updateDoc(doc(db, "requests", selectedMission.id), {
                currentLocation: coords,
                lastGpsUpdate: Timestamp.now()
              });
              toast({ title: "Position GPS envoyée 📍", description: `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
            } catch {
              toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour les coordonnées." });
            }
          } else {
            // Cache in Offline Queue
            const queueEntry = {
              missionId: selectedMission.id,
              type: "GPS_UPDATE",
              payload: coords,
              timestamp: Date.now()
            };
            addToOfflineQueue(queueEntry);
          }
        }
        setTrackingActive(false);
      },
      (err) => {
        console.error(err);
        setTrackingActive(false);
        toast({ variant: "destructive", title: "Erreur GPS", description: "Veuillez autoriser l'accès à la position." });
      }
    );
  };

  const addToOfflineQueue = (entry: any) => {
    const updated = [...offlineQueue, entry];
    setOfflineQueue(updated);
    localStorage.setItem("tg_offline_queue", JSON.stringify(updated));
    toast({ title: "Log stocké hors-ligne 💾", description: "Les données seront synchronisées dès le retour du réseau." });
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    toast({ title: "Synchronisation hors-ligne... 📡", description: `Envoi de ${offlineQueue.length} mise(s) à jour en attente.` });

    try {
      for (const item of offlineQueue) {
        if (item.type === "GPS_UPDATE") {
          await updateDoc(doc(db, "requests", item.missionId), {
            currentLocation: item.payload,
            lastGpsUpdate: Timestamp.now()
          });
        }
      }
      setOfflineQueue([]);
      localStorage.removeItem("tg_offline_queue");
      toast({ title: "Données synchronisées ! ✅" });
    } catch {
      toast({ variant: "destructive", title: "Erreur Sync", description: "La synchronisation a échoué. Nouvel essai ultérieur." });
    }
  };

  // Upload proof of delivery (POD)
  const handleUploadPod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission || !podFile || !user) return;

    setUploading(true);
    setUploadProgress(10);
    try {
      const fileRef = ref(storage, `pods/${selectedMission.id}/${Date.now()}_${podFile.name}`);
      const uploadTask = uploadBytesResumable(fileRef, podFile);

      uploadTask.on("state_changed", (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 80) + 10;
        setUploadProgress(progress);
      });

      const snapshot = await uploadTask;
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Complete Mission
      await updateDoc(doc(db, "requests", selectedMission.id), {
        status: "Terminé",
        podUrl: downloadUrl,
        deliveredAt: Timestamp.now()
      });

      toast({ title: "Livraison validée ! 🎉", description: "Preuve de livraison (POD) enregistrée et validée." });
      setSelectedMission(null);
      setPodFile(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de valider la livraison." });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Withdraw via Mobile Money (Orange Money / MTN Momo)
  const handleMobileMoneyWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawPhone || walletBalance <= 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Solde insuffisant ou numéro manquant." });
      return;
    }

    setWithdrawing(true);
    // Simulate real Orange / MTN sandbox payout API callback delay
    setTimeout(async () => {
      try {
        const amount = walletBalance;
        setWalletBalance(0);
        setWithdrawing(false);
        setWithdrawPhone("");
        toast({ 
          title: `Retrait ${momoOperator} Money validé ! 💸`, 
          description: `Un transfert de ${amount.toLocaleString('fr-FR')} GNF a été envoyé au numéro ${withdrawPhone}.` 
        });
      } catch {
        setWithdrawing(false);
      }
    }, 2500);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Simulateur Chauffeur</h1>
          <p className="text-sm text-muted-foreground mt-1">Tester le comportement mobile, la capture GPS, le dépôt de POD photo et les retraits de solde Mobile Money.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* iPhone / Viewport Frame container */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative mx-auto border-[12px] border-slate-800 bg-slate-950 rounded-[40px] shadow-2xl h-[780px] w-[360px] overflow-hidden flex flex-col justify-between select-none">
            {/* Speaker & camera notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-2xl flex items-center justify-center z-20">
              <div className="w-16 h-3.5 bg-slate-950 rounded-full flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-800" />
              </div>
            </div>

            {/* Mobile Workspace content */}
            <div className="flex-1 overflow-y-auto px-4 pt-10 pb-4 text-white bg-slate-950 space-y-4">
              
              {/* Header inside phone */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="text-indigo-400 h-5 w-5" />
                  <span className="text-xs font-bold font-mono">WORKSPACE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {onlineStatus ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1"><Wifi size={10}/> EN LIGNE</span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded flex items-center gap-1"><WifiOff size={10}/> HORS LIGNE</span>
                  )}
                </div>
              </div>

              {/* Wallet & Balance inside phone */}
              <div className="p-4 bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                  <span>Solde Chauffeur (GNF)</span>
                  <Sparkles size={12} className="text-yellow-400" />
                </div>
                <h3 className="text-2xl font-black">{walletBalance.toLocaleString('fr-FR')} GNF</h3>
                <p className="text-[9px] text-slate-400 leading-normal">Frais de péage, indemnités et pourboires perçus.</p>
              </div>

              {/* Mission Selector inside phone */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Course en cours :</label>
                {loading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin text-indigo-400 h-6 w-6"/></div>
                ) : missions.length === 0 ? (
                  <div className="p-4 bg-slate-900/50 border border-slate-800 text-center rounded-2xl text-xs text-slate-400">
                    Aucune mission active assignée.
                  </div>
                ) : (
                  <select
                    className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl p-2.5 h-10 focus:ring-1 focus:ring-indigo-500 text-slate-200"
                    value={selectedMission?.id || ""}
                    onChange={e => setSelectedMission(missions.find(m => m.id === e.target.value) || null)}
                  >
                    <option value="">-- Choisir ma mission --</option>
                    {missions.map(m => (
                      <option key={m.id} value={m.id}>{m.from} → {m.to}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedMission && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  {/* Mission Summary Card */}
                  <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-2xl text-xs space-y-1.5">
                    <p className="font-bold text-slate-200">Détails de la mission :</p>
                    <div>Départ: <strong className="text-slate-100">{selectedMission.from}</strong></div>
                    <div>Destination: <strong className="text-slate-100">{selectedMission.to}</strong></div>
                    <div>Statut: <span className="text-indigo-400 font-bold">{selectedMission.status}</span></div>
                  </div>

                  {/* Geolocation Capture Widget */}
                  <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Position GPS de Course :</p>
                    <Button 
                      onClick={handleCaptureGps}
                      disabled={trackingActive}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      {trackingActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin size={14} />} 
                      Mettre à jour ma position GPS
                    </Button>
                    {gpsCoords && (
                      <div className="text-[10px] text-indigo-300 font-mono text-center">
                        Lat: {gpsCoords.lat.toFixed(6)} | Lng: {gpsCoords.lng.toFixed(6)}
                      </div>
                    )}
                  </div>

                  {/* Camera POD Upload Widget */}
                  <form onSubmit={handleUploadPod} className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Preuve de Livraison (POD) :</p>
                    <div className="relative border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 text-center cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => e.target.files && setPodFile(e.target.files[0])}
                      />
                      <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-slate-400">
                        <Camera size={18} className="text-indigo-400" />
                        <span>{podFile ? podFile.name : "Prendre photo de livraison"}</span>
                      </div>
                    </div>

                    {uploading && (
                      <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      disabled={!podFile || uploading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle size={14} />} 
                      Confirmer la livraison
                    </Button>
                  </form>
                </div>
              )}

              {/* Wallet withdrawals via Orange/MTN inside phone */}
              {walletBalance > 0 && (
                <form onSubmit={handleMobileMoneyWithdraw} className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Retirer mes gains :</p>
                  
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      size="sm"
                      onClick={() => setMomoOperator("Orange")}
                      className={`flex-1 text-[10px] h-7 rounded-lg ${momoOperator === "Orange" ? "bg-amber-600 text-white font-bold" : "bg-slate-900 text-slate-400"}`}
                    >
                      Orange Money
                    </Button>
                    <Button 
                      type="button"
                      size="sm"
                      onClick={() => setMomoOperator("MTN")}
                      className={`flex-1 text-[10px] h-7 rounded-lg ${momoOperator === "MTN" ? "bg-yellow-600 text-slate-950 font-bold" : "bg-slate-900 text-slate-400"}`}
                    >
                      MTN MoMo
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Input 
                      placeholder="Numéro de téléphone (ex: 622 12 34 56)" 
                      className="bg-slate-950 border-slate-800 text-xs h-8 text-white"
                      value={withdrawPhone}
                      onChange={e => setWithdrawPhone(e.target.value)}
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={withdrawing || !withdrawPhone}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 h-8 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Landmark size={12} />} 
                    Transférer mon solde
                  </Button>
                </form>
              )}

            </div>

            {/* Bottom bar of iPhone */}
            <div className="h-10 bg-slate-950 flex items-center justify-center z-20">
              <div className="w-28 h-1 bg-white rounded-full opacity-60" />
            </div>
          </div>
        </div>

        {/* Technical Explanations Card on the Right */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Smartphone size={24} className="text-indigo-400" /> Guide de test du simulateur
            </h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-3">
              <p>
                Ce simulateur d&apos;interface chauffeur mobile vous permet de valider le fonctionnement des technologies de traçabilité en temps réel et de validation de livraison (POD) :
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-400">
                <li>
                  <strong className="text-indigo-400">Réseau déconnecté (Offline cache) :</strong> Utilisez le bouton de déconnexion ci-dessous pour simuler une perte de réseau dans les zones rurales de Guinée. Les logs GPS seront stockés localement dans le <code>localStorage</code> et synchronisés automatiquement à la reconnexion.
                </li>
                <li>
                  <strong className="text-indigo-400">Validation POD par Caméra :</strong> Prenez une photo de preuve de livraison avec votre appareil ou importez un reçu pour marquer le transport comme complété.
                </li>
                <li>
                  <strong className="text-indigo-400">Encaissement Mobile Money :</strong> Simulez le transfert de vos gains directement vers des portefeuilles Orange Money ou MTN Mobile Money.
                </li>
              </ul>

              <div className="flex gap-3 pt-3">
                <Button 
                  onClick={() => setOnlineStatus(!onlineStatus)} 
                  variant="outline"
                  className="rounded-xl flex items-center gap-1.5 text-xs font-bold"
                >
                  {onlineStatus ? <WifiOff size={14} className="text-rose-400" /> : <Wifi size={14} className="text-emerald-400" />}
                  {onlineStatus ? "Simuler déconnexion" : "Simuler reconnexion"}
                </Button>
                {offlineQueue.length > 0 && (
                  <Button 
                    onClick={syncOfflineQueue}
                    className="bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-1.5 text-xs font-bold text-white"
                  >
                    <RefreshCw size={14} /> Synchroniser manuellement ({offlineQueue.length})
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Table of Offline Cached logs */}
          <Card className="border-border/50 bg-[#0d1322]/80 shadow-xl rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Logs et caches hors-ligne en cours</h3>
            {offlineQueue.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Aucun log en attente de synchronisation.</p>
            ) : (
              <div className="space-y-2">
                {offlineQueue.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-amber-400 uppercase text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mr-2">{item.type}</span>
                      <span className="text-[11px] text-slate-300">Mission: {item.missionId.substring(0, 8)}...</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
