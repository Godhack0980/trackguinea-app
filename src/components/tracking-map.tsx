
"use client"

import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Card, CardContent } from "./ui/card";
import { guineanCities } from "@/lib/guinea-cities";
import React, { useState, useEffect } from "react";

interface TrackingMapProps {
    from: string;
    to: string;
}

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '1rem',
};

const center = {
  lat: 9.9456,
  lng: -9.6966
};

export default function TrackingMap({ from, to }: TrackingMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyA0H1SxW7JRoqqmCyhh9ZqH5KmYZn-mBWM"
    });

    const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null)

    useEffect(() => {
        if (!isLoaded || !from || !to || !guineanCities[from] || !guineanCities[to]) {
            setDirectionsResponse(null);
            return;
        }

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: guineanCities[from],
                destination: guineanCities[to],
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirectionsResponse(result);
                } else {
                    console.error(`error fetching directions ${result}`);
                    setDirectionsResponse(null);
                }
            }
        );
    }, [isLoaded, from, to]);

    const fromCoords = guineanCities[from] || null;
    const toCoords = guineanCities[to] || null;

    const onLoad = React.useCallback(function callback(mapInstance: google.maps.Map) {
        if (fromCoords && toCoords) {
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(fromCoords);
            bounds.extend(toCoords);
            mapInstance.fitBounds(bounds);
        } else if (fromCoords) {
             mapInstance.setCenter(fromCoords);
             mapInstance.setZoom(10);
        } else if (toCoords) {
             mapInstance.setCenter(toCoords);
             mapInstance.setZoom(10);
        } else {
            mapInstance.setCenter(center);
            mapInstance.setZoom(7);
        }
        setMap(mapInstance)
    }, [fromCoords, toCoords])

    const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
        setMap(null)
    }, [])


    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardContent className="p-2">
                 {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={7}
                        onLoad={onLoad}
                        onUnmount={onUnmount}
                        options={{
                            mapTypeControl: false,
                            streetViewControl: false,
                        }}
                    >
                       {directionsResponse && (
                           <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: true }} />
                       )}
                       {fromCoords && <Marker position={fromCoords} title={"Départ"} label={{ text: "D", color: "white", fontWeight: "bold" }} />}
                       {toCoords && <Marker position={toCoords} title={"Arrivée"} label={{ text: "A", color: "white", fontWeight: "bold" }}/>}
                    </GoogleMap>
                ) : (
                     <div className="h-[400px] w-full flex items-center justify-center bg-muted">
                        <p>Chargement de la carte...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
