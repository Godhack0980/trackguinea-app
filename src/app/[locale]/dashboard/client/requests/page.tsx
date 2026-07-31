"use client";

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import TransportRequestCard from "@/components/transport-request-card";
import { Loader2, List, AlertTriangle, RefreshCw, Package, Clock, CheckCircle2, Truck, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateTransportRequestForm } from "@/components/create-request-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import type { TransportRequest } from "@/ai/types";
import { createNotification } from "@/lib/notifications";
import { useTranslation } from "@/lib/translations";
import { DateFilterPicker } from "@/components/date-filter-picker";

export default function ClientRequestsPage() {
  const { user, userData, loadingAuth } = useAuth();
  const { t, lang } = useTranslation();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchRequests = useCallback(async (showRefreshSpinner = false) => {
    if (!user) return;

    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoadingRequests(true);

    try {
      const requestsQuery = query(
        collection(db, "requests"),
        where("clientId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(requestsQuery);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as TransportRequest));
      setRequests(data);
    } catch (error) {
      console.error("Erreur Firestore :", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue lors du chargement des demandes.",
      });
    } finally {
      setLoadingRequests(false);
      setIsRefreshing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
      setLoadingRequests(false);
      return;
    }
    fetchRequests();
  }, [user, loadingAuth, fetchRequests]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loadingAuth) {
        fetchRequests(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loadingAuth, fetchRequests]);

  const handleCancellationRequest = async (requestId: string, reason: string, fileUrl: string | null) => {
      if (!user) {
          toast({ variant: "destructive", title: "Non authentifié" });
          return;
      }
      try {
          const requestRef = doc(db, "requests", requestId);
          const requestSnap = await getDoc(requestRef);
          if (!requestSnap.exists()) {
              throw new Error("La demande n'existe pas.");
          }
          const currentStatus = requestSnap.data().status;

          await updateDoc(requestRef, {
              status: 'Annulation demandée',
              previousStatus: currentStatus,
              cancellationReason: reason,
              cancellationDocumentUrl: fileUrl
          });
          toast({ title: "Demande d'annulation envoyée", description: "Votre demande a été soumise à un administrateur."});
          fetchRequests(true);
      } catch (error) {
          console.error("Erreur lors de la demande d'annulation:", error);
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de soumettre la demande."});
      }
  }

  const handleAssign = async (requestId: string, transporterId: string) => {
     if (!user) {
        toast({ variant: "destructive", title: "Non authentifié" });
        return;
    }
    try {
        const transporterDocRef = doc(db, 'users', transporterId);
        const transporterSnap = await getDoc(transporterDocRef);

        if (!transporterSnap.exists()) {
             toast({ variant: "destructive", title: "Erreur", description: "Le transporteur sélectionné n'existe pas." });
             return;
        }
        
        const transporterData = transporterSnap.data();
        const requestDocRef = doc(db, 'requests', requestId);
        const requestSnap = await getDoc(requestDocRef);

        await updateDoc(requestDocRef, {
            status: 'En attente',
            assignedTo: transporterId,
            transporterName: `${transporterData.firstName} ${transporterData.lastName}`
        });

        await createNotification({
            userId: transporterId,
            message: `Vous avez été sélectionné pour la course "${requestSnap.data()?.nature}". En attente de paiement du client.`,
            href: `/dashboard/transporter/jobs`
        });

        toast({ title: "Transporteur sélectionné !", description: "Veuillez maintenant procéder au paiement sécurisé de la course."});
        fetchRequests(true);
    } catch (error) {
        console.error("Erreur d'assignation:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'assigner le transporteur."});
    }
  }

  // Summary counts
  const counts = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'En attente').length,
      inProgress: requests.filter(r => r.status === 'En cours').length,
      completed: requests.filter(r => r.status === 'Terminé' || r.status === 'Livré').length,
    };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. Tab filter
      if (activeTab === 'pending' && req.status !== 'En attente') return false;
      if (activeTab === 'in_progress' && req.status !== 'En cours' && req.status !== 'Annulation demandée') return false;
      if (activeTab === 'completed' && req.status !== 'Terminé' && req.status !== 'Livré') return false;

      // 2. Text Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = req.id?.toLowerCase().includes(q) || (req as any).uniqueId?.toLowerCase().includes(q);
        const natureMatch = req.nature?.toLowerCase().includes(q);
        const fromMatch = req.from?.toLowerCase().includes(q);
        const toMatch = req.to?.toLowerCase().includes(q);
        const transporterMatch = req.transporterName?.toLowerCase().includes(q);
        if (!(idMatch || natureMatch || fromMatch || toMatch || transporterMatch)) {
          return false;
        }
      }

      // 3. Calendar Date filter
      if (filterDate && req.createdAt) {
        const reqDate = req.createdAt.toDate();
        const isSameDay =
          reqDate.getFullYear() === filterDate.getFullYear() &&
          reqDate.getMonth() === filterDate.getMonth() &&
          reqDate.getDate() === filterDate.getDate();
        if (!isSameDay) return false;
      }

      return true;
    });
  }, [requests, activeTab, searchQuery, filterDate]);

  if (userData && userData.isVerified === false) {
    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent"><AlertTriangle className="text-destructive"/>Profil en attente de vérification</CardTitle>
                <CardDescription>Votre compte doit être vérifié par un administrateur avant de pouvoir créer des demandes de transport.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Pour faire vérifier votre compte, veuillez fournir les documents requis.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/client/documents">
                    Aller à la page des documents
                  </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-8">
        {/* Header Title & Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {lang === 'fr' ? "Mes Demandes de Transport" : "My Transport Requests"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Gérez l'ensemble de vos expéditions, choisissez vos transporteurs et suivez vos livraisons en temps réel.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRequests(true)}
            disabled={isRefreshing}
            className="gap-2 rounded-xl border-border/60 font-bold text-xs self-start sm:self-auto"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {lang === 'fr' ? "Actualiser" : "Refresh"}
          </Button>
        </div>

        {/* Top KPI Cards Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package size={20} />
            </span>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Demandes</p>
              <p className="text-xl font-extrabold text-foreground">{counts.total}</p>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={20} />
            </span>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">En Attente</p>
              <p className="text-xl font-extrabold text-amber-500">{counts.pending}</p>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Truck size={20} />
            </span>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">En Cours</p>
              <p className="text-xl font-extrabold text-blue-500">{counts.inProgress}</p>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-md p-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Terminées / Livrées</p>
              <p className="text-xl font-extrabold text-emerald-500">{counts.completed}</p>
            </div>
          </Card>
        </div>

        {/* CREATE REQUEST FORM COMPONENT */}
        <CreateTransportRequestForm />

        {/* REQUESTS LIST & FILTERING SECTION */}
        <Card className="shadow-lg rounded-3xl border-border/60 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {lang === 'fr' ? "Liste & Suivi des Demandes" : "Requests Management"}
                </CardTitle>
                <CardDescription className="text-xs">
                  Consultez le statut de vos demandes et attribuez vos transporteurs.
                </CardDescription>
              </div>

              {/* Tabs list */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="rounded-xl bg-muted/40 p-1 border border-border/40">
                  <TabsTrigger value="all" className="rounded-lg text-xs font-bold">Toutes ({counts.total})</TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-lg text-xs font-bold">En attente ({counts.pending})</TabsTrigger>
                  <TabsTrigger value="in_progress" className="rounded-lg text-xs font-bold">En cours ({counts.inProgress})</TabsTrigger>
                  <TabsTrigger value="completed" className="rounded-lg text-xs font-bold">Livrées ({counts.completed})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Search & Date Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par ID course, trajet, marchandise, transporteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 h-10 rounded-xl bg-background/80 border-border/60 text-xs font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <DateFilterPicker
                date={filterDate}
                onSelect={setFilterDate}
                placeholder="Filtrer par date (Calendrier)"
              />
            </div>
          </CardHeader>

          <CardContent className="p-6 grid gap-5">
              {loadingRequests || loadingAuth ? (
                  <div className="flex justify-center items-center h-40">
                      <Loader2 className="animate-spin h-8 w-8 text-primary" />
                  </div>
              ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-3">
                  <List className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <div>
                    <p className="font-bold text-foreground text-base">Aucune demande correspondant à vos critères.</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {searchQuery || filterDate ? "Essayez de modifier ou d'effacer vos filtres de recherche." : "Utilisez le formulaire ci-dessus pour publier votre première offre."}
                    </p>
                  </div>
              </div>
              ) : (
                filteredRequests.map((request) => (
                  <TransportRequestCard 
                    key={request.id} 
                    request={request} 
                    onAssign={handleAssign} 
                    onCancellationRequest={handleCancellationRequest} 
                    onPaid={() => fetchRequests(true)} 
                  />
                ))
              )}
          </CardContent>
        </Card>
    </div>
  );
}
