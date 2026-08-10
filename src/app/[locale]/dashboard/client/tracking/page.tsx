"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, collection, query, where, updateDoc } from "firebase/firestore"
import { useCollection } from "react-firebase-hooks/firestore"
import { auth, db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/translations"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
const TrackingMap = dynamic(() => import("@/components/tracking-map"), { ssr: false })
import { LocateFixed, MapPin, User, Loader2, CheckCircle, Clock, Truck, Key, ExternalLink, Phone, MessageSquare, Copy, ShieldCheck, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { TransportRequest } from "@/ai/types"
import TrackingSidebar from "@/components/tracking-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import TransconnektIntelligence from "@/components/transconnekt-intelligence";

export interface TransporterProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  vehicleType?: string;
  email?: string;
  phone?: string;
  rating?: number;
  companyName?: string;
}

export interface EnrichedTransportRequest extends TransportRequest {
  assignedTransporter?: TransporterProfile | null;
}

export default function ClientTrackingPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const { toast } = useToast();
  const { t } = useTranslation();

  const requestsQuery = useMemo(() => {
    return user
      ? query(
          collection(db, "requests"),
          where("status", "in", ["En attente", "En cours", "Livré", "Terminé"]),
          where("clientId", "==", user.uid)
        )
      : null;
  }, [user?.uid]);

  const [requestsSnapshot, loadingRequests, errorRequests] = useCollection(requestsQuery);

  const requests: EnrichedTransportRequest[] = useMemo(() => {
    if (!requestsSnapshot) return [];
    return requestsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as EnrichedTransportRequest[];
  }, [requestsSnapshot]);

  const [selectedRequest, setSelectedRequest] = useState<EnrichedTransportRequest | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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
        title: t.tracking_action_required || "Course terminée !",
        description: t.tracking_action_desc || "Merci d'avoir confirmé."
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

  const activeStep = selectedRequest
    ? selectedRequest.status === "Terminé" || selectedRequest.status === "Livré"
      ? 3
      : selectedRequest.status === "En cours"
      ? 2
      : selectedRequest.assignedTo
      ? 1
      : 0
    : 0;

  const copyTrackingLink = () => {
    if (!selectedRequest?.id) return;
    const link = `${window.location.origin}/tracking/${selectedRequest.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: t.tracking_copy_link || "Lien copié",
      description: "Le lien de suivi GPS public a été copié.",
    });
  };

  const shareWhatsApp = () => {
    if (!selectedRequest?.id) return;
    const link = `${window.location.origin}/tracking/${selectedRequest.id}`;
    const text = `${t.tracking_title || 'Suivi GPS'} "${selectedRequest.nature}" : ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (errorRequests) {
    console.error(errorRequests);
    return <p className="text-destructive text-center p-6 font-bold">Erreur de chargement des courses.</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            {t.tracking_title || "Console de Suivi GPS des Colis"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t.tracking_subtitle || "Suivez la position en temps réel de vos marchandises et consultez vos codes secrets de livraison."}
          </p>
        </div>
        {selectedRequest?.id && (
          <Link href={`/tracking/${selectedRequest.id}`} target="_blank">
            <Button className="rounded-xl bg-primary text-white font-bold text-xs gap-2 shadow-md">
              <ExternalLink size={14} /> {t.tracking_fullscreen_live || "Plein Écran GPS Live"}
            </Button>
          </Link>
        )}
      </div>

      <TransconnektIntelligence />

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
          <Card className="shadow-lg rounded-3xl border-border/50 overflow-hidden bg-card/60 backdrop-blur-md">
            <CardHeader className="border-b border-border/40 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {selectedRequest ? (
                <>
                  <div>
                    <CardTitle className="flex items-center gap-2.5 text-xl font-extrabold text-foreground">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><LocateFixed size={18} /></span>
                      "{selectedRequest.nature}"
                    </CardTitle>
                    <CardDescription className="text-xs font-mono mt-1 text-muted-foreground">
                      ID: #{selectedRequest.id?.slice(0, 8)} · {selectedRequest.from} ➔ {selectedRequest.to}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={copyTrackingLink} className="rounded-xl text-xs font-bold gap-1">
                      <Copy size={12} /> {t.tracking_copy_link || "Lien"}
                    </Button>
                    <Button size="sm" onClick={shareWhatsApp} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1">
                      <MessageSquare size={12} /> {t.tracking_whatsapp || "WhatsApp"}
                    </Button>
                  </div>
                </>
              ) : (
                <CardTitle className="text-accent text-xl font-bold">{t.tracking_no_active || "Aucune course sélectionnée"}</CardTitle>
              )}
            </CardHeader>

            <CardContent className="p-4 md:p-6">
              {isLoading && !selectedRequest ? (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : selectedRequest ? (
                <div className="space-y-6">

                  {/* OTP Validation Box */}
                  {selectedRequest.otpCode && selectedRequest.status !== 'Terminé' && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 text-white space-y-2 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase text-emerald-400 flex items-center gap-1.5">
                          <Key size={14} /> {t.tracking_otp_title || "Code Secret de Livraison (OTP)"}
                        </span>
                        <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5">
                          {t.tracking_otp_confidential || "CONFIDENTIEL"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        {t.tracking_otp_desc || "Transmettez ce code secret au chauffeur uniquement une fois que vous avez contrôlé et réceptionné le colis :"}
                      </p>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/50 text-center font-mono font-black text-2xl tracking-[0.4em] text-emerald-400 shadow-inner">
                        {selectedRequest.otpCode}
                      </div>
                    </div>
                  )}

                  {/* Interactive Mapbox View */}
                  <div className="rounded-2xl overflow-hidden border border-border/60 shadow-md">
                    <TrackingMap 
                      from={selectedRequest.from} 
                      to={selectedRequest.to} 
                      shipmentId={selectedRequest.id} 
                    />
                  </div>

                  {/* Stepper Timeline */}
                  <div className="border border-border/60 rounded-3xl p-6 bg-muted/20 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 relative">
                      <div className="hidden md:block absolute top-[18px] left-[10%] right-[10%] h-[3px] bg-border -z-10 rounded-full" />
                      <div 
                        className="hidden md:block absolute top-[18px] left-[10%] h-[3px] bg-primary -z-10 rounded-full transition-all duration-700 ease-in-out" 
                        style={{ width: `${(activeStep / 3) * 80}%` }}
                      />

                      {[
                        { label: t.tracking_step_created || 'Créée', desc: t.tracking_step_created_desc || 'Demande publiée', icon: <CheckCircle size={16} /> },
                        { label: t.tracking_step_assigned || 'Assignée', desc: t.tracking_step_assigned_desc || 'Chauffeur validé', icon: <User size={16} /> },
                        { label: t.tracking_step_in_transit || 'En Transit', desc: t.tracking_step_in_transit_desc || 'Colis en route', icon: <Truck size={16} /> },
                        { label: t.tracking_step_delivered || 'Livrée', desc: t.tracking_step_delivered_desc || 'Confirmé par client', icon: <CheckCircle size={16} /> }
                      ].map((step, i) => {
                        const isDone = i <= activeStep;
                        const isCurrent = i === activeStep;
                        return (
                          <div key={i} className="flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center flex-1 relative z-10 w-full md:w-auto">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all duration-500 shrink-0 ${
                              isDone 
                                ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' 
                                : 'bg-background border-border text-muted-foreground'
                            } ${isCurrent ? 'scale-110 ring-4 ring-primary/20 animate-pulse' : ''}`}>
                              {step.icon}
                            </div>
                            <div>
                              <p className={`font-bold text-xs md:text-sm ${isDone ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{step.label}</p>
                              <p className="text-[10px] md:text-xs text-muted-foreground/80 hidden sm:block mt-0.5">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedRequest.status === "Livré" && (
                    <Card className="bg-emerald-500/10 border-emerald-500/30 shadow-md rounded-2xl">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-foreground flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle size={18} /> {t.tracking_action_required || "Colis Livré !"}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t.tracking_action_desc || "Le transporteur signale avoir déposé votre marchandise. Validez la réception pour débloquer le séquestre."}
                          </p>
                        </div>
                        <Button
                          onClick={handleConfirmDelivery}
                          disabled={isConfirming}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 shrink-0"
                        >
                          {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          {t.tracking_confirm_delivery || "Confirmer la livraison"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Delivery & Transporter Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Card className="shadow-md rounded-2xl border-border/50 bg-card/40 backdrop-blur-md">
                      <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                          <MapPin size={16} className="text-primary" /> {t.tracking_trip_details || "Détails du Trajet & Colis"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2.5 pt-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">{t.tracking_departure || "Départ"} :</span>
                          <strong className="text-foreground">{selectedRequest.from}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">{t.tracking_destination || "Arrivée"} :</span>
                          <strong className="text-foreground">{selectedRequest.to}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">{t.tracking_weight || "Poids"} :</span>
                          <strong className="text-foreground">{selectedRequest.weight} {selectedRequest.weightUnit}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">{t.tracking_escrow_status || "Statut Séquestre"} :</span>
                          <span className="font-bold text-emerald-400">{t.tracking_escrow_locked || "Verrouillé 🛡️"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {isLoadingDetails ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : selectedRequest.assignedTransporter && (
                      <Card className="shadow-md rounded-2xl border-border/50 bg-card/40 backdrop-blur-md">
                        <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Truck size={16} className="text-primary" /> {t.tracking_transporter_info || "Transports Partenaire"}
                          </CardTitle>
                          <span className="text-emerald-400 font-bold text-xs">⭐ {selectedRequest.assignedTransporter.rating?.toFixed(1) || '5.0'}</span>
                        </CardHeader>
                        <CardContent className="text-xs space-y-3 pt-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {selectedRequest.assignedTransporter.firstName?.[0]}
                                {selectedRequest.assignedTransporter.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground">
                                {selectedRequest.assignedTransporter.companyName || `${selectedRequest.assignedTransporter.firstName} ${selectedRequest.assignedTransporter.lastName}`}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{selectedRequest.assignedTransporter.vehicleType || t.tracking_driver_verified || "Chauffeur vérifié"}</p>
                            </div>
                          </div>
                          {selectedRequest.assignedTransporter.phone && (
                            <div className="pt-2 border-t border-border/40 flex gap-2">
                              <a href={`tel:${selectedRequest.assignedTransporter.phone}`} className="flex-1">
                                <Button size="sm" className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl">
                                  <Phone size={12} /> {t.tracking_call || "Appeler"}
                                </Button>
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 gap-3">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground/60"><MapPin size={32} /></span>
                  <div>
                    <p className="font-bold text-foreground text-lg">{t.tracking_no_active || "Vous n'avez aucune course active"}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t.tracking_no_active_desc || "Vos livraisons en cours de transit apparaîtront ici."}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
