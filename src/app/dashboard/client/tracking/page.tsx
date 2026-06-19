
"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, collection, query, where, updateDoc } from "firebase/firestore"
import { useCollection } from "react-firebase-hooks/firestore"
import { auth, db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import TrackingMap from "@/components/tracking-map"
import { LocateFixed, MapPin, User, Loader2, CheckCircle, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import type { TransportRequest } from "@/ai/types"
import TrackingSidebar from "@/components/tracking-sidebar"
import { Button } from "@/components/ui/button"
import { formatDurationFromSeconds } from "@/lib/utils"

export interface TransporterProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  vehicleType?: string;
  email?: string;
  phone?: string;
  rating?: number;
  photoURL?: string;
}

export interface EnrichedTransportRequest extends TransportRequest {
  assignedTransporter?: TransporterProfile | null;
}

export default function ClientTrackingPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { toast } = useToast();

  const requestsQuery = user
    ? query(
        collection(db, "requests"),
        where("status", "in", ["En cours", "Livré"]),
        where("clientId", "==", user.uid)
      )
    : null;

  // Use useCollection for robust ID handling
  const [requestsSnapshot, loadingRequests, errorRequests] = useCollection(requestsQuery);

  // Manually map docs to data with ID
  const requests: EnrichedTransportRequest[] = useMemo(() => {
    if (!requestsSnapshot) return [];
    return requestsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as EnrichedTransportRequest[];
  }, [requestsSnapshot]);


  const [selectedRequest, setSelectedRequest] = useState<EnrichedTransportRequest | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Auto-select the first request or refresh the selected one
  useEffect(() => {
    if (loadingRequests || !requests) return;

    if (requests.length === 0) {
      setSelectedRequest(null);
      return;
    }

    const currentSelectedId = selectedRequest?.id;
    if (currentSelectedId) {
      const refreshedRequest = requests.find(r => r.id === currentSelectedId);
      setSelectedRequest(refreshedRequest || requests[0]);
    } else {
      setSelectedRequest(requests[0]);
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, loadingRequests]);


  const handleConfirmDelivery = async () => {
    const requestId = selectedRequest?.id;

    if (!requestId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "ID de la course manquant. Veuillez réessayer."
      });
      return;
    }

    const requestDocRef = doc(db, "requests", requestId);
    setIsConfirming(true);
    try {
      await updateDoc(requestDocRef, { status: "Terminé" });
      toast({
        title: "Course terminée !",
        description: "Merci d'avoir confirmé. Vous pouvez maintenant évaluer le transporteur."
      });
    } catch (error) {
      console.error("Erreur lors de la confirmation :", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de confirmer la livraison."
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSelectRequest = (request: TransportRequest) => {
    setSelectedRequest(request as EnrichedTransportRequest);
  };

  // Fetch transporter details when a request is selected
  useEffect(() => {
    const fetchTransporterDetails = async () => {
      if (
        selectedRequest &&
        selectedRequest.assignedTo &&
        !selectedRequest.assignedTransporter
      ) {
        setIsLoadingDetails(true);
        try {
          const transporterDocRef = doc(db, "users", selectedRequest.assignedTo);
          const docSnap = await getDoc(transporterDocRef);
          if (docSnap.exists()) {
            setSelectedRequest(prev =>
              prev
                ? {
                    ...prev,
                    assignedTransporter: { id: docSnap.id, ...(docSnap.data() as any) } as TransporterProfile
                  }
                : prev
            );
          }
        } catch (error) {
          console.error("Error fetching transporter details:", error);
        } finally {
          setIsLoadingDetails(false);
        }
      }
    };
    fetchTransporterDetails();
  }, [selectedRequest]);

  const isLoading = loadingAuth || loadingRequests;

  if (errorRequests) {
    console.error(errorRequests);
    return <p className="text-destructive text-center">Erreur de chargement des courses.</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <LocateFixed className="h-6 w-6 text-teal-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Suivi des Colis</h1>
            <p className="mt-2 text-slate-600 text-sm">Suivez vos colis en temps réel</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {isLoading && !selectedRequest ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            <p className="mt-4 text-slate-600">Chargement de vos courses...</p>
          </div>
        ) : errorRequests ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">Erreur de chargement des courses.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <TrackingSidebar
                isLoading={isLoading}
                requests={requests as TransportRequest[]}
                selectedRequest={selectedRequest}
                onSelectRequest={handleSelectRequest}
              />
            </div>
            <div className="lg:col-span-2">
              {selectedRequest ? (
                <div className="space-y-6">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-teal-100 rounded-lg">
                            <LocateFixed className="h-5 w-5 text-teal-700" />
                          </div>
                          <div>
                            <CardTitle className="text-teal-900">{selectedRequest.nature}</CardTitle>
                            <CardDescription className="text-teal-700/70">ID: {selectedRequest.id ?? "—"}</CardDescription>
                          </div>
                        </div>
                        {selectedRequest.status === "En cours" && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            <Clock className="h-3 w-3" /> En cours
                          </span>
                        )}
                        {selectedRequest.status === "Livré" && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle className="h-3 w-3" /> Livré
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-6">
                        <TrackingMap from={selectedRequest.from} to={selectedRequest.to} />
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Départ</p>
                              <p className="mt-1 text-sm font-medium text-slate-900">{selectedRequest.from}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nature du colis</p>
                              <p className="mt-1 text-sm font-medium text-slate-900">{selectedRequest.nature}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Destination</p>
                              <p className="mt-1 text-sm font-medium text-slate-900">{selectedRequest.to}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</p>
                              <p className="mt-1 text-sm font-medium text-slate-900">
                                {selectedRequest.createdAt && format(selectedRequest.createdAt.toDate?.() || new Date(), 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {selectedRequest.assignedTransporter && (
                          <div className="border-t border-slate-200 pt-6">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4">Transporteur assigné</h3>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                              <Avatar className="h-12 w-12 border border-slate-200">
                                <AvatarImage src={selectedRequest.assignedTransporter.photoURL} />
                                <AvatarFallback className="bg-teal-100 text-teal-700">
                                  {selectedRequest.assignedTransporter.firstName?.[0]}{selectedRequest.assignedTransporter.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">
                                  {selectedRequest.assignedTransporter.firstName} {selectedRequest.assignedTransporter.lastName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {selectedRequest.assignedTransporter.rating && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-medium text-yellow-600">
                                        ⭐ {selectedRequest.assignedTransporter.rating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                  {selectedRequest.assignedTransporter.phone && (
                                    <a href={`tel:${selectedRequest.assignedTransporter.phone}`} className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                                      {selectedRequest.assignedTransporter.phone}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedRequest.status === "Livré" && (
                          <div className="border-t border-slate-200 pt-6">
                            <Card className="bg-green-50 border border-green-200 shadow-none rounded-lg">
                              <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h3 className="font-semibold text-green-900">Colis livré</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                      Le transporteur a marqué cette course comme livrée. Veuillez confirmer la réception.
                                    </p>
                                    <Button 
                                      onClick={handleConfirmDelivery}
                                      disabled={isConfirming}
                                      className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      {isConfirming ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          Confirmation...
                                        </>
                                      ) : (
                                        'Confirmer la livraison'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                  <CardContent className="p-12">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center h-16 w-16 bg-slate-100 rounded-full">
                        <MapPin className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-900">Aucune course sélectionnée</h3>
                      <p className="mt-2 text-slate-600">Sélectionnez une course dans la liste de gauche pour commencer le suivi</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
