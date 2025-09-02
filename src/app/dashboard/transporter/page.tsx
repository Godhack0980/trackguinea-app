
"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { useDocumentData, useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, CalendarIcon, Weight, ArrowRight, Truck, Loader2, Rocket, User, AlertTriangle, Clock, Navigation } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatDurationFromSeconds } from "@/lib/utils"
import type { TransportRequest } from "@/ai/types"
import { createNotification } from "@/lib/notifications"


const getRequestIcon = (nature: string) => {
    if (nature.toLowerCase().includes('meuble') || nature.toLowerCase().includes('déménagement')) return <Truck/>;
    if (nature.toLowerCase().includes('urgent') || nature.toLowerCase().includes('document')) return <Rocket/>;
    return <Package/>
}

export default function TransporterDashboard() {
  const { toast } = useToast();
  const [user, loadingAuth] = useAuthState(auth);
  
  const requestsQuery = query(collection(db, 'requests'), where('status', '==', 'En attente'));
  const [availableRequests, loadingRequests, errorRequests] = useCollection(requestsQuery);

  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData, loadingUser] = useDocumentData(userDocRef);
  
  const isLoading = loadingAuth || loadingUser || loadingRequests;

  const handleApply = async (request: TransportRequest) => {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: "Erreur", description: "Vous devez être connecté pour postuler."});
      return;
    }

    try {
      const docRef = doc(db, `requests`, request.id);
      await updateDoc(docRef, {
        applicants: arrayUnion(user.uid)
      });
      
      // Notify the client
      await createNotification({
        userId: request.clientId,
        message: `${userData.firstName} ${userData.lastName} a postulé à votre demande "${request.nature}".`,
        href: `/dashboard/client/requests`
      });

      toast({ title: "Postulé !", description: "Votre offre a été envoyée au client." });
    } catch (error) {
       console.error("Error applying to request:", error);
       toast({ variant: 'destructive', title: "Erreur", description: "Une erreur est survenue lors de votre postulation."});
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  if (userData && userData.isVerified === false) {
    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent"><AlertTriangle className="text-destructive"/>Profil en attente de vérification</CardTitle>
                <CardDescription>Votre compte doit être vérifié par un administrateur avant de pouvoir accéder aux demandes de transport.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Veuillez compléter tous les documents requis dans la section <Link href="/dashboard/transporter/documents" className="text-primary underline hover:text-primary/80">Mes documents</Link>. Vous recevrez une notification une fois votre compte approuvé.</p>
            </CardContent>
        </Card>
    )
  }

  if (errorRequests) {
    console.error(errorRequests);
    return <p className="text-destructive text-center p-4">Erreur: Impossible de charger les demandes disponibles. ({errorRequests.message})</p>
  }
  
  const filteredRequests = availableRequests?.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(req => {
        if (!user) return false;
        const request = req as TransportRequest;
        return !request.applicants?.includes(user.uid) && request.status === 'En attente';
    });


  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Tableau de bord Transporteur</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md rounded-2xl border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offres Disponibles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRequests?.length || 0}</div>
             <p className="text-xs text-muted-foreground">Demandes en attente de transporteurs</p>
          </CardContent>
        </Card>
        <Card className="shadow-md rounded-2xl border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missions en Cours</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.jobsInProgress || 0}</div>
            <p className="text-xs text-muted-foreground">Voir dans <Link href="/dashboard/transporter/jobs" className="underline">Mes Courses</Link></p>
          </CardContent>
        </Card>
         <Card className="shadow-md rounded-2xl border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Note Moyenne</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{userData?.rating?.toFixed(1) || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Basé sur les dernières courses terminées</p>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Nouvelles Demandes de Transport</CardTitle>
          <CardDescription>
            Voici les dernières demandes publiées par les clients. Postulez pour être sélectionné.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {filteredRequests && filteredRequests.length > 0 ? (
                filteredRequests.map(req => {
                    const request = req as TransportRequest;
                    const alreadyApplied = user && request.applicants?.includes(user.uid);
                    return (
                        <Card key={request.id} className="p-4 shadow-md rounded-2xl border-border">
                            <div className="grid md:grid-cols-4 gap-4 items-center">
                                <div className="md:col-span-3 space-y-2">
                                    <CardTitle className="flex items-center gap-3 text-base">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">{getRequestIcon(request.nature)}</span>
                                        {request.nature}
                                    </CardTitle>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <p className="flex items-center gap-1">
                                            <MapPin size={14} /> {request.from} <ArrowRight size={14} className="mx-1" /> {request.to}
                                        </p>
                                        <p className="flex items-center gap-1"><Weight size={14} /> {request.weight} {request.weightUnit}</p>
                                        <p className="flex items-center gap-1"><CalendarIcon size={14} /> {format(request.date.toDate(), "PPP")}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        {request.distance && <p className="flex items-center gap-1"><Navigation size={14} /> {request.distance} km</p>}
                                        {request.duration && <p className="flex items-center gap-1"><Clock size={14} /> {formatDurationFromSeconds(request.duration)}</p>}
                                    </div>
                                </div>
                                <div className="md:col-span-1 flex justify-end">
                                     <Button onClick={() => handleApply(request)} disabled={!!alreadyApplied}>
                                        {alreadyApplied ? 'Déjà Postulé' : 'Postuler'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )
                })
            ) : (
                <p className="text-center text-muted-foreground py-10">Aucune demande disponible pour le moment.</p>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
