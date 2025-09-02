"use client"

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, MoreHorizontal, Loader2, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import InviteUserDialog from "@/components/invite-user-dialog";

export default function CompanyDriversPage() {
    const { user, userData, loadingAuth } = useAuth();
    const { toast } = useToast();

    // The user is the admin if their UID matches their company's ID.
    const isCompanyAdmin = user?.uid && userData?.companyId && user.uid === userData.companyId;

    // Ensure userData.companyId is defined before creating the query
    const driversQuery = userData?.companyId 
        ? query(collection(db, 'users'), where('companyId', '==', userData.companyId), where('role', '==', 'transporter')) 
        : null;

    const [driversSnapshot, loading, error] = useCollection(driversQuery);

    const companyDrivers = driversSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    
    const handleRemoveDriver = async (driverId: string) => {
        if (!isCompanyAdmin || driverId === user?.uid) {
            toast({ variant: "destructive", title: "Action non autorisée", description: "Vous ne pouvez pas supprimer un administrateur." });
            return;
        }
        try {
            // Note: This only deletes the user record. It does not delete their auth account.
            // For a full deletion, you'd need a Cloud Function to handle the auth part.
            await deleteDoc(doc(db, "users", driverId));
            toast({ title: "Chauffeur supprimé", description: "Le chauffeur a été retiré de votre entreprise." });
        } catch (error) {
            console.error("Error removing driver:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le chauffeur." });
        }
    };
    
    const getStatusBadge = (user: any) => {
        if (user.isPlaceholder) {
            return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Invitation en attente</span>
        }
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Actif</span>
    }
    
    const isLoading = loadingAuth || loading;

    if (!isCompanyAdmin && !loadingAuth) {
        return (
            <Card className="shadow-md rounded-2xl border-border">
                <CardHeader><CardTitle>Accès non autorisé</CardTitle></CardHeader>
                <CardContent><p>Seuls les administrateurs de l'entreprise peuvent gérer les chauffeurs.</p></CardContent>
            </Card>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Gestion des Chauffeurs</h1>
                {userData && (
                    <InviteUserDialog
                        companyId={userData.companyId}
                        companyName={userData.companyName}
                        role="transporter"
                        triggerButton={
                            <Button className="bg-primary hover:bg-accent text-white rounded-2xl shadow-lg px-4 py-2 flex items-center gap-2">
                                <PlusCircle className="h-5 w-5" />
                                Inviter un chauffeur
                            </Button>
                        }
                    />
                )}
            </div>

            <Card className="shadow-md rounded-2xl border-border">
                <CardHeader>
                    <CardTitle className="text-lg text-accent">Liste des chauffeurs</CardTitle>
                    <CardDescription>Retrouvez ici tous les chauffeurs rattachés à votre entreprise.</CardDescription>
                </CardHeader>
                <CardContent>
                     <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-left">
                                <th className="p-3">Nom</th>
                                <th className="p-3">Email & Téléphone</th>
                                <th className="p-3">Statut</th>
                                <th className="p-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="text-center h-24 p-3">
                                        <Loader2 className="mx-auto animate-spin"/>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="text-center text-destructive p-3">Erreur: {error.message}</td></tr>
                            ) : companyDrivers.length > 0 ? companyDrivers.map((d: any) => (
                                <tr key={d.id} className="hover:bg-muted/30 transition">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={d.photoURL || `https://placehold.co/40x40/E0F8F8/008080/png?text=${d.isPlaceholder ? '?' : `${d.firstName?.[0] || ''}${d.lastName?.[0] || ''}`}`} />
                                                <AvatarFallback>{d.isPlaceholder ? d.email[0].toUpperCase() : `${d.firstName?.[0] || ''}${d.lastName?.[0] || ''}`}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{d.isPlaceholder ? 'Invitation en attente' : `${d.firstName} ${d.lastName}`}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <p className="font-mono text-sm">{d.email}</p>
                                        <p className="text-xs text-muted-foreground">{d.phone || 'N/A'}</p>
                                    </td>
                                    <td className="p-3">{getStatusBadge(d)}</td>
                                    <td className="text-right p-3">
                                        {isCompanyAdmin && d.uid !== user?.uid && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator/>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveDriver(d.id)}>
                                                        <UserX className="mr-2 h-4 w-4"/> Retirer de l'entreprise
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center h-24 text-muted-foreground p-3">
                                        Vous n'avez invité aucun chauffeur pour le moment.
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
