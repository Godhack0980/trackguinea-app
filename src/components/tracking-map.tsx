"use client"

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent } from "./ui/card";
import { guineanCities } from "@/lib/guinea-cities";
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Mapbox access token fetched securely via server API proxy route
if (typeof window !== 'undefined') {
  fetch('/api/config/mapbox')
    .then(res => res.json())
    .then(data => {
      if (data.token) mapboxgl.accessToken = data.token;
    })
    .catch(() => {});
}

interface TrackingMapProps {
    from: string;
    to: string;
    shipmentId?: string;
}

interface ShipmentLocation {
    lat: number;
    lng: number;
    timestamp: number;
}

interface ShipmentData {
    status: string;
    currentLocation: ShipmentLocation | null;
    routeHistory: ShipmentLocation[];
}

export default function TrackingMap({ from, to, shipmentId }: TrackingMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [shipment, setShipment] = useState<ShipmentData | null>(null);
    const truckMarkerRef = useRef<mapboxgl.Marker | null>(null);

    // 1. Subscribe to real-time shipment document if shipmentId is provided
    useEffect(() => {
        if (!shipmentId) {
            setShipment(null);
            return;
        }

        const unsub = onSnapshot(doc(db, 'shipments', shipmentId), (snap) => {
            if (snap.exists()) {
                setShipment(snap.data() as ShipmentData);
            } else {
                setShipment(null);
            }
        }, (err) => {
            console.error("Error subscribing to shipment:", err);
        });

        return () => unsub();
    }, [shipmentId]);

    // 2. Initialize Mapbox Instance
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const fromCoords = guineanCities[from];
        const toCoords = guineanCities[to];

        // Initial default center: Guinea
        let initialCenter: [number, number] = [-10.9, 10.4];
        let initialZoom = 5.5;

        if (fromCoords) {
            initialCenter = [fromCoords.lng, fromCoords.lat];
            initialZoom = 7;
        }

        const mapInstance = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11', // dark premium theme
            center: initialCenter,
            zoom: initialZoom,
            attributionControl: false
        });

        // Add Zoom & Rotate Controls
        mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

        mapInstance.on('load', () => {
            setMapLoaded(true);

            // Add actual travel path line source & layer (Green/Emerald line)
            mapInstance.addSource('actual-route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: []
                    }
                }
            });

            mapInstance.addLayer({
                id: 'actual-route-layer',
                type: 'line',
                source: 'actual-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.85 }
            });
        });

        setMap(mapInstance);

        return () => {
            if (truckMarkerRef.current) {
                truckMarkerRef.current.remove();
                truckMarkerRef.current = null;
            }
            mapInstance.remove();
        };
    }, [from, to]);

    // 3. Draw Departure, Arrival points & theoretical route path
    useEffect(() => {
        if (!map || !mapLoaded) return;

        const fromCoords = guineanCities[from];
        const toCoords = guineanCities[to];

        const markers: mapboxgl.Marker[] = [];

        if (fromCoords) {
            const el = document.createElement('div');
            el.className = 'flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border-2 border-slate-900 shadow-lg';
            el.innerText = 'D';
            
            try {
                const markerFrom = new mapboxgl.Marker(el)
                    .setLngLat([fromCoords.lng, fromCoords.lat])
                    .addTo(map);
                markers.push(markerFrom);
            } catch (e) {
                console.warn("Marker D addition deferred:", e);
            }
        }

        if (toCoords) {
            const el = document.createElement('div');
            el.className = 'flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white border-2 border-slate-900 shadow-lg';
            el.innerText = 'A';
            
            try {
                const markerTo = new mapboxgl.Marker(el)
                    .setLngLat([toCoords.lng, toCoords.lat])
                    .addTo(map);
                markers.push(markerTo);
            } catch (e) {
                console.warn("Marker A addition deferred:", e);
            }
        }

        if (fromCoords && toCoords) {
            const fitAndDrawRoute = async () => {
                // Fetch real driving route from Mapbox Directions API
                const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    if (data.routes && data.routes.length > 0) {
                        const geometry = data.routes[0].geometry;

                        if (map.getSource('route')) {
                            (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
                                type: 'Feature',
                                properties: {},
                                geometry
                            });
                        } else {
                            map.addSource('route', {
                                type: 'geojson',
                                data: {
                                    type: 'Feature',
                                    properties: {},
                                    geometry
                                }
                            });

                            map.addLayer({
                                id: 'route',
                                type: 'line',
                                source: 'route',
                                layout: {
                                    'line-join': 'round',
                                    'line-cap': 'round'
                                },
                                paint: {
                                    'line-color': '#6366f1', // Indigo Neon Glow
                                    'line-width': 4,
                                    'line-opacity': 0.4
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error loading route from Mapbox:", error);
                    // Fallback to straight line
                    const fallbackGeometry = {
                        type: 'LineString',
                        coordinates: [
                            [fromCoords.lng, fromCoords.lat],
                            [toCoords.lng, toCoords.lat]
                        ]
                    };
                    if (map.getSource('route')) {
                        (map.getSource('route') as mapboxgl.GeoJSONSource).setData({
                            type: 'Feature',
                            properties: {},
                            geometry: fallbackGeometry
                        });
                    } else {
                        map.addSource('route', {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: fallbackGeometry
                            }
                        });
                        map.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#6366f1',
                                'line-width': 4,
                                'line-opacity': 0.4
                            }
                        });
                    }
                }

                // Smoothly fit bounds
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([fromCoords.lng, fromCoords.lat]);
                bounds.extend([toCoords.lng, toCoords.lat]);
                map.fitBounds(bounds, { padding: 50, duration: 1500, maxZoom: 8 });
            };

            if (map.isStyleLoaded()) {
                fitAndDrawRoute();
            } else {
                map.once('style.load', fitAndDrawRoute);
            }
        } else if (fromCoords) {
            map.flyTo({ center: [fromCoords.lng, fromCoords.lat], zoom: 8 });
        } else if (toCoords) {
            map.flyTo({ center: [toCoords.lng, toCoords.lat], zoom: 8 });
        }

        return () => {
            markers.forEach(m => m.remove());
        };
    }, [map, from, to]);

    // 4. Listen to real-time location changes of driver & draw actual path / animate truck
    useEffect(() => {
        if (!map || !mapLoaded || !shipment) return;

        // Draw actual route history (Emerald line)
        const historyCoords = (shipment.routeHistory || []).map(p => [p.lng, p.lat]);
        if (historyCoords.length > 1) {
            const actualSource = map.getSource('actual-route') as mapboxgl.GeoJSONSource;
            if (actualSource) {
                actualSource.setData({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: historyCoords
                    }
                });
            }
        }

        // Draw pulsing truck marker at currentLocation
        if (shipment.currentLocation) {
            const { lat, lng } = shipment.currentLocation;

            if (!truckMarkerRef.current) {
                const containerEl = document.createElement('div');
                containerEl.className = 'relative flex items-center justify-center';
                containerEl.style.width = '40px';
                containerEl.style.height = '40px';

                const pulseEl = document.createElement('div');
                pulseEl.className = 'animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-75';
                containerEl.appendChild(pulseEl);

                const iconEl = document.createElement('div');
                iconEl.className = 'relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-slate-900 shadow-xl text-xs font-bold';
                iconEl.innerText = '🚛';
                containerEl.appendChild(iconEl);

                try {
                    const marker = new mapboxgl.Marker(containerEl)
                        .setLngLat([lng, lat])
                        .addTo(map);
                    truckMarkerRef.current = marker;
                } catch (e) {
                    console.warn("Truck marker addition deferred:", e);
                }
            } else {
                truckMarkerRef.current.setLngLat([lng, lat]);
            }

            // Ease map center onto the truck's coordinates dynamically
            map.easeTo({
                center: [lng, lat],
                zoom: 7.5,
                duration: 1000
            });
        } else {
            // Remove truck marker if it went offline
            if (truckMarkerRef.current) {
                truckMarkerRef.current.remove();
                truckMarkerRef.current = null;
            }
        }
    }, [map, mapLoaded, shipment]);

    return (
        <Card className="shadow-lg rounded-2xl border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md">
            <CardContent className="p-0">
                <div ref={mapContainerRef} className="h-[400px] w-full" />
            </CardContent>
        </Card>
    );
}
