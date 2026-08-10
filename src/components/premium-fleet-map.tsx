"use client"

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { guineanCities } from "@/lib/guinea-cities";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface PremiumFleetMapProps {
    job: {
        id: string;
        from: string;
        to: string;
        status?: string;
        transporterName?: string;
    } | null;
}

export default function PremiumFleetMap({ job }: PremiumFleetMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const mapInstance = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [-10.9, 10.4], // Guinea center
            zoom: 5.5,
            attributionControl: false
        });

        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
        setMap(mapInstance);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            mapInstance.remove();
        };
    }, []);

    useEffect(() => {
        if (!map || !job) return;

        const fromCoords = guineanCities[job.from];
        const toCoords = guineanCities[job.to];

        if (!fromCoords || !toCoords) return;

        const handleStyleLoad = () => {
            // Clean previous layers if any
            if (map.getLayer('route-line')) map.removeLayer('route-line');
            if (map.getLayer('route-endpoints')) map.removeLayer('route-endpoints');
            if (map.getSource('route-src')) map.removeSource('route-src');

            // Draw bezier arc path
            const steps = 60;
            const points: [number, number][] = [];
            const dx = toCoords.lng - fromCoords.lng;
            const dy = toCoords.lat - fromCoords.lat;
            const len = Math.sqrt(dx * dx + dy * dy);
            const offset = len * 0.18;
            const px = -dy / len;
            const py = dx / len;
            const ctrlLng = (fromCoords.lng + toCoords.lng) / 2 + px * offset;
            const ctrlLat = (fromCoords.lat + toCoords.lat) / 2 + py * offset;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const lng = (1 - t) * (1 - t) * fromCoords.lng + 2 * (1 - t) * t * ctrlLng + t * t * toCoords.lng;
                const lat = (1 - t) * (1 - t) * fromCoords.lat + 2 * (1 - t) * t * ctrlLat + t * t * toCoords.lat;
                points.push([lng, lat]);
            }

            map.addSource('route-src', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            geometry: { type: 'LineString', coordinates: points },
                            properties: {}
                        },
                        {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [fromCoords.lng, fromCoords.lat] },
                            properties: { type: 'start' }
                        },
                        {
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: [toCoords.lng, toCoords.lat] },
                            properties: { type: 'end' }
                        }
                    ]
                }
            });

            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route-src',
                paint: {
                    'line-color': '#4f46e5',
                    'line-width': 3
                }
            });

            map.addLayer({
                id: 'route-endpoints',
                type: 'circle',
                source: 'route-src',
                filter: ['has', 'type'],
                paint: {
                    'circle-radius': 6,
                    'circle-color': [
                        'match',
                        ['get', 'type'],
                        'start', '#f43f5e',
                        'end', '#10b981',
                        '#ffffff'
                    ],
                    'circle-stroke-width': 1.5,
                    'circle-stroke-color': '#000000'
                }
            });

            // Setup animated Truck marker
            if (markerRef.current) {
                markerRef.current.remove();
                markerRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            const el = document.createElement('div');
            el.className = 'flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 border border-indigo-400 text-white shadow-lg';
            el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4h-8v-4h-4V9Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;

            const marker = new mapboxgl.Marker(el)
                .setLngLat([fromCoords.lng, fromCoords.lat])
                .addTo(map);
            markerRef.current = marker;

            // Loop animation along the curve points
            let stepIndex = 0;
            let direction = 1;

            const animate = () => {
                if (!markerRef.current) return;
                
                stepIndex += direction;
                if (stepIndex >= points.length) {
                    stepIndex = points.length - 1;
                    direction = -1; // reverse
                } else if (stepIndex < 0) {
                    stepIndex = 0;
                    direction = 1; // forward
                }

                const currentPoint = points[stepIndex];
                markerRef.current.setLngLat(currentPoint);
                animationFrameRef.current = requestAnimationFrame(animate);
            };

            animate();

            // Fit map bounds to show route
            const bounds = new mapboxgl.LngLatBounds();
            bounds.extend([fromCoords.lng, fromCoords.lat]);
            bounds.extend([toCoords.lng, toCoords.lat]);
            map.fitBounds(bounds, { padding: 60, duration: 1000 });
        };

        if (map.isStyleLoaded()) {
            handleStyleLoad();
        } else {
            map.once('style.load', handleStyleLoad);
        }

    }, [map, job]);

    return (
        <div ref={mapContainerRef} className="h-[300px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#070b13]" />
    );
}
