"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getDocs, collection, query, orderBy, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Loader2, RefreshCw, Search, Truck, Package, MapPin, 
  CheckCircle2, Clock, AlertTriangle, Eye, ShieldCheck, DollarSign, Filter, ArrowRight, Trash2, Archive, Phone, User, X
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AdminRequestsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const paramFilter = searchParams.get('filter') || searchParams.get('status') || 'all';
  const paramId = searchParams.get('id') || '';

  const [filter, setFilter] = useState<string>(paramFilter);
  const [searchTerm, setSearchTerm] = useState<string>(paramId);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Selected request for details modal
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const handleDeleteRequest = async (id: string) => {
    setIsActionLoading(true);
    try {
      await deleteDoc(doc(db, 'requests', id));
      toast({ title: "Course supprimée", description: "La demande a été définitivement supprimée." });
      setDeleteConfirmId(null);
      if (selectedReq?.id === id) setSelectedReq(null);
      await fetchRequests(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer la course." });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArchiveRequest = async (id: string) => {
    setIsActionLoading(true);
    try {
      await updateDoc(doc(db, 'requests', id), { isArchived: true, status: 'Archivé' });
      toast({ title: "Course archivée", description: "La demande a été déplacée vers les archives." });
      await fetchRequests(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'archiver la course." });
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'En attente':
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <Clock className="w-3.5 h-3.5" /> En attente
          </Badge>
        );
      case 'En cours':
      case 'en_route':
      case 'in_progress':
        return (
          <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
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
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Livré / Terminé
          </Badge>
        );
      case 'Annulé':
      case 'cancelled':
        return (
          <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 w-max">
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
                "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-md",
                isSelected && "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/10"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-4">
                <CardTitle className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">{kpi.label}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-black text-slate-900 dark:text-white">{kpi.value}</div>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Table Card */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <CardTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-indigo-500" /> Registre Général des Demandes
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400 font-bold">
              {filteredRequests.length} course(s) trouvée(s) selon vos critères.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher trajet, client, ID..."
                className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-slate-900 dark:text-white">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs">
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
            <div className="text-center py-16 text-slate-500">
              <Package className="h-10 w-10 mx-auto text-slate-400 mb-2" />
              <p className="font-extrabold text-slate-800 dark:text-slate-200">Aucune course ne correspond aux critères</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Essayez d'effacer la recherche ou de changer de filtre.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 uppercase tracking-wider font-black border-b border-slate-200 dark:border-slate-800 text-[11px]">
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
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold text-slate-900 dark:text-slate-100">
                  {filteredRequests.map((req) => {
                    const reqPrice = Number(req.priceTotal || req.price || req.amount || 0);
                    const formattedDate = req.createdAt?.toDate 
                      ? format(req.createdAt.toDate(), "dd MMM yyyy", { locale: fr })
                      : "—";

                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            {req.nature || "Fret routier"}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold font-mono mt-0.5">
                            ID: {req.id.slice(0, 10)}... • {formattedDate}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900 dark:text-slate-100">
                          <div>{req.clientName || req.clientEmail || "Client anonyme"}</div>
                          {req.clientPhone && <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">{req.clientPhone}</div>}
                        </td>

                        <td className="px-4 py-4">
                          {req.driverName || req.transporterName ? (
                            <div className="space-y-0.5">
                              <div className="font-black text-slate-900 dark:text-white flex items-center gap-1">
                                <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {req.driverName || req.transporterName}
                              </div>
                              {req.vehicleRegistration && (
                                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                                  Matricule: {req.vehicleRegistration}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                              Non attribué
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 font-black text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>{req.from || "Conakry"}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{req.to || "Destination"}</span>
                          </div>
                          {req.weight && <div className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">{req.weight}</div>}
                        </td>

                        <td className="px-4 py-4 font-black text-indigo-700 dark:text-indigo-300">
                          {reqPrice > 0 ? `${reqPrice.toLocaleString("fr-FR")} GNF` : "N/A"}
                        </td>

                        <td className="px-4 py-4">
                          {getStatusBadge(req.status)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedReq(req)}
                              className="h-8 px-2.5 rounded-xl text-xs font-extrabold text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-500/10 gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Voir Détails
                            </Button>

                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleArchiveRequest(req.id)}
                              title="Archiver cette course"
                              className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-500/10"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>

                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(req.id)}
                              title="Supprimer la course"
                              className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* FULL COURSE DETAILS DIALOG MODAL */}
      {selectedReq && (
        <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
          <DialogContent className="rounded-3xl border-slate-200 dark:border-slate-800 max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Détails de la Course #{selectedReq.id.slice(0, 10)}
                </DialogTitle>
                {getStatusBadge(selectedReq.status)}
              </div>
              <DialogDescription className="text-xs font-bold text-slate-500">
                Fiche complète du transport et informations de livraison.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs font-bold">
              {/* Route & Cargo */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-900 dark:text-white">
                  <span className="text-sm font-black text-indigo-500">{selectedReq.nature || "Fret général"}</span>
                  <span className="font-black text-emerald-500 text-base">
                    {Number(selectedReq.priceTotal || selectedReq.price || selectedReq.amount || 0).toLocaleString()} GNF
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 pt-1">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-extrabold">{selectedReq.from || "Conakry"}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="font-extrabold">{selectedReq.to || "Destination"}</span>
                </div>
                {selectedReq.weight && <p className="text-slate-500 text-[11px]">Poids / Volume : {selectedReq.weight}</p>}
              </div>

              {/* Client & Transporter details grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-indigo-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Informations Client
                  </span>
                  <p className="text-sm font-black">{selectedReq.clientName || selectedReq.clientEmail || "Client anonyme"}</p>
                  {selectedReq.clientPhone && <p className="text-slate-500 flex items-center gap-1"><Phone size={12} /> {selectedReq.clientPhone}</p>}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-500 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Transporteur & Chauffeur
                  </span>
                  <p className="text-sm font-black">{selectedReq.driverName || selectedReq.transporterName || "Non attribué"}</p>
                  {selectedReq.vehicleRegistration && <p className="text-emerald-500 font-mono text-[11px]">Matricule: {selectedReq.vehicleRegistration}</p>}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setSelectedReq(null)} className="rounded-xl text-xs font-extrabold">
                Fermer
              </Button>
              <Link href={`/dashboard/admin/tracking?requestId=${selectedReq.id}`}>
                <Button className="rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 w-full sm:w-auto">
                  <MapPin className="w-3.5 h-3.5" /> Suivre sur la Carte
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="rounded-3xl border-slate-200 dark:border-slate-800 max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-rose-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Confirmer la Suppression
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-500">
                Êtes-vous sûr de vouloir supprimer définitivement cette course ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-xl text-xs font-bold">
                Annuler
              </Button>
              <Button 
                onClick={() => handleDeleteRequest(deleteConfirmId)} 
                disabled={isActionLoading}
                className="rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                Supprimer Définitivement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

