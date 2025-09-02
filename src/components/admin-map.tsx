
"use client"

import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent } from "./ui/card";
import { guineanCities } from "@/lib/guinea-cities";
import React from "react";

interface ActiveJob {
    id: string;
    from: string;
    to: string;
    transporterName?: string;
}

interface AdminMapProps {
    activeJobs: ActiveJob[];
}

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '1rem', // Match card rounding
};

const mapCenter = {
  lat: 9.9456,
  lng: -9.6966
};


export default function AdminMap({ activeJobs }: AdminMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyA0H1SxW7JRoqqmCyhh9ZqH5KmYZn-mBWM"
    });

    const [selectedJob, setSelectedJob] = React.useState<ActiveJob | null>(null);

    const getPosition = (from: string, to: string) => {
        const fromCoords = guineanCities[from];
        const toCoords = guineanCities[to];
        if (fromCoords && toCoords) {
            // Simple midpoint for truck icon visualization
            return {
                lat: (fromCoords.lat + toCoords.lat) / 2,
                lng: (fromCoords.lng + toCoords.lng) / 2
            };
        }
        return guineanCities[from] || guineanCities[to] || null;
    };
    
    const onLoad = React.useCallback(function callback(map: google.maps.Map) {
        const bounds = new window.google.maps.LatLngBounds(mapCenter);
        if (activeJobs.length > 0) {
           activeJobs.forEach(job => {
               const pos = getPosition(job.from, job.to);
               if (pos) {
                   bounds.extend(pos);
               }
           });
           map.fitBounds(bounds);
        } else {
             map.setCenter(mapCenter);
             map.setZoom(7);
        }
    }, [activeJobs]);


    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardContent className="p-2">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={mapCenter}
                        zoom={7}
                        onLoad={onLoad}
                         options={{
                            mapTypeControl: false,
                            streetViewControl: false,
                        }}
                    >
                        {activeJobs.map(job => {
                             if (!job || !job.id || !job.from || !job.to) return null;
                             const position = getPosition(job.from, job.to);
                             if (!position) return null;

                             return (
                                <Marker 
                                    key={job.id} 
                                    position={position}
                                    icon={{
                                        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4h-8v-4h-4V9Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
                                        scaledSize: new window.google.maps.Size(40, 40),
                                    }}
                                    onClick={() => setSelectedJob(job)}
                                />
                             );
                        })}

                        {selectedJob && getPosition(selectedJob.from, selectedJob.to) && (
                            <InfoWindow
                                position={getPosition(selectedJob.from, selectedJob.to)!}
                                onCloseClick={() => setSelectedJob(null)}
                            >
                                <div className="p-1">
                                    <h4 className="font-bold">Course #{selectedJob.id.substring(0,6)}</h4>
                                    <p>{selectedJob.from} → {selectedJob.to}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Transporteur: {selectedJob.transporterName || 'N/A'}
                                    </p>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                ) : (
                    <div className="h-[500px] w-full flex items-center justify-center bg-muted">
                        <p>Chargement de la carte...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
