export const guineanCities: Record<string, { lat: number, lng: number }> = {
    // Prefecture Capitals
    "Conakry": { lat: 9.53795, lng: -13.67729 },
    "Nzérékoré": { lat: 7.7550, lng: -8.8181 },
    "Kankan": { lat: 10.3854, lng: -9.3057 },
    "Kindia": { lat: 10.0570, lng: -12.8556 },
    "Labé": { lat: 11.3186, lng: -12.2833 },
    "Mamou": { lat: 10.3750, lng: -12.0833 },
    "Boké": { lat: 10.9333, lng: -14.2917 },
    "Faranah": { lat: 10.0436, lng: -10.7455 },
    "Guéckédou": { lat: 8.5667, lng: -10.1333 },
    "Macenta": { lat: 8.5425, lng: -9.4711 },
    "Kissidougou": { lat: 9.1833, lng: -10.1000 },
    "Pita": { lat: 11.0583, lng: -12.3950 },
    "Siguiri": { lat: 11.4167, lng: -9.1667 },
    "Dalaba": { lat: 10.6833, lng: -12.2500 },
    "Kouroussa": { lat: 10.6500, lng: -9.8833 },
    "Dabola": { lat: 10.7417, lng: -11.1119 },
    "Télimélé": { lat: 10.9000, lng: -13.0333 },
    "Koundara": { lat: 12.4833, lng: -13.3000 },
    "Yomou": { lat: 7.5667, lng: -9.2500 },
    "Mandiana": { lat: 10.6333, lng: -8.6833 },
    "Coyah": { lat: 9.7056, lng: -13.3853 },
    "Dubréka": { lat: 9.7911, lng: -13.5233 },
    "Forécariah": { lat: 9.4306, lng: -13.0881 },
    "Port de Conakry": { lat: 9.5091, lng: -13.7121 },

    // Conakry Communes, Neighborhoods & Sub-districts
    "Kaloum": { lat: 9.5091, lng: -13.7121 },
    "Coléah": { lat: 9.53795, lng: -13.67729 },
    "Dixinn": { lat: 9.5532, lng: -13.6710 },
    "Matam": { lat: 9.5645, lng: -13.6521 },
    "Hamdallaye": { lat: 9.5780, lng: -13.6510 },
    "Bambéto": { lat: 9.5890, lng: -13.6390 },
    "Taouyah": { lat: 9.5931, lng: -13.6425 },
    "Taouya": { lat: 9.5931, lng: -13.6425 },
    "Kipé": { lat: 9.5992, lng: -13.6291 },
    "Ratoma": { lat: 9.6150, lng: -13.6210 },
    "Cosa": { lat: 9.6090, lng: -13.6190 },
    "Nongo": { lat: 9.6251, lng: -13.6012 },
    "Lambanyi": { lat: 9.6380, lng: -13.5890 },
    "Enco5": { lat: 9.6180, lng: -13.5990 },
    "Matoto": { lat: 9.6083, lng: -13.5622 },
    "Sangoyah": { lat: 9.6010, lng: -13.5780 },
    "Kissosso": { lat: 9.6110, lng: -13.5650 },
    "Entag": { lat: 9.6210, lng: -13.5480 },
    "Cobayah": { lat: 9.6452, lng: -13.5510 },
    "Sonfonia": { lat: 9.6581, lng: -13.5290 },
    "Lansanaya": { lat: 9.6350, lng: -13.5350 },
    "Dabompa": { lat: 9.6490, lng: -13.5180 },
    "Kagbelen": { lat: 9.6912, lng: -13.4831 },
    "Kountia": { lat: 9.6680, lng: -13.4980 },
    "Sanoyah": { lat: 9.6800, lng: -13.4790 },
    "Cimenterie": { lat: 9.6750, lng: -13.4890 },

    // Sub-Prefectures & Industrial Ports
    "Kamsar": { lat: 10.6500, lng: -14.6000 },
    "Sangarédi": { lat: 11.1000, lng: -14.2167 },
    "Fria": { lat: 10.3667, lng: -13.5833 }
};

export const cityNames = Object.keys(guineanCities);

export function getGuineanCityCoords(cityRaw: string): { lat: number; lng: number } {
  if (!cityRaw) return guineanCities["Conakry"];
  
  // Clean string: remove country suffix like "(Guinée)", "(Guinea)", or extra spaces/commas
  const cleanName = cityRaw.split('(')[0].split(',')[0].trim();
  
  // 1. Direct exact match
  if (guineanCities[cleanName]) return guineanCities[cleanName];

  // 2. Case-insensitive or substring match
  const lowerClean = cleanName.toLowerCase();
  const foundKey = Object.keys(guineanCities).find(
    key => key.toLowerCase() === lowerClean || lowerClean.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerClean)
  );

  return foundKey ? guineanCities[foundKey] : guineanCities["Conakry"];
}

/**
 * Async coordinate lookup with Mapbox Geocoding fallback for precise neighborhood/sub-prefecture resolution.
 */
export async function getGuineanCityCoordsAsync(cityRaw: string, mapboxToken?: string): Promise<{ lat: number; lng: number }> {
  const syncCoords = getGuineanCityCoords(cityRaw);
  if (!cityRaw) return syncCoords;

  const cleanName = cityRaw.split('(')[0].split(',')[0].trim();
  
  // If exact city key exists in local dictionary, return it immediately
  if (guineanCities[cleanName]) return guineanCities[cleanName];

  const token = mapboxToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return syncCoords;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanName + ', Guinea')}.json?access_token=${token}&country=gn&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const coords = { lat, lng };
        guineanCities[cleanName] = coords; // Cache locally
        return coords;
      }
    }
  } catch (err) {
    console.warn("Mapbox geocoding lookup fallback error:", err);
  }

  return syncCoords;
}
