"use client"

import { useMemo, useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { collection, query, where, getDocs, Query, doc, updateDoc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, CalendarIcon, Weight, ArrowRight, Truck, Loader2, Rocket, User, CheckCircle, Clock, Navigation, ShieldCheck, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TransportRequest } from "@/ai/types"
import { formatDurationFromSeconds } from "@/lib/utils"
import { createNotification } from "@/lib/notifications"
import { useAuth } from "@/context/auth-context"
import { releaseEscrowPayment } from "@/lib/payments"
import Link from "next/link"
import { ClientDetailsDialog } from "@/components/client-details-dialog"
import { DateFilterPicker } from "@/components/date-filter-picker"

const getRequestIcon = (nature: string) => {
    const n = nature.toLowerCase();
    if (n.includes('mine') || n.includes('simandou') || n.includes('fer') || n.includes('ciment')) {
      return <Truck className="h-5 w-5 text-amber-400" />;
    }
    if (n.includes('meuble') || n.includes('déménagement')) return <Truck className="h-5 w-5 text-blue-400" />;
    if (n.includes('urgent') || n.includes('document')) return <Rocket className="h-5 w-5 text-rose-400" />;
    return <Package className="h-5 w-5 text-emerald-400" />;
}

const VerifyDeliveryOTPDialog = ({ job, transporterId, onSuccess }: { job: TransportRequest; transporterId: string; onSuccess: () => void }) => {
    const [otp, setOtp] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleVerify = async () => {
        if (otp !== job.otpCode) {
            toast({
                variant: "destructive",
                title: "Code OTP Incorrect",
                description: "Le code fourni par le client ne correspond pas."
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await releaseEscrowPayment(job.id, transporterId);
            
            await createNotification({
                userId: job.clientId,
                message: `Votre livraison pour la course "${job.nature}" a été validée avec succès. Merci d'avoir choisi TransConnekt !`,
                href: `/dashboard/client/history`
            });

            toast({
                title: "Livraison Validée !",
                description: "Le paiement a été libéré et crédité sur votre portefeuille."
            });
            setOpen(false);
            onSuccess();
        } catch (error) {
            console.error("Error releasing escrow:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de la libération des fonds."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/10 transition-all">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmer la Livraison (OTP)
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-sm bg-slate-950 text-slate-100 border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <CheckCircle className="text-emerald-500" /> Saisie du Code OTP
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Saisissez le code de livraison fourni par le client pour débloquer le paiement.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    <Label htmlFor="otp" className="text-xs font-semibold text-slate-300">Code secret de livraison (4 chiffres)</Label>
                    <Input 
                        id="otp" 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)} 
                        placeholder="Ex: 5824" 
                        maxLength={4}
                        className="bg-slate-900 border-slate-850 text-white text-center font-bold text-xl tracking-widest h-12 rounded-xl focus:border-emerald-500 focus:ring-emerald-500"
                    />
                </div>

                <DialogFooter className="border-t border-slate-900 pt-3">
                    <Button variant="ghost" className="hover:bg-slate-900 hover:text-white" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button 
                        onClick={handleVerify} 
                        disabled={isSubmitting || otp.length !== 4}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    >
                        {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                        Valider et Encaisser
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const getStatusBadge = (status: TransportRequest['status']) => {
    let className = "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ";
    switch (status) {
        case 'En attente': className += 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25'; break;
        case 'En cours': className += 'bg-blue-500/10 text-blue-400 border border-blue-500/25'; break;
        case 'Livré': className += 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'; break;
        case 'Terminé': className += 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'; break;
        case 'Annulé': className += 'bg-red-500/10 text-red-400 border border-red-500/25'; break;
        default: className += 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25'; break;
    }
    return <span className={className}>{status}</span>;
};

export default function TransporterJobsPage() {
  const { user, userData, loadingAuth } = useAuth();
  const [myJobs, setMyJobs] = useState<TransportRequest[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const isCompanyView = userData?.role === 'transporter-company';

  const fetchJobs = async () => {
      if (!user || !userData) return;
      if (isCompanyView && !userData.companyId) {
          setLoadingJobs(false);
          return;
      }
      
      setLoadingJobs(true);
      setError(null);

      try {
          const requestsRef = collection(db, 'requests');
          let jobsQuery: Query | null = null;

          if (isCompanyView) {
              const driversQuery = query(collection(db, 'users'), where('companyId', '==', userData.companyId));
              const driverSnapshot = await getDocs(driversQuery);
              const driverIds = driverSnapshot.docs.map(doc => doc.id);
              
              if (driverIds.length === 0) {
                setMyJobs([]);
                setLoadingJobs(false);
                return;
              }
              
              jobsQuery = query(requestsRef, where('assignedTo', 'in', driverIds));
          } else {
              jobsQuery = query(requestsRef, where('assignedTo', '==', user.uid));
          }
          
          if (!jobsQuery) {
            setMyJobs([]);
            setLoadingJobs(false);
            return;
          }

          const snapshot = await getDocs(jobsQuery);
          const jobs = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            // Auto-heal: If client has completed escrow payment, ensure status is 'En cours'
            if (data.paymentStatus === 'escrow_held' && data.status === 'En attente') {
              try {
                await updateDoc(doc(db, 'requests', docSnap.id), { status: 'En cours' });
                data.status = 'En cours';
              } catch (err) {
                console.error("Auto-heal status error:", err);
              }
            }
            return { id: docSnap.id, ...data } as TransportRequest;
          }));
          
          setMyJobs(jobs.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()));

      } catch (e: any) {
          console.error("Erreur de chargement des missions:", e);
          setError(e);
      } finally {
          setLoadingJobs(false);
      }
  }

  useEffect(() => {
    if (!loadingAuth && user && userData) {
        fetchJobs();
    } else if (!loadingAuth) {
        setLoadingJobs(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, loadingAuth]);

  const handleMarkAsDelivered = async (requestId: string) => {
    const requestDocRef = doc(db, 'requests', requestId);
    try {
        const requestSnap = await getDoc(requestDocRef);
        if (!requestSnap.exists()) throw new Error("Request not found");
        const requestData = requestSnap.data() as TransportRequest;

        await updateDoc(requestDocRef, { status: 'Livré' });
        
        await createNotification({
            userId: requestData.clientId,
            message: `Le transporteur a marqué votre course "${requestData.nature}" comme livrée. Veuillez confirmer.`,
            href: `/dashboard/client/tracking`
        });

        toast({
            title: "Course mise à jour",
            description: "Le client a été notifié et doit confirmer la livraison."
        });
        fetchJobs(); // Refresh the list
    } catch (error) {
        console.error("Erreur lors de la mise à jour :", error);
        toast({
            variant: 'destructive',
            title: "Erreur",
            description: "Impossible de mettre à jour le statut de la course."
        });
    }
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  const { jobsInProgress, jobsHistory } = useMemo(() => {
    const inProgress = myJobs.filter(j => j.status !== 'Terminé' && j.status !== 'Annulé');
    const history = myJobs.filter(j => j.status === 'Terminé' || j.status === 'Annulé');
    return { jobsInProgress: inProgress, jobsHistory: history };
  }, [myJobs]);

  const filteredHistory = useMemo(() => {
    return jobsHistory.filter((job) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = job.id?.toLowerCase().includes(q);
        const natureMatch = job.nature?.toLowerCase().includes(q);
        const fromMatch = job.from?.toLowerCase().includes(q);
        const toMatch = job.to?.toLowerCase().includes(q);
        const clientMatch = job.clientName?.toLowerCase().includes(q);
        const weightMatch = `${job.weight || ""} ${job.weightUnit || ""}`.toLowerCase().includes(q);
        if (!(idMatch || natureMatch || fromMatch || toMatch || clientMatch || weightMatch)) {
          return false;
        }
      }

      // 2. Calendar Date Filter
      if (filterDate) {
        if (!job.date) return false;
        const jobDate = job.date.toDate();
        const isSameDay =
          jobDate.getFullYear() === filterDate.getFullYear() &&
          jobDate.getMonth() === filterDate.getMonth() &&
          jobDate.getDate() === filterDate.getDate();
        if (!isSameDay) return false;
      }

      return true;
    });
  }, [jobsHistory, searchQuery, filterDate]);
  
  const isLoading = loadingAuth || loadingJobs;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive font-semibold">Erreur de chargement des missions</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Mes Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivez vos transports en cours et gérez l'historique de vos trajets.</p>
        </div>
      </div>

      <Tabs defaultValue="in-progress" className="w-full">
        <TabsList className="bg-muted border border-border/50 p-1 rounded-xl backdrop-blur-md">
          <TabsTrigger value="in-progress" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            Courses en cours ({jobsInProgress.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            Historique ({jobsHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress" className="mt-6">
          {jobsInProgress.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobsInProgress.map(job => {
                const isMiningJob = job.nature.toLowerCase().includes('mine') || job.nature.toLowerCase().includes('simandou') || job.nature.toLowerCase().includes('fer') || job.nature.toLowerCase().includes('ciment');
                return (
                  <Card key={job.id} className={`shadow-xl rounded-3xl border transition-all duration-300 hover:scale-[1.02] bg-card/60 backdrop-blur-md overflow-hidden flex flex-col justify-between ${
                    isMiningJob ? 'border-amber-500/30 shadow-amber-500/5' : 'border-border/50'
                  }`}>
                    <div>
                      {isMiningJob && (
                        <div className="bg-amber-500 text-zinc-950 font-bold text-[10px] tracking-wider uppercase py-1 px-4 text-center">
                          Mission Minière Simandou 2040
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-3 text-lg font-bold text-foreground">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted border border-border/50 shrink-0">
                              {getRequestIcon(job.nature)}
                            </span>
                            <span className="truncate">{job.nature}</span>
                          </CardTitle>
                        </div>
                        
                        {/* Interactive Route Path */}
                        <div className="mt-4 p-3 rounded-2xl bg-muted/30 border border-border/30 space-y-2">
                          <div className="flex items-start gap-2.5 text-xs">
                            <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-muted-foreground font-semibold">Départ</span>
                              <span className="text-foreground font-medium">{job.from}</span>
                            </div>
                          </div>
                          
                          <div className="pl-[6px] border-l-2 border-dashed border-border/40 h-4 ml-1" />
                          
                          <div className="flex items-start gap-2.5 text-xs">
                            <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-muted-foreground font-semibold">Destination</span>
                              <span className="text-foreground font-medium">{job.to}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 text-xs border-t border-border/20 mt-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User size={13} className="text-primary" />
                            <span>Client: <strong className="text-foreground">{job.clientName}</strong></span>
                          </div>
                          {job.clientId && (
                            <ClientDetailsDialog clientId={job.clientId} clientName={job.clientName} />
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-2.5 pb-4 text-xs font-medium">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20 border border-border/25">
                            <Weight size={14} className="text-primary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Poids</p>
                              <p className="text-foreground font-bold">{job.weight} {job.weightUnit}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20 border border-border/25">
                            <CalendarIcon size={14} className="text-primary" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Date</p>
                              <p className="text-foreground font-bold">{format(job.date.toDate(), "dd MMM yyyy", { locale: fr })}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 p-2 rounded-xl bg-muted/20 border border-border/25">
                          <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground"><Navigation size={13} /> Distance</span>
                            <span className="text-foreground font-bold">{job.distance ? `${job.distance} km` : '—'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1 border-t border-border/10">
                            <span className="flex items-center gap-1.5 text-muted-foreground"><Clock size={13} /> Durée estimée</span>
                            <span className="text-foreground font-bold">{job.duration ? formatDurationFromSeconds(job.duration) : '—'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </div>

                    <CardFooter className="flex flex-col items-stretch gap-3 pt-2 pb-5 border-t border-border/20 bg-muted/10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Statut Course</span>
                        {getStatusBadge(job.status as TransportRequest['status'])}
                      </div>
                      
                      {job.status === 'En cours' && (
                        <div className="space-y-2">
                          <Button 
                            asChild
                            variant="outline"
                            className="w-full rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs"
                          >
                            <Link href={`/tracking/driver/${job.id}`}>
                              <Navigation className="mr-2 h-4 w-4" />
                              Console GPS & Suivi
                            </Link>
                          </Button>

                          {job.paymentStatus === 'escrow_held' && job.otpCode ? (
                            <VerifyDeliveryOTPDialog job={job} transporterId={user?.uid || ""} onSuccess={fetchJobs} />
                          ) : (
                            <Button 
                              onClick={() => handleMarkAsDelivered(job.id)} 
                              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md shadow-emerald-500/10 transition-all"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmer la Livraison
                            </Button>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground bg-card/40 border border-border/50 rounded-3xl backdrop-blur-md gap-3">
              <Package className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-bold text-foreground text-lg">Aucune course active</p>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">Vous n'avez pas de transport en cours de livraison pour le moment.</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          {/* Search & Calendar Date Filter Header */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/60 p-3.5 rounded-2xl border border-border/50 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par ID, trajet, client, marchandise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 h-10 rounded-xl bg-background/80 border-border/60 text-xs focus:ring-primary font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Calendar Date Picker Filter */}
              <DateFilterPicker
                date={filterDate}
                onSelect={setFilterDate}
                placeholder="Filtrer par date (Calendrier)"
              />
            </div>

            <div className="text-xs text-muted-foreground font-semibold px-2 self-end md:self-center">
              {filteredHistory.length} {filteredHistory.length > 1 ? "courses trouvées" : "course trouvée"}
            </div>
          </div>

          {/* High-density Explicit Table Layout */}
          {filteredHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ID Course</th>
                    <th className="py-3 px-4">Marchandise / Colis</th>
                    <th className="py-3 px-4">Trajet (Départ ➔ Arrivée)</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Poids / Charge</th>
                    <th className="py-3 px-4">Date de livraison</th>
                    <th className="py-3 px-4">Montant / Gain</th>
                    <th className="py-3 px-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-medium">
                  {filteredHistory.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary text-[11px]">
                        #{job.id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border/50 shrink-0">
                            {getRequestIcon(job.nature)}
                          </span>
                          <span className="truncate max-w-[140px]" title={job.nature}>{job.nature}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-foreground">
                          <span>{job.from}</span>
                          <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                          <span>{job.to}</span>
                          {job.distance && <span className="text-[10px] text-muted-foreground ml-1 font-normal">({job.distance} km)</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-semibold">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-primary/70 shrink-0" />
                          <span>{job.clientName || "Client"}</span>
                          {job.clientId && (
                            <ClientDetailsDialog clientId={job.clientId} clientName={job.clientName} />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-foreground">
                        {job.weight ? `${job.weight} ${job.weightUnit || "tonnes"}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {job.date ? format(job.date.toDate(), "dd MMM yyyy", { locale: fr }) : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                        {job.payoutAmount ? `${job.payoutAmount.toLocaleString('fr-FR')} GNF` : job.price ? `${job.price.toLocaleString('fr-FR')} GNF` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {getStatusBadge(job.status as TransportRequest['status'])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground bg-card/40 border border-border/50 rounded-3xl backdrop-blur-md gap-3">
              <Clock className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-bold text-foreground text-base">Aucune course trouvée</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? `Aucun résultat pour "${searchQuery}". Essayez un autre mot-clé.` : "Vous n'avez pas encore terminé de courses sur la plateforme."}
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
