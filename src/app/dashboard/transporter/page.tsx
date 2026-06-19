
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
  
  const filteredRequests = (availableRequests?.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(req => {
        if (!user) return false;
        const request = req as TransportRequest;
        return !request.applicants?.includes(user.uid) && request.status === 'En attente';
    }) || []) as TransportRequest[];


  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <Truck className="h-6 w-6 text-teal-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Demandes Disponibles</h1>
            <p className="mt-2 text-slate-600 text-sm">Trouvez et postulez aux demandes de transport</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {isLoading && (
          <Card className="border-0 shadow-md rounded-xl bg-white">
            <CardContent className="p-12 flex justify-center items-center">
              <div className="text-center">
                <Loader2 className="animate-spin h-8 w-8 text-teal-600 mx-auto" />
                <p className="mt-4 text-slate-600">Chargement des demandes disponibles...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {userData && userData.isVerified === false && !isLoading && (
          <Card className="border-0 shadow-md rounded-xl bg-orange-50 border border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">Profil en attente de vérification</h3>
                  <p className="text-sm text-orange-800 mt-2">Votre compte doit être vérifié par un administrateur avant de pouvoir postuler à des demandes de transport.</p>
                  <p className="text-sm text-orange-700 mt-3">Veuillez compléter tous les documents requis dans la section <Link href="/dashboard/transporter/documents" className="underline font-medium hover:text-orange-600">Mes documents</Link>.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && errorRequests && (
          <Card className="border-0 shadow-md rounded-xl bg-red-50 border border-red-200">
            <CardContent className="p-6">
              <p className="text-red-700 font-medium">Erreur: Impossible de charger les demandes disponibles.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !userData?.isVerified === false && (
          <div className="space-y-6">
            {filteredRequests && filteredRequests.length === 0 ? (
              <Card className="border-0 shadow-md rounded-xl bg-white">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-slate-100 rounded-full mb-4">
                      <Package className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-900">Aucune demande disponible pour le moment.</p>
                    <p className="text-sm text-slate-600 mt-2">Revenez plus tard pour voir les nouvelles demandes de transport.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests?.map((request: TransportRequest) => (
                  <Card key={request.id} className="border-0 shadow-md rounded-xl bg-white overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex gap-4 flex-1">
                          <div className="p-3 bg-teal-100 rounded-lg h-fit">
                            {getRequestIcon(request.nature)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-slate-900 text-lg">{request.nature}</h3>
                                <p className="text-sm text-slate-600 mt-1">ID: {request.id}</p>
                              </div>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                En attente
                              </span>
                            </div>
                            
                            <div className="grid sm:grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Départ</p>
                                <p className="text-sm text-slate-900 mt-1">{request.from}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination</p>
                                <p className="text-sm text-slate-900 mt-1">{request.to}</p>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-4 mt-4">
                              {request.weight && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Poids</p>
                                  <p className="text-sm text-slate-900 mt-1 flex items-center gap-1">
                                    <Weight className="h-4 w-4" /> {request.weight} kg
                                  </p>
                                </div>
                              )}
                              {request.estimatedDistance && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Distance</p>
                                  <p className="text-sm text-slate-900 mt-1 flex items-center gap-1">
                                    <Navigation className="h-4 w-4" /> ~{request.estimatedDistance} km
                                  </p>
                                </div>
                              )}
                              {request.estimatedDuration && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Durée estimée</p>
                                  <p className="text-sm text-slate-900 mt-1 flex items-center gap-1">
                                    <Clock className="h-4 w-4" /> {formatDurationFromSeconds(request.estimatedDuration)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {request.estimatedPrice && (
                              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-green-700">Prix estimé</p>
                                  <p className="text-lg font-bold text-green-700">
                                    {new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(request.estimatedPrice)}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                              <User className="h-4 w-4 text-slate-400" />
                              <p className="text-sm text-slate-600">Client: <span className="font-medium text-slate-900">{request.clientName || 'N/A'}</span></p>
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleApply(request)}
                          className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
                          disabled={isLoading}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Postuler
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
