
"use client";

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import TransportRequestCard from "@/components/transport-request-card";
import { Loader2, List, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateTransportRequestForm } from "@/components/create-request-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { TransportRequest } from "@/ai/types";
import { createNotification } from "@/lib/notifications";

export default function ClientRequestsPage() {
  const { user, userData, loadingAuth } = useAuth();
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || loadingAuth) {
        setLoadingRequests(!loadingAuth);
        return;
    };

    setLoadingRequests(true);
    const requestsQuery = query(
      collection(db, "requests"),
      where("clientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as TransportRequest));
      setRequests(data);
      setLoadingRequests(false);
    }, (error) => {
        console.error("Erreur Firestore :", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: error instanceof Error ? error.message : "Erreur inconnue lors du chargement des demandes.",
        });
        setLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [user, loadingAuth, toast]);
  
  const handleCancellationRequest = async (requestId: string, reason: string, fileUrl: string | null) => {
      if (!user) {
          toast({ variant: "destructive", title: "Non authentifié" });
          return;
      }
      try {
          const requestRef = doc(db, "requests", requestId);
          const requestSnap = await getDoc(requestRef);
          if (!requestSnap.exists()) {
              throw new Error("La demande n'existe pas.");
          }
          const currentStatus = requestSnap.data().status;

          await updateDoc(requestRef, { 
              status: 'Annulation demandée',
              previousStatus: currentStatus,
              cancellationReason: reason,
              cancellationDocumentUrl: fileUrl
          });
          toast({ title: "Demande d'annulation envoyée", description: "Votre demande a été soumise à un administrateur."});
      } catch (error) {
          console.error("Erreur lors de la demande d'annulation:", error);
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de soumettre la demande."});
      }
  }


  const handleAssign = async (requestId: string, transporterId: string) => {
     if (!user) {
        toast({ variant: "destructive", title: "Non authentifié" });
        return;
    }
    try {
        const transporterDocRef = doc(db, 'users', transporterId);
        const transporterSnap = await getDoc(transporterDocRef);

        if (!transporterSnap.exists()) {
             toast({ variant: "destructive", title: "Erreur", description: "Le transporteur sélectionné n'existe pas." });
             return;
        }
        
        const transporterData = transporterSnap.data();
        const requestDocRef = doc(db, 'requests', requestId);
        const requestSnap = await getDoc(requestDocRef);

        await updateDoc(requestDocRef, {
            status: 'En cours',
            assignedTo: transporterId,
            transporterName: `${transporterData.firstName} ${transporterData.lastName}`
        });

        // Notify the transporter
        await createNotification({
            userId: transporterId,
            message: `Vous avez été assigné à la course "${requestSnap.data()?.nature}".`,
            href: `/dashboard/transporter/jobs`
        });

        toast({ title: "Transporteur assigné !", description: "Votre course est maintenant en cours."});
    } catch (error) {
        console.error("Erreur d'assignation:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'assigner le transporteur."});
    }
  }
  
  const activeRequests = requests.filter(req => req.status === 'En attente' || req.status === 'En cours' || req.status === 'Annulation demandée');

  if (userData && userData.isVerified === false) {
    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent"><AlertTriangle className="text-destructive"/>Profil en attente de vérification</CardTitle>
                <CardDescription>Votre compte doit être vérifié par un administrateur avant de pouvoir créer des demandes de transport.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Pour faire vérifier votre compte, veuillez fournir les documents requis.</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/client/documents">
                    Aller à la page des documents
                  </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-primary">Mes Demandes de Transport</h1>
        <CreateTransportRequestForm />
        <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
            <CardTitle className="text-lg text-accent">Demandes actives</CardTitle>
            <CardDescription>
            Voici la liste de toutes vos demandes de transport en attente ou en cours.
            </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            {loadingRequests || loadingAuth ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                </div>
            ) : activeRequests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <List className="mx-auto h-12 w-12" />
                <p className="mt-4 font-semibold">Aucune demande active pour le moment.</p>
                <p className="text-sm mt-1">Utilisez le formulaire ci-dessus pour créer votre première demande de transport.</p>
            </div>
            ) : (
            activeRequests.map((request) => (
                <TransportRequestCard key={request.id} request={request} onAssign={handleAssign} onCancellationRequest={handleCancellationRequest} />
            ))
            )}
        </CardContent>
        </Card>
    </div>
  );
}
