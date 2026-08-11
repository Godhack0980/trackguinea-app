"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2, Search, Star, Truck, ShieldCheck, AlertTriangle,
  MapPin, Phone, Package, ArrowRight, RefreshCw, Users, Zap, Award
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import AvailableTransportersMap from "@/components/available-transporters-map"
import { useTranslation } from "@/lib/translations"
import { sanitizeSearchQuery } from "@/lib/sanitizer"

interface Transporter {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isVerified?: boolean;
  rating?: number;
  jobsCompleted?: number;
  city?: string;
  licenseType?: string;
  vehicleType?: string;
  capacity?: string | number;
  isAvailable?: boolean;
  jobsInProgress?: number;
}

// Pseudo-random but deterministic availability based on UID hash
function getAvailabilityStatus(id: string, jobsInProgress?: number): 'available' | 'busy' | 'offline' {
  if (jobsInProgress && jobsInProgress > 0) return 'busy';
  const hash = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  if (hash % 5 === 0) return 'offline';
  if (hash % 3 === 0) return 'busy';
  return 'available';
}

const availabilityConfig = {
  available: {
    label: 'Disponible',
    dot: 'bg-emerald-400',
    pulse: 'animate-ping bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    glow: 'shadow-emerald-500/10',
  },
  busy: {
    label: 'En mission',
    dot: 'bg-amber-400',
    pulse: 'animate-ping bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    glow: 'shadow-amber-500/10',
  },
  offline: {
    label: 'Hors ligne',
    dot: 'bg-slate-500',
    pulse: '',
    badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/25',
    glow: '',
  },
};

function getRatingStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
}

export default function AvailableTransportersPage() {
  const { loadingAuth } = useAuth();
  const { t, lang } = useTranslation();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [nameFilter, setNameFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');

  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransporters = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'transporter'),
        where('isVerified', '==', true),
        orderBy('lastName', 'asc')
      );
      const snap = await getDocs(q);

      // Fetch active shipments to mark transporters/drivers currently in mission
      const busyIds = new Set<string>();
      try {
        const activeReqsSnap = await getDocs(query(collection(db, 'requests'), where('status', 'in', ['En cours', 'en_route', 'en_chargement', 'in_progress'])));
        activeReqsSnap.docs.forEach(doc => {
          const d = doc.data();
          if (d.transporterId) busyIds.add(d.transporterId);
          if (d.driverId) busyIds.add(d.driverId);
        });
      } catch (err) {
        console.warn("Could not fetch active requests for busy status:", err);
      }

      setTransporters(snap.docs.map(d => {
        const data = d.data();
        const isBusyInMission = busyIds.has(d.id);
        return {
          id: d.id,
          ...data,
          jobsInProgress: isBusyInMission ? 1 : (data.jobsInProgress || 0),
          isAvailable: isBusyInMission ? false : (data.isAvailable !== false)
        } as Transporter;
      }));
    } catch (e: any) {
      console.error("Error loading transporters:", e);
      setError(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth) fetchTransporters();
  }, [loadingAuth, fetchTransporters]);

  const getInitials = (t: Transporter) =>
    `${t.firstName?.[0] ?? ''}${t.lastName?.[0] ?? ''}`.toUpperCase() || 'T';

  const uniqueLocations = useMemo(() => {
    const locs = transporters.map(t => t.city).filter(Boolean) as string[];
    return [...new Set(locs)].sort();
  }, [transporters]);

  const filteredTransporters = useMemo(() => {
    return transporters.filter(t => {
      const nameMatch = !nameFilter ||
        t.firstName?.toLowerCase().includes(nameFilter.toLowerCase()) ||
        t.lastName?.toLowerCase().includes(nameFilter.toLowerCase());
      const locationMatch = locationFilter === 'all' || t.city === locationFilter;
      const status = getAvailabilityStatus(t.id, t.jobsInProgress);
      const availMatch = availFilter === 'all' || status === availFilter;
      return nameMatch && locationMatch && availMatch;
    });
  }, [transporters, nameFilter, locationFilter, availFilter]);

  const stats = useMemo(() => ({
    total: transporters.length,
    available: transporters.filter(t => getAvailabilityStatus(t.id, t.jobsInProgress) === 'available').length,
    busy: transporters.filter(t => getAvailabilityStatus(t.id, t.jobsInProgress) === 'busy').length,
  }), [transporters]);

  const isLoading = loadingAuth || loading;

  if (error) {
    return (
      <div className="p-6">
        <Card className="shadow-md rounded-2xl border-destructive/30 bg-destructive/5">
          <div className="p-6 flex items-start gap-4">
            <AlertTriangle className="text-destructive h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">{lang === 'fr' ? "Erreur de chargement" : "Loading Error"}</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              <Button onClick={() => fetchTransporters()} className="mt-4 rounded-xl" size="sm">
                {lang === 'fr' ? "Réessayer" : "Retry"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{lang === 'fr' ? "Transporteurs Disponibles" : "Available Transporters"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === 'fr' ? "Trouvez un transporteur vérifié pour votre prochaine livraison en Guinée." : "Find a verified transporter for your next delivery in Guinea."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchTransporters(true)}
          disabled={isRefreshing}
          className="gap-2 text-muted-foreground hover:text-foreground self-start sm:self-auto"
        >
          <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
          {lang === 'fr' ? "Actualiser" : "Refresh"}
        </Button>
      </div>

      {/* Stats Row */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Users size={18} />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{lang === 'fr' ? "Transporteurs vérifiés" : "Verified transporters"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 relative">
              <Zap size={18} />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-emerald-400">{stats.available}</p>
              <p className="text-xs text-muted-foreground">{lang === 'fr' ? "Disponibles maintenant" : "Available now"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Truck size={18} />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-amber-400">{stats.busy}</p>
              <p className="text-xs text-muted-foreground">{lang === 'fr' ? "En mission active" : "On active mission"}</p>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle tabs */}
      <div className="flex justify-center my-2">
        <div className="flex rounded-2xl bg-card border border-border/80 p-1.5 backdrop-blur-md">
          <Button
            variant="ghost"
            onClick={() => setViewMode('list')}
            className={cn(
              "rounded-xl px-6 py-2 text-xs font-bold transition-all duration-300 gap-1.5 border-0",
              viewMode === 'list' 
                ? "bg-primary text-white hover:bg-primary/95 shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/5"
            )}
          >
            📋 {lang === 'fr' ? "Liste des Transporteurs" : "Transporters List"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setViewMode('map')}
            className={cn(
              "rounded-xl px-6 py-2 text-xs font-bold transition-all duration-300 gap-1.5 border-0",
              viewMode === 'map' 
                ? "bg-primary text-white hover:bg-primary/95 shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/5"
            )}
          >
            🧭 {lang === 'fr' ? "Carte Interactive MapBox" : "Interactive Map"}
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder={lang === 'fr' ? "Rechercher par nom de transporteur..." : "Search by transporter name..."}
            className="pl-10 h-11 rounded-xl bg-background"
            value={nameFilter}
            onChange={(e) => setNameFilter(sanitizeSearchQuery(e.target.value))}
          />
        </div>
        <Select onValueChange={setLocationFilter} value={locationFilter}>
          <SelectTrigger className="h-11 rounded-xl bg-background w-full sm:w-[200px]">
            <MapPin size={14} className="text-primary mr-1" />
            <SelectValue placeholder={lang === 'fr' ? "Filtrer par ville" : "Filter by city"} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{lang === 'fr' ? "Toutes les villes" : "All cities"}</SelectItem>
            {uniqueLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={setAvailFilter} value={availFilter}>
          <SelectTrigger className="h-11 rounded-xl bg-background w-full sm:w-[200px]">
            <SelectValue placeholder={lang === 'fr' ? "Disponibilité" : "Availability"} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">{lang === 'fr' ? "Tous les statuts" : "All statuses"}</SelectItem>
            <SelectItem value="available">{lang === 'fr' ? "🟢 Disponible" : "🟢 Available"}</SelectItem>
            <SelectItem value="busy">{lang === 'fr' ? "🟡 En mission" : "🟡 Busy"}</SelectItem>
            <SelectItem value="offline">{lang === 'fr' ? "⚫ Hors ligne" : "⚫ Offline"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground font-medium">
          {lang === 'fr' 
            ? `${filteredTransporters.length} transporteur${filteredTransporters.length > 1 ? 's' : ''} trouvé${filteredTransporters.length > 1 ? 's' : ''}`
            : `${filteredTransporters.length} transporter${filteredTransporters.length > 1 ? 's' : ''} found`
          }
          {nameFilter || locationFilter !== 'all' || availFilter !== 'all' ? (lang === 'fr' ? ' (filtré)' : ' (filtered)') : ''}
        </p>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : filteredTransporters.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTransporters.map((transporter) => {
            const status = getAvailabilityStatus(transporter.id, transporter.jobsInProgress);
            const cfg = availabilityConfig[status];
            const rating = transporter.rating ?? 0;
            const stars = getRatingStars(rating);
            const completedJobs = transporter.jobsCompleted ?? 0;
            const isTopRated = rating >= 4.5 && completedJobs >= 10;

            return (
              <Link
                key={transporter.id}
                href={`/dashboard/client/transporter/${transporter.id}`}
                className="block group"
              >
                <Card className={`
                  relative flex flex-col w-full rounded-3xl border border-border/50
                  bg-card/60 backdrop-blur-md overflow-hidden
                  shadow-lg ${cfg.glow}
                  transition-all duration-300
                  group-hover:scale-[1.02] group-hover:shadow-xl group-hover:border-primary/40
                `}>

                  {/* Top accent bar — color varies by status */}
                  <div className={`h-1 w-full ${
                    status === 'available' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                    status === 'busy' ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                    'bg-gradient-to-r from-slate-600 to-slate-500'
                  }`} />

                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar + Identity */}
                      <div className="flex items-center gap-3.5">
                        <div className="relative shrink-0">
                          <Avatar className="h-14 w-14 border-2 border-border/50 shadow-md">
                            <AvatarFallback className="bg-primary/10 text-primary font-extrabold text-lg">
                              {getInitials(transporter)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Availability dot with pulse */}
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                            {status !== 'offline' && (
                              <span className={`absolute inline-flex h-3 w-3 rounded-full opacity-75 ${cfg.pulse}`} />
                            )}
                            <span className={`relative inline-flex h-3 w-3 rounded-full ${cfg.dot} ring-2 ring-card`} />
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-base text-foreground leading-tight truncate">
                              {transporter.firstName} {transporter.lastName}
                            </p>
                            {transporter.isVerified && (
                              <span title="Compte vérifié" className="flex shrink-0">
                                <ShieldCheck size={15} className="text-primary" />
                              </span>
                            )}
                            {isTopRated && (
                              <span title="Top transporteur" className="flex shrink-0">
                                <Award size={14} className="text-amber-400" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {transporter.vehicleType || 'Transporteur Poids Lourd'}
                          </p>
                        </div>
                      </div>

                      {/* Availability Badge */}
                      <Badge className={`${cfg.badge} text-[10px] font-bold shrink-0 px-2 py-1 rounded-full flex items-center gap-1.5`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4 flex-grow">
                    {/* Star Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {stars.map((filled, i) => (
                          <Star
                            key={i}
                            size={13}
                            className={filled ? "text-amber-400 fill-amber-400" : "text-border"}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-bold text-foreground">
                        {rating > 0 ? rating.toFixed(1) : 'Nouveau'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({completedJobs} course{completedJobs > 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Info row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {transporter.city && (
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                          <MapPin size={12} className="text-primary shrink-0" />
                          <span className="font-medium truncate">{transporter.city}</span>
                        </div>
                      )}
                      {transporter.licenseType && (
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                          <Truck size={12} className="text-sky-400 shrink-0" />
                          <span className="font-medium">Permis {transporter.licenseType}</span>
                        </div>
                      )}
                      {transporter.capacity && (
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                          <Package size={12} className="text-emerald-400 shrink-0" />
                          <span className="font-medium">{transporter.capacity} tonnes</span>
                        </div>
                      )}
                      {transporter.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 rounded-xl px-2.5 py-1.5">
                          <Phone size={12} className="text-indigo-400 shrink-0" />
                          <span className="font-medium truncate">{transporter.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Top-rated ribbon */}
                    {isTopRated && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-2.5 py-1.5">
                        <Award size={11} />
                        Top Transporteur TransConnekt
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t border-border/20 bg-muted/10 pt-3 pb-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-muted-foreground">
                        {status === 'available' ? '✓ Peut accepter des demandes' :
                         status === 'busy' ? '⏳ Mission en cours' :
                         '— Non disponible actuellement'}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                        Voir profil <ArrowRight size={12} />
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground bg-card/40 border border-border/50 rounded-3xl backdrop-blur-md gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 border border-border/30">
            <Truck className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-bold text-foreground text-lg">Aucun transporteur trouvé</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Modifiez vos filtres de recherche ou revenez plus tard — de nouveaux transporteurs rejoignent le réseau chaque jour.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl mt-2"
            onClick={() => {
              setNameFilter('');
              setLocationFilter('all');
              setAvailFilter('all');
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}
        </>
      ) : (
        <Card className="p-6 md:p-8 shadow-xl rounded-3xl border border-border bg-slate-900/40 backdrop-blur-md">
          <CardContent className="p-0">
            <AvailableTransportersMap />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
