"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { guineanCities } from '@/lib/guinea-cities';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Navigation, MapPin, AlertTriangle, Camera, CheckCircle2, 
  Play, Square, Loader2, Phone, User, Info, ArrowLeft, ShieldAlert, WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ClientDetailsDialog } from '@/components/client-details-dialog';

interface Shipment {
  id: string;
  requestId: string;
  clientId: string;
  transporterId: string;
  nature: string;
  from: string;
  to: string;
  price: number;
  weight?: string;
  status: 'en_attente' | 'en_chargement' | 'en_route' | 'arrive' | 'livre' | 'incident';
  currentLocation: {
    lat: number;
    lng: number;
    timestamp: number;
  } | null;
  routeHistory: Array<{
    lat: number;
    lng: number;
    timestamp: number;
  }>;
  estimatedArrival: string | null;
  lastUpdated: number;
  incidentReport?: {
    description: string;
    photoUrl?: string;
    timestamp: number;
  } | null;
}

export default function DriverTrackingPage() {
  const { shipmentId } = useParams() as { shipmentId: string };
  const { toast } = useToast();
  const router = useRouter();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [geoPermission, setGeoPermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');

  // Modal Incident state
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentText, setIncidentText] = useState("");
  const [incidentPhoto, setIncidentPhoto] = useState<string | null>(null);
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationUpdateRef = useRef<number>(Date.now());

  // Check geolocation permission on mount + request browser notification permission
  useEffect(() => {
    // Request push notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Check geolocation permission
    if (!navigator.geolocation) {
      setGeoPermission('denied');
      return;
    }
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setGeoPermission(result.state as 'granted' | 'denied' | 'prompt');
        result.addEventListener('change', () => {
          setGeoPermission(result.state as 'granted' | 'denied' | 'prompt');
        });
      });
    } else {
      setGeoPermission('prompt');
    }
  }, []);

  // Load shipment or initialize from accepted request
  useEffect(() => {
    if (!shipmentId) return;

    const unsub = onSnapshot(doc(db, 'shipments', shipmentId), async (snap) => {
      if (snap.exists()) {
        setShipment(snap.data() as Shipment);
        setError(false);
        setLoading(false);
      } else {
        // Fallback: Check requests collection to initialize the shipment
        try {
          const reqSnap = await getDoc(doc(db, 'requests', shipmentId));
          if (reqSnap.exists()) {
            const reqData = reqSnap.data();
            
            // Security/Ownership check: Ensure user is the assigned transporter
            const currentUserId = auth.currentUser?.uid;
            if (reqData.assignedTo && currentUserId && reqData.assignedTo !== currentUserId) {
              setError(true);
              setLoading(false);
              return;
            }

            const newShipment: Shipment = {
              id: shipmentId,
              requestId: shipmentId,
              clientId: reqData.clientId || "",
              transporterId: reqData.assignedTo || currentUserId || "",
              nature: reqData.nature || "Marchandises",
              from: reqData.from || "",
              to: reqData.to || "",
              price: reqData.price || 0,
              weight: reqData.weight || "",
              status: 'en_attente',
              currentLocation: null,
              routeHistory: [],
              estimatedArrival: "En attente du départ",
              lastUpdated: Date.now()
            };

            await setDoc(doc(db, 'shipments', shipmentId), newShipment);
            setShipment(newShipment);
            setError(false);
          } else {
            setError(true);
          }
        } catch (e) {
          console.error("Error creating shipment fallback:", e);
          setError(true);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => {
      unsub();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [shipmentId]);

  // Helper: send browser push notification
  const sendBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/transconnekt-logo.png',
        badge: '/transconnekt-logo.png',
      });
    }
  };

  // Helper: notify client in Firestore
  const notifyClient = async (message: string, href: string) => {
    if (!shipment?.clientId) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: shipment.clientId,
        message,
        href,
        isRead: false,
        createdAt: Timestamp.now(),
      });
    } catch (e) {
      console.error('Failed to send client notification:', e);
    }
  };

  // Update status in Firestore + notify client + browser push
  const updateStatus = async (newStatus: Shipment['status']) => {
    if (!shipment) return;
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        status: newStatus,
        lastUpdated: Date.now()
      });

      const statusMessages: Record<string, string> = {
        en_chargement: '📦 Votre marchandise est en cours de chargement.',
        en_route: '🚚 Votre marchandise est en route ! Le chauffeur a commencé la livraison.',
        arrive: `🏁 Votre chauffeur est arrivé à destination : ${shipment.to}.`,
        livre: '✅ Livraison confirmée ! Votre marchandise a bien été livrée.',
        incident: '⚠️ Un incident a été signalé sur votre livraison. Contactez le chauffeur.',
      };

      const msg = statusMessages[newStatus];
      if (msg) {
        await notifyClient(msg, `/tracking/${shipmentId}`);
        sendBrowserNotification('TransConnekt — Mise à jour de livraison', msg);
      }

      toast({
        title: "Statut mis à jour",
        description: `La course est passée au statut : ${newStatus.toUpperCase()}`
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut."
      });
    }
  };

  // Start real GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "GPS Non Supporté",
        description: "Votre téléphone ne supporte pas le suivi GPS."
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setTrackingActive(true);
        setGeoPermission('granted');
        updateStatus('en_route');

        const watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            lastLocationUpdateRef.current = Date.now();
            await handleLocationUpdate(latitude, longitude);
          },
          (err) => {
            console.error("Watch position error:", err);
            toast({
              variant: "destructive",
              title: "Perte du signal GPS",
              description: "Veuillez vérifier que le GPS de votre téléphone est activé."
            });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
        watchIdRef.current = watchId;

        // Inactivity check: every 5 minutes, if no GPS update → send notification
        if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current);
        inactivityTimerRef.current = setInterval(async () => {
          const now = Date.now();
          const diff = now - lastLocationUpdateRef.current;
          if (diff > 5 * 60 * 1000) { // 5 minutes
            toast({
              variant: "destructive",
              title: "GPS inactif",
              description: "Aucune position GPS reçue depuis 5 minutes. Veuillez vérifier votre GPS ou annuler la course.",
            });
            sendBrowserNotification(
              'TransConnekt — GPS inactif',
              'Aucune position GPS reçue depuis 5 minutes. Activez votre GPS pour continuer la livraison.'
            );
            // Send notification to client
            if (shipment?.clientId) {
              await notifyClient(
                '⚠️ Votre chauffeur semble inactif (GPS non reçu depuis 5 min). Contactez-le si nécessaire.',
                `/tracking/${shipmentId}`
              );
            }
          }
        }, 5 * 60 * 1000);
      },
      (err) => {
        console.error("Initial GPS error:", err);
        setGeoPermission('denied');
        toast({
          variant: "destructive",
          title: "Accès GPS Refusé",
          description: "Le partage de position GPS est obligatoire pour commencer cette livraison."
        });
      }
    );
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setTrackingActive(false);
  };

  // Handle new lat/lng coordinate update (geofencing & DB push)
  const handleLocationUpdate = async (lat: number, lng: number) => {
    if (!shipment) return;

    const newLoc = { lat, lng, timestamp: Date.now() };
    const history = [...(shipment.routeHistory || [])];
    
    if (history.length === 0 || 
        Math.abs(history[history.length - 1].lat - lat) > 0.0001 || 
        Math.abs(history[history.length - 1].lng - lng) > 0.0001) {
      history.push(newLoc);
    }

    // Geofencing: Check distance to destination
    const destCity = guineanCities[shipment.to];
    let nextStatus = shipment.status;
    
    if (destCity) {
      const R = 6371; 
      const dLat = (destCity.lat - lat) * Math.PI / 180;
      const dLon = (destCity.lng - lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(destCity.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance <= 0.5) { // 500 meters
        nextStatus = 'arrive';
        toast({
          title: "Arrivée !",
          description: "Arrivée automatique détectée à " + shipment.to
        });
      }
    }

    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        currentLocation: newLoc,
        routeHistory: history,
        status: nextStatus,
        lastUpdated: Date.now()
      });
      // Send arrival notification if geofencing detected arrival
      if (nextStatus === 'arrive' && shipment.status !== 'arrive') {
        await notifyClient(`🏁 Votre chauffeur est arrivé à destination : ${shipment.to}.`, `/tracking/${shipmentId}`);
        sendBrowserNotification('TransConnekt — Arrivée détectée', `Votre chauffeur est arrivé à ${shipment.to}.`);
      }
    } catch (e) {
      console.error("Error updating location:", e);
    }
  };

  // Convert image input to base64
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIncidentPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitIncident = async () => {
    if (!incidentText) {
      toast({ variant: "destructive", title: "Description requise", description: "Veuillez décrire l'incident." });
      return;
    }
    setSubmittingIncident(true);
    try {
      await updateDoc(doc(db, 'shipments', shipmentId), {
        status: 'incident',
        incidentReport: {
          description: incidentText,
          photoUrl: incidentPhoto || "",
          timestamp: Date.now()
        },
        lastUpdated: Date.now()
      });
      toast({ title: "Incident signalé", description: "Le client a été notifié de la situation." });
      setShowIncidentModal(false);
      setIncidentText("");
      setIncidentPhoto(null);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de signaler l'incident." });
    } finally {
      setSubmittingIncident(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
          <p className="text-sm text-slate-400">Chargement de la course...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white p-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900 text-center p-6 space-y-4">
          <AlertTriangle className="text-rose-500 h-12 w-12 mx-auto animate-bounce" />
          <div>
            <h2 className="text-lg font-bold">Course introuvable</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Cette course n&apos;existe pas ou vous n&apos;êtes pas le transporteur assigné à cette livraison.
            </p>
          </div>
          <Link href="/dashboard/transporter/jobs" className="block">
            <Button className="w-full rounded-xl bg-primary text-white font-bold h-10 border-0">
              Retour à mes courses
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 flex flex-col justify-between">
      
      {/* Header bar */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800">
        <Link href="/dashboard/transporter/jobs" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
          <ArrowLeft size={14} /> Retour
        </Link>
        <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase">ESPACE CHAUFFEUR</span>
        <Badge className={cn(
          "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
          shipment.status === 'en_route' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          shipment.status === 'en_chargement' && 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
          shipment.status === 'arrive' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          shipment.status === 'livre' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
          shipment.status === 'incident' && 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
        )}>
          {shipment.status}
        </Badge>
      </div>

      {/* Main console content */}
      <div className="max-w-md mx-auto w-full flex-grow py-6 space-y-6">
        
        {/* Cargo Detail Card */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white">{shipment.nature}</h2>
              <span className="text-xs text-emerald-400 font-bold">{shipment.price.toLocaleString("fr-FR")} GNF</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800/60 pt-3">
              <div>
                <p className="text-[9px] uppercase text-slate-500 font-extrabold">Départ</p>
                <p className="font-semibold text-slate-200">{shipment.from}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-slate-500 font-extrabold">Destination</p>
                <p className="font-semibold text-slate-200">{shipment.to}</p>
              </div>
            </div>

            {shipment.clientId && (
              <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Information & Contact Client :</span>
                <ClientDetailsDialog clientId={shipment.clientId} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console Controls */}
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Console de Suivi GPS</CardTitle>
            <CardDescription className="text-xs text-slate-500">Activez le GPS de votre smartphone pour partager votre position en direct.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            
            {/* GPS Permission warning */}
            {geoPermission === 'denied' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                <ShieldAlert size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-left">
                  <p className="font-extrabold text-rose-400">Permission GPS refusée</p>
                  <p className="text-slate-400 mt-0.5">Vous devez autoriser l&apos;accès à votre position dans les paramètres de votre navigateur pour pouvoir effectuer cette livraison.</p>
                </div>
              </div>
            )}

            {/* Tracking Activator Buttons */}
            {!trackingActive ? (
              <Button 
                onClick={startTracking}
                disabled={geoPermission === 'denied'}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 border-0 text-sm"
              >
                <Play size={18} className="fill-white" />
                {geoPermission === 'denied' ? 'GPS requis pour démarrer' : 'Activer le suivi GPS en temps réel'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div className="text-xs text-left">
                    <p className="font-extrabold text-emerald-400">GPS Actif & Partagé</p>
                    <p className="text-[10px] text-slate-400">Votre position est transmise aux clients en direct</p>
                  </div>
                </div>

                <Button 
                  onClick={stopTracking}
                  variant="destructive"
                  className="w-full h-11 font-bold rounded-xl flex items-center justify-center gap-2 border-0"
                >
                  <Square size={16} className="fill-white" />
                  Désactiver le suivi GPS
                </Button>
              </div>
            )}

            {/* Quick Status Modifiers */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-4">
              <Button 
                type="button"
                size="sm"
                onClick={() => updateStatus('en_chargement')}
                className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                📦 Chargement
              </Button>
              <Button 
                type="button"
                size="sm"
                onClick={() => updateStatus('en_route')}
                className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                🚚 En route
              </Button>
              <Button 
                type="button"
                size="sm"
                onClick={() => updateStatus('arrive')}
                className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                🏁 Arrivé
              </Button>
              <Button 
                type="button"
                size="sm"
                onClick={() => updateStatus('livre')}
                className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              >
                🤝 Livré
              </Button>
            </div>

            {/* Incident Trigger */}
            <Button 
              variant="ghost" 
              onClick={() => setShowIncidentModal(true)}
              className="w-full text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-xl border border-dashed border-rose-500/20 py-2.5 mt-2"
            >
              <AlertTriangle size={14} className="mr-1.5 shrink-0" />
              Signaler un Incident (Panne, Barrage...)
            </Button>

          </CardContent>
        </Card>

      </div>

      {/* Incident Modal Backdrop */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-slate-800 bg-[#0D1322] text-white rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base font-extrabold text-white flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={18} />
                Déclarer un incident de trajet
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Le client recevra immédiatement l&apos;information sur sa carte.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                <Textarea 
                  placeholder="Panne moteur, embouteillage majeur, route bloquée..." 
                  className="rounded-xl border-slate-800 bg-slate-950 text-white placeholder:text-slate-500 text-xs"
                  value={incidentText}
                  onChange={(e) => setIncidentText(e.target.value)}
                />
              </div>

              {/* Photo Upload / Camera Input */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] uppercase font-bold text-slate-400">Photo de l&apos;incident</label>
                <div className="flex items-center gap-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="rounded-xl border-slate-800 bg-slate-950 hover:bg-slate-900 h-10 gap-2 text-xs relative overflow-hidden"
                  >
                    <Camera size={14} /> Prendre une photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={handlePhotoCapture} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                  {incidentPhoto && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold rounded-lg px-2 py-1">
                      Photo attachée
                    </Badge>
                  )}
                </div>
                {incidentPhoto && (
                  <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-800 bg-black mt-2">
                    <img src={incidentPhoto} alt="Preview incident" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-800/80">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowIncidentModal(false);
                    setIncidentPhoto(null);
                    setIncidentText("");
                  }} 
                  className="rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={submitIncident} 
                  disabled={submittingIncident}
                  className="rounded-xl text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold border-0"
                >
                  {submittingIncident ? "Signalement..." : "Signaler l'incident"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer Branding */}
      <div className="max-w-md mx-auto w-full text-center py-4 text-[10px] text-slate-600 font-semibold uppercase tracking-widest">
        TRACKGUINEA SECURE TRACKING
      </div>

    </div>
  );
}
