
'use server';

import { guineanCities } from "@/lib/guinea-cities";
import axios from 'axios';

interface RouteDetails {
    distance: number; // in km
    duration: number; // in seconds
}

/**
 * Fetches route details from Google Maps Directions API.
 * @param origin The starting city name.
 * @param destination The destination city name.
 * @returns A promise that resolves to an object with distance and duration.
 */
export async function getRouteDetails(origin: string, destination: string): Promise<RouteDetails | null> {
    const originCoords = guineanCities[origin];
    const destinationCoords = guineanCities[destination];

    if (!originCoords || !destinationCoords) {
        console.error("Invalid origin or destination city name.");
        return null;
    }
    
    // IMPORTANT: A real application should use a secure API key from environment variables.
    // This key is for demonstration purposes only and is restricted.
    const apiKey = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originCoords.lat},${originCoords.lng}&destination=${destinationCoords.lat},${destinationCoords.lng}&key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const route = response.data.routes[0];

        if (!route || !route.legs[0]) {
            console.error("No routes found by Google Maps API.");
            return null;
        }

        const leg = route.legs[0];
        const distanceInMeters = leg.distance.value;
        const durationInSeconds = leg.duration.value;

        // Apply a 25% slowdown factor for heavy vehicles
        const heavyVehicleDuration = durationInSeconds * 1.25;

        return {
            distance: Math.round(distanceInMeters / 1000), // convert to km
            duration: Math.round(heavyVehicleDuration),
        };
    } catch (error) {
        console.error("Error fetching directions from Google Maps:", error);
        return null;
    }
}
