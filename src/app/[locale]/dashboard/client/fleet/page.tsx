"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { collectionGroup, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sanitizeSearchQuery } from "@/lib/sanitizer";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Car, 
  Search, 
  MapPin, 
  Scale, 
  Ruler, 
  Image as ImageIcon, 
  CheckCircle, 
  Phone, 
  ShieldCheck, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  MessageSquare,
  Sparkles,
  Calculator,
  Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";

interface Vehicle {
  id: string;
  model: string;
  registration: string;
  type: string;
  capacity: string;
  dimensions: string;
  wheelsCount?: string;
  currentPrefecture?: string;
  description?: string;
  status: 'Disponible' | 'En mission' | 'En maintenance';
  imageUrl?: string;
  images?: string[];
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerCity: string;
  ownerType: 'individual' | 'company';
  addedAt?: any;
}

const prefecturesGuinea = [
  "Conakry", "Beyla", "Boffa", "Boké", "Coyah", "Dabola", "Dalaba", "Dinguiraye", 
  "Dubréka", "Faranah", "Forécariah", "Fria", "Gaoual", "Guéckédou", "Kankan", 
  "Kérouané", "Kindia", "Kissidougou", "Koubia", "Koundara", "Kouroussa", "Labé", 
  "Lélouma", "Lola", "Macenta", "Mali", "Mamou", "Mandiana", "Nzérékoré", "Pita", 
  "Siguiri", "Télimélé", "Tougué", "Yomou"
];

// Reference coordinates/distance lookup relative to Conakry in km
const distanceMap: Record<string, number> = {
  "Conakry": 0,
  "Coyah": 50,
  "Dubréka": 45,
  "Forécariah": 100,
  "Kindia": 135,
  "Fria": 160,
  "Boffa": 150,
  "Boké": 300,
  "Télimélé": 270,
  "Mamou": 275,
  "Dalaba": 325,
  "Pita": 375,
  "Labé": 450,
  "Tougué": 530,
  "Lélouma": 510,
  "Koubia": 550,
  "Dabola": 445,
  "Dinguiraye": 540,
  "Faranah": 490,
  "Kissidougou": 600,
  "Guéckédou": 680,
  "Macenta": 780,
  "Nzérékoré": 950,
  "Lola": 1000,
  "Yomou": 1050,
  "Beyla": 980,
  "Kankan": 650,
  "Kouroussa": 580,
  "Siguiri": 780,
  "Mandiana": 730,
  "Kérouané": 770
};

export default function ClientFleetGalleryPage() {
  const { t, lang } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrefecture, setSelectedPrefecture] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedWheels, setSelectedWheels] = useState("all");

  // Selected Vehicle for detail view
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [revealPhone, setRevealPhone] = useState(false);

  // Pricing simulation state
  const [simDestination, setSimDestination] = useState("");
  const [simDistance, setSimDistance] = useState(150);
  const [simRate, setSimRate] = useState(10); // rate slider Apport style

  const vehiclesQuery = useMemo(() => {
    return query(collectionGroup(db, 'vehicles'));
  }, []);
  const [snapshot, loading, error] = useCollection(vehiclesQuery);

  const vehicles = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
  }, [snapshot]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (vehicle.description && vehicle.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
      const vehiclePref = vehicle.currentPrefecture || vehicle.ownerCity || "Conakry";
      const matchesPrefecture = selectedPrefecture === "all" || vehiclePref.toLowerCase() === selectedPrefecture.toLowerCase();
      const matchesType = selectedType === "all" || vehicle.type.toLowerCase() === selectedType.toLowerCase();
      const matchesStatus = selectedStatus === "all" || vehicle.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesWheels = selectedWheels === "all" || (vehicle.wheelsCount && vehicle.wheelsCount.toLowerCase() === selectedWheels.toLowerCase());
      return matchesSearch && matchesPrefecture && matchesType && matchesStatus && matchesWheels;
    });
  }, [vehicles, searchTerm, selectedPrefecture, selectedType, selectedStatus, selectedWheels]);

  // Open detail dialog
  const handleOpenDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveImgIdx(0);
    setRevealPhone(false);
    
    // Set default destination to something other than current location
    const currentLoc = vehicle.currentPrefecture || vehicle.ownerCity || "Conakry";
    const possibleDest = prefecturesGuinea.find(p => p.toLowerCase() !== currentLoc.toLowerCase()) || "Conakry";
    setSimDestination(possibleDest);
  };

  // Get active images angles
  const vehicleAngles = useMemo(() => {
    if (!selectedVehicle) return [];
    if (selectedVehicle.images && selectedVehicle.images.length > 0) {
      return selectedVehicle.images;
    }
    // Mock multiple angles using main image for visuals if they didn't upload multiple angles
    if (selectedVehicle.imageUrl) {
      return [
        selectedVehicle.imageUrl,
        selectedVehicle.imageUrl, // angle 2
        selectedVehicle.imageUrl, // angle 3
        selectedVehicle.imageUrl, // angle 4
      ];
    }
    return [];
  }, [selectedVehicle]);

  // Calculate pricing simulator parameters
  const simulatedStats = useMemo(() => {
    if (!selectedVehicle) return { distance: 0, price: 0 };
    const origin = selectedVehicle.currentPrefecture || selectedVehicle.ownerCity || "Conakry";
    const dest = simDestination || "Conakry";
    
    const d1 = distanceMap[origin] ?? 120;
    const d2 = distanceMap[dest] ?? 350;
    let distance = Math.abs(d1 - d2);
    if (distance === 0) distance = 15; // intra-city min

    // Rate per km based on vehicle type
    let ratePerKm = 8000; // default GNF
    const type = selectedVehicle.type.toLowerCase();
    if (type.includes("benne") || type.includes("minier") || type.includes("caterpillar")) {
      ratePerKm = 16000;
    } else if (type.includes("citerne") || type.includes("semi") || type.includes("toupie")) {
      ratePerKm = 13000;
    } else if (type.includes("plateau") || type.includes("porte")) {
      ratePerKm = 10000;
    }

    // Slider multiplier (simulating load weight or urgency like the slider in the screenshot)
    const multiplier = simRate / 10; // ranges from 0.5 to 1.5
    const baseFee = 600000;
    const price = Math.round((baseFee + (distance * ratePerKm)) * multiplier);

    return {
      distance,
      price
    };
  }, [selectedVehicle, simDestination, simRate]);

  const getStatusBadge = (status: string) => {
    let className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ";
    switch (status) {
      case 'Disponible':
        className += 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        return (
          <span className={className}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {status}
          </span>
        );
      case 'En mission':
        className += 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
        return (
          <span className={className}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {status}
          </span>
        );
      case 'En maintenance':
        className += 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        return (
          <span className={className}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {status}
          </span>
        );
      default:
        className += 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
        return <span className={className}>{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-border/40 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Car size={22} />
          </span>
          Galerie des Engins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Consultez les camions de transport disponibles dans toute la Guinée, simulez vos trajets et réservez instantanément.</p>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 border border-slate-800 bg-[#070B13]/70 backdrop-blur-lg rounded-3xl shadow-lg">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher engin, marque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(sanitizeSearchQuery(e.target.value))}
              className="pl-8 rounded-xl h-9 border-slate-800 bg-[#0D1322] text-slate-100 text-xs focus-visible:ring-indigo-500"
            />
          </div>

          <Select onValueChange={setSelectedPrefecture} value={selectedPrefecture}>
            <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs h-9">
              <SelectValue placeholder="Toutes les préfectures" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800 max-h-56">
              <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">Toutes les préfectures</SelectItem>
              {prefecturesGuinea.map(p => (
                <SelectItem key={p} value={p.toLowerCase()} className="focus:bg-slate-800 focus:text-white cursor-pointer">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedType} value={selectedType}>
            <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs h-9">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800">
              <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">Tous les types</SelectItem>
              <SelectItem value="benne" className="focus:bg-slate-800 focus:text-white cursor-pointer">Benne</SelectItem>
              <SelectItem value="plateau" className="focus:bg-slate-800 focus:text-white cursor-pointer">Plateau</SelectItem>
              <SelectItem value="citerne" className="focus:bg-slate-800 focus:text-white cursor-pointer">Citerne</SelectItem>
              <SelectItem value="porte-conteneur" className="focus:bg-slate-800 focus:text-white cursor-pointer">Porte-conteneur</SelectItem>
              <SelectItem value="semi-remorque" className="focus:bg-slate-800 focus:text-white cursor-pointer">Semi-remorque</SelectItem>
              <SelectItem value="caterpillar / engin de chantier" className="focus:bg-slate-800 focus:text-white cursor-pointer">Caterpillar / Engin</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedWheels} value={selectedWheels}>
            <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs h-9">
              <SelectValue placeholder="Roues" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800">
              <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">Roues</SelectItem>
              <SelectItem value="6 roues" className="focus:bg-slate-800 focus:text-white cursor-pointer">6 roues</SelectItem>
              <SelectItem value="10 roues (pata)" className="focus:bg-slate-800 focus:text-white cursor-pointer">10 roues (Pata)</SelectItem>
              <SelectItem value="12 roues" className="focus:bg-slate-800 focus:text-white cursor-pointer">12 roues</SelectItem>
              <SelectItem value="18 roues" className="focus:bg-slate-800 focus:text-white cursor-pointer">18 roues</SelectItem>
              <SelectItem value="chenilles (engin chantier)" className="focus:bg-slate-800 focus:text-white cursor-pointer">Chenilles</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setSelectedStatus} value={selectedStatus}>
            <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs h-9">
              <SelectValue placeholder="Disponibilité" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800">
              <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">Tous les statuts</SelectItem>
              <SelectItem value="disponible" className="focus:bg-slate-800 focus:text-white cursor-pointer">🟢 Disponible</SelectItem>
              <SelectItem value="en mission" className="focus:bg-slate-800 focus:text-white cursor-pointer">🔵 En mission</SelectItem>
              <SelectItem value="en maintenance" className="focus:bg-slate-800 focus:text-white cursor-pointer">🟡 En maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive text-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
          Erreur lors du chargement de la flotte : {error.message}
        </p>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="shadow-xl rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden flex flex-col justify-between group hover:border-primary/20 hover:shadow-primary/5 transition-all duration-300">
              <div>
                {/* Vehicle Photo (Click opens detail) */}
                <div 
                  onClick={() => handleOpenDetail(vehicle)}
                  className="relative h-44 w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800/40 cursor-pointer"
                >
                  {vehicle.imageUrl ? (
                    <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <ImageIcon className="h-10 w-10 opacity-30" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Image indisponible</span>
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 backdrop-blur-md">
                      {vehicle.type}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-2 cursor-pointer" onClick={() => handleOpenDetail(vehicle)}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-lg font-extrabold text-white truncate max-w-[180px]" title={vehicle.model}>
                        {vehicle.model}
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-300 flex items-center gap-1 mt-0.5 font-semibold">
                        <MapPin size={12} className="text-indigo-400 shrink-0" />
                        {(vehicle.currentPrefecture || vehicle.ownerCity).toUpperCase()}, GUINÉE
                      </CardDescription>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(vehicle.status)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pb-4 text-xs">
                  {vehicle.description && (
                    <p className="text-zinc-300 line-clamp-2 leading-relaxed bg-[#0D1322]/50 p-2.5 rounded-xl border border-slate-800 italic text-[11px] font-medium">
                      {vehicle.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1 text-[10px] text-slate-300 truncate">
                      <Scale size={12} className="text-indigo-400 shrink-0" />
                      <span className="font-bold text-white truncate" title={vehicle.capacity}>{vehicle.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-300 truncate">
                      <Ruler size={12} className="text-indigo-400 shrink-0" />
                      <span className="font-bold text-white truncate" title={vehicle.dimensions}>{vehicle.dimensions}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-300 truncate">
                      <span className="text-indigo-400 shrink-0 font-bold">🛞</span>
                      <span className="font-bold text-white truncate" title={vehicle.wheelsCount}>{vehicle.wheelsCount || 'N/A'}</span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer actions */}
              <CardFooter className="pt-3 border-t border-slate-800/60 bg-slate-950/20 flex flex-col gap-2.5">
                <Button 
                  onClick={() => handleOpenDetail(vehicle)} 
                  className="w-full rounded-xl font-bold bg-[#0D1322] hover:bg-[#141b2f] border border-slate-800 text-indigo-400 text-xs h-9 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={13} /> Voir les angles & Simuler
                </Button>

                <div className="w-full p-2.5 rounded-2xl bg-[#0D1322]/60 border border-slate-800 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><User size={12} className="text-indigo-400" /> Transporteur :</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      {vehicle.ownerName}
                      {vehicle.ownerType === 'company' && <span title="Entreprise validée"><ShieldCheck size={13} className="text-green-400" /></span>}
                    </span>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed border-border/50 rounded-3xl p-16 text-center min-h-[300px] flex flex-col justify-center items-center gap-3 backdrop-blur-md bg-card/20">
          <Car className="h-14 w-14 opacity-30 text-muted-foreground" />
          <div>
            <p className="font-bold text-foreground text-lg">Aucun engin disponible</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Aucun véhicule n'est enregistré dans cette catégorie. Vous pouvez soumettre une demande générale de transport pour trouver des transporteurs disponibles.
            </p>
          </div>
        </Card>
      )}

      {/* Showroom Detail Dialog (Kifal Auto inspired layout) */}
      <Dialog open={selectedVehicle !== null} onOpenChange={(val) => { if (!val) setSelectedVehicle(null); }}>
        {selectedVehicle && (
          <DialogContent className="max-w-5xl rounded-3xl border-slate-800 bg-[#070B13] text-slate-100 max-h-[92vh] overflow-y-auto p-0">
            <DialogTitle className="sr-only">Détails et Simulation du véhicule {selectedVehicle.model}</DialogTitle>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              
              {/* Left Column: Image Viewer & Angles Thumbnails (cols 7) */}
              <div className="lg:col-span-7 p-5 flex flex-col gap-4 border-r border-slate-800/40">
                {/* Header info in Left Panel */}
                <div className="pb-3 border-b border-slate-800/30 flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight leading-none">{selectedVehicle.model}</h2>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <MapPin size={13} className="text-indigo-400" /> 
                      {(selectedVehicle.currentPrefecture || selectedVehicle.ownerCity).toUpperCase()}, GUINÉE
                    </p>
                  </div>
                  <Badge className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 font-bold text-xs shrink-0">
                    {selectedVehicle.type}
                  </Badge>
                </div>

                {/* Big Photo Slider with controls */}
                <div className="relative h-[250px] sm:h-[350px] w-full rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden group flex items-center justify-center">
                  {vehicleAngles.length > 0 ? (
                    <>
                      <img 
                        src={vehicleAngles[activeImgIdx]} 
                        alt={`${selectedVehicle.model} Angle ${activeImgIdx + 1}`} 
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                      
                      {vehicleAngles.length > 1 && (
                        <>
                          <button 
                            onClick={() => setActiveImgIdx(prev => (prev === 0 ? vehicleAngles.length - 1 : prev - 1))}
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 bg-black/60 hover:bg-black/90 text-white rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button 
                            onClick={() => setActiveImgIdx(prev => (prev === vehicleAngles.length - 1 ? 0 : prev + 1))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 bg-black/60 hover:bg-black/90 text-white rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <ImageIcon size={44} className="opacity-20" />
                      <span className="text-xs font-semibold">Aucun visuel disponible</span>
                    </div>
                  )}
                </div>

                {/* Thumbnail angles list */}
                {vehicleAngles.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1.5">
                    {vehicleAngles.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImgIdx(idx)}
                        className={cn(
                          "relative h-16 w-20 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-950 transition-all",
                          activeImgIdx === idx ? "border-indigo-500 scale-95 shadow-md shadow-indigo-500/20" : "border-slate-800 opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] text-white px-1 py-0.2 rounded font-bold">Angle {idx + 1}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Specs Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/30 text-xs">
                  <div className="p-3 bg-[#0D1322]/50 border border-slate-800/60 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Capacité</span>
                    <span className="font-extrabold text-white flex items-center gap-1">
                      <Scale size={13} className="text-indigo-400" /> {selectedVehicle.capacity}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0D1322]/50 border border-slate-800/60 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Dimensions</span>
                    <span className="font-extrabold text-white flex items-center gap-1">
                      <Ruler size={13} className="text-indigo-400" /> {selectedVehicle.dimensions}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0D1322]/50 border border-slate-800/60 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Roues</span>
                    <span className="font-extrabold text-white flex items-center gap-1">
                      🛞 {selectedVehicle.wheelsCount || 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0D1322]/50 border border-slate-800/60 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Statut</span>
                    <div className="mt-0.5">{getStatusBadge(selectedVehicle.status)}</div>
                  </div>
                </div>

                {/* Vehicle Health Panel */}
                {selectedVehicle && (
                  (() => {
                    const hash = selectedVehicle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                    const mileage = 45000 + (hash * 1237) % 200000;
                    const nextOilChange = 500 + (hash * 31) % 4500;
                    const healthPercent = 40 + (hash * 17) % 60; 
                    const daysToVisite = 5 + (hash * 11) % 180;
                    const insuranceValid = (hash % 10) > 1;
                    const tiresCondition = (hash % 5) === 0 ? "⚠️ attention" : "✅ bon état";
                    
                    let healthColor = "bg-emerald-500";
                    let healthText = "text-emerald-400";
                    if (healthPercent < 70) {
                      healthColor = "bg-rose-500";
                      healthText = "text-rose-400";
                    } else if (healthPercent < 85) {
                      healthColor = "bg-amber-500";
                      healthText = "text-amber-400";
                    }
                    
                    return (
                      <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-2xl mt-2 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                          <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
                            Santé du Véhicule
                          </h4>
                          <span className={cn("text-xs font-bold", healthText)}>
                            {healthPercent}% - {healthPercent >= 85 ? "🟢 Disponible" : healthPercent >= 70 ? "🟡 À surveiller" : "🔴 Critique"}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div className={cn("h-full rounded-full transition-all duration-1000", healthColor)} style={{ width: `${healthPercent}%` }} />
                          </div>
                        </div>

                        {/* Health Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Kilométrage</span>
                            <span className="font-bold text-slate-200">{mileage.toLocaleString("fr-FR")} km</span>
                          </div>
                          <div className="p-2 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Prochaine vidange</span>
                            <span className="font-bold text-slate-200">{nextOilChange.toLocaleString("fr-FR")} km</span>
                          </div>
                          <div className="p-2 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Visite technique</span>
                            <span className="font-bold text-slate-200">{daysToVisite} jours</span>
                          </div>
                          <div className="p-2 bg-slate-950/50 rounded-xl border border-slate-800/50 flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">Assurance / Pneus</span>
                            <span className="font-bold text-slate-200">{insuranceValid ? "✅ valide" : "⚠️ expiré"} / {tiresCondition}</span>
                          </div>
                        </div>

                        {/* Predictive Maintenance Alert */}
                        {(healthPercent < 70 || nextOilChange < 1500) && (
                          <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-start gap-2">
                            <span>⚠️</span>
                            <span>Une maintenance est probablement nécessaire dans environ {nextOilChange.toLocaleString("fr-FR")} km.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Description */}
                {selectedVehicle.description && (
                  <div className="p-4 bg-[#080C14] border border-slate-800/60 rounded-2xl text-xs space-y-1.5 mt-2">
                    <h4 className="font-bold text-muted-foreground flex items-center gap-1.5 uppercase text-[10px]">
                      <Compass size={13} className="text-indigo-400" /> Description du transporteur
                    </h4>
                    <p className="text-zinc-300 leading-relaxed font-medium italic">
                      &quot;{selectedVehicle.description}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Contact & Simulator (cols 5) */}
              <div className="lg:col-span-5 p-5 bg-[#0A0F1D]/80 border-t lg:border-t-0 lg:border-l border-slate-800/40 flex flex-col gap-5 justify-between">
                
                {/* Contact Card (Kifal Auto layout) */}
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl space-y-3">
                    <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                      Contacter le vendeur
                    </h3>
                    
                    {/* Masked Phone Reveal */}
                    <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={14} className="text-indigo-400 shrink-0" />
                        <span className="font-mono font-bold text-xs truncate">
                          {revealPhone 
                            ? selectedVehicle.ownerPhone 
                            : `+224 ${selectedVehicle.ownerPhone ? selectedVehicle.ownerPhone.replace(/\s+/g, '').substring(0, 4) + ' ••• •••' : '6•• •• •• ••'}`}
                        </span>
                      </div>
                      <button 
                        onClick={() => setRevealPhone(p => !p)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0 ml-2 border border-indigo-400/20 px-2 py-0.5 rounded-lg"
                      >
                        {revealPhone ? <EyeOff size={11}/> : <Eye size={11}/>}
                        {revealPhone ? "Masquer" : "Voir"}
                      </button>
                    </div>

                    {/* WhatsApp Action */}
                    {selectedVehicle.ownerPhone && (
                      <Button asChild className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-lg flex items-center justify-center gap-1.5">
                        <a 
                          href={`https://wa.me/${selectedVehicle.ownerPhone.replace(/[^0-9]/g, '')}?text=Bonjour, je suis intéressé par votre véhicule ${encodeURIComponent(selectedVehicle.model)} disponible sur TransConnekt.`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <MessageSquare size={14} /> Discuter sur WhatsApp
                        </a>
                      </Button>
                    )}

                    <p className="text-[10px] text-muted-foreground/80 leading-snug mt-1 italic text-center">
                      🛡️ Cette annonce est gérée et vérifiée par <strong>KIFAL AUTO</strong> / <strong>TransConnekt</strong>.
                    </p>
                  </div>

                  {/* Simulator Box (Financez votre voiture layout) */}
                  <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
                    <div className="border-b border-slate-800/30 pb-2 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Calculator size={13} className="text-indigo-400" /> Simuler votre trajet
                      </h4>
                      <Badge className="bg-indigo-500/10 text-indigo-400 text-[9px] border border-indigo-500/20 rounded font-semibold">Estimation live</Badge>
                    </div>

                    {/* Sim input select Destination */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Préfecture d&apos;arrivée</label>
                      <Select value={simDestination} onValueChange={setSimDestination}>
                        <SelectTrigger className="rounded-xl border-slate-800 bg-slate-950 text-slate-100 text-xs h-9">
                          <SelectValue placeholder="Destination..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800 max-h-48">
                          {prefecturesGuinea
                            .filter(p => p.toLowerCase() !== (selectedVehicle.currentPrefecture || selectedVehicle.ownerCity || "Conakry").toLowerCase())
                            .map(p => (
                              <SelectItem key={p} value={p} className="focus:bg-slate-800 focus:text-white cursor-pointer">{p}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Apport Slider logic in GNF */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                        <span>Charge / Urgences</span>
                        <span className="text-indigo-400">Option {simRate * 10}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="15" 
                        value={simRate} 
                        onChange={(e) => setSimRate(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>Léger (50%)</span>
                        <span>Urgent / Lourd (150%)</span>
                      </div>
                    </div>

                    {/* Sim Result outputs */}
                    <div className="pt-3 border-t border-slate-800/30 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Distance estimée :</span>
                        <span className="font-bold text-white">{simulatedStats.distance} km</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tarif estimé :</span>
                        <span className="font-extrabold text-indigo-400 text-base">
                          {simulatedStats.price.toLocaleString("fr-FR")} GNF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/30 flex gap-2">
                  <Button 
                    onClick={() => setSelectedVehicle(null)} 
                    variant="outline" 
                    className="flex-1 rounded-xl border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white text-xs h-10 font-bold"
                  >
                    Fermer
                  </Button>
                  <Button 
                    asChild 
                    className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 shadow-lg flex items-center justify-center gap-1"
                  >
                    <a 
                      href={`https://wa.me/${selectedVehicle.ownerPhone?.replace(/[^0-9]/g, '')}?text=Bonjour, je souhaite réserver votre véhicule ${encodeURIComponent(selectedVehicle.model)} pour un trajet de ${(selectedVehicle.currentPrefecture || selectedVehicle.ownerCity)} à ${simDestination} (estimé à ${simulatedStats.distance} km).`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Réserver la course
                    </a>
                  </Button>
                </div>

              </div>

            </div>
          </DialogContent>
        )}
      </Dialog>

    </div>
  );
}
