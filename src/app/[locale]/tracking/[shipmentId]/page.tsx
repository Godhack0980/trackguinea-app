"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { guineanCities } from '@/lib/guinea-cities';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MapPin, AlertTriangle, CheckCircle2, Clock, Phone, 
  User, Truck, Loader2, ArrowLeft, ShieldCheck, Mail, Share2, Copy, MessageSquare, Search, Key, Sparkles, Navigation, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Set Mapbox access token
mapboxgl.accessToken = 'process.env.NEXT_PUBLIC_MAPBOX_TOKEN!';

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
  otpCode?: string;
}

interface TransporterDetails {
  firstName: string;
  lastName: string;
  phone: string;
  companyName?: string;
  vehicleType?: string;
  rating?: number;
}

export default function ClientTrackingPage() {
  const { shipmentId } = useParams() as { shipmentId: string };
  const router = useRouter();
  const { toast } = useToast();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [transporter, setTransporter] = useState<TransporterDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchIdInput, setSearchIdInput] = useState('');
  const [gpsLost, setGpsLost] = useState(false);
  const [otpCode, setOtpCode] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Check GPS signal freshness
  useEffect(() => {
    if (!shipment || shipment.status !== 'en_route') {
      setGpsLost(false);
      return;
    }
    const checkGps = () => {
      if (Date.now() - shipment.lastUpdated > 5 * 60 * 1000) {
        setGpsLost(true);
      } else {
        setGpsLost(false);
      }
    };
    checkGps();
    const interval = setInterval(checkGps, 15000);
    return () => clearInterval(interval);
  }, [shipment]);

  // Load shipment & associated OTP code from request
  useEffect(() => {
    if (!shipmentId) return;

    const unsub = onSnapshot(doc(db, 'shipments', shipmentId), async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Shipment;
        setShipment(data);
        setError(false);
        
        // Fetch transporter profile
        if (data.transporterId && !transporter) {
          try {
            const userSnap = await getDoc(doc(db, 'users', data.transporterId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              setTransporter({
                firstName: userData.firstName || "Chauffeur",
                lastName: userData.lastName || "Indépendant",
                companyName: userData.companyName || "",
                phone: userData.phone || "",
                vehicleType: userData.vehicleType || "Véhicule de transport",
                rating: userData.rating || 5.0
              });
            }
          } catch (e) {
            console.error("Transporter fetch error:", e);
          }
        }

        // Fetch request for OTP code
        if (data.requestId) {
          try {
            const reqSnap = await getDoc(doc(db, 'requests', data.requestId));
            if (reqSnap.exists()) {
              setOtpCode(reqSnap.data().otpCode || null);
            }
          } catch (e) {
            console.error("Request OTP fetch error:", e);
          }
        }

        setLoading(false);
      } else {
        setError(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [shipmentId]);

  // Mapbox initialization
  useEffect(() => {
    if (loading || !shipment || !mapContainerRef.current) return;

    const fromCoords = guineanCities[shipment.from] || guineanCities["Conakry"];
    const toCoords = guineanCities[shipment.to] || guineanCities["Mamou"];

    const centerLng = (fromCoords.lng + toCoords.lng) / 2;
    const centerLat = (fromCoords.lat + toCoords.lat) / 2;

    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [centerLng, centerLat],
      zoom: 6.2,
      attributionControl: false
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = mapInstance;

    mapInstance.on('load', () => {
      setMapLoaded(true);

      // Departure Marker
      const depEl = document.createElement('div');
      depEl.className = 'flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white border-2 border-slate-900 shadow-xl';
      depEl.innerText = 'DÉP';
      new mapboxgl.Marker(depEl)
        .setLngLat([fromCoords.lng, fromCoords.lat])
        .addTo(mapInstance);

      // Arrival Marker
      const arrEl = document.createElement('div');
      arrEl.className = 'flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white border-2 border-slate-900 shadow-xl';
      arrEl.innerText = 'ARR';
      new mapboxgl.Marker(arrEl)
        .setLngLat([toCoords.lng, toCoords.lat])
        .addTo(mapInstance);

      // Fetch Directions route
      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
      fetch(directionsUrl)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const geometry = data.routes[0].geometry;
            mapInstance.addSource('theoretical-route', {
              type: 'geojson',
              data: { type: 'Feature', properties: {}, geometry }
            });
            mapInstance.addLayer({
              id: 'theoretical-route-layer',
              type: 'line',
              source: 'theoretical-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': '#6366f1', 'line-width': 4, 'line-opacity': 0.4 }
            });
          }
        })
        .catch(err => console.error("Directions fetch error:", err));

      // Actual route source
      mapInstance.addSource('actual-route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      mapInstance.addLayer({
        id: 'actual-route-layer',
        type: 'line',
        source: 'actual-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.9 }
      });
    });

    return () => {
      if (mapInstance) mapInstance.remove();
      mapRef.current = null;
    };
  }, [loading]);

  // Update real-time GPS position
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !mapLoaded || !shipment) return;

    const historyCoords = (shipment.routeHistory || []).map(p => [p.lng, p.lat]);
    if (historyCoords.length > 1) {
      const source = mapInstance.getSource('actual-route') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: historyCoords }
        });
      }
    }

    if (shipment.currentLocation) {
      const { lat, lng } = shipment.currentLocation;
      if (!truckMarkerRef.current) {
        const trEl = document.createElement('div');
        trEl.className = 'relative flex items-center justify-center';
        trEl.style.width = '40px';
        trEl.style.height = '40px';

        const pulse = document.createElement('div');
        pulse.className = 'animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-75';
        trEl.appendChild(pulse);

        const inner = document.createElement('div');
        inner.className = 'relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-slate-950 shadow-2xl font-bold text-xs';
        inner.innerHTML = '🚛';
        trEl.appendChild(inner);

        const marker = new mapboxgl.Marker(trEl).setLngLat([lng, lat]).addTo(mapInstance);
        truckMarkerRef.current = marker;
      } else {
        truckMarkerRef.current.setLngLat([lng, lat]);
      }
      mapInstance.easeTo({ center: [lng, lat], zoom: 8, duration: 1000 });
    }
  }, [shipment, mapLoaded]);

  const copyTrackingLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Lien copié ! 📋",
        description: "Le lien de suivi GPS a été copié dans votre presse-papier.",
      });
    }
  };

  const shareWhatsApp = () => {
    if (typeof window !== 'undefined' && shipment) {
      const text = `Suivi en direct de la livraison "${shipment.nature}" (${shipment.from} ➔ ${shipment.to}) : ${window.location.href}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchIdInput.trim()) {
      router.push(`/tracking/${searchIdInput.trim()}`);
    }
  };

  const getStatusStepIndex = (status: Shipment['status']) => {
    switch (status) {
      case 'en_attente': return 0;
      case 'en_chargement': return 1;
      case 'en_route': return 2;
      case 'arrive': return 3;
      case 'livre': return 4;
      case 'incident': return 2;
      default: return 0;
    }
  };

  const currentStepIdx = shipment ? getStatusStepIndex(shipment.status) : 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto" />
          <p className="text-sm text-slate-400 font-semibold">Chargement de la console de suivi GPS en direct...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white p-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900 text-center p-6 space-y-5 rounded-3xl shadow-2xl">
          <AlertTriangle className="text-rose-500 h-14 w-14 mx-auto animate-bounce" />
          <div>
            <h2 className="text-xl font-extrabold text-white">Livraison Introuvable</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Le numéro de suivi renseigné ne correspond à aucune livraison active. Saisissez votre code ci-dessous :
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input 
              placeholder="Code de suivi (ex: ID-7NS50q...)" 
              value={searchIdInput}
              onChange={(e) => setSearchIdInput(e.target.value)}
              className="h-11 rounded-xl bg-slate-950 border-slate-800 text-white text-xs"
            />
            <Button type="submit" className="h-11 rounded-xl bg-primary text-white font-bold text-xs px-4">
              Rechercher
            </Button>
          </form>

          <Link href="/" className="block pt-2">
            <Button variant="outline" className="w-full rounded-xl border-slate-800 text-slate-300 font-bold h-10">
              Retour à l&apos;accueil TransConnekt
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white font-sans">
      
      {/* Header bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-primary font-black text-lg tracking-wider">TRANSCONNEKT</span>
            </Link>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 uppercase">
              LIVE GPS TRACKING
            </Badge>
          </div>

          {/* Quick Search in header */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center gap-2 max-w-xs w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Autre numéro de suivi..."
                value={searchIdInput}
                onChange={(e) => setSearchIdInput(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-slate-900 border-slate-800 text-white text-xs placeholder:text-slate-500"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold">
              OK
            </Button>
          </form>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={copyTrackingLink}
              className="rounded-xl border-slate-800 bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 font-bold"
            >
              <Copy size={13} /> <span className="hidden sm:inline">Copier le lien</span>
            </Button>

            <Button 
              size="sm" 
              onClick={shareWhatsApp}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold shadow-md shadow-emerald-600/20 border-0"
            >
              <MessageSquare size={13} /> <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main split-screen panel */}
      <main className="flex-grow grid lg:grid-cols-12 items-stretch min-h-[calc(100vh-4rem)]">
        
        {/* Left Side: Map visualizer (7 cols) */}
        <div className="lg:col-span-7 relative bg-slate-950 min-h-[400px] lg:min-h-0 border-r border-slate-800">
          <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
          
          {/* Incident Alert Overlay */}
          {shipment.status === 'incident' && shipment.incidentReport && (
            <div className="absolute top-4 left-4 right-4 z-20">
              <Card className="border-rose-500/40 bg-rose-950/90 backdrop-blur-md rounded-2xl shadow-2xl">
                <CardContent className="p-4 flex items-start gap-3 text-left">
                  <AlertTriangle className="text-rose-400 h-6 w-6 shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-white text-xs uppercase tracking-wider">Alerte Incident Signalé par le Chauffeur</p>
                      <Badge className="bg-rose-500 text-white text-[9px] uppercase font-bold px-1.5 py-0">SIGNALÉ</Badge>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      {shipment.incidentReport.description}
                    </p>
                    {shipment.incidentReport.photoUrl && (
                      <div className="relative mt-2 h-24 w-40 rounded-xl overflow-hidden border border-rose-500/30 bg-black">
                        <img src={shipment.incidentReport.photoUrl} alt="Preuve d'incident" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* GPS Lost Alert Overlay */}
          {!shipment.incidentReport && gpsLost && (
            <div className="absolute top-4 left-4 right-4 z-20">
              <Card className="border-amber-500/40 bg-amber-950/90 backdrop-blur-md rounded-2xl shadow-2xl">
                <CardContent className="p-4 flex items-start gap-3 text-left">
                  <AlertTriangle className="text-amber-400 h-6 w-6 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-white text-xs uppercase tracking-wider">Alerte Signal GPS Inactif</p>
                      <Badge className="bg-amber-500 text-white text-[9px] uppercase font-bold px-1.5 py-0">GPS ARRETÉ</Badge>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      Le smartphone du transporteur ne transmet plus sa position depuis 5 minutes (zone blanche ou GPS désactivé).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Side: Logistical Console (5 cols) */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-6 overflow-y-auto max-h-[calc(100vh-4rem)] bg-slate-950 text-left">
          
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest text-primary uppercase">CODE SUIVI #{shipment.id.slice(0, 8)}</span>
                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5">
                  Séquestre Garanti 🛡️
                </Badge>
              </div>
              <h1 className="text-2xl font-extrabold text-white mt-1.5">{shipment.nature}</h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                <span>De : <strong className="text-white">{shipment.from}</strong></span>
                <span className="text-slate-600">➔</span>
                <span>Destination : <strong className="text-white">{shipment.to}</strong></span>
              </p>
            </div>

            {/* Delivery Validation OTP Box (For Client) */}
            {otpCode && (shipment.status as string) !== 'livre' && (shipment.status as string) !== 'Terminé' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-emerald-400 flex items-center gap-1.5">
                    <Key size={14} /> Code Secret de Livraison (OTP)
                  </span>
                  <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5">CONFIDENTIEL</Badge>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Communiquez ce code au chauffeur <strong>uniquement</strong> une fois que vous avez reçu et vérifié votre marchandise :
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/50 text-center font-mono font-black text-2xl tracking-[0.4em] text-emerald-400 shadow-inner">
                  {otpCode}
                </div>
              </div>
            )}

            {/* Stepper progress indicator */}
            <div className="bg-[#0D1322] border border-slate-800/80 rounded-2xl p-4.5 space-y-4 shadow-md">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Progression du Trajet Logistique</p>
              
              <div className="flex items-center justify-between relative mt-2 px-1">
                <div className="absolute top-3 left-3 right-3 h-0.5 bg-slate-800 -z-10" />
                <div 
                  className="absolute top-3 left-3 h-0.5 bg-primary -z-10 transition-all duration-500" 
                  style={{ width: `${(currentStepIdx / 4) * 100}%` }}
                />

                {['En attente', 'Chargement', 'En route', 'Arrivé', 'Livré'].map((lbl, idx) => {
                  const isActive = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <div key={lbl} className="flex flex-col items-center gap-1.5 z-10">
                      <span className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 border-2",
                        isActive && isCurrent && "bg-primary text-slate-950 border-primary shadow-[0_0_12px_rgba(79,70,229,0.5)]",
                        isActive && !isCurrent && "bg-indigo-900 text-white border-primary",
                        !isActive && "bg-slate-900 text-slate-500 border-slate-800"
                      )}>
                        {idx + 1}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase",
                        isActive ? "text-slate-200" : "text-slate-500"
                      )}>
                        {lbl}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ETA & Status Card */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-slate-800 bg-slate-900/40 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="text-primary h-6 w-6 shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase text-slate-500 font-extrabold">ARRIVÉE ESTIMÉE</p>
                    <p className="text-xs font-black text-white mt-0.5">
                      {shipment.status === 'en_route' ? (shipment.estimatedArrival || "Calcul en cours...") : shipment.status === 'arrive' ? "Arrivé ✓" : shipment.status === 'livre' ? "Livré ✓" : "En attente du départ"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/40 rounded-2xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <ShieldCheck className="text-emerald-400 h-6 w-6 shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase text-slate-500 font-extrabold">GARANTIE TRANSCONNEKT</p>
                    <p className="text-xs font-black text-white mt-0.5">Séquestre Verrouillé</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transporter Info Card */}
            {transporter && (
              <Card className="border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden shadow-md">
                <CardHeader className="pb-2 bg-slate-900/40 border-b border-slate-800/40 p-4">
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Truck size={14} className="text-primary" /> Transporteur Assigné</span>
                    <span className="text-emerald-400 font-bold text-[11px]">⭐ {transporter.rating?.toFixed(1) || '5.0'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center text-sm font-black text-white border border-slate-700 shrink-0">
                      {transporter.firstName[0]}{transporter.lastName[0]}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-white">{transporter.companyName || `${transporter.firstName} ${transporter.lastName}`}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{transporter.vehicleType}</p>
                    </div>
                  </div>
                  {transporter.phone && (
                    <a href={`tel:${transporter.phone}`} className="shrink-0">
                      <Button size="sm" className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl border-0 text-xs gap-1.5 shadow-sm">
                        <Phone size={13} /> Appeler
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cargo Details */}
            <Card className="border-slate-800 bg-slate-900/30 rounded-2xl">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400 font-semibold">Poids du Fret</span>
                  <span className="font-bold text-slate-200">{shipment.weight || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400 font-semibold">Prix de la course</span>
                  <span className="font-bold text-emerald-400">{shipment.price ? `${shipment.price.toLocaleString('fr-FR')} GNF` : 'N/A'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400 font-semibold">Dernier signal GPS</span>
                  <span className="font-bold text-indigo-400">
                    il y a {Math.round((Date.now() - shipment.lastUpdated) / 1000)} sec
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Bottom support links */}
          <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span>🛡️ TransConnekt Suivi Sécurisé</span>
            <Link href="/dashboard/messages" className="text-primary hover:underline flex items-center gap-1">
              <MessageSquare size={12} /> Support client 24/7
            </Link>
          </div>

        </div>

      </main>

    </div>
  );
}
