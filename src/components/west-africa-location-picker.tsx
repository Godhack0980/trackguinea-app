"use client";

import React, { useState, useEffect } from "react";
import { WEST_AFRICA_COUNTRIES, CountryData } from "@/lib/west-africa-locations";
import { guineanCities } from "@/lib/guinea-cities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WestAfricaLocationPickerProps {
  value?: string;
  onChange: (locationValue: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function WestAfricaLocationPicker({
  value,
  onChange,
  label,
  placeholder = "Sélectionnez une localisation...",
  className,
}: WestAfricaLocationPickerProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("GN");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [isManual, setIsManual] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>("");

  const currentCountry = WEST_AFRICA_COUNTRIES.find((c) => c.code === selectedCountryCode) || WEST_AFRICA_COUNTRIES[0];

  // Parse existing value if available safely without infinite loop
  useEffect(() => {
    if (!value) {
      if (selectedRegion || manualText) {
        setSelectedRegion("");
        setManualText("");
      }
      return;
    }

    let regionPart = value;
    let countryPart = "";
    const match = value.match(/^(.*)\s*\((.*)\)$/);
    if (match) {
      regionPart = match[1].trim();
      countryPart = match[2].trim();
    }

    const matchedCountry = countryPart 
      ? WEST_AFRICA_COUNTRIES.find((c) => c.name.toLowerCase() === countryPart.toLowerCase())
      : WEST_AFRICA_COUNTRIES.find((c) => c.regions.includes(regionPart));

    const targetCountry = matchedCountry || currentCountry;

    if (targetCountry.code !== selectedCountryCode) {
      setSelectedCountryCode(targetCountry.code);
    }

    if (targetCountry.regions.includes(regionPart)) {
      if (selectedRegion !== regionPart) setSelectedRegion(regionPart);
      if (isManual) setIsManual(false);
    } else {
      if (!isManual) setIsManual(true);
      if (manualText !== regionPart) setManualText(regionPart);
    }
  }, [value]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setSelectedRegion("");
    setManualText("");
    setIsManual(false);
  };

  const handleRegionChange = (regionVal: string) => {
    if (regionVal === "CURRENT_GPS_LOCATION") {
      if (typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            let minD = Infinity;
            let best = "Conakry";
            Object.entries(guineanCities).forEach(([cityName, loc]) => {
              const d = Math.sqrt(Math.pow(latitude - loc.lat, 2) + Math.pow(longitude - loc.lng, 2));
              if (d < minD) {
                minD = d;
                best = cityName;
              }
            });
            setSelectedCountryCode("GN");
            setSelectedRegion(best);
            setIsManual(false);
            onChange(`${best} (Guinée)`);
          },
          (err) => {
            console.warn("Geolocation error:", err);
          }
        );
      }
      return;
    }

    if (regionVal === "MANUAL_ENTRY") {
      setIsManual(true);
      setSelectedRegion("");
      return;
    }
    setIsManual(false);
    setSelectedRegion(regionVal);
    const country = WEST_AFRICA_COUNTRIES.find((c) => c.code === selectedCountryCode);
    const fullLoc = country ? `${regionVal} (${country.name})` : regionVal;
    onChange(fullLoc);
  };

  const handleManualTextChange = (text: string) => {
    setManualText(text);
    const country = WEST_AFRICA_COUNTRIES.find((c) => c.code === selectedCountryCode);
    const fullLoc = text.trim() ? (country ? `${text.trim()} (${country.name})` : text.trim()) : "";
    onChange(fullLoc);
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      {label && (
        <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {label}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsManual(!isManual);
              if (!isManual) setSelectedRegion("");
            }}
            className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
          >
            <Edit3 size={11} /> {isManual ? "Liste déroulante" : "Saisie manuelle"}
          </button>
        </Label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Country Selector */}
        <div className="sm:col-span-4">
          <Select value={selectedCountryCode} onValueChange={handleCountryChange}>
            <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-64 z-50">
              {WEST_AFRICA_COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs font-semibold rounded-xl">
                  <span className="mr-1.5">{c.flag}</span> {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Region Selector OR Manual Entry */}
        <div className="sm:col-span-8">
          {!isManual ? (
            <Select value={selectedRegion || undefined} onValueChange={handleRegionChange}>
              <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-semibold">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72 z-50">
                <SelectItem value="CURRENT_GPS_LOCATION" className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 rounded-xl bg-emerald-500/10">
                  📍 Mon emplacement actuel (Détection GPS auto)...
                </SelectItem>
                <SelectItem value="MANUAL_ENTRY" className="text-xs font-bold text-primary rounded-xl">
                  ✏️ Saisie manuelle libre (Entrer une zone spécifique)...
                </SelectItem>
                {currentCountry.regions.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs font-medium rounded-xl">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="relative">
              <Input
                type="text"
                value={manualText}
                onChange={(e) => handleManualTextChange(e.target.value)}
                placeholder={`Entrez la sous-préfecture, quartier ou zone (${currentCountry.name})...`}
                className="h-11 rounded-xl text-xs bg-background pr-10 border-primary/50 focus:ring-primary font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  setIsManual(false);
                  setManualText("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
                title="Revenir à la liste"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
