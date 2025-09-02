
"use client"

import { useState, useMemo } from "react"
import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, MoreHorizontal, Loader2, ShieldAlert, UserX, UserCheck as UserCheckIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const usersQuery = useMemo(() => {
      const baseQuery = collection(db, 'users');
      if(roleFilter !== 'all') {
          return query(baseQuery, where('role', '==', roleFilter), orderBy('createdAt', 'desc'));
      }
      return query(baseQuery, orderBy('createdAt', 'desc'));
  }, [roleFilter]);
  
  const [users, loading, error] = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => {
        const term = searchTerm.toLowerCase();
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const email = user.email || '';
        const companyName = user.companyName || '';
        return firstName.toLowerCase().includes(term) || lastName.toLowerCase().includes(term) || email.toLowerCase().includes(term) || companyName.toLowerCase().includes(term);
      });
  }, [users, searchTerm]);

  const handleVerify = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { isVerified: true });
      toast({
        title: "Utilisateur vérifié",
        description: "Le statut de l'utilisateur a été mis à jour.",
      });
    } catch (e) {
      console.error("Error verifying user:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vérifier l'utilisateur."
      });
    }
  }
  
  const handleSuspend = async (userId: string, suspend: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: suspend });
      toast({
        title: `Compte ${suspend ? 'suspendu' : 'réactivé'}`,
        description: `L'utilisateur a été ${suspend ? 'suspendu' : 'réactivé'} avec succès.`,
      });
    } catch (e) {
      console.error(`Error ${suspend ? 'suspending' : 'unsuspending'} user:`, e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du compte."
      });
    }
  }

  const getStatusBadge = (user: any) => {
    if (user.isSuspended) {
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">Suspendu</span>
    }
    if (user.role !== 'admin' && !user.isVerified) {
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Non vérifié</span>
    }
    return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Actif</span>
  }

  return (
    <div className="p-6 space-y-6">
       <h1 className="text-3xl font-bold text-primary">Gestion des Utilisateurs</h1>
       <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Liste des utilisateurs</CardTitle>
          <CardDescription>Visualisez, filtrez et gérez tous les utilisateurs de la plateforme.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 mb-4">
                <Input 
                  placeholder="Rechercher par nom, email, entreprise..." 
                  className="max-w-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select onValueChange={setRoleFilter} defaultValue="all">
                    <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Filtrer par rôle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les rôles</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="client-company">Client (Entreprise)</SelectItem>
                        <SelectItem value="transporter">Transporteur</SelectItem>
                         <SelectItem value="transporter-company">Transporteur (Entreprise)</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="p-3">Utilisateur</th>
                <th className="p-3">Rôle</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Inscrit le</th>
                <th className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr className="hover:bg-muted/30 transition">
                  <td colSpan={5} className="text-center p-4">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? filteredUsers.map((user: any) => (
                <tr key={user.id} className={`hover:bg-muted/30 transition ${user.isSuspended ? 'bg-destructive/10' : ''}`}>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-3">
                         <Avatar className="hidden h-9 w-9 sm:flex">
                             <AvatarImage src={user.photoURL || `https://placehold.co/40x40/E0F8F8/008080/png?text=${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`} alt="Avatar" />
                            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1">
                            <p className="font-medium">{user.companyName || `${user.firstName} ${user.lastName}`}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  </td>
                  <td className="p-3">{getStatusBadge(user)}</td>
                  <td className="p-3">{user.createdAt ? format(user.createdAt.toDate(), 'PPP') : 'N/A'}</td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {user.role !== 'admin' && !user.isVerified && (
                           <DropdownMenuItem onClick={() => handleVerify(user.id)}>Vérifier le profil</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {user.isSuspended ? (
                          <DropdownMenuItem onClick={() => handleSuspend(user.id, false)} className="text-green-600 focus:text-green-700">
                              <UserCheckIcon className="mr-2 h-4 w-4"/>
                              Réactiver le compte
                          </DropdownMenuItem>
                        ) : (
                          user.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => handleSuspend(user.id, true)} className="text-destructive focus:text-destructive">
                                <UserX className="mr-2 h-4 w-4"/>
                                Suspendre le compte
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )) : (
                 <tr className="hover:bg-muted/30 transition">
                    <td colSpan={5} className="text-center text-muted-foreground p-4">
                       Aucun utilisateur trouvé pour les filtres sélectionnés.
                    </td>
                </tr>
              )}
               {error && (
                <tr className="hover:bg-muted/30 transition">
                  <td colSpan={5} className="text-center text-destructive p-4">
                    Erreur: Impossible de charger les utilisateurs. ({error.message})
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
