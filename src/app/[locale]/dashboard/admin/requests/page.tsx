"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getDocs, collection, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, RefreshCw, Search, Truck, Package, MapPin, 
  CheckCircle2, Clock, AlertTriangle, Eye, ShieldCheck, DollarSign, Filter, ArrowRight 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminRequestsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramFilter = searchParams.get('filter') || searchParams.get('status') || 'all';
  const paramId = searchParams.get('id') || '';

  const [filter, setFilter] = useState<string>(paramFilter);
  const [searchTerm, setSearchTerm] = useState<string>(paramId);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (paramFilter) setFilter(paramFilter);
    if (paramId) setSearchTerm(paramId);
  }, [paramFilter, paramId]);

  const fetchRequests = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const baseQuery = collection(db, 'requests');
      const q = query(baseQuery, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAllRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      console.error("Error loading admin requests:", e);
      setError(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'En attente':
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <Clock className="w-3.5 h-3.5" /> En attente
          </Badge>
        );
      case 'En cours':
      case 'en_route':
      case 'in_progress':
        return (
          <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            En cours
          </Badge>
        );
      case 'Terminé':
      case 'livre':
      case 'completed':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Livré / Terminé
          </Badge>
        );
      case 'Annulé':
      case 'cancelled':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <AlertTriangle className="w-3.5 h-3.5" /> Annulé
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs font-bold">{status}</Badge>;
    }
  };

  const filteredRequests = useMemo(() => {
    return allRequests.filter(req => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || (
        req.id.toLowerCase().includes(term) ||
        (req.clientName || '').toLowerCase().includes(term) ||
        (req.driverName || '').toLowerCase().includes(term) ||
        (req.transporterName || '').toLowerCase().includes(term) ||
        (req.from || '').toLowerCase().includes(term) ||
        (req.to || '').toLowerCase().includes(term) ||
        (req.nature || '').toLowerCase().includes(term)
      );

      let matchesFilter = true;
      if (filter === 'pending' || filter === 'En attente') {
        matchesFilter = req.status === 'En attente' || req.status === 'pending';
      } else if (filter === 'active' || filter === 'En cours') {
        matchesFilter = req.status === 'En cours' || req.status === 'en_route' || req.status === 'in_progress';
      } else if (filter === 'completed' || filter === 'Terminé') {
        matchesFilter = req.status === 'Terminé' || req.status === 'livre' || req.status === 'completed';
      } else if (filter === 'cancelled' || filter === 'Annulé') {
        matchesFilter = req.status === 'Annulé' || req.status === 'cancelled';
      }

      return matchesSearch && matchesFilter;
    });
  }, [allRequests, searchTerm, filter]);

  // Statistics
  const stats = useMemo(() => {
    const total = allRequests.length;
    const pending = allRequests.filter(r => r.status === 'En attente' || r.status === 'pending').length;
    const active = allRequests.filter(r => r.status === 'En cours' || r.status === 'en_route' || r.status === 'in_progress').length;
    const completed = allRequests.filter(r => r.status === 'Terminé' || r.status === 'livre' || r.status === 'completed').length;
    const totalVolume = allRequests.reduce((sum, r) => sum + Number(r.priceTotal || r.price || r.amount || 0), 0);

    return { total, pending, active, completed, totalVolume };
  }, [allRequests]);

  if (error) {
    return (
      <div className="p-6 text-center text-rose-500 font-bold">
        Erreur de chargement des courses : {error.message}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="text-indigo-500" /> Toutes les Courses
          </h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
            Supervision intelligente et suivi en temps réel de tous les transports de la plateforme.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRequests(true)}
            disabled={isRefreshing}
            className="gap-2 rounded-xl text-xs font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Courses", value: stats.total.toString(), sub: "Demandes enregistrées", icon: <Package className="w-4 h-4 text-indigo-400" />, filterKey: "all" },
          { label: "En Attente", value: stats.pending.toString(), sub: "Nécessitent attribution", icon: <Clock className="w-4 h-4 text-amber-400" />, filterKey: "pending" },
          { label: "En Mission", value: stats.active.toString(), sub: "Transit en cours", icon: <Truck className="w-4 h-4 text-sky-400" />, filterKey: "active" },
          { label: "Terminées / Livrées", value: stats.completed.toString(), sub: "Missions réussies", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, filterKey: "completed" },
          { label: "Volume Financier", value: `${stats.totalVolume.toLocaleString("fr-FR")} GNF`, sub: "Chiffre d'affaires global", icon: <DollarSign className="w-4 h-4 text-purple-400" />, filterKey: "all" },
        ].map((kpi) => {
          const isSelected = filter === kpi.filterKey;
          return (
            <Card 
              key={kpi.label} 
              onClick={() => setFilter(kpi.filterKey)}
              className={cn(
                "rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-sm",
                isSelected && "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/10"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-black text-slate-900 dark:text-white">{kpi.value}</div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Table Card */}
      <Card className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-400" /> Registre Général des Demandes
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {filteredRequests.length} course(s) trouvée(s) selon vos critères.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher trajet, client, ID..."
                className="pl-9 h-9 text-xs rounded-xl bg-slate-900/40 border-slate-700/60 text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-slate-700/60 bg-slate-900/40 font-bold">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-800 bg-slate-900 text-slate-200 text-xs">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="active">En mission (En cours)</SelectItem>
                <SelectItem value="completed">Terminées / Livrées</SelectItem>
                <SelectItem value="cancelled">Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="h-10 w-10 mx-auto text-slate-600 mb-2 opacity-50" />
              <p className="font-bold text-slate-200">Aucune course ne correspond aux critères</p>
              <p className="text-xs text-slate-500 mt-1">Essayez d'effacer la recherche ou de changer de filtre.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/40 text-slate-400 uppercase tracking-wider font-extrabold border-b border-border/20 text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">ID / Marchandise</th>
                    <th className="px-4 py-3.5">Client & Expéditeur</th>
                    <th className="px-4 py-3.5">Transporteur & Chauffeur</th>
                    <th className="px-4 py-3.5">Trajet & Axe</th>
                    <th className="px-4 py-3.5">Montant GNF</th>
                    <th className="px-4 py-3.5">Statut</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredRequests.map((req) => {
                    const reqPrice = Number(req.priceTotal || req.price || req.amount || 0);
                    const formattedDate = req.createdAt?.toDate 
                      ? format(req.createdAt.toDate(), "dd MMM yyyy", { locale: fr })
                      : "—";

                    return (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 font-medium">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            {req.nature || "Fret routier"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {req.id.slice(0, 10)}... • {formattedDate}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-200">
                          <div>{req.clientName || req.clientEmail || "Client anonyme"}</div>
                          {req.clientPhone && <div className="text-[10px] text-slate-400 font-normal">{req.clientPhone}</div>}
                        </td>

                        <td className="px-4 py-4">
                          {req.driverName || req.transporterName ? (
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-100 flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                {req.driverName || req.transporterName}
                              </div>
                              {req.vehicleRegistration && (
                                <div className="text-[10px] text-emerald-400/80 font-mono">
                                  Matricule: {req.vehicleRegistration}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Non attribué
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-200">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{req.from || "Conakry"}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span>{req.to || "Destination"}</span>
                          </div>
                          {req.weight && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{req.weight}</div>}
                        </td>

                        <td className="px-4 py-4 font-black text-indigo-300">
                          {reqPrice > 0 ? `${reqPrice.toLocaleString("fr-FR")} GNF` : "N/A"}
                        </td>

                        <td className="px-4 py-4">
                          {getStatusBadge(req.status)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <Link href={`/dashboard/admin/tracking?requestId=${req.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs font-bold text-indigo-400 hover:bg-indigo-500/10 gap-1">
                              <Eye className="w-3.5 h-3.5" /> Voir
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
