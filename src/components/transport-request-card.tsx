
"use client";

import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Users, Loader2, Star, UserCheck, AlertTriangle, FileUp, Paperclip, Clock, Navigation, Ban, MapPin, ArrowRight, ShieldCheck, Receipt, Wallet, Smartphone, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslation } from "@/lib/translations";
import { collection, query, where, getDocs, doc, updateDoc, getDocsFromCache } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type { Timestamp } from "firebase/firestore";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDurationFromSeconds } from "@/lib/utils";
import type { TransportRequest } from "@/ai/types";
import { createNotification } from "@/lib/notifications";
import { initiateEscrowPayment } from "@/lib/payments";

interface ApplicantProfile {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
}

interface TransportRequestCardProps {
    request: TransportRequest;
    onAssign: (requestId: string, transporterId: string) => void;
    onCancellationRequest: (requestId: string, reason: string, fileUrl: string | null) => Promise<void>;
}

const CancelRequestDialog = ({ request, onCancellationRequest }: { request: TransportRequest, onCancellationRequest: TransportRequestCardProps['onCancellationRequest'] }) => {
    const [reason, setReason] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { t, lang } = useTranslation();

    const handleSubmit = async () => {
        if (!reason) {
            toast({ variant: "destructive", title: "Erreur", description: "La justification est obligatoire." });
            return;
        }
        setIsSubmitting(true);
        let fileUrl: string | null = null;
        try {
            if (file) {
                const storageRef = ref(storage, `cancellations/${request.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(storageRef);
            }
            await onCancellationRequest(request.id, reason, fileUrl);

            // Notify admins
            const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
            const adminSnapshot = await getDocs(adminsQuery);
            adminSnapshot.forEach(adminDoc => {
                 createNotification({
                    userId: adminDoc.id,
                    message: `Une demande d'annulation a été soumise pour la course #${request.id.substring(0, 6)}.`,
                    href: `/dashboard/admin/cancellations`
                });
            });

            setOpen(false);
        } catch (error) {
            console.error("Error submitting cancellation request:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de soumettre la demande d'annulation." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Ban className="mr-2 h-4 w-4" />
                    {lang === 'fr' ? "Demander l'annulation" : "Request cancellation"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{lang === 'fr' ? "Demande d'annulation" : "Cancellation Request"}</DialogTitle>
                    <DialogDescription>
                        {lang === 'fr' ? "Veuillez fournir une justification pour votre demande d'annulation. Un administrateur l'examinera." : "Please provide a justification for your cancellation request. An administrator will review it."}
                        {request.assignedTo && (
                            <div className="mt-2 text-destructive font-bold text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                {lang === 'fr' ? "Un transporteur est déjà assigné. Des justificatifs sont fortement recommandés." : "A transporter is already assigned. Supporting documents are strongly recommended."}
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="cancellation-reason">{lang === 'fr' ? "Justification (obligatoire)" : "Justification (required)"}</Label>
                        <Textarea id="cancellation-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder={lang === 'fr' ? "Expliquez pourquoi vous annulez..." : "Explain why you are canceling..."}/>
                    </div>
                    <div>
                        <Label htmlFor="cancellation-file">{lang === 'fr' ? "Document justificatif (optionnel)" : "Supporting document (optional)"}</Label>
                        <Input id="cancellation-file" type="file" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>{lang === 'fr' ? "Fermer" : "Close"}</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {lang === 'fr' ? "Soumettre la demande" : "Submit request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const PaymentDialog = ({ request, onPaid }: { request: TransportRequest; onPaid: () => void }) => {
    const [insurance, setInsurance] = useState(false);
    const [method, setMethod] = useState<'orange_money' | 'mtn_momo' | 'bank_transfer'>('orange_money');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    // Calculate dynamic price based on distance and weight if not set
    const distanceKm = request.distance || 100;
    const weightTons = request.weight || 1;
    const calculatedPrice = request.price || Math.round((distanceKm * 12000) + (weightTons * 60000));
    
    const insurancePrice = insurance ? Math.round(calculatedPrice * 0.02) : 0;
    const totalAmount = calculatedPrice + insurancePrice;

    const handlePayment = async () => {
        setIsSubmitting(true);
        try {
            await initiateEscrowPayment(
                request.id,
                request.clientId,
                calculatedPrice,
                method,
                insurance
            );

            if (request.assignedTo) {
                await createNotification({
                    userId: request.assignedTo,
                    message: `Le client a effectué le paiement séquestre pour la course "${request.nature}". Vous pouvez commencer le trajet.`,
                    href: `/dashboard/transporter/jobs`
                });
            }

            toast({
                title: "Paiement enregistré !",
                description: method === 'bank_transfer'
                  ? "Votre demande de paiement par facture est enregistrée. La course est activée."
                  : "Le dépôt de garantie a été placé en séquestre avec succès.",
            });
            setOpen(false);
            onPaid();
        } catch (error) {
            console.error("Error processing escrow payment:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Le traitement du paiement a échoué."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full h-9 px-4 text-xs font-semibold shadow-md shadow-emerald-600/10">
                    <Wallet size={14} className="mr-1.5" />
                    Payer la course
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md bg-slate-950 text-slate-100 border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" /> Paiement Séquestre Sécurisé
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Déposez les fonds de manière sécurisée. Ils seront bloqués jusqu'à la livraison finale.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Price Recap */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Transport de marchandises</span>
                            <span className="font-semibold text-white">{calculatedPrice.toLocaleString('fr-FR')} GNF</span>
                        </div>
                        
                        {/* Insurance SVA */}
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                            <div className="flex items-start gap-2">
                                <Checkbox 
                                    id="insurance" 
                                    checked={insurance} 
                                    onCheckedChange={(checked) => setInsurance(!!checked)} 
                                    className="mt-0.5 border-slate-600 text-primary"
                                />
                                <div className="space-y-0.5">
                                    <Label htmlFor="insurance" className="text-xs font-semibold text-white cursor-pointer flex items-center gap-1">
                                        Assurance Cargo TransConnekt (+2%)
                                    </Label>
                                    <p className="text-[10px] text-slate-400 leading-tight">Couvre jusqu'à 250M GNF en cas de dommages ou vol.</p>
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-300">
                                {insurancePrice > 0 ? `+${insurancePrice.toLocaleString('fr-FR')} GNF` : 'Non activée'}
                            </span>
                        </div>

                        {/* Total price */}
                        <div className="flex justify-between text-base font-bold border-t border-slate-800 pt-3">
                            <span className="text-slate-200">Total à payer</span>
                            <span className="text-emerald-400">{totalAmount.toLocaleString('fr-FR')} GNF</span>
                        </div>
                    </div>

                    {/* Method Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-300">Moyen de paiement</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setMethod('orange_money')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                                    method === 'orange_money' 
                                        ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-850'
                                }`}
                            >
                                <Smartphone size={16} />
                                <span>Orange Money</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('mtn_momo')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                                    method === 'mtn_momo' 
                                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' 
                                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-850'
                                }`}
                            >
                                <Smartphone size={16} />
                                <span>MTN MoMo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('bank_transfer')}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
                                    method === 'bank_transfer' 
                                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-850'
                                }`}
                            >
                                <Receipt size={16} />
                                <span>Facture Virement</span>
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-900 pt-3">
                    <Button variant="ghost" className="hover:bg-slate-900 hover:text-white" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button 
                        onClick={handlePayment} 
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-bold rounded-xl"
                    >
                        {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                        {method === 'bank_transfer' ? 'Générer la facture' : 'Déposer les fonds'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function TransportRequestCard({ request, onAssign, onCancellationRequest, onPaid }: TransportRequestCardProps & { onPaid?: () => void }) {
    const [applicants, setApplicants] = useState<ApplicantProfile[]>([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    const { t, lang } = useTranslation();

    const fetchApplicants = async () => {
        if (!request.applicants || request.applicants.length === 0) {
            setApplicants([]);
            return;
        };
        setLoadingApplicants(true);
        try {
            const q = query(collection(db, "users"), where("__name__", "in", request.applicants));
            const querySnapshot = await getDocs(q);
            const applicantData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApplicantProfile));
            setApplicants(applicantData);
        } catch (error) {
            console.error("Error fetching applicants:", error);
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Impossible de charger les postulants."
            });
        }
        setLoadingApplicants(false);
    };

    const handleAssignTransporter = async (transporterId: string) => {
        await onAssign(request.id, transporterId);
        setIsDialogOpen(false); // Close the dialog on success
    };

    const getStatusBadge = (reqObj: TransportRequest) => {
        let className = "px-3 py-1 rounded-full text-xs font-semibold ";
        
        if (reqObj.status === 'En attente' && reqObj.assignedTo && reqObj.paymentStatus !== 'escrow_held') {
            return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-1"><Clock size={12}/> En attente de paiement</span>;
        }

        switch (reqObj.status) {
            case 'En attente': className += 'bg-amber-500/10 text-amber-600 dark:text-amber-400'; break;
            case 'En cours': className += 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'; break;
            case 'Livré': className += 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'; break;
            case 'Annulation demandée': className += 'bg-rose-500/10 text-rose-600 dark:text-rose-400'; break;
            default: className += 'bg-muted text-muted-foreground'; break;
        }
        return <span className={className}>{reqObj.status}</span>;
    };

    return (
        <Card className="bg-card/50 backdrop-blur-md shadow-md rounded-2xl border-border/50 transition-all duration-300 hover:shadow-lg hover:border-border/80">
            <CardContent className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-5">
                <div className="flex-grow space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-lg text-foreground">{request.nature}</p>
                        <div className="pt-0.5">{getStatusBadge(request)}</div>
                        
                        {request.paymentStatus === 'escrow_held' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <ShieldCheck size={10}/> {lang === 'fr' ? "Dépôt Séquestre Sécurisé" : "Secure Escrow Held"}
                            </span>
                        )}
                        {request.insurancePrice && request.insurancePrice > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                🛡️ {lang === 'fr' ? "Assuré" : "Insured"}
                            </span>
                        ) : null}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <MapPin size={14} className="text-primary"/> {request.from} <ArrowRight size={12} className="text-muted-foreground/60"/> {request.to}
                    </p>
                    
                    {request.paymentStatus === 'escrow_held' && request.otpCode && (
                        <div className="mt-2 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 max-w-sm">
                            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                🔑 {lang === 'fr' ? "Code de livraison sécurisé (A donner au chauffeur) :" : "Secure delivery OTP code (Provide to driver):"}
                            </p>
                            <p className="text-lg font-black tracking-widest text-indigo-400 mt-0.5">{request.otpCode}</p>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80 border-t border-border/40 pt-2">
                       <span>{lang === 'fr' ? "Créée le" : "Created on"} {request.createdAt ? format(request.createdAt.toDate(), "PPP", { locale: lang === 'fr' ? fr : enUS }) : ''}</span>
                        {request.distance && <span className="flex items-center gap-1"><Navigation className="h-3 w-3 text-primary"/>{request.distance} km</span>}
                        {request.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary"/>{formatDurationFromSeconds(request.duration)}</span>}
                    </div>
                </div>
                <div className="flex-shrink-0 self-end sm:self-center flex flex-wrap gap-2">
                    {request.status === 'En attente' && !request.assignedTo && (
                         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" onClick={fetchApplicants} disabled={!request.applicants || request.applicants.length === 0} className="rounded-full h-9 px-4 text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 hover:bg-primary/5 hover:text-primary">
                                    <Users size={14} />
                                    {lang === 'fr' ? `Voir les postulants (${request.applicants?.length || 0})` : `View applicants (${request.applicants?.length || 0})`}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-bold">{lang === 'fr' ? "Choisir un transporteur" : "Choose a transporter"}</DialogTitle>
                                    <DialogDescription>
                                        {lang === 'fr' ? "Sélectionnez le transporteur pour votre course." : "Select the transporter for your trip."}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
                                    {loadingApplicants ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /> :
                                     applicants.length > 0 ? applicants.map(applicant => (
                                             <div key={applicant.id} className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-muted/10 hover:bg-muted/20 transition-all duration-300">
                                                 <div className="flex items-center gap-3">
                                                     <Avatar className="h-9 w-9">
                                                        <AvatarImage src={`https://placehold.co/40x40/E0F8F8/008080/png?text=${applicant.firstName?.[0]}${applicant.lastName?.[0]}`} />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{applicant.firstName?.[0]}{applicant.lastName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-sm text-foreground">{applicant.firstName} {applicant.lastName}</p>
                                                        <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                                            <Star className="h-3 w-3 mr-1 text-amber-400 fill-amber-400" /> {applicant.rating?.toFixed(1) || 'N/A'}
                                                        </div>
                                                    </div>
                                                 </div>
                                                 <Button size="sm" onClick={() => handleAssignTransporter(applicant.id)} className="rounded-full h-8 px-3 text-xs font-semibold bg-primary hover:bg-primary/95 text-white">
                                                     <UserCheck size={12} className="mr-1" />
                                                     {lang === 'fr' ? "Choisir" : "Select"}
                                                 </Button>
                                             </div>
                                         )) : <p className="text-center text-muted-foreground py-6 text-sm">{lang === 'fr' ? "Aucun postulant pour le moment." : "No applicants at the moment."}</p>
                                    }
                                </div>
                            </DialogContent>
                         </Dialog>
                    )}
                    {request.status === 'En attente' && request.assignedTo && request.paymentStatus !== 'escrow_held' && (
                        <PaymentDialog request={request} onPaid={onPaid || (() => {})} />
                    )}
                    {(request.status === 'En attente' || request.status === 'En cours') && (
                       <CancelRequestDialog request={request} onCancellationRequest={onCancellationRequest} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
