"use client"

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from "@/lib/firebase";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { guineanCities } from "@/lib/guinea-cities";
import { Loader2, MapPin } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";
import { useTranslation } from "@/lib/translations";

const prefecturesGuinea = [
  "Conakry", "Beyla", "Boffa", "Boké", "Coyah", "Dabola", "Dalaba", "Dinguiraye", 
  "Dubréka", "Faranah", "Forécariah", "Fria", "Gaoual", "Guéckédou", "Kankan", 
  "Kérouané", "Kindia", "Kissidougou", "Koubia", "Koundara", "Kouroussa", "Labé", 
  "Lélouma", "Lola", "Macenta", "Mali", "Mamou", "Mandiana", "Nzérékoré", "Pita", 
  "Siguiri", "Télimélé", "Tougué", "Yomou"
];

const fallbackMapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function AvailableOffersComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [currentPrefecture, setCurrentPrefecture] = useState("Conakry");
  const [geolocating, setGeolocating] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            setUserRole(snap.data().role || 'client');
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Fetch pending requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      setLoadingRequests(true);
      try {
        const q = query(
          collection(db, "requests"),
          where("status", "==", "En attente")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableRequests(list);
      } catch (e) {
        console.error("Error fetching requests:", e);
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchPendingRequests();
  }, []);

  const handleApply = async (req: any) => {
    if (!currentUser) {
      router.push(`/login?redirect=/dashboard/transporter/jobs`);
      return;
    }

    if (userRole !== 'transporter' && userRole !== 'transporter-company') {
      toast({
        variant: "destructive",
        title: t('available_offers.toast_action_impossible'),
        description: t('available_offers.toast_transporter_only')
      });
      return;
    }

    // Check if already applied
    if (req.applicants && req.applicants.includes(currentUser.uid)) {
      toast({
        title: t('available_offers.toast_already_applied_title'),
        description: t('available_offers.toast_already_applied_desc')
      });
      return;
    }

    setApplyingId(req.id);
    try {
      if (typeof window !== 'undefined' && Notification.permission !== 'granted') {
        window.dispatchEvent(new CustomEvent('show-notification-reminder'));
      }
      const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
      const profileData = userSnap.exists() ? userSnap.data() : {};
      const displayName = profileData.companyName || `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || "Un transporteur";

      const docRef = doc(db, 'requests', req.id);
      await updateDoc(docRef, {
        applicants: arrayUnion(currentUser.uid)
      });

      if (req.clientId) {
        await createNotification({
          userId: req.clientId,
          message: `${displayName} ${t('available_offers.notification_suffix')} "${req.nature}".`,
          href: `/dashboard/client/requests`
        });
      }

      toast({
        title: t('available_offers.toast_success_title'),
        description: t('available_offers.toast_success_desc')
      });

      setAvailableRequests(prev => prev.map(r => r.id === req.id ? { ...r, applicants: [...(r.applicants || []), currentUser.uid] } : r));

    } catch (e) {
      console.error("Apply error:", e);
      toast({
        variant: "destructive",
        title: t('available_offers.toast_error_title'),
        description: t('available_offers.toast_error_desc')
      });
    } finally {
      setApplyingId(null);
    }
  };

  // Calculate geodistances
  const getDistanceGeo = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const closestRequestId = useMemo(() => {
    if (availableRequests.length === 0 || !currentPrefecture) return null;
    const selfCoords = guineanCities[currentPrefecture] || guineanCities["Conakry"];
    if (!selfCoords) return null;

    let minDistance = Infinity;
    let closestId = null;
    for (const req of availableRequests) {
      const destCoords = guineanCities[req.from];
      if (destCoords) {
        const dist = getDistanceGeo(selfCoords.lat, selfCoords.lng, destCoords.lat, destCoords.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestId = req.id;
        }
      }
    }
    return closestId;
  }, [availableRequests, currentPrefecture]);

  // Mapbox initialization
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        const response = await fetch('/api/config/mapbox');
        const data = await response.json();
        if (isMounted && data?.token) {
          mapboxgl.accessToken = data.token;
        } else if (isMounted) {
          mapboxgl.accessToken = fallbackMapboxToken;
        }
      } catch (error) {
        console.warn('Mapbox token unavailable, using fallback token.', error);
        if (isMounted) {
          mapboxgl.accessToken = fallbackMapboxToken;
        }
      }

      if (!isMounted || !mapContainerRef.current || mapRef.current) return;

      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-10.9, 10.4],
        zoom: 5.4,
        attributionControl: false
      });

      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      mapRef.current = mapInstance;
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Mapbox markers dynamically
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Add Marker for Transporter's current prefecture (Yellow)
    const selfCoords = guineanCities[currentPrefecture] || guineanCities["Conakry"];
    if (selfCoords) {
      const selfEl = document.createElement('div');
      selfEl.className = 'relative flex items-center justify-center';
      selfEl.style.width = '32px';
      selfEl.style.height = '32px';

      const selfPulse = document.createElement('div');
      selfPulse.className = "animate-pulse absolute inline-flex h-8 w-8 rounded-full bg-yellow-500/20";
      selfEl.appendChild(selfPulse);

      const selfCore = document.createElement('div');
      selfCore.className = "relative inline-flex rounded-full h-3.5 w-3.5 bg-yellow-500 border-2 border-slate-950 shadow-md";
      selfEl.appendChild(selfCore);

      const selfLabel = document.createElement('div');
      selfLabel.className = "absolute -top-6 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/90 border border-yellow-500/30 text-yellow-500 text-center whitespace-nowrap shadow-lg";
      selfLabel.innerText = "VOUS";
      selfEl.appendChild(selfLabel);

      const selfMarker = new mapboxgl.Marker(selfEl)
        .setLngLat([selfCoords.lng, selfCoords.lat])
        .addTo(mapInstance);

      markersRef.current.push(selfMarker);
    }

    // 2. Add markers for each active request
    availableRequests.forEach(req => {
      const coords = guineanCities[req.from] || guineanCities["Conakry"];
      if (!coords) return;

      const isClosest = closestRequestId === req.id;
      
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center';
      el.style.width = '32px';
      el.style.height = '32px';

      const pulse = document.createElement('div');
      pulse.className = cn(
        "animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-75",
        isClosest ? "bg-emerald-400" : "bg-blue-400"
      );
      el.appendChild(pulse);

      const core = document.createElement('div');
      core.className = cn(
        "relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-950 shadow-md",
        isClosest ? "bg-emerald-500" : "bg-blue-500"
      );
      el.appendChild(core);

      const label = document.createElement('div');
      label.className = cn(
        "absolute -bottom-6 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/90 border text-center whitespace-nowrap shadow-lg",
        isClosest ? "border-emerald-500/30 text-emerald-400" : "border-slate-800 text-blue-400"
      );
      label.innerText = `${req.from}`;
      el.appendChild(label);

      // Create Mapbox popup
      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div class="text-slate-900 p-2.5 text-xs font-sans text-left space-y-1 rounded-2xl bg-white shadow-xl min-w-[150px]">
            <p class="font-extrabold text-sm text-indigo-900">${req.nature}</p>
            <p class="font-bold text-slate-700">${t('available_offers.map_from_prefix')} <span class="text-slate-950">${req.from}</span> → <span class="text-slate-950">${req.to}</span></p>
            <p class="font-bold text-slate-700">${t('available_offers.map_price_prefix')} <span class="text-emerald-600 font-extrabold">${req.price ? req.price.toLocaleString("fr-FR") + ' GNF' : t('available_offers.price_debated')}</span></p>
            <p class="text-[10px] text-slate-500 font-semibold">${t('available_offers.map_weight_prefix')} ${req.weight || 'N/A'}</p>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });

    // Smooth pan to current selected position only on user interaction
    if (hasInteracted && selfCoords) {
      mapInstance.flyTo({
        center: [selfCoords.lng, selfCoords.lat],
        zoom: 6.2,
        speed: 0.8
      });
    }
  }, [availableRequests, currentPrefecture, closestRequestId, hasInteracted]);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: t('available_offers.toast_not_supported_title'), description: t('available_offers.toast_not_supported_desc') });
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let minGeoDistance = Infinity;
        let bestPref = "Conakry";
        Object.entries(guineanCities).forEach(([pref, loc]) => {
          const d = Math.sqrt(Math.pow(latitude - loc.lat, 2) + Math.pow(longitude - loc.lng, 2));
          if (d < minGeoDistance) {
            minGeoDistance = d;
            bestPref = pref;
          }
        });
        setCurrentPrefecture(bestPref);
        setHasInteracted(true);
        toast({ title: t('available_offers.toast_detect_success_title'), description: t('available_offers.toast_detect_success_desc', { prefecture: bestPref }) });
        setGeolocating(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        toast({ variant: "destructive", title: t('available_offers.toast_detect_error_title'), description: t('available_offers.toast_detect_error_desc') });
        setGeolocating(false);
      }
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12 items-stretch text-left">
      {/* List of pending requests (Left 5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2">
        {loadingRequests ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : availableRequests.length > 0 ? (
          availableRequests.map((req) => {
            const isClosest = closestRequestId === req.id;
            return (
              <Card 
                key={req.id} 
                className={cn(
                  "shadow-md rounded-2xl border backdrop-blur-md transition-all duration-300 hover:translate-x-1 bg-card text-card-foreground",
                  isClosest 
                    ? "border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-emerald-500/10" 
                    : "border-border/80 hover:border-indigo-500/40"
                )}
              >
                <CardContent className="p-4 flex justify-between items-start gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{req.nature}</p>
                      {isClosest && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-bold rounded-full py-0 px-1.5 animate-pulse">
                          {t('available_offers.closest_badge')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                      <MapPin size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{req.from} → {req.to}</span>
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                      {req.weight && <span>{t('available_offers.weight_label', { weight: req.weight })}</span>}
                      {req.distance && <span>{t('available_offers.distance_label', { distance: req.distance })}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end justify-between h-full gap-2">
                    <p className={cn("text-xs font-black", isClosest ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400")}>
                      {req.price ? `${req.price.toLocaleString("fr-FR")} GNF` : t('available_offers.price_debated')}
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => handleApply(req)}
                      disabled={applyingId === req.id || (currentUser && req.applicants && req.applicants.includes(currentUser.uid))}
                      className={cn(
                        "h-7 text-[10px] font-bold rounded-lg px-2.5 border-0 shadow-sm transition-all",
                        (currentUser && req.applicants && req.applicants.includes(currentUser.uid))
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed" 
                          : "bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold"
                      )}
                    >
                      {applyingId === req.id ? t('available_offers.btn_applying') : (
                        currentUser && req.applicants && req.applicants.includes(currentUser.uid)
                          ? t('available_offers.btn_applied') 
                          : t('available_offers.btn_apply')
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="text-center py-16 text-slate-400 italic">{t('available_offers.no_offers')}</div>
        )}
      </div>

      {/* Mapbox Map Container (Right 7 cols) */}
      <div className="lg:col-span-7 flex flex-col justify-between gap-4 p-5 rounded-3xl border border-slate-800 bg-slate-950/40 backdrop-blur-md relative overflow-hidden min-h-[420px]">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('available_offers.label_your_position')}</p>
            <Select 
              value={currentPrefecture} 
              onValueChange={(val) => {
                setCurrentPrefecture(val);
                setHasInteracted(true);
              }}
            >
              <SelectTrigger className="mt-1 h-9 rounded-xl bg-[#0D1322] border-slate-800 text-xs w-[180px] text-white">
                <SelectValue placeholder={t('available_offers.filter_position_placeholder')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-[#0D1322] text-white border-slate-800 max-h-56">
                {prefecturesGuinea.map(pref => (
                  <SelectItem key={pref} value={pref} className="focus:bg-slate-800 focus:text-white cursor-pointer text-xs">{pref}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleGeolocate} 
            disabled={geolocating}
            className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 self-end border-0"
          >
            {geolocating ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : "🧭"}
            {t('available_offers.btn_detect_position')}
          </Button>
        </div>

        {/* Real Mapbox Container */}
        <div ref={mapContainerRef} className="w-full flex-grow rounded-2xl min-h-[300px] border border-slate-800 overflow-hidden shadow-inner" />
      </div>
    </div>
  );
}
