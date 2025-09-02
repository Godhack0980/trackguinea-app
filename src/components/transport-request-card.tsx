
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
import { Trash2, Users, Loader2, Star, UserCheck, AlertTriangle, FileUp, Paperclip, Clock, Navigation, Ban } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { collection, query, where, getDocs, doc, updateDoc, getDocsFromCache } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type { Timestamp } from "firebase/firestore";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { formatDurationFromSeconds } from "@/lib/utils";
import type { TransportRequest } from "@/ai/types";
import { createNotification } from "@/lib/notifications";

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
                    Demander l'annulation
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Demande d'annulation</DialogTitle>
                    <DialogDescription>
                        Veuillez fournir une justification pour votre demande d'annulation. Un administrateur l'examinera.
                        {request.assignedTo && (
                            <div className="mt-2 text-destructive font-bold text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Un transporteur est déjà assigné. Des justificatifs sont fortement recommandés.
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="cancellation-reason">Justification (obligatoire)</Label>
                        <Textarea id="cancellation-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Expliquez pourquoi vous annulez..."/>
                    </div>
                    <div>
                        <Label htmlFor="cancellation-file">Document justificatif (optionnel)</Label>
                        <Input id="cancellation-file" type="file" ref={fileInputRef} onChange={e => setFile(e.target.files?.[0] || null)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Fermer</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Soumettre la demande
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function TransportRequestCard({ request, onAssign, onCancellationRequest }: TransportRequestCardProps) {
    const [applicants, setApplicants] = useState<ApplicantProfile[]>([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

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
    
    const getStatusBadge = (status: string) => {
        let className = "px-3 py-1 rounded-full text-sm font-medium ";
        switch (status) {
            case 'En attente': className += 'bg-yellow-100 text-yellow-700'; break;
            case 'En cours': className += 'bg-blue-100 text-blue-700'; break;
            case 'Livré': className += 'bg-sky-100 text-sky-700'; break;
            case 'Annulation demandée': className += 'bg-orange-100 text-orange-700'; break;
            default: className += 'bg-gray-100 text-gray-700'; break;
        }
        return <span className={className}>{status}</span>;
    };

    return (
        <Card className="bg-background shadow-md rounded-2xl border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-grow space-y-2">
                    <p className="font-semibold">{request.nature}</p>
                    <p className="text-sm text-muted-foreground">{request.from} → {request.to}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                       <span>Créée le {request.createdAt ? format(request.createdAt.toDate(), "PPP", { locale: fr }) : ''}</span>
                        {request.distance && <span><Navigation className="inline-block mr-1 h-3 w-3"/>{request.distance} km</span>}
                        {request.duration && <span><Clock className="inline-block mr-1 h-3 w-3"/>{formatDurationFromSeconds(request.duration)}</span>}
                    </div>
                    <div className="pt-1">{getStatusBadge(request.status)}</div>
                </div>
                <div className="flex-shrink-0 self-end sm:self-center flex gap-2">
                    {request.status === 'En attente' && (
                         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" onClick={fetchApplicants} disabled={!request.applicants || request.applicants.length === 0}>
                                    <Users className="mr-2 h-4 w-4" />
                                    Voir les {request.applicants?.length || 0} postulants
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Choisir un transporteur</DialogTitle>
                                    <DialogDescription>
                                        Sélectionnez le transporteur pour votre course.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
                                    {loadingApplicants ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> :
                                     applicants.length > 0 ? applicants.map(applicant => (
                                            <div key={applicant.id} className="flex items-center justify-between p-2 rounded-md border">
                                                <div className="flex items-center gap-3">
                                                     <Avatar>
                                                        <AvatarImage src={`https://placehold.co/40x40/E0F8F8/008080/png?text=${applicant.firstName?.[0]}${applicant.lastName?.[0]}`} />
                                                        <AvatarFallback>{applicant.firstName?.[0]}{applicant.lastName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold">{applicant.firstName} {applicant.lastName}</p>
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Star className="h-4 w-4 mr-1 text-amber-400" fill="currentColor" /> {applicant.rating?.toFixed(1) || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button size="sm" onClick={() => handleAssignTransporter(applicant.id)}>
                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                    Choisir
                                                </Button>
                                            </div>
                                        )) : <p className="text-center text-muted-foreground">Aucun postulant pour le moment.</p>
                                    }
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {(request.status === 'En attente' || request.status === 'En cours') && (
                       <CancelRequestDialog request={request} onCancellationRequest={onCancellationRequest} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
