
"use client"

import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Ban, AlertCircle, CheckCircle, XCircle, FileText, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { TransportRequest } from "@/ai/types"
import { createNotification } from "@/lib/notifications"

export default function AdminCancellationsPage() {
  const { toast } = useToast();
  
  const cancellationRequestsQuery = query(
    collection(db, 'requests'), 
    where('status', '==', 'Annulation demandée'),
    orderBy('createdAt', 'desc')
  );
  
  const [requests, loading, error] = useCollection(cancellationRequestsQuery);

  const handleApproval = async (request: TransportRequest, approve: boolean) => {
    const requestRef = doc(db, 'requests', request.id);
    const newStatus = approve ? 'Annulé' : request.previousStatus;

    if (!newStatus) {
        toast({ variant: "destructive", title: "Erreur", description: "Le statut précédent est manquant." });
        return;
    }

    try {
      await updateDoc(requestRef, { status: newStatus });

      await createNotification({
          userId: request.clientId,
          message: `Votre demande d'annulation pour la course #${request.id.substring(0,6)} a été ${approve ? 'approuvée' : 'rejetée'}.`,
          href: '/dashboard/client/history'
      });

      toast({
        title: `Demande ${approve ? 'approuvée' : 'rejetée'}`,
        description: "Le statut de la course a été mis à jour.",
      });
    } catch (e) {
      console.error("Error updating request status:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la course."
      });
    }
  }

  const CancellationRequestCard = ({ request }: { request: TransportRequest }) => {
    return (
        <Card key={request.id} className="bg-background shadow-md rounded-2xl border-border">
            <CardHeader>
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Avatar>
                           <AvatarFallback className="bg-destructive/20 text-destructive"><Ban/></AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-lg">Demande d'annulation: #{request.id.substring(0, 6)}</CardTitle>
                            <CardDescription>
                                De: {request.from} à {request.to}
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><User className="h-4 w-4"/> Infos Client</h4>
                    <p className="text-sm"><span className="text-muted-foreground">Nom:</span> {request.clientName}</p>
                    <p className="text-sm"><span className="text-muted-foreground">ID Client:</span> <span className="font-mono text-xs">{request.clientId}</span></p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/50">
                    <h4 className="font-semibold text-sm mb-2">Justification du client :</h4>
                    <p className="text-sm italic">"{request.cancellationReason || 'Aucune justification fournie.'}"</p>
                    {request.cancellationDocumentUrl && (
                        <Button asChild variant="link" size="sm" className="p-0 h-auto mt-2">
                            <a href={request.cancellationDocumentUrl} target="_blank" rel="noopener noreferrer">
                                <FileText className="mr-2 h-4 w-4"/> Voir le justificatif
                            </a>
                        </Button>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleApproval(request, false)}>
                        <XCircle className="mr-2 h-4 w-4" /> Rejeter
                    </Button>
                    <Button onClick={() => handleApproval(request, true)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-2 h-4 w-4"/> Approuver l'annulation
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Demandes d'Annulation</h1>
       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Demandes en attente</CardTitle>
          <CardDescription>Examinez et approuvez ou rejetez les demandes d'annulation soumises par les clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {loading && (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           )}
           {error && <p className="text-destructive text-center">Erreur: {error.message}</p>}
           
           {!loading && requests?.docs.length === 0 && (
            <div className="text-center py-10 text-muted-foreground bg-muted/50 rounded-lg">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-4 font-semibold">Aucune demande d'annulation</p>
                <p className="text-sm mt-1">Il n'y a aucune demande en attente d'approbation.</p>
            </div>
           )}

           <div className="grid gap-6 lg:grid-cols-2">
                {requests?.docs.map(doc => {
                    const request = { id: doc.id, ...doc.data() } as TransportRequest;
                    return <CancellationRequestCard key={doc.id} request={request} />
                })}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
