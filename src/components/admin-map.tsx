"use client"

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from "./ui/card";
import { guineanCities } from "@/lib/guinea-cities";

// Set Mapbox access token
mapboxgl.accessToken = 'process.env.NEXT_PUBLIC_MAPBOX_TOKEN!';

interface ActiveJob {
    id: string;
    from: string;
    to: string;
    transporterName?: string;
}

interface AdminMapProps {
    activeJobs: ActiveJob[];
}

export default function AdminMap({ activeJobs }: AdminMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<mapboxgl.Map | null>(null);

    const getPosition = (from: string, to: string) => {
        const fromCoords = guineanCities[from];
        const toCoords = guineanCities[to];
        if (fromCoords && toCoords) {
            const dx = toCoords.lng - fromCoords.lng;
            const dy = toCoords.lat - fromCoords.lat;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) {
                return { lat: (fromCoords.lat + toCoords.lat) / 2, lng: (fromCoords.lng + toCoords.lng) / 2 };
            }
            const midLng = (fromCoords.lng + toCoords.lng) / 2;
            const midLat = (fromCoords.lat + toCoords.lat) / 2;
            const offset = len * 0.15; // arc height offset
            const px = -dy / len;
            const py = dx / len;
            const ctrlLng = midLng + px * offset;
            const ctrlLat = midLat + py * offset;
            
            // Return midpoint along the quadratic bezier curve (t = 0.5)
            return {
                lng: 0.25 * fromCoords.lng + 0.5 * ctrlLng + 0.25 * toCoords.lng,
                lat: 0.25 * fromCoords.lat + 0.5 * ctrlLat + 0.25 * toCoords.lat
            };
        }
        return guineanCities[from] || guineanCities[to] || null;
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const mapInstance = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11', // dark theme matching admin console
            center: [-10.9, 10.4], // geographic center of Guinea
            zoom: 5.5, // zoomed out default to fit the entire country
            attributionControl: false
        });

        // Add Zoom & Rotate Controls
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

        setMap(mapInstance);

        return () => {
            mapInstance.remove();
        };
    }, []);

    useEffect(() => {
        if (!map) return;

        const activeMarkers: mapboxgl.Marker[] = [];
        const activePopups: mapboxgl.Popup[] = [];
        const lineFeatures: any[] = [];
        const pointFeatures: any[] = [];

        // Helper to generate quadratic Bezier curve coordinates
        const getArcCoordinates = (from: {lng: number, lat: number}, to: {lng: number, lat: number}) => {
            const points = [];
            const steps = 40;
            const midLng = (from.lng + to.lng) / 2;
            const midLat = (from.lat + to.lat) / 2;
            
            const dx = to.lng - from.lng;
            const dy = to.lat - from.lat;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len < 0.01) {
                return [[from.lng, from.lat], [to.lng, to.lat]];
            }

            const offset = len * 0.15;
            const px = -dy / len;
            const py = dx / len;
            
            const ctrlLng = midLng + px * offset;
            const ctrlLat = midLat + py * offset;
            
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const lng = (1 - t) * (1 - t) * from.lng + 2 * (1 - t) * t * ctrlLng + t * t * to.lng;
                const lat = (1 - t) * (1 - t) * from.lat + 2 * (1 - t) * t * ctrlLat + t * t * to.lat;
                points.push([lng, lat]);
            }
            return points;
        };

        if (activeJobs.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            let validBounds = false;

            activeJobs.forEach(job => {
                if (!job || !job.id || !job.from || !job.to) return;
                const fromCoords = guineanCities[job.from];
                const toCoords = guineanCities[job.to];

                if (fromCoords && toCoords) {
                    // Generate arc points
                    const arcPoints = getArcCoordinates(fromCoords, toCoords);
                    
                    lineFeatures.push({
                        type: 'Feature',
                        properties: { id: job.id },
                        geometry: {
                            type: 'LineString',
                            coordinates: arcPoints
                        }
                    });

                    // Add start indicator
                    pointFeatures.push({
                        type: 'Feature',
                        properties: { type: 'start', id: job.id },
                        geometry: {
                            type: 'Point',
                            coordinates: [fromCoords.lng, fromCoords.lat]
                        }
                    });

                    // Add end indicator
                    pointFeatures.push({
                        type: 'Feature',
                        properties: { type: 'end', id: job.id },
                        geometry: {
                            type: 'Point',
                            coordinates: [toCoords.lng, toCoords.lat]
                        }
                    });

                    const pos = getPosition(job.from, job.to);
                    if (pos) {
                        bounds.extend([pos.lng, pos.lat]);
                        validBounds = true;

                        // Create custom marker element (Truck Icon badge)
                        const el = document.createElement('div');
                        el.className = 'flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 border border-indigo-400 text-white shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200';
                        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4h-8v-4h-4V9Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;

                        // Create popup
                        const popupHTML = `
                            <div style="font-family: inherit; padding: 4px; color: #0f172a;">
                                <h4 style="font-weight: bold; margin: 0; font-size: 11px;">Course #${job.id.substring(0, 6)}</h4>
                                <p style="margin: 2px 0 0; font-size: 10px; font-weight: 500;">${job.from} → ${job.to}</p>
                                <p style="margin: 4px 0 0; font-size: 9px; color: #64748b;">
                                    Chauffeur: ${job.transporterName || 'Non spécifié'}
                                </p>
                            </div>
                        `;

                        const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
                            .setHTML(popupHTML);

                        activePopups.push(popup);

                        const marker = new mapboxgl.Marker(el)
                            .setLngLat([pos.lng, pos.lat])
                            .setPopup(popup)
                            .addTo(map);

                        activeMarkers.push(marker);
                    }
                }
            });

            // Draw paths and endpoints using GeoJSON
            const drawRoutes = () => {
                // Lines Source & Layer
                if (map.getSource('admin-routes')) {
                    (map.getSource('admin-routes') as mapboxgl.GeoJSONSource).setData({
                        type: 'FeatureCollection',
                        features: lineFeatures
                    });
                } else {
                    map.addSource('admin-routes', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: lineFeatures
                        }
                    });

                    map.addLayer({
                        id: 'admin-routes-layer',
                        type: 'line',
                        source: 'admin-routes',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#6366f1', // Indigo Neon Glow
                            'line-width': 2.5,
                            'line-opacity': 0.65
                        }
                    });
                }

                // Endpoints Source & Layer
                if (map.getSource('admin-endpoints')) {
                    (map.getSource('admin-endpoints') as mapboxgl.GeoJSONSource).setData({
                        type: 'FeatureCollection',
                        features: pointFeatures
                    });
                } else {
                    map.addSource('admin-endpoints', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: pointFeatures
                        }
                    });

                    map.addLayer({
                        id: 'admin-endpoints-layer',
                        type: 'circle',
                        source: 'admin-endpoints',
                        paint: {
                            'circle-radius': 4.5,
                            'circle-color': [
                                'match',
                                ['get', 'type'],
                                'start', '#f43f5e', // Rose for departure
                                'end', '#10b981',   // Emerald for destination
                                '#ffffff'
                            ],
                            'circle-stroke-width': 1.5,
                            'circle-stroke-color': '#0f172a'
                        }
                    });
                }
            };

            if (map.isStyleLoaded()) {
                drawRoutes();
            } else {
                map.once('style.load', drawRoutes);
            }

            if (validBounds) {
                map.fitBounds(bounds, { padding: 85, duration: 1500, maxZoom: 6 });
            }
        }

        return () => {
            activeMarkers.forEach(m => m.remove());
            activePopups.forEach(p => p.remove());
        };
    }, [map, activeJobs]);

    return (
        <Card className="shadow-lg rounded-2xl border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md">
            <CardContent className="p-0">
                <div ref={mapContainerRef} className="h-[500px] w-full" />
            </CardContent>
        </Card>
    );
}
