"use client"

import React, { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { collectionGroup, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/auth-context";

import SharedHeader from "@/components/shared-header";
import SharedFooter from "@/components/shared-footer";
import AvailableTransportersMap from "@/components/available-transporters-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Car, Search, MapPin, Scale, Ruler, Image as ImageIcon, Lock } from "lucide-react";
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

const vehicleTypes = [
  "Benne",
  "Plateau",
  "Citerne",
  "Porte-conteneur",
  "Porte-char",
  "Frigo",
  "Caterpillar / Engin de chantier",
  "Remorque",
  "Semi-remorque",
  "Plateau Minier",
  "Toupie à Béton / Malaxeur",
  "Porte-engin",
];

const wheelsOptions = [
  "4 roues",
  "6 roues",
  "10 roues (Pata)",
  "12 roues",
  "18 roues",
  "22 roues",
  "Chenilles (Engin chantier)",
];

function PublicFleetGalleryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const vehicleIdParam = searchParams.get("vehicleId");
  const { t, lang } = useTranslation();

  const [viewMode, setViewMode] = useState<'vehicles' | 'drivers'>('vehicles');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrefecture, setSelectedPrefecture] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedWheels, setSelectedWheels] = useState("all");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collectionGroup(db, 'vehicles'));
      const snap = await getDocs(q);
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    } catch (e: any) {
      console.error("Error loading vehicles list:", e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Handle auto-scroll and highlight when redirected back to page
  useEffect(() => {
    if (vehicleIdParam && vehicles.length > 0) {
      const element = document.getElementById(`vehicle-${vehicleIdParam}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add("ring-2", "ring-primary", "scale-[1.01]");
        }, 600);
      }
    }
  }, [vehicleIdParam, vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (vehicle.description && vehicle.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const vehiclePref = vehicle.currentPrefecture || vehicle.ownerCity || "Conakry";
      const matchesPrefecture = selectedPrefecture === "all" || vehiclePref.toLowerCase() === selectedPrefecture.toLowerCase();
      const matchesType = selectedType === "all" || vehicle.type.toLowerCase() === selectedType.toLowerCase();
      const matchesStatus = selectedStatus === "all" || vehicle.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesWheels = selectedWheels === "all" || (vehicle.wheelsCount && vehicle.wheelsCount.toLowerCase() === selectedWheels.toLowerCase());
      return matchesSearch && matchesPrefecture && matchesType && matchesStatus && matchesWheels;
    });
  }, [vehicles, searchTerm, selectedPrefecture, selectedType, selectedStatus, selectedWheels]);

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
            {t('fleet.filter_status_available')}
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
            {t('fleet.filter_status_mission')}
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
            {t('fleet.filter_status_maintenance')}
          </span>
        );
      default:
        className += 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
        return <span className={className}>{status}</span>;
    }
  };

  const isLoggedIn = !!user;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-foreground">
      <SharedHeader />
      
      <main className="flex-grow py-12 px-4 md:px-8">
        <div className="container max-w-7xl mx-auto space-y-10">
          
          {/* Hero Banner */}
          <div className="text-center space-y-4 py-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              {t('fleet.hero_title')}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              {t('fleet.hero_desc')}
            </p>
          </div>

          {/* View Mode Toggle tabs */}
          <div className="flex justify-center">
            <div className="flex rounded-2xl bg-slate-900/60 border border-slate-800/80 p-1.5 backdrop-blur-md">
              <Button
                variant="ghost"
                onClick={() => setViewMode('vehicles')}
                className={cn(
                  "rounded-xl px-6 py-2 text-xs font-bold transition-all duration-300 gap-1.5 border-0",
                  viewMode === 'vehicles' 
                    ? "bg-primary text-white hover:bg-primary/95 shadow-md" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                🚛 {t('fleet.tab_vehicles')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setViewMode('drivers')}
                className={cn(
                  "rounded-xl px-6 py-2 text-xs font-bold transition-all duration-300 gap-1.5 border-0",
                  viewMode === 'drivers' 
                    ? "bg-primary text-white hover:bg-primary/95 shadow-md" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                🧭 {t('fleet.tab_drivers')}
              </Button>
            </div>
          </div>

          {viewMode === 'vehicles' ? (
            <>
              {/* Filters Bar */}
              <Card className="p-6 shadow-xl rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('fleet.search_placeholder')}
                  className="pl-10 rounded-xl border-slate-800 bg-[#0D1322] text-white placeholder:text-slate-400 focus:border-primary/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select onValueChange={setSelectedPrefecture} value={selectedPrefecture}>
                <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs">
                  <SelectValue placeholder={t('fleet.filter_prefecture')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800 max-h-56">
                  <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">{t('fleet.filter_prefecture_all')}</SelectItem>
                  {prefecturesGuinea.map(pref => (
                    <SelectItem key={pref} value={pref} className="focus:bg-slate-800 focus:text-white cursor-pointer">{pref}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={setSelectedType} value={selectedType}>
                <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs">
                  <SelectValue placeholder={t('fleet.filter_type')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800">
                  <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">{t('fleet.filter_type_all')}</SelectItem>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type} value={type} className="focus:bg-slate-800 focus:text-white cursor-pointer">{type.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={setSelectedWheels} value={selectedWheels}>
                <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs">
                  <SelectValue placeholder={t('fleet.filter_wheels')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800">
                  <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">{t('fleet.filter_wheels_all')}</SelectItem>
                  {wheelsOptions.map(wheels => (
                    <SelectItem key={wheels} value={wheels} className="focus:bg-slate-800 focus:text-white cursor-pointer">{wheels}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                <SelectTrigger className="rounded-xl border-slate-800 bg-[#0D1322] text-slate-100 text-xs">
                  <SelectValue placeholder={t('fleet.filter_status')} />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-[#0D1322] text-slate-100 border-slate-800">
                  <SelectItem value="all" className="focus:bg-slate-800 focus:text-white cursor-pointer">{t('fleet.filter_status_all')}</SelectItem>
                  <SelectItem value="disponible" className="focus:bg-slate-800 focus:text-white cursor-pointer">🟢 {t('fleet.filter_status_available')}</SelectItem>
                  <SelectItem value="en mission" className="focus:bg-slate-800 focus:text-white cursor-pointer">🔵 {t('fleet.filter_status_mission')}</SelectItem>
                  <SelectItem value="en maintenance" className="focus:bg-slate-800 focus:text-white cursor-pointer">🟡 {t('fleet.filter_status_maintenance')}</SelectItem>
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
              {t('fleet.loading_error')}{error.message}
            </p>
          ) : filteredVehicles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((vehicle) => {
                const isTarget = vehicleIdParam === vehicle.id;
                return (
                  <Card 
                    key={vehicle.id} 
                    id={`vehicle-${vehicle.id}`}
                    className={cn(
                      "shadow-xl rounded-3xl border bg-slate-900/60 backdrop-blur-md overflow-hidden flex flex-col justify-between group transition-all duration-500",
                      isTarget ? "border-primary ring-2 ring-primary scale-[1.01]" : "border-slate-800 hover:border-primary/20 hover:shadow-primary/5"
                    )}
                  >
                    <div>
                      {/* Vehicle Photo */}
                      <div className="relative h-48 w-full bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800/40">
                        {vehicle.imageUrl ? (
                           <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                            <ImageIcon className="h-10 w-10 opacity-30" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">{t('fleet.image_unavailable')}</span>
                          </div>
                        )}
                        
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 backdrop-blur-md">
                            {vehicle.type}
                          </Badge>
                        </div>
                      </div>

                      <CardHeader className="pb-2">
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

                    <CardFooter className="pt-3 border-t border-slate-800/60 bg-slate-950/20 flex flex-col gap-2.5">
                      {isLoggedIn ? (
                        <div className="w-full space-y-2">
                          <div className="w-full p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1 text-xs text-emerald-200 font-semibold">
                            <p className="flex items-center gap-1.5 font-bold text-white">
                              📞 {t('fleet.owner_contact')}
                            </p>
                            <p className="text-sm text-emerald-400 font-extrabold tracking-wider mt-0.5">
                              {vehicle.ownerPhone || t('fleet.owner_not_provided')}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1 leading-normal font-normal">
                              {t('fleet.owner_managed_by', { name: vehicle.ownerName, type: vehicle.ownerType === 'company' ? t('fleet.company_pro') : t('fleet.individual') })}
                            </p>
                          </div>
                          <Link href="/dashboard/client/requests" className="w-full block">
                            <Button className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90 text-white text-xs h-9 transition-all">
                              {t('fleet.btn_request_trip')}
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          <div className="w-full p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-[10px] text-indigo-200 font-semibold">
                            <Lock size={12} className="shrink-0 text-indigo-400" />
                            <span>{t('fleet.visitor_lock')}</span>
                          </div>

                          <Link href={`/login?redirect=/fleet&vehicleId=${vehicle.id}`} className="w-full">
                            <Button className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90 text-white text-xs h-9 transition-all">
                              {t('fleet.btn_login_reserve')}
                            </Button>
                          </Link>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border border-dashed border-slate-800 rounded-3xl p-16 text-center min-h-[300px] flex flex-col justify-center items-center gap-3 backdrop-blur-md bg-slate-900/60">
              <Car className="h-14 w-14 opacity-30 text-muted-foreground" />
              <div>
                <p className="font-bold text-foreground text-lg">{t('fleet.no_vehicle_title')}</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  {t('fleet.no_vehicle_desc')}
                </p>
              </div>
            </Card>
          )}
            </>
          ) : (
            <Card className="p-6 md:p-8 shadow-xl rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
              <CardContent className="p-0">
                <AvailableTransportersMap />
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      <SharedFooter />
    </div>
  );
}

export default function PublicFleetGalleryPage() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="flex justify-center items-center h-screen bg-slate-950 text-white">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      }>
        <PublicFleetGalleryContent />
      </Suspense>
    </AuthProvider>
  );
}
