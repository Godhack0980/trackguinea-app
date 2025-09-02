
"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users2, Car, LineChart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCollection, useCollectionData } from "react-firebase-hooks/firestore";
import { collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TransporterCompanyDashboardPage() {
  const { user, userData, loadingAuth } = useAuth();

  const driversQuery = userData?.companyId ? query(collection(db, 'users'), where('companyId', '==', userData.companyId), where('role', '==', 'transporter')) : null;
  const [driversSnapshot, loadingDrivers] = useCollection(driversQuery);
  const driverIds = driversSnapshot?.docs.map(d => d.id);

  const vehiclesQuery = userData?.companyId ? query(collection(db, 'users', userData.companyId, 'vehicles')) : null;
  const [vehiclesSnapshot, loadingVehicles] = useCollection(vehiclesQuery);

  const requestsQuery = (driverIds && driverIds.length > 0)
    ? query(collection(db, 'requests'), where('assignedTo', 'in', driverIds))
    : null;

  const [requestsSnapshot, loadingRequests] = useCollection(requestsQuery);
  
  if (loadingAuth || !userData) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isLoading = loadingDrivers || loadingVehicles || (loadingRequests && !!requestsQuery);

  const stats = [
    { title: "Chauffeurs", value: isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : driversSnapshot?.size || 0, icon: <Users2/>, description: "Chauffeurs actifs dans votre flotte" },
    { title: "Véhicules dans la Flotte", value: isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : vehiclesSnapshot?.size || 0, icon: <Car/>, description: "Total des véhicules enregistrés" },
    { title: "Courses Terminées (Total)", value: isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : requestsSnapshot?.docs.filter(d => d.data().status === 'Terminé').length || 0, icon: <LineChart/>, description: "Historique de toutes les courses" },
  ]

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Tableau de bord - {userData.companyName}</h1>
       <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="text-lg text-accent">Vue d'ensemble</CardTitle>
                <CardDescription>Gérez votre flotte et vos opérations de transport.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {stats.map(stat => (
                 <Card key={stat.title} className="shadow-md rounded-2xl border-border">
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                     <span className="text-muted-foreground">{stat.icon}</span>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{stat.value}</div>
                     <p className="text-xs text-muted-foreground">{stat.description}</p>
                   </CardContent>
                 </Card>
              ))}
            </CardContent>
        </Card>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Gestion des Chauffeurs</CardTitle>
              <CardDescription>Consultez la liste de vos chauffeurs, ajoutez-en de nouveaux et gérez leurs informations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/transporter-company/drivers">
                  Accéder à la gestion des chauffeurs
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Gestion de la Flotte</CardTitle>
              <CardDescription>Consultez la liste de vos véhicules, ajoutez-en de nouveaux et suivez leur statut.</CardDescription>
            </CardHeader>
            <CardContent>
               <Button asChild>
                <Link href="/dashboard/transporter-company/fleet">
                  Accéder à la gestion de la flotte
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
