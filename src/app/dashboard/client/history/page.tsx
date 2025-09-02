
"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { collection, query, where, Timestamp, orderBy, doc, runTransaction, updateDoc, getDoc, increment } from "firebase/firestore"
import { useCollection } from "react-firebase-hooks/firestore"
import { auth, db } from "@/lib/firebase"
import { format } from "date-fns"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Star, Truck, MapPin, ArrowRight, Package, Rocket, History, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { TransportRequest } from "@/ai/types"


const getStatusVariant = (status: TransportRequest['status']) => {
  switch (status) {
    case 'Terminé':
      return 'outline';
    case 'Annulé':
      return 'destructive';
    default:
      return 'default';
  }
};

const getRequestIcon = (nature: string) => {
    if (nature.toLowerCase().includes('meuble') || nature.toLowerCase().includes('déménagement')) return <Truck/>;
    if (nature.toLowerCase().includes('urgent') || nature.toLowerCase().includes('document')) return <Rocket/>;
    return <Package/>
}

const RatingStars = ({ rating, interactive = false, setRating }: { rating: number, interactive?: boolean, setRating?: (rating: number) => void }) => {
  return (
    <div className={`flex items-center gap-1 ${interactive ? 'cursor-pointer' : ''}`}>
        {[...Array(5)].map((_, i) => (
             <Star
                key={i}
                className={`h-5 w-5 ${i < rating ? 'text-amber-400' : 'text-gray-300'}`}
                fill={i < rating ? 'currentColor' : 'none'}
                onClick={() => interactive && setRating?.(i + 1)}
            />
        ))}
    </div>
  )
}

const RateDialog = ({ request, isOpen, onOpenChange, onSubmit }: { request: TransportRequest | null, isOpen: boolean, onOpenChange: (open: boolean) => void, onSubmit: (rating: number, comment: string) => void }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset state when a new request is selected or dialog is closed
  useState(() => {
    if (isOpen) {
      setRating(0);
      setComment("");
    }
  });
  
  if (!request) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ variant: 'destructive', title: "Veuillez sélectionner une note." });
      return;
    }
    setIsSubmitting(true);
    await onSubmit(rating, comment);
    setIsSubmitting(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
        <DialogHeader>
            <DialogTitle>Évaluer la course "{request.nature}"</DialogTitle>
            <DialogDescription>
            Donnez une note au transporteur ({request.transporterName}) pour cette course.
            </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div>
            <label className="text-sm font-medium">Votre note</label>
            <div className="mt-2">
                <RatingStars rating={rating} interactive setRating={setRating} />
            </div>
            </div>
            <div>
            <label htmlFor="comment" className="text-sm font-medium">Votre commentaire (optionnel)</label>
            <Textarea 
                id="comment"
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Laissez un commentaire sur votre expérience..."
                className="mt-2"
            />
            </div>
        </div>
        <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Envoyer l'évaluation"}
            </Button>
        </div>
        </DialogContent>
    </Dialog>
  )
}


export default function ClientHistoryPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [selectedRequestForRating, setSelectedRequestForRating] = useState<TransportRequest | null>(null);
  const { toast } = useToast();
  
  const historyQuery = user ? query(
    collection(db, 'requests'), 
    where("clientId", "==", user.uid),
    where("status", "in", ["Terminé", "Annulé"]),
    orderBy("status"),
    orderBy("createdAt", "desc")
  ) : null;
  const [snapshot, loadingRequests, error] = useCollection(historyQuery);
  
  const requests = snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

  const handleOpenRateDialog = (request: TransportRequest) => {
    setSelectedRequestForRating(request);
    setIsRateDialogOpen(true);
  }
  
  const handleRatingSubmit = async (rating: number, comment: string) => {
    const request = selectedRequestForRating;
    
    if (!request || !request.id || !request.assignedTo) {
      console.error("handleSubmit error: request.id or request.assignedTo is missing.", request);
      toast({ variant: 'destructive', title: "Erreur", description: "L'ID de la course ou du transporteur est manquant. Impossible d'évaluer." });
      return;
    }

    const requestRef = doc(db, 'requests', request.id);
    const transporterRef = doc(db, 'users', request.assignedTo);
    
    try {
      await runTransaction(db, async (transaction) => {
        const transporterDoc = await transaction.get(transporterRef);
        if (!transporterDoc.exists()) {
          throw "Le document du transporteur n'existe pas !";
        }
        
        const currentRating = transporterDoc.data().rating || 0;
        const ratingCount = transporterDoc.data().ratingCount || 0;
        const newRatingCount = ratingCount + 1;
        const newAverageRating = ((currentRating * ratingCount) + rating) / newRatingCount;

        transaction.update(transporterRef, { 
          rating: newAverageRating,
          ratingCount: newRatingCount,
          jobsCompleted: increment(1)
        });

        transaction.update(requestRef, { 
          rating: rating,
          comment: comment,
        });
      });

      toast({ title: "Évaluation envoyée !", description: "Merci pour votre retour." });
      setIsRateDialogOpen(false);
    } catch (error) {
      console.error("Erreur lors de l'évaluation:", error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de soumettre l'évaluation." });
    }
  }


  if (error) {
    console.error("Error fetching history:", error);
  }

  const isLoading = loadingAuth || loadingRequests;

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Historique & Évaluations</h1>

      {isLoading ? (
         <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      ) : requests.length > 0 ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.map(request => {
                const typedRequest = request as TransportRequest;
                return (
                    <Card key={typedRequest.id} className="opacity-90 flex flex-col hover:bg-muted/50 transition-colors shadow-md rounded-2xl border-border">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                 <CardTitle className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        {getRequestIcon(typedRequest.nature as string)}
                                    </span> 
                                    {typedRequest.nature}
                                 </CardTitle>
                                 <Badge variant={getStatusVariant(typedRequest.status as TransportRequest['status'])}>{typedRequest.status}</Badge>
                            </div>
                            <CardDescription className="flex items-center gap-1 pt-2"> 
                                <MapPin size={14} /> De: {typedRequest.from} <ArrowRight size={14} className="mx-1" /> A: {typedRequest.to} 
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1 flex-grow">
                             <p className="text-sm text-muted-foreground">Terminée le: {format((typedRequest.date as Timestamp).toDate(), "PPP")}</p>
                             <p className="text-sm text-muted-foreground">Transporteur: {typedRequest.transporterName || 'N/A'}</p>
                        </CardContent>
                        <CardFooter>
                            {typedRequest.status === 'Terminé' && (
                                <div className="flex items-center gap-1 text-sm w-full">
                                {typedRequest.rating ? (
                                    <>
                                        <span className="text-muted-foreground">Votre note:</span>
                                        <RatingStars rating={typedRequest.rating} />
                                    </>
                                ) : (
                                  <Button variant="secondary" size="sm" className="w-full" onClick={() => handleOpenRateDialog(typedRequest)}>
                                      <Edit className="mr-2 h-4 w-4"/>
                                      Évaluer cette course
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
        <Card className="shadow-md rounded-2xl border-border">
            <CardContent className="p-10 text-center text-muted-foreground">
                <History className="mx-auto h-12 w-12" />
                <p className="mt-4 font-semibold">Aucun historique</p>
                <p className="text-sm">Vos demandes terminées ou annulées apparaîtront ici.</p>
            </CardContent>
        </Card>
      )}

      <RateDialog 
        isOpen={isRateDialogOpen} 
        onOpenChange={setIsRateDialogOpen} 
        request={selectedRequestForRating} 
        onSubmit={handleRatingSubmit}
      />
    </div>
  )
}
