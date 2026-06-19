
"use client"

import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users2, ListChecks, Link as LinkIcon, Building } from "lucide-react";
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const isLoading = loadingUsers || loadingRequests;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 lg:px-8 py-8 border-b border-slate-200 bg-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <Building className="h-6 w-6 text-teal-700" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">Tableau de bord - {userData?.companyName || 'Entreprise'}</h1>
            <p className="mt-2 text-slate-600 text-sm">Gérez toutes les opérations de transport de votre entreprise</p>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Key Metrics */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">Statistiques</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Utilisateurs</p>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mt-2 text-teal-600" />
                      ) : (
                        <p className="mt-2 text-3xl font-bold text-slate-900">{usersSnapshot?.size || 0}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">Utilisateurs actifs dans votre entreprise</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users2 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Total des Demandes</p>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mt-2 text-teal-600" />
                      ) : (
                        <p className="mt-2 text-3xl font-bold text-slate-900">{requestsSnapshot?.size || 0}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">Total des demandes de transport créées</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <ListChecks className="h-6 w-6 text-green-600" />
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
              <Card className="border-0 shadow-md rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="border-b border-teal-200">
                  <CardTitle className="text-teal-900 flex items-center gap-2">
                    <ListChecks className="h-5 w-5" />
                    Créer une demande
                  </CardTitle>
                  <CardDescription className="text-teal-700">Lancez une nouvelle demande de transport pour vos marchandises.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button asChild className="bg-teal-600 hover:bg-teal-700 w-full">
                    <Link href="/dashboard/client/requests">
                      <LinkIcon className="mr-2 h-4 w-4"/> Accéder aux demandes
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="border-b border-blue-200">
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Users2 className="h-5 w-5" />
                    Gestion des utilisateurs
                  </CardTitle>
                  <CardDescription className="text-blue-700">Ajoutez ou modifiez les utilisateurs autorisés de votre entreprise.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
                    <Link href="/dashboard/client-company/users">
                      <Users2 className="mr-2 h-4 w-4"/> Gérer les utilisateurs
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
