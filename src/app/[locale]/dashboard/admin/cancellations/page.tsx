"use client";

import React, { useMemo } from "react"
import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Ban, AlertCircle, CheckCircle, XCircle, FileText, User, ArrowRight, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { TransportRequest } from "@/ai/types"
import { createNotification } from "@/lib/notifications"
import { cn } from "@/lib/utils"

export default function AdminCancellationsPage() {
  const { toast } = useToast();
  
  const cancellationRequestsQuery = useMemo(() => {
    return query(
      collection(db, 'requests'), 
      where('status', '==', 'Annulation demandée'),
      orderBy('createdAt', 'desc')
    );
  }, []);
  
  const [requests, loading, error] = useCollection(cancellationRequestsQuery);

  const handleApproval = async (request: TransportRequest, approve: boolean) => {
    const requestRef = doc(db, 'requests', request.id);
    const newStatus = approve ? 'Annulé' : (request.previousStatus || 'En cours');

    try {
      await updateDoc(requestRef, { 
        status: newStatus,
        cancellationStatus: approve ? 'approved' : 'rejected' 
      });

      // If approved, update shipment status as well if it exists
      if (approve) {
        try {
          await updateDoc(doc(db, 'shipments', request.id), {
            status: 'incident',
            lastUpdated: Date.now()
          });
        } catch (e) {
          // ignore if shipment does not exist
        }
      }

      await createNotification({
          userId: request.clientId,
          message: `Votre demande d'annulation pour la course #${request.id.substring(0,6)} a été ${approve ? 'approuvée' : 'rejetée'}.`,
          href: '/dashboard/client/history'
      });

      toast({
        title: `Demande ${approve ? 'approuvée' : 'rejetée'}`,
        description: "Le statut de la course a été mis à jour avec succès.",
      });
    } catch (e) {
      console.error("Error updating request status:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut de cette course."
      });
    }
  }

  const CancellationRequestCard = ({ request }: { request: TransportRequest }) => {
    return (
        <Card key={request.id} className="shadow-lg rounded-3xl border border-border/50 bg-card/65 backdrop-blur-md overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-border/20 bg-slate-950/20">
                  <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-border/50">
                             <AvatarFallback className="bg-destructive/10 text-destructive"><Ban size={18} /></AvatarFallback>
                          </Avatar>
                          <div>
                              <CardTitle className="text-base font-bold text-foreground">Annulation : #{request.id.substring(0, 6)}</CardTitle>
                              <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5 font-medium">
                                  De: <strong className="text-foreground">{request.from}</strong> <ArrowRight size={10} className="text-muted-foreground" /> À: <strong className="text-foreground">{request.to}</strong>
                              </CardDescription>
                          </div>
                      </div>
                  </div>
              </CardHeader>
              
              <CardContent className="space-y-4 pt-5">
                  <div className="p-3.5 rounded-2xl border border-border/25 bg-slate-900/40 space-y-1">
                      <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><User className="h-3.5 w-3.5 text-primary"/> Demandeur</h4>
                      <p className="text-xs font-semibold text-foreground">Client: <span className="font-bold text-foreground">{request.clientName}</span></p>
                      <p className="text-[10px] text-muted-foreground font-mono">UID Client: {request.clientId}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-border/25 bg-slate-900/40 space-y-2">
                      <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Justification d'annulation</h4>
                      <p className="text-xs italic text-muted-foreground leading-relaxed">"{request.cancellationReason || 'Aucune justification textuelle fournie.'}"</p>
                      {request.cancellationDocumentUrl && (
                          <Button asChild variant="outline" size="sm" className="h-7 rounded-lg border-border/50 text-[10px] font-bold hover:bg-slate-800 mt-2">
                              <a href={request.cancellationDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5 text-primary"/> Consulter le justificatif
                              </a>
                          </Button>
                      )}
                  </div>
              </CardContent>
            </div>

            <CardContent className="pt-2 pb-5 border-t border-border/20 bg-slate-950/20 flex gap-3">
                <Button variant="outline" onClick={() => handleApproval(request, false)} className="flex-1 rounded-xl border-border/50 font-bold hover:bg-slate-800 text-xs">
                    <XCircle className="mr-1.5 h-4 w-4 text-red-500" /> Rejeter
                </Button>
                <Button onClick={() => handleApproval(request, true)} className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-md shadow-green-600/10 text-xs">
                    <CheckCircle className="mr-1.5 h-4 w-4"/> Approuver
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Ban className="text-primary" /> Demandes d'Annulation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez les litiges de transport et arbitrez les requêtes de résiliation de course.</p>
        </div>
      </div>

      <Card className="shadow-xl rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Requêtes en attente de décision</CardTitle>
          <CardDescription>Arbitrez les litiges et décidez du remboursement ou de la réouverture des courses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
           {loading && (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
             </div>
           )}
           {error && <p className="text-destructive text-center font-semibold">Erreur: {error.message}</p>}
           
           {!loading && requests?.docs.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-slate-900/30 rounded-3xl border border-border/40 gap-3 flex flex-col items-center">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <div>
                  <p className="font-bold text-foreground text-lg">Aucun litige d'annulation</p>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1 font-medium">Aucune demande d'annulation n'est actuellement en attente d'instruction.</p>
                </div>
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
