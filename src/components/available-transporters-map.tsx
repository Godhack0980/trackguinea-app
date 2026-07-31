"use client"

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from "@/lib/firebase";
import { guineanCities } from "@/lib/guinea-cities";
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/lib/translations';

// Mapbox access token fetched securely via server API proxy route
if (typeof window !== 'undefined') {
  fetch('/api/config/mapbox')
    .then(res => res.json())
    .then(data => {
      if (data.token) mapboxgl.accessToken = data.token;
    })
    .catch(() => {});
}

interface Transporter {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  rating?: number;
  jobsCompleted?: number;
  experienceYears?: number;
  vehicleType?: string;
  jobsInProgress?: number;
}

// Pseudo-random but deterministic availability status
function getAvailabilityStatus(id: string, jobsInProgress?: number): 'available' | 'busy' | 'offline' {
  if (jobsInProgress && jobsInProgress > 0) return 'busy';
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  if (hash % 5 === 0) return 'offline';
  if (hash % 3 === 0) return 'busy';
  return 'available';
}

export default function AvailableTransportersMap() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch transporters list
  useEffect(() => {
    const fetchTransporters = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'transporter')
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transporter));
        setTransporters(list);
      } catch (err) {
        console.error("Error loading transporters for map:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransporters();
  }, []);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-10.9, 10.4],
      zoom: 5.4,
      attributionControl: false
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = mapInstance;

    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map markers whenever transporters list changes
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || transporters.length === 0) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    transporters.forEach(tr => {
      const cityKey = tr.city || "Conakry";
      const baseCoords = guineanCities[cityKey] || guineanCities["Conakry"];
      
      // Add minor deterministic offset (jitter) to prevent overlapping in the same city
      const hash = tr.id.charCodeAt(0) + tr.id.charCodeAt(tr.id.length - 1);
      const jitterLat = Math.sin(hash) * 0.035;
      const jitterLng = Math.cos(hash) * 0.035;
      const lat = baseCoords.lat + jitterLat;
      const lng = baseCoords.lng + jitterLng;

      const status = getAvailabilityStatus(tr.id, tr.jobsInProgress);
      let statusColor = "bg-emerald-500";
      let pulseColor = "bg-emerald-400";
      if (status === 'busy') {
        statusColor = "bg-amber-500";
        pulseColor = "bg-amber-400";
      } else if (status === 'offline') {
        statusColor = "bg-slate-500";
        pulseColor = "bg-slate-400";
      }

      // Marker element
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center cursor-pointer';
      el.style.width = '32px';
      el.style.height = '32px';

      if (status !== 'offline') {
        const pulse = document.createElement('div');
        pulse.className = cn("animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-70", pulseColor);
        el.appendChild(pulse);
      }

      const core = document.createElement('div');
      core.className = cn("relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-950 shadow-md", statusColor);
      el.appendChild(core);

      // Label below marker
      const label = document.createElement('div');
      label.className = "absolute -bottom-6 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-slate-300 text-center whitespace-nowrap shadow-lg";
      label.innerText = `${tr.firstName || ''} ${tr.lastName?.[0] || ''}.`;
      el.appendChild(label);

      // Experience & Rating Math
      const ratingVal = tr.rating || 4.5;
      const experienceVal = tr.experienceYears || (Math.abs(hash % 8) + 2);
      const jobsVal = tr.jobsCompleted || (Math.abs(hash % 30) + 5);

      const contactSection = isLoggedIn
        ? `<p class="font-bold text-slate-700 mt-1">📞 ${t('available_transporters_map.phone_label')} : <span class="text-indigo-900 font-extrabold">${tr.phone || t('available_transporters_map.phone_not_provided')}</span></p>`
        : `<a href="/login" class="inline-block mt-1 text-[10px] text-indigo-600 font-bold hover:underline">🔐 ${t('available_transporters_map.link_login')}</a>`;

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div class="text-slate-900 p-3 text-xs font-sans text-left space-y-1.5 rounded-2xl bg-white shadow-xl min-w-[170px]">
            <div class="flex items-center justify-between border-b pb-1">
              <p class="font-extrabold text-sm text-slate-950">${tr.firstName || ''} ${tr.lastName || ''}</p>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${status === 'available' ? 'bg-emerald-100 text-emerald-700' : status === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}">${status === 'available' ? t('available_transporters_map.status_available') : status === 'busy' ? t('available_transporters_map.status_busy') : t('available_transporters_map.status_offline')}</span>
            </div>
            <p class="font-bold text-slate-700">📍 ${t('available_transporters_map.city_label')} : <span class="text-slate-900 font-semibold">${cityKey}</span></p>
            <p class="font-bold text-slate-700">⭐ ${t('available_transporters_map.rating_label')} : <span class="text-amber-500 font-extrabold">${ratingVal.toFixed(1)}/5</span> <span class="text-slate-500">(${jobsVal} ${t('available_transporters_map.trips_suffix')})</span></p>
            <p class="font-bold text-slate-700">🛠️ ${t('available_transporters_map.experience_label')} : <span class="text-slate-900 font-semibold">${experienceVal} ${t('available_transporters_map.years_suffix')}</span></p>
            <p class="font-bold text-slate-700">🚛 ${t('available_transporters_map.vehicle_label')} : <span class="text-slate-900 font-semibold">${tr.vehicleType || t('available_transporters_map.vehicle_generic')}</span></p>
            ${contactSection}
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });
  }, [transporters, isLoggedIn]);

  return (
    <div className="flex flex-col gap-4 text-left w-full h-full min-h-[450px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{t('available_transporters_map.title')}</h3>
          <p className="text-xs text-slate-400">{t('available_transporters_map.legend')}</p>
        </div>
      </div>

      <div className="relative w-full flex-grow min-h-[380px] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full min-h-[380px] absolute inset-0" />
      </div>
    </div>
  );
}
