
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
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Suivi des Colis</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <TrackingSidebar
            isLoading={isLoading}
            requests={requests as TransportRequest[]}
            selectedRequest={selectedRequest}
            onSelectRequest={handleSelectRequest}
          />
        </div>
        <div className="lg:col-span-2">
          <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
              {selectedRequest ? (
                <>
                  <CardTitle className="flex items-center gap-2 text-accent">
                    <LocateFixed /> Suivi pour: "{selectedRequest.nature}"
                  </CardTitle>
                  <CardDescription>ID de la course: {selectedRequest.id ?? "— (non fourni)"}</CardDescription>
                </>
              ) : (
                <CardTitle className="text-accent">Aucune course sélectionnée</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {isLoading && !selectedRequest ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96">
                  <Loader2 className="h-12 w-12 animate-spin" />
                </div>
              ) : selectedRequest ? (
                <div className="space-y-6">
                  <TrackingMap from={selectedRequest.from} to={selectedRequest.to} />
                  {selectedRequest.status === "Livré" && (
                    <Card className="bg-primary/10 border-primary shadow-md rounded-2xl">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">Action Requise</h3>
                          <p className="text-sm text-muted-foreground">
                            Le transporteur a marqué cette course comme livrée. Veuillez confirmer la réception.
                          </p>
                        </div>
                        <Button
                          onClick={handleConfirmDelivery}
                          disabled={isConfirming}
                        >
                          {isConfirming ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Confirmation...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Confirmer la livraison
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  <div>
                    <h3 className="font-semibold mb-3">Informations de la course</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Card className="shadow-md rounded-2xl border-border">
                        <CardHeader>
                          <CardTitle className="text-base text-accent">Détails</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <p>
                            <span className="text-muted-foreground">De:</span>{" "}
                            <strong>{selectedRequest.from}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">À:</span>{" "}
                            <strong>{selectedRequest.to}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Poids:</span>{" "}
                            <strong>{selectedRequest.weight} {selectedRequest.weightUnit}</strong>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Date:</span>{" "}
                            <strong>
                              {selectedRequest.date?.toDate
                                ? format(selectedRequest.date.toDate(), "PPP")
                                : "Date invalide"}
                            </strong>
                          </p>
                           {selectedRequest.duration && (
                            <p className="flex items-center gap-1">
                                <span className="text-muted-foreground">Durée estimée:</span>{" "}
                                <strong className="flex items-center gap-1"><Clock className="h-4 w-4"/> {formatDurationFromSeconds(selectedRequest.duration)}</strong>
                            </p>
                           )}
                        </CardContent>
                      </Card>
                      {isLoadingDetails ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : selectedRequest.assignedTransporter && (
                        <Card className="shadow-md rounded-2xl border-border">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2 text-accent">
                              <User size={16} /> Transporteur
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm space-y-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={`https://placehold.co/40x40/008080/FFFFFF/png?text=${selectedRequest.assignedTransporter.firstName?.[0]}${selectedRequest.assignedTransporter.lastName?.[0]}`}
                                />
                                <AvatarFallback>
                                  {selectedRequest.assignedTransporter.firstName?.[0]}
                                  {selectedRequest.assignedTransporter.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <strong>
                                {selectedRequest.assignedTransporter.firstName}{" "}
                                {selectedRequest.assignedTransporter.lastName}
                              </strong>
                            </div>
                            <p>
                              <strong>Contact:</strong>{" "}
                              {selectedRequest.assignedTransporter.phone || "Non fourni"}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96">
                  <MapPin className="h-16 w-16 mb-4" />
                  <p className="font-semibold">Vous n'avez aucune course en cours.</p>
                  <p>Toutes vos courses actives s'afficheront ici pour le suivi.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
