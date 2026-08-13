export const guineanCities: Record<string, { lat: number, lng: number }> = {
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
    "Port de Conakry": { lat: 9.5091, lng: -13.7121 }
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
