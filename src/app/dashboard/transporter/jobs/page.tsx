
"use client"

import { useMemo, useEffect, useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { db, auth } from "@/lib/firebase"
import { format } from "date-fns"
import { collection, query, where, orderBy, getDocs, Query, doc, updateDoc, getDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, CalendarIcon, Weight, ArrowRight, Truck, Loader2, Rocket, User, CheckCircle, Clock, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TransportRequest } from "@/ai/types"
import { formatDurationFromSeconds } from "@/lib/utils"
import { createNotification } from "@/lib/notifications"
import { useAuth } from "@/context/auth-context"


const getRequestIcon = (nature: string) => {
    if (nature.toLowerCase().includes('meuble') || nature.toLowerCase().includes('déménagement')) return <Truck/>;
    if (nature.toLowerCase().includes('urgent') || nature.toLowerCase().includes('document')) return <Rocket/>;
    return <Package/>
}

const getStatusBadge = (status: TransportRequest['status']) => {
    let className = "px-3 py-1 rounded-full text-sm font-medium ";
    switch (status) {
        case 'En attente': className += 'bg-yellow-100 text-yellow-700'; break;
        case 'En cours': className += 'bg-blue-100 text-blue-700'; break;
        case 'Livré': className += 'bg-sky-100 text-sky-700'; break;
        case 'Terminé': className += 'bg-green-100 text-green-700'; break;
        case 'Annulé': className += 'bg-red-100 text-red-700'; break;
        default: className += 'bg-gray-100 text-gray-700'; break;
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
          const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportRequest));
          
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

  const { jobsInProgress, jobsHistory } = useMemo(() => {
    const inProgress = myJobs.filter(j => j.status !== 'Terminé' && j.status !== 'Annulé');
    const history = myJobs.filter(j => j.status === 'Terminé' || j.status === 'Annulé');
    return { jobsInProgress: inProgress, jobsHistory: history };
  }, [myJobs]);
  
  
  const isLoading = loadingAuth || loadingJobs;

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
  }
  
  if (error) {
    return <p className="text-destructive text-center p-4">Erreur de chargement des missions: {error.message}</p>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Mes Courses</h1>
      <Tabs defaultValue="in-progress">
        <TabsList>
          <TabsTrigger value="in-progress">Courses en cours ({jobsInProgress.length})</TabsTrigger>
          <TabsTrigger value="history">Historique des courses ({jobsHistory.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress" className="mt-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobsInProgress.length > 0 ? (
                jobsInProgress.map(job => (
                <Card key={job.id} className="shadow-md rounded-2xl border-border">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">{getRequestIcon(job.nature)}</span>
                        {job.nature}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 pt-2">
                        <MapPin size={14} /> De: {job.from} <ArrowRight size={14} className="mx-1" /> A: {job.to}
                    </CardDescription>
                     <CardDescription className="flex items-center gap-1 pt-1">
                        <User size={14} /> Client: {job.clientName}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                    <p className="flex items-center gap-2 text-sm"><Weight size={14} /> <strong>Poids:</strong> {job.weight} {job.weightUnit}</p>
                    <p className="flex items-center gap-2 text-sm"><CalendarIcon size={14} /> <strong>Date:</strong> {format(job.date.toDate(), "PPP")}</p>
                    {job.distance && <p className="flex items-center gap-2 text-sm"><Navigation size={14} /> <strong>Distance:</strong> {job.distance} km</p>}
                    {job.duration && <p className="flex items-center gap-2 text-sm"><Clock size={14} /> <strong>Durée:</strong> {formatDurationFromSeconds(job.duration)}</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col items-start gap-2">
                        {getStatusBadge(job.status as TransportRequest['status'])}
                        {job.status === 'En cours' && (
                            <Button onClick={() => handleMarkAsDelivered(job.id)} size="sm">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marquer comme livré
                            </Button>
                        )}
                    </CardFooter>
                </Card>
                ))
            ) : (
                <p className="text-muted-foreground col-span-full text-center py-10">Vous n'avez aucune course en cours.</p>
            )}
          </div>
        </TabsContent>
         <TabsContent value="history" className="mt-4">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobsHistory.length > 0 ? (
                jobsHistory.map(job => (
                <Card key={job.id} className="opacity-70 shadow-md rounded-2xl border-border">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">{getRequestIcon(job.nature)}</span>
                        {job.nature}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 pt-2">
                        <MapPin size={14} /> De: {job.from} <ArrowRight size={14} className="mx-1" /> A: {job.to}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                    <p className="flex items-center gap-2"><Weight size={14} /> <strong>Poids:</strong> {job.weight} {job.weightUnit}</p>
                    <p className="flex items-center gap-2"><CalendarIcon size={14} /> <strong>Date:</strong> {format(job.date.toDate(), "PPP")}</p>
                    </CardContent>
                    <CardFooter>
                        {getStatusBadge(job.status as TransportRequest['status'])}
                    </CardFooter>
                </Card>
                ))
            ) : (
                <p className="text-muted-foreground col-span-full text-center py-10">Aucun historique de course.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
