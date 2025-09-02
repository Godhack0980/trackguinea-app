
"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users2, ListChecks, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";


// This is the dashboard for professional clients.
export default function ClientCompanyDashboardPage() {
  const { user, userData, loadingAuth } = useAuth();
  
  const usersQuery = userData?.companyId ? query(collection(db, 'users'), where('companyId', '==', userData.companyId)) : null;
  const [usersSnapshot, loadingUsers] = useCollection(usersQuery);

  // Note: Firestore doesn't allow '!=' or 'not-in' queries on a single field easily.
  // This query fetches all requests for the company. A more complex aggregation would be needed for monthly stats.
  const requestsQuery = userData?.companyId ? query(collection(db, 'requests'), where('clientId', '==', user?.uid)) : null;
  const [requestsSnapshot, loadingRequests] = useCollection(requestsQuery);


  if (loadingAuth || !user || !userData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isLoading = loadingUsers || loadingRequests;

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Tableau de bord - {userData?.companyName || 'Entreprise'}</h1>
       <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="text-lg text-accent">Statistiques</CardTitle>
                <CardDescription>Gérez toutes les opérations de transport de votre entreprise.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
                 <Card className="shadow-md rounded-2xl border-border">
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                     <span className="text-muted-foreground"><Users2/></span>
                   </CardHeader>
                   <CardContent>
                     {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{usersSnapshot?.size || 0}</div>}
                     <p className="text-xs text-muted-foreground">Utilisateurs actifs dans votre entreprise</p>
                   </CardContent>
                 </Card>
                 <Card className="shadow-md rounded-2xl border-border">
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">Total des Demandes</CardTitle>
                     <span className="text-muted-foreground"><ListChecks/></span>
                   </CardHeader>
                   <CardContent>
                      {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : <div className="text-2xl font-bold">{requestsSnapshot?.size || 0}</div>}
                      <p className="text-xs text-muted-foreground">Total des demandes de transport créées</p>
                   </CardContent>
                 </Card>
            </CardContent>
        </Card>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Créer une demande</CardTitle>
              <CardDescription>Lancez une nouvelle demande de transport pour vos marchandises.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/client/requests">
                  <LinkIcon className="mr-2 h-4 w-4"/> Accéder aux demandes
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Gestion des utilisateurs</CardTitle>
              <CardDescription>Ajoutez, modifiez ou supprimez les utilisateurs autorisés à gérer les transports pour votre entreprise.</CardDescription>
            </CardHeader>
            <CardContent>
               <Button asChild>
                <Link href="/dashboard/client-company/users">
                  <Users2 className="mr-2 h-4 w-4"/> Gérer les utilisateurs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
