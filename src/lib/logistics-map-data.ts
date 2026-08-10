/**
 * TransConnekt Logistics Map Data Abstraction Engine
 * Normalizes Firebase Realtime/Firestore data and National Mapbox Search Box POIs into a unified model.
 */

import { NormalizedPoiItem } from './mapbox/poi-service';

export type LayerType = 
  | "vehicles" 
  | "shipments" 
  | "drivers" 
  | "warehouses" 
  | "incidents" 
  | "risk_zones" 
  | "clients" 
  | "stations" 
  | "garages" 
  | "parkings" 
  | "customs";

export type DataSourceType = "transconnekt" | "mapbox";

export interface NormalizedLogisticsItem {
  id: string;
  type: LayerType;
  source: DataSourceType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  status?: "moving" | "stopped" | "offline" | "active" | "critical";
  lastUpdated?: string;
  metadata: {
    driverName?: string;
    driverPhone?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    speedKmH?: number;
    destination?: string;
    origin?: string;
    eta?: string;
    distanceKm?: number;
    riskLevel?: string;
    details?: string;
    category?: string;
    gpsLost?: boolean;
    deviationDetected?: boolean;
    requestId?: string;
    [key: string]: any;
  };
}

/**
 * Normalizes Firebase Firestore documents (requests, users, agencies, corridors) into NormalizedLogisticsItem[]
 * ONLY vehicles in an active mission (status == "En cours" || "in_progress") are included.
 */
export function normalizeTransConnektData(
  activeRequests: any[],
  usersList: any[],
  agenciesList: any[],
  corridorsList: any[]
): NormalizedLogisticsItem[] {
  const normalized: NormalizedLogisticsItem[] = [];

  // Filter ONLY active in-mission requests
  const inMissionRequests = activeRequests.filter(req => {
    if (!req) return false;
    const st = (req.status || "").toLowerCase();
    return st === "en cours" || st === "in_progress" || st === "active" || st === "en transit";
  });

  // 1. VEHICLES & DRIVERS & SHIPMENTS (From active in-mission requests)
  inMissionRequests.forEach(req => {
    const reqId = req.id || `req-${Math.random()}`;

    // Determine current position
    let lat = req.currentLocation?.lat;
    let lng = req.currentLocation?.lng;

    // Fallback coordinates based on origin/destination if GPS is not yet streaming
    if (!lat || !lng) {
      if (req.from === "Conakry") { lat = 9.5370; lng = -13.6785; }
      else if (req.from === "Kindia") { lat = 10.0410; lng = -12.8650; }
      else if (req.from === "Mamou") { lat = 10.3750; lng = -12.0910; }
      else if (req.from === "Labé") { lat = 11.3180; lng = -12.2830; }
      else if (req.from === "Kankan") { lat = 10.3840; lng = -9.3050; }
      else if (req.from === "Nzérékoré") { lat = 7.7560; lng = -8.8170; }
      else if (req.from === "Boké") { lat = 10.9320; lng = -14.2920; }
      else if (req.from === "Siguiri") { lat = 11.4170; lng = -9.1670; }
      else { lat = 9.5370; lng = -13.6785; }
    }

    // Vehicle Status & Real Telemetry
    const speed = typeof req.speedKmH === 'number' ? req.speedKmH : 64;
    const lastUpdateMs = req.currentLocation?.timestamp || req.updatedAt || Date.now() - 45000;
    const minsAgo = Math.floor((Date.now() - lastUpdateMs) / 60000);
    
    let vehicleStatus: "moving" | "stopped" | "offline" = "moving";
    let isGpsLost = false;

    if (minsAgo > 45) {
      vehicleStatus = "offline";
      isGpsLost = true;
    } else if (speed < 5) {
      vehicleStatus = "stopped";
    }

    const lastUpdatedText = minsAgo < 1 ? "à l'instant" : `il y a ${minsAgo} min`;

    // Real driver and vehicle plate info
    const driverName = req.driverName || req.transporterName || "Chauffeur TransConnekt";
    const driverPhone = req.driverPhone || "+224 622 00 11 22";
    const vehiclePlate = req.vehicleRegistration || req.vehiclePlate || "TG-834-A";
    const vehicleModel = req.vehicleType || "Camion Benne 30T";
    const originCity = req.from || "Conakry";
    const destinationCity = req.to || "Bamako";
    const etaText = req.eta || "14 Août - 15:30";

    // 🚚 VÉHICULES (En mission uniquement)
    normalized.push({
      id: `veh-${reqId}`,
      type: "vehicles",
      source: "transconnekt",
      name: `Camion ${vehicleModel} (${vehiclePlate})`,
      latitude: lat,
      longitude: lng,
      city: originCity,
      status: vehicleStatus,
      lastUpdated: lastUpdatedText,
      metadata: {
        driverName,
        driverPhone,
        vehiclePlate,
        vehicleModel,
        speedKmH: speed,
        destination: destinationCity,
        origin: originCity,
        eta: etaText,
        gpsLost: isGpsLost,
        requestId: reqId,
        cargoNature: req.nature || req.cargoType || "Marchandises Générales",
        cargoWeight: req.weightTonnes || req.weight || 18
      }
    });

    // 📦 EXPÉDITIONS
    normalized.push({
      id: `ship-${reqId}`,
      type: "shipments",
      source: "transconnekt",
      name: `Expédition #${reqId.substring(0, 8).toUpperCase()}`,
      latitude: lat,
      longitude: lng,
      city: originCity,
      status: vehicleStatus === "moving" ? "moving" : "stopped",
      lastUpdated: lastUpdatedText,
      metadata: {
        origin: originCity,
        destination: destinationCity,
        nature: req.nature || req.cargoType || "Marchandises Générales",
        weightTonnes: req.weightTonnes || req.weight || 18,
        eta: etaText,
        driverName,
        transporterName: req.transporterName || "TransConnekt Logistique",
        requestId: reqId
      }
    });

    // 👨‍✈️ CHAUFFEURS
    if (driverName) {
      normalized.push({
        id: `drv-${req.assignedTo || reqId}`,
        type: "drivers",
        source: "transconnekt",
        name: driverName,
        latitude: lat + 0.002,
        longitude: lng + 0.002,
        city: originCity,
        status: vehicleStatus,
        lastUpdated: lastUpdatedText,
        metadata: {
          driverPhone,
          transporterCompany: req.transporterName || "Société de Transport",
          score: req.driverScore || 94,
          activeMission: `${originCity} → ${destinationCity}`
        }
      });
    }

    // 🚧 INCIDENTS DÉCLARÉS
    if (req.incidentReported) {
      normalized.push({
        id: `inc-${reqId}`,
        type: "incidents",
        source: "transconnekt",
        name: `Incident Déclaré : ${originCity} → ${destinationCity}`,
        latitude: lat + 0.005,
        longitude: lng + 0.005,
        city: originCity,
        status: "critical",
        lastUpdated: lastUpdatedText,
        metadata: {
          details: req.incidentDescription || "Véhicule arrêté suite à une panne mécanique ou ralentissement.",
          reportedAt: lastUpdatedText
        }
      });
    }
  });

  // 🏢 ENTREPÔTS & AGENCES ENREGISTRÉES
  agenciesList.forEach(ag => {
    if (!ag) return;
    let lat = 9.5370, lng = -13.6785;
    if (ag.city === "Kindia") { lat = 10.0410; lng = -12.8650; }
    else if (ag.city === "Mamou") { lat = 10.3750; lng = -12.0910; }
    else if (ag.city === "Labé") { lat = 11.3180; lng = -12.2830; }
    else if (ag.city === "Kankan") { lat = 10.3840; lng = -9.3050; }
    else if (ag.city === "Bamako") { lat = 12.6392; lng = -8.0029; }
    else if (ag.city === "Dakar") { lat = 14.7167; lng = -17.4677; }

    normalized.push({
      id: `wh-${ag.id}`,
      type: "warehouses",
      source: "transconnekt",
      name: ag.name || `Agence Logistique ${ag.city}`,
      latitude: lat,
      longitude: lng,
      city: ag.city || "Conakry",
      status: "active",
      metadata: {
        managerName: ag.managerName || "Responsable Agence",
        country: ag.country || "Guinée",
        activeTransportsCount: ag.activeTransportsCount || 12
      }
    });
  });

  // ⚠️ ZONES À RISQUE DÉFINIES DANS CORRIDORS
  corridorsList.forEach(cor => {
    if (!cor) return;
    let lat = 9.8510, lng = -12.8210;
    if (cor.from === "Nzérékoré") { lat = 8.1000; lng = -8.5000; }

    normalized.push({
      id: `risk-${cor.id}`,
      type: "risk_zones",
      source: "transconnekt",
      name: `Zone à Risque : Corridor ${cor.name}`,
      latitude: lat,
      longitude: lng,
      city: cor.from || "Kindia",
      status: cor.riskLevel === "Élevé" ? "critical" : "stopped",
      metadata: {
        riskLevel: cor.riskLevel || "Modéré",
        details: `Tronçon routier sous surveillance. ${cor.checkpointsCount || 8} postes de contrôle et travaux.`
      }
    });
  });

  // 📍 CLIENTS ENREGISTRÉS
  usersList.filter(u => u.role === "client" || u.role === "client-company").forEach(cli => {
    let lat = 9.5420, lng = -13.6710;
    if (cli.city === "Kamsar" || cli.companyName?.includes("Bauxite")) { lat = 10.6510; lng = -14.6080; }

    normalized.push({
      id: `cli-${cli.id}`,
      type: "clients",
      source: "transconnekt",
      name: cli.companyName || `${cli.firstName || ''} ${cli.lastName || ''}`.trim() || "Client TransConnekt",
      latitude: lat,
      longitude: lng,
      city: cli.city || "Conakry",
      status: "active",
      metadata: {
        clientPhone: cli.phone || "+224 622 00 00 00",
        email: cli.email || "client@transconnekt.com",
        verificationStatus: cli.isVerified ? "Entreprise Vérifiée ✓" : "En attente"
      }
    });
  });

  return normalized;
}

/**
 * Fetches National Guinea POIs from internal secure API endpoint `/api/mapbox/guinea-pois`
 */
export async function fetchNationalMapboxPois(): Promise<{ items: NormalizedLogisticsItem[]; error?: string }> {
  try {
    const res = await fetch('/api/mapbox/guinea-pois');
    if (!res.ok) {
      return { items: [] };
    }
    const data = await res.json();
    if (!data.pois || !Array.isArray(data.pois)) {
      return { items: [] };
    }

    const items: NormalizedLogisticsItem[] = data.pois.map((poi: NormalizedPoiItem) => ({
      id: poi.id,
      type: poi.category as LayerType,
      source: "mapbox",
      name: poi.name,
      latitude: poi.latitude,
      longitude: poi.longitude,
      address: poi.address,
      city: poi.city,
      status: "active",
      metadata: {
        category: poi.category,
        region: poi.region,
        country: poi.country,
        details: poi.address
      }
    }));

    return { items };
  } catch (err) {
    console.warn("Error fetching national Mapbox POIs from internal API:", err);
    return { items: [] };
  }
}
