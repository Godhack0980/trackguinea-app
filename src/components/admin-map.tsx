"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";
import { 
  normalizeTransConnektData, 
  fetchNationalMapboxPois, 
  NormalizedLogisticsItem, 
  LayerType 
} from "@/lib/logistics-map-data";
import { 
  Search, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Loader2, 
  Radio, 
  Truck, 
  AlertTriangle, 
  WifiOff, 
  ChevronRight, 
  ChevronLeft,
  Navigation,
  ExternalLink,
  MapPin,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveJob {
  id: string;
  from: string;
  to: string;
  transporterName?: string;
  driverName?: string;
  vehicleType?: string;
  vehicleRegistration?: string;
  status?: string;
  speedKmH?: number;
  currentLocation?: { lat: number; lng: number; timestamp?: number };
  [key: string]: any;
}

interface AdminMapProps {
  activeJobs?: ActiveJob[];
  usersList?: any[];
  agenciesList?: any[];
  corridorsList?: any[];
}

export default function AdminMap({ 
  activeJobs = [], 
  usersList = [], 
  agenciesList = [], 
  corridorsList = [] 
}: AdminMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const FALLBACK_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

  if (typeof window !== 'undefined' && !mapboxgl.accessToken) {
    mapboxgl.accessToken = FALLBACK_TOKEN;
  }

  const [mapboxToken, setMapboxToken] = useState<string>(FALLBACK_TOKEN);
  const { toast } = useToast();

  const markersRef = useRef<{ id: string; marker: mapboxgl.Marker; type: LayerType }[]>([]);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Selected Active Job State
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // All POIs Visibility Master Toggle
  const [poisVisible, setPoisVisible] = useState<boolean>(true);

  // 11-Layer Active States
  const [activeLayers, setActiveLayers] = useState<Record<LayerType, boolean>>({
    vehicles: true,
    shipments: true,
    drivers: true,
    stations: true,
    garages: true,
    parkings: true,
    warehouses: true,
    customs: true,
    incidents: true,
    risk_zones: true,
    clients: true
  });

  const [layerLoading, setLayerLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [nationalMapboxPois, setNationalMapboxPois] = useState<NormalizedLogisticsItem[]>([]);

  // Token retrieval fallback
  useEffect(() => {
    fetch('/api/config/mapbox')
      .then(async (res) => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (data?.token) {
            mapboxgl.accessToken = data.token;
            setMapboxToken(data.token);
          }
        }
      })
      .catch((err) => console.warn("Using fallback mapbox token:", err));
  }, []);

  // Fetch National Guinea POIs from internal API once
  const loadNationalPois = useCallback(async () => {
    setLayerLoading(true);
    const { items } = await fetchNationalMapboxPois();
    setNationalMapboxPois(items);
    setLayerLoading(false);
  }, []);

  useEffect(() => {
    loadNationalPois();
  }, [loadNationalPois]);

  // Normalize TransConnekt Firebase Realtime Data (Vehicles IN MISSION ONLY)
  const transconnektItems = useMemo(() => {
    return normalizeTransConnektData(activeJobs, usersList, agenciesList, corridorsList);
  }, [activeJobs, usersList, agenciesList, corridorsList]);

  // Combine TransConnekt Data + National Mapbox POIs
  const allLogisticsItems = useMemo(() => {
    return [...transconnektItems, ...nationalMapboxPois];
  }, [transconnektItems, nationalMapboxPois]);

  // Filter items by search query & layer visibility
  const filteredItems = useMemo(() => {
    return allLogisticsItems.filter(item => {
      // Check master POIs toggle
      if (!poisVisible && (item.type === "stations" || item.type === "garages" || item.type === "parkings" || item.type === "customs" || item.type === "warehouses")) {
        return false;
      }

      const layerActive = activeLayers[item.type];
      if (!layerActive) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchName = (item.name || "").toLowerCase().includes(term);
      const matchCity = (item.city || "").toLowerCase().includes(term);
      const matchDriver = (item.metadata?.driverName || "").toLowerCase().includes(term);
      const matchStatus = (item.status || "").toLowerCase().includes(term);

      return matchName || matchCity || matchDriver || matchStatus;
    });
  }, [allLogisticsItems, activeLayers, poisVisible, searchTerm]);

  // Calculate live count per layer
  const layerCounts = useMemo(() => {
    const counts: Record<LayerType, number> = {
      vehicles: 0, shipments: 0, drivers: 0, stations: 0, garages: 0,
      parkings: 0, warehouses: 0, customs: 0, incidents: 0, risk_zones: 0, clients: 0
    };
    allLogisticsItems.forEach(item => {
      if (counts[item.type] !== undefined) {
        counts[item.type]++;
      }
    });
    return counts;
  }, [allLogisticsItems]);

  // Operational Control KPIs
  const controlKpis = useMemo(() => {
    let activeMissions = 0;
    let movingVehicles = 0;
    let stoppedVehicles = 0;
    let incidentCount = 0;
    let gpsLostCount = 0;

    transconnektItems.forEach(item => {
      if (item.type === "vehicles") {
        activeMissions++;
        if (item.status === "moving") movingVehicles++;
        else if (item.status === "stopped") stoppedVehicles++;
        else if (item.status === "offline" || item.metadata?.gpsLost) gpsLostCount++;
      } else if (item.type === "incidents") {
        incidentCount++;
      }
    });

    return { activeMissions, movingVehicles, stoppedVehicles, incidentCount, gpsLostCount };
  }, [transconnektItems]);

  // Initialize Mapbox Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const activeToken = mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || FALLBACK_TOKEN;

    mapboxgl.accessToken = activeToken;

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-10.9, 10.4],
        zoom: 6.5,
        attributionControl: false
      });

      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
      setMap(mapInstance);

      return () => {
        mapInstance.remove();
      };
    } catch (err) {
      console.error("Mapbox initialization error:", err);
    }
  }, [mapboxToken]);

  // Draw Job Route helper (Strictly checks for valid origin & destination)
  const drawJobRoute = useCallback(async (jobItem: NormalizedLogisticsItem) => {
    if (!map || !mapboxToken || !jobItem) return;

    const origin = jobItem.metadata.origin;
    const dest = jobItem.metadata.destination;

    // Do NOT draw route if destination is missing or invalid
    if (!dest || dest === "Non renseignée" || dest === "Inconnue") {
      map.flyTo({ center: [jobItem.longitude, jobItem.latitude], zoom: 10 });
      return;
    }

    let destLat = jobItem.latitude + 0.8;
    let destLng = jobItem.longitude + 1.2;

    if (dest === "Bamako") { destLat = 12.6392; destLng = -8.0029; }
    else if (dest === "Labé") { destLat = 11.3180; destLng = -12.2830; }
    else if (dest === "Kankan") { destLat = 10.3840; destLng = -9.3050; }
    else if (dest === "Kindia") { destLat = 10.0410; destLng = -12.8650; }
    else if (dest === "Koundara") { destLat = 12.4833; destLng = -13.3000; }
    else if (dest === "Kamsar") { destLat = 10.6510; destLng = -14.6080; }

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${jobItem.longitude},${jobItem.latitude};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const geometry = data.routes[0].geometry;
        if (map.getSource('active-job-route')) {
          (map.getSource('active-job-route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature', properties: {}, geometry
          });
        } else {
          map.addSource('active-job-route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry }
          });
          map.addLayer({
            id: 'active-job-route-layer',
            type: 'line',
            source: 'active-job-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.9 }
          });
        }

        // Render arrival pin 🏁
        if (destMarkerRef.current) destMarkerRef.current.remove();
        const destEl = document.createElement('div');
        destEl.innerHTML = `
          <div style="background: #ef4444; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 0 16px rgba(239,68,68,0.9);">
            🏁
          </div>
        `;
        destMarkerRef.current = new mapboxgl.Marker({ element: destEl })
          .setLngLat([destLng, destLat])
          .addTo(map);

        // Center map on vehicle
        map.flyTo({ center: [jobItem.longitude, jobItem.latitude], zoom: 8.5 });
      }
    } catch (e) {
      console.error("Error drawing active job route:", e);
    }
  }, [map, mapboxToken]);

  // Auto resize Mapbox canvas when sidebar toggles to eliminate white gaps
  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      try { map.resize(); } catch (e) {}
    }, 320);
    try { map.resize(); } catch (e) {}
    return () => clearTimeout(timer);
  }, [sidebarOpen, map]);

  // Native Fullscreen API handler
  const handleOpenFullscreen = () => {
    const el = mapContainerRef.current;
    if (el) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        el.requestFullscreen().then(() => {
          setTimeout(() => map?.resize(), 200);
        }).catch(() => {
          window.open('/dashboard/admin/tracking', '_blank');
        });
      }
    }
  };

  // Toggle route line drawing on click
  const handleSelectJob = (item: NormalizedLogisticsItem) => {
    if (selectedJobId === item.id) {
      // Clicked again -> Toggle OFF and erase route
      setSelectedJobId(null);
      if (map) {
        if (map.getLayer('active-job-route-layer')) map.removeLayer('active-job-route-layer');
        if (map.getSource('active-job-route')) map.removeSource('active-job-route');
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      toast({ title: "Itinéraire effacé", description: "Le tracé d'itinéraire a été retiré de la carte." });
    } else {
      setSelectedJobId(item.id);
      drawJobRoute(item);
      toast({
        title: `Mission ${item.name}`,
        description: `Trajet ${item.metadata.origin || 'Départ'} → ${item.metadata.destination || 'Destination'}`
      });
    }
  };

  // Render Markers & Popups with safe DOM container checks
  useEffect(() => {
    if (!map) return;
    try {
      if (!map.getCanvasContainer || !map.getCanvasContainer()) return;
    } catch (e) {
      return;
    }

    // Clear previous markers
    markersRef.current.forEach(m => {
      try { m.marker.remove(); } catch (e) {}
    });
    markersRef.current = [];

    const getIconForType = (type: LayerType) => {
      switch (type) {
        case "vehicles": return "🚚";
        case "shipments": return "📦";
        case "drivers": return "👨‍✈️";
        case "stations": return "⛽";
        case "garages": return "🛠️";
        case "parkings": return "🅿️";
        case "warehouses": return "🏢";
        case "customs": return "🛃";
        case "incidents": return "🚧";
        case "risk_zones": return "⚠️";
        case "clients": return "📍";
      }
    };

    filteredItems.forEach((item) => {
      try {
        const el = document.createElement('div');
        el.className = 'custom-logistics-marker transition-all transform hover:scale-125 cursor-pointer relative';

        // Status indicator color
        let borderCol = "#6366f1";
        let isPulsing = false;
        if (item.source === "transconnekt") {
          if (item.status === "moving") { borderCol = "#10b981"; isPulsing = true; }
          else if (item.status === "stopped") { borderCol = "#f59e0b"; isPulsing = true; }
          else if (item.status === "offline" || item.metadata?.gpsLost) borderCol = "#ef4444";
        } else {
          borderCol = "#38bdf8"; // Mapbox POI sky blue
        }

        const isSelected = selectedJobId === item.id;
        if (isSelected) borderCol = "#f43f5e";

        // Emoji-only marker with pulsing radar ring for active moving vehicles
        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
            ${isPulsing ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${borderCol}; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
            <div style="position: relative; width: 34px; height: 34px; border-radius: 50%; background: #0f172a; border: 2.5px solid ${borderCol}; display: flex; align-items: center; justify-content: center; font-size: 17px; box-shadow: 0 0 16px ${borderCol}90;">
              ${getIconForType(item.type)}
            </div>
          </div>
        `;

        // Clean Contextual Popup HTML (WITHOUT itinerary button)
        let popupContent = "";

        if (item.type === "vehicles") {
          popupContent = `
            <div style="background: #0f172a; color: #ffffff; border-radius: 16px; padding: 14px; max-width: 270px; border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 14px 35px rgba(0,0,0,0.85);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 13px; color: #34d399;">🚚 ${item.name}</span>
                <span style="background: rgba(16,185,129,0.2); color: #34d399; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 10px; text-transform: uppercase;">
                  ${item.status === "moving" ? "🟢 En mouvement" : item.status === "stopped" ? "🟠 Arrêté" : "🔴 Hors ligne"}
                </span>
              </div>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Chauffeur : <strong>${item.metadata.driverName}</strong></p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Immatriculation : <strong>${item.metadata.vehiclePlate}</strong></p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Trajet : <strong>${item.metadata.origin} → ${item.metadata.destination}</strong></p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Fret : <strong>${item.metadata.cargoNature} (${item.metadata.cargoWeight}T)</strong></p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Vitesse : <strong>${item.metadata.speedKmH} km/h</strong></p>
              <p style="font-size: 10px; color: #94a3b8; margin: 2px 0;">Dernière mise à jour GPS : ${item.lastUpdated}</p>
            </div>
          `;
        } else if (item.type === "shipments") {
          popupContent = `
            <div style="background: #0f172a; color: #ffffff; border-radius: 16px; padding: 14px; max-width: 260px; border: 1px solid rgba(99, 102, 241, 0.4); box-shadow: 0 14px 35px rgba(0,0,0,0.85);">
              <p style="font-weight: 800; font-size: 13px; color: #818cf8; margin: 0 0 4px 0;">📦 ${item.name}</p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Statut : <strong>${item.status === "moving" ? "En transit 🟢" : "En attente 🟠"}</strong></p>
              <p style="font-size: 11px; color: #f1f5f9; margin: 2px 0;">Départ : ${item.metadata.origin}</p>
              <p style="font-size: 11px; color: #f1f5f9; margin: 2px 0;">Destination : ${item.metadata.destination}</p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">Chauffeur : ${item.metadata.driverName}</p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 2px 0;">ETA : <strong>${item.metadata.eta}</strong></p>
            </div>
          `;
        } else {
          // Mapbox POI or Station / Garage / Parking Popup (Clean, no itinerary button)
          popupContent = `
            <div style="background: #0f172a; color: #ffffff; border-radius: 16px; padding: 14px; max-width: 260px; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 14px 35px rgba(0,0,0,0.85);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 800; font-size: 13px; color: #ffffff;">${getIconForType(item.type)} ${item.name}</span>
                <span style="background: #1e293b; color: #38bdf8; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 8px;">${item.source.toUpperCase()}</span>
              </div>
              <p style="font-size: 11px; color: #94a3b8; margin: 0 0 4px 0;">Adresse : ${item.address || item.city}</p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 0;">Ville : <strong>${item.city}</strong></p>
            </div>
          `;
        }

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupContent);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([item.longitude, item.latitude])
          .setPopup(popup);

        if (map && map.getCanvasContainer && map.getCanvasContainer()) {
          marker.addTo(map);
          markersRef.current.push({ id: item.id, marker, type: item.type });
        }
      } catch (markerErr) {
        console.warn("Marker creation skipped:", markerErr);
      }
    });

  }, [map, mapboxToken, filteredItems, searchTerm, selectedJobId]);

  // Single-Layer Exclusive Filter Helper ("Uniquement")
  const handleSingleFilter = (targetType: LayerType) => {
    setActiveLayers({
      vehicles: targetType === "vehicles",
      shipments: targetType === "shipments",
      drivers: targetType === "drivers",
      stations: targetType === "stations",
      garages: targetType === "garages",
      parkings: targetType === "parkings",
      warehouses: targetType === "warehouses",
      customs: targetType === "customs",
      incidents: targetType === "incidents",
      risk_zones: targetType === "risk_zones",
      clients: targetType === "clients"
    });
  };

  const handleSelectAll = () => {
    setActiveLayers({
      vehicles: true, shipments: true, drivers: true, stations: true,
      garages: true, parkings: true, warehouses: true, customs: true,
      incidents: true, risk_zones: true, clients: true
    });
    setPoisVisible(true);
  };

  const handleDeselectAll = () => {
    setActiveLayers({
      vehicles: false, shipments: false, drivers: false, stations: false,
      garages: false, parkings: false, warehouses: false, customs: false,
      incidents: false, risk_zones: false, clients: false
    });
  };

  const handleRefresh = () => {
    loadNationalPois();
    toast({ title: "Données Actualisées", description: "Les données des véhicules en mission et POIs nationaux ont été rechargées." });
  };

  const layerButtons: { type: LayerType; label: string; icon: string }[] = [
    { type: "vehicles", label: "Véhicules (En mission)", icon: "🚚" },
    { type: "shipments", label: "Expéditions", icon: "📦" },
    { type: "drivers", label: "Chauffeurs", icon: "👨‍✈️" },
    { type: "stations", label: "Stations", icon: "⛽" },
    { type: "garages", label: "Garages", icon: "🛠️" },
    { type: "parkings", label: "Parkings", icon: "🅿️" },
    { type: "warehouses", label: "Entrepôts", icon: "🏢" },
    { type: "customs", label: "Douanes", icon: "🛃" },
    { type: "incidents", label: "Incidents", icon: "🚧" },
    { type: "risk_zones", label: "Zones à risque", icon: "⚠️" },
    { type: "clients", label: "Clients", icon: "📍" }
  ];

  // Active Vehicle Missions list for Control Center Sidebar (Real Firestore Data Only)
  const activeVehicleMissions = useMemo(() => {
    return transconnektItems.filter(item => item.type === "vehicles");
  }, [transconnektItems]);

  return (
    <Card className="shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white space-y-0">
      {/* 🟢 TOP OPERATIONAL CONTROL CENTER KPI BANNER */}
      <div className="bg-slate-950 text-white px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-black uppercase text-indigo-400 tracking-wider">
            <Radio size={14} className="animate-pulse text-emerald-400" /> Poste de Contrôle Opérationnel (Guinée)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
            🟢 {controlKpis.activeMissions} véhicules en mission
          </span>
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
            <Truck size={12} /> {controlKpis.movingVehicles} en mouvement
          </span>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
            🛑 {controlKpis.stoppedVehicles} à l'arrêt
          </span>
          {controlKpis.incidentCount > 0 && (
            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
              <AlertTriangle size={12} /> {controlKpis.incidentCount} incidents
            </span>
          )}
          {controlKpis.gpsLostCount > 0 && (
            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-full flex items-center gap-1 font-bold">
              <WifiOff size={12} /> {controlKpis.gpsLostCount} GPS perdu
            </span>
          )}

          {/* Fullscreen Button in Header */}
          <button
            onClick={handleOpenFullscreen}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-xl font-bold flex items-center gap-1 shadow-sm transition-all text-[10px]"
            title="Ouvrir la carte en plein écran dans un nouvel onglet"
          >
            <ExternalLink size={12} /> Plein Écran
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              🗺️ Suivi Global & Carte Logistique
            </span>

            {/* Master POIs Toggle Button */}
            <button
              onClick={() => setPoisVisible(!poisVisible)}
              className={cn(
                "text-[10px] font-extrabold px-3 py-1 rounded-xl border transition-all flex items-center gap-1",
                poisVisible
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
              )}
            >
              <MapPin size={12} /> {poisVisible ? "Masquer POIs Mapbox" : "Afficher POIs Mapbox"}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher camion, chauffeur, ville..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            {/* Quick Actions */}
            <button
              onClick={handleSelectAll}
              className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1"
            >
              <Eye size={12} /> Tout
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1"
            >
              <EyeOff size={12} /> Masquer
            </button>
            <button
              onClick={handleRefresh}
              className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
            >
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>
        </div>

        {/* 11 Layer Buttons Grid with Rich Color Framing */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
          {layerButtons.map((b) => {
            const isActive = activeLayers[b.type];
            const count = layerCounts[b.type] || 0;

            // Vibrant color palette per layer type
            let activeStyle = "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20";
            if (b.type === "vehicles") activeStyle = "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20";
            else if (b.type === "shipments") activeStyle = "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20";
            else if (b.type === "drivers") activeStyle = "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20";
            else if (b.type === "stations") activeStyle = "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-500/20";
            else if (b.type === "garages") activeStyle = "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20";
            else if (b.type === "parkings") activeStyle = "bg-fuchsia-600 text-white border-fuchsia-500 shadow-md shadow-fuchsia-500/20";
            else if (b.type === "customs") activeStyle = "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20";

            return (
              <button
                key={b.type}
                type="button"
                onClick={() => setActiveLayers(prev => ({ ...prev, [b.type]: !prev[b.type] }))}
                className={cn(
                  "text-[10px] font-extrabold px-3 py-1.5 rounded-xl border transition-all duration-200 select-none flex items-center gap-1.5 shadow-sm",
                  isActive
                    ? activeStyle
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
                {layerLoading && (b.type === "stations" || b.type === "garages" || b.type === "parkings" || b.type === "customs") ? (
                  <Loader2 size={10} className="animate-spin text-white" />
                ) : (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded-full font-black",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <CardContent className="p-0 relative flex flex-col md:flex-row h-[620px] overflow-hidden">
        {/* DYNAMIC ACTIVE MISSIONS SIDEBAR (Real Firestore Vehicles Only) */}
        <div className={cn(
          "bg-slate-950 text-white border-r border-slate-800 transition-all duration-300 z-10 flex flex-col shrink-0",
          sidebarOpen ? "w-full md:w-80" : "w-12"
        )}>
          {/* Sidebar Header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            {sidebarOpen && (
              <span className="text-xs font-black uppercase text-indigo-400 flex items-center gap-1.5">
                <Navigation size={14} /> Véhicules en Mission ({activeVehicleMissions.length})
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {/* Missions List */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {activeVehicleMissions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Aucun véhicule en mission active.
                </div>
              ) : (
                activeVehicleMissions.map((job) => {
                  const isSelected = selectedJobId === job.id;
                  const isMoving = job.status === "moving";
                  const isStopped = job.status === "stopped";

                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 text-xs",
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg"
                          : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-white flex items-center gap-1.5">
                          {isMoving ? "🟢" : isStopped ? "🟠" : "🔴"} {job.name}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                          {job.metadata.speedKmH || 0} km/h
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>{job.metadata.origin || 'Départ'} → {job.metadata.destination || 'Destination'}</span>
                        <span className="text-[10px] text-slate-500">{job.lastUpdated}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 mt-1">
                        <span>Chauffeur : <strong>{job.metadata.driverName}</strong></span>
                        <span className="text-emerald-400 font-bold">ETA {job.metadata.eta}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* MAP CONTAINER */}
        <div ref={mapContainerRef} className="flex-1 h-full w-full relative" />
      </CardContent>
    </Card>
  );
}
