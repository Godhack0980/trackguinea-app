
"use client"

import { useMemo, useState } from "react"
import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Star, Truck, ShieldCheck, AlertTriangle } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface Transporter {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isVerified?: boolean;
  rating?: number;
  jobsCompleted?: number;
  city?: string;
}

export default function AvailableTransportersPage() {
  const { user, loadingAuth } = useAuth();
  const [nameFilter, setNameFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');

  const transportersQuery = query(
      collection(db, 'users'), 
      where('role', '==', 'transporter'),
      where('isVerified', '==', true),
      orderBy('lastName', 'asc')
  );

  const [snapshot, loadingTransporters, error] = useCollection(transportersQuery);

  const transporters = useMemo(() => 
    snapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transporter[] | undefined,
  [snapshot]);

  const filteredTransporters = useMemo(() => {
    if (!transporters) return [];
    return transporters.filter(t => {
      const nameMatch = t.firstName?.toLowerCase().includes(nameFilter.toLowerCase()) || 
                        t.lastName?.toLowerCase().includes(nameFilter.toLowerCase());
      const locationMatch = locationFilter === 'all' || t.city === locationFilter;
      return nameMatch && locationMatch;
    });
  }, [transporters, nameFilter, locationFilter]);

  const uniqueLocations = useMemo(() => {
    if (!transporters) return [];
    const locations = transporters.map(t => t.city).filter(Boolean) as string[];
    return [...new Set(locations)];
  }, [transporters]);

  const getInitials = (t: Transporter) => {
    return `${t.firstName?.[0] ?? ''}${t.lastName?.[0] ?? ''}`.toUpperCase() || 'T';
  }

  const isLoading = loadingAuth || loadingTransporters;

  if (error) {
    console.error("Firebase Error:", error);
    return (
       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/> Erreur de chargement</CardTitle>
          <CardDescription>
            Nous n'avons pas pu charger la liste des transporteurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm font-medium">Message d'erreur :</p>
            <pre className="mt-2 p-3 bg-muted rounded-md text-xs font-mono">{error.message}</pre>
            <p className="mt-4 text-sm text-muted-foreground">Veuillez vérifier que vous êtes bien connecté à internet et réessayez. Si le problème persiste, contactez le support.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Transporteurs Disponibles</h1>
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Trouvez un transporteur</CardTitle>
          <CardDescription>Trouvez un transporteur vérifié pour votre prochaine livraison.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom..."
                className="pl-10"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <Select onValueChange={setLocationFilter} value={locationFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrer par ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {uniqueLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTransporters && filteredTransporters.length > 0 ? filteredTransporters.map((transporter) => {
                const typedTransporter = transporter as Transporter;
                return (
                  <Link key={typedTransporter.id} href={`/dashboard/client/transporter/${typedTransporter.id}`} className="flex">
                    <Card className="flex flex-col w-full hover:border-primary transition-colors shadow-md rounded-2xl border-border">
                      <CardHeader>
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={`https://placehold.co/64x64/E0F8F8/008080/png?text=${getInitials(typedTransporter)}`} />
                            <AvatarFallback>{getInitials(typedTransporter)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-xl flex items-center gap-1.5">
                                {typedTransporter.firstName} {typedTransporter.lastName}
                                {typedTransporter.isVerified && <span title="Vérifié"><ShieldCheck className="h-5 w-5 text-green-500" /></span>}
                            </CardTitle>
                            <CardDescription>Transporteur Poids Lourd</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
                          <span>{typedTransporter.rating?.toFixed(1) || 'N/A'}</span>
                          <span className="text-muted-foreground">({typedTransporter.jobsCompleted || 0} courses)</span>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Badge variant="secondary">Voir le profil</Badge>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              }) : (
                <p className="col-span-full text-center text-muted-foreground py-10">
                  Aucun transporteur ne correspond à vos critères de recherche.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
