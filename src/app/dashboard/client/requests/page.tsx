
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
import { Loader2, List, AlertTriangle, Plus } from "lucide-react";
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
        <div className="min-h-screen bg-slate-50">
          <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Profil en attente de vérification</h1>
                <p className="mt-2 text-slate-600 text-sm">Votre compte doit être vérifié par un administrateur avant de pouvoir créer des demandes de transport.</p>
              </div>
            </div>
          </div>
          <div className="px-6 lg:px-8 py-8">
            <Card className="border-0 shadow-md rounded-xl">
              <CardContent className="p-6">
                <p className="text-slate-600 mb-6">Pour faire vérifier votre compte, veuillez fournir les documents requis.</p>
                <Button asChild className="bg-teal-600 hover:bg-teal-700">
                  <Link href="/dashboard/client/documents">
                    <Plus className="h-4 w-4 mr-2" /> Aller à la page des documents
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <List className="h-6 w-6 text-teal-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Mes Demandes de Transport</h1>
            <p className="mt-2 text-slate-600 text-sm">Créez et gérez vos demandes de transport</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* New Request Form Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Créer une nouvelle demande</h2>
            <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
              <CardContent className="p-6">
                <CreateTransportRequestForm />
              </CardContent>
            </Card>
          </div>

          {/* Active Requests Section */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Demandes actives</h2>
            {loadingRequests || loadingAuth ? (
              <Card className="border-0 shadow-md rounded-xl bg-white">
                <CardContent className="p-12 flex justify-center items-center">
                  <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-teal-600 mx-auto" />
                    <p className="mt-4 text-slate-600">Chargement de vos demandes...</p>
                  </div>
                </CardContent>
              </Card>
            ) : activeRequests.length === 0 ? (
              <Card className="border-0 shadow-md rounded-xl bg-white">
                <CardContent className="p-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-slate-100 rounded-full mb-4">
                      <List className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="font-semibold text-slate-900">Aucune demande active pour le moment.</p>
                    <p className="text-sm text-slate-600 mt-2">Utilisez le formulaire ci-dessus pour créer votre première demande de transport.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeRequests.map((request) => (
                  <TransportRequestCard key={request.id} request={request} onAssign={handleAssign} onCancellationRequest={handleCancellationRequest} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
