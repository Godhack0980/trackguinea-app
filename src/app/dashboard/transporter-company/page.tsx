
"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users2, Car, LineChart, Truck, Building } from "lucide-react";
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const isLoading = loadingDrivers || loadingVehicles || (loadingRequests && !!requestsQuery);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <Building className="h-6 w-6 text-teal-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Tableau de bord - {userData.companyName}</h1>
            <p className="mt-2 text-slate-600 text-sm">Gérez votre flotte et vos opérations de transport</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Key Metrics */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Vue d'ensemble</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Drivers Card */}
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Chauffeurs</p>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mt-2 text-teal-600" />
                      ) : (
                        <p className="mt-2 text-3xl font-bold text-slate-900">{driversSnapshot?.size || 0}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">Chauffeurs actifs dans votre flotte</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users2 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicles Card */}
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Véhicules dans la Flotte</p>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mt-2 text-teal-600" />
                      ) : (
                        <p className="mt-2 text-3xl font-bold text-slate-900">{vehiclesSnapshot?.size || 0}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">Total des véhicules enregistrés</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Car className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Jobs Card */}
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Courses Terminées</p>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mt-2 text-teal-600" />
                      ) : (
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                          {requestsSnapshot?.docs.filter(d => d.data().status === 'Terminé').length || 0}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">Historique de toutes les courses</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <LineChart className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Actions Rapides</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="border-b border-blue-200">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Users2 className="h-5 w-5" />
                    Gestion des Chauffeurs
                  </CardTitle>
                  <CardDescription className="text-blue-700">Consultez la liste de vos chauffeurs et gérez leurs informations.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
                    <Link href="/dashboard/transporter-company/drivers">
                      <Users2 className="mr-2 h-4 w-4" /> Gérer les chauffeurs
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="border-b border-green-200">
                  <CardTitle className="text-green-900 flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Gestion de la Flotte
                  </CardTitle>
                  <CardDescription className="text-green-700">Consultez la liste de vos véhicules et leur statut.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button asChild className="bg-green-600 hover:bg-green-700 w-full">
                    <Link href="/dashboard/transporter-company/fleet">
                      <Car className="mr-2 h-4 w-4" /> Gérer la flotte
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
