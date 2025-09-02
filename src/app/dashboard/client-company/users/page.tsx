
"use client"

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, addDoc, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, MoreHorizontal, Loader2, Info, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const inviteUserSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
});

const AddUserDialog = ({ companyId, companyName }: { companyId: string, companyName: string }) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof inviteUserSchema>>({
        resolver: zodResolver(inviteUserSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (values: z.infer<typeof inviteUserSchema>) => {
        if (!companyId || !companyName) {
             toast({ variant: "destructive", title: "Erreur", description: "Informations sur l'entreprise manquantes." });
             return;
        }
        try {
            await addDoc(collection(db, "users"), {
                email: values.email,
                role: 'client', // Invited user will have the 'client' role within the company
                companyId: companyId,
                companyName: companyName,
                companyRole: 'member',
                isPlaceholder: true, // This user is invited and hasn't signed up yet
                createdAt: Timestamp.now(),
            });

            toast({ title: "Utilisateur invité", description: `Une invitation a été préparée pour ${values.email}. Il devra s'inscrire avec cet email.` });
            form.reset();
            setOpen(false);
        } catch (error) {
            console.error("Error inviting user:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'inviter l'utilisateur." });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-accent text-white rounded-2xl shadow-lg px-4 py-2 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Inviter un utilisateur
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Inviter un nouveau membre</DialogTitle>
                    <DialogDescription>
                        Entrez l'adresse e-mail du membre que vous souhaitez inviter. Il devra ensuite s'inscrire lui-même avec cet e-mail pour rejoindre votre espace.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="membre@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : "Envoyer l'invitation"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function CompanyUsersPage() {
    const { user, userData, loadingAuth } = useAuth();
    const { toast } = useToast();

    // The user is the admin if their UID matches their company's ID.
    const isCompanyAdmin = user?.uid && userData?.companyId && user.uid === userData.companyId;

    const usersQuery = userData?.companyId ? query(collection(db, 'users'), where('companyId', '==', userData.companyId)) : null;
    const [usersSnapshot, loading, error] = useCollection(usersQuery);

    const companyUsers = usersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    
    const handleRemoveUser = async (userId: string) => {
        if (!isCompanyAdmin || userId === user?.uid) {
            toast({ variant: "destructive", title: "Action non autorisée", description: "Vous ne pouvez pas vous supprimer vous-même." });
            return;
        }
        try {
            await deleteDoc(doc(db, "users", userId));
            toast({ title: "Utilisateur supprimé", description: "L'utilisateur a été retiré de votre entreprise." });
        } catch (error) {
            console.error("Error removing user:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer l'utilisateur." });
        }
    };
    
    const getStatusBadge = (user: any) => {
        if (user.isPlaceholder) {
            return <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">En attente</span>
        }
        return <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">Actif</span>
    }

    if (loadingAuth || !user || !userData) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary">Gestion des Utilisateurs</h1>
                <AddUserDialog companyId={userData.companyId} companyName={userData.companyName} />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Comment ça marche ?</AlertTitle>
              <AlertDescription>
                Pour ajouter un membre, cliquez sur "Inviter un utilisateur". La personne devra ensuite se rendre sur la page d'inscription pour clients et créer son compte en utilisant la même adresse e-mail que vous avez fournie. Le système la rattachera automatiquement à votre entreprise.
              </AlertDescription>
            </Alert>

            <Card className="shadow-md rounded-2xl border-border">
                <CardHeader>
                    <CardTitle className="text-lg text-accent">Membres de l'équipe</CardTitle>
                    <CardDescription>Retrouvez ici tous les utilisateurs rattachés à {userData.companyName}.</CardDescription>
                </CardHeader>
                <CardContent>
                     <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-left">
                                <th className="p-3">Nom</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Rôle</th>
                                <th className="p-3">Statut</th>
                                <th className="p-3 text-right"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center h-24 p-3">
                                        <Loader2 className="mx-auto animate-spin"/>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="text-center text-destructive p-3">Erreur: {error.message}</td></tr>
                            ) : companyUsers.length > 0 ? companyUsers.map((u: any) => (
                                <tr key={u.id} className="hover:bg-muted/30 transition">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={u.photoURL || `https://placehold.co/40x40/E0F8F8/008080/png?text=${u.isPlaceholder ? '?' : `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`}`} />
                                                <AvatarFallback>{u.isPlaceholder ? u.email[0].toUpperCase() : `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{u.isPlaceholder ? 'Invitation en attente' : `${u.firstName} ${u.lastName}`}</span>
                                        </div>
                                    </td>
                                    <td className="p-3">{u.email}</td>
                                    <td className="p-3">
                                        <Badge variant={u.uid === userData.companyId ? 'default' : 'secondary'} className="capitalize">
                                            {u.uid === userData.companyId ? 'Admin' : 'Membre'}
                                        </Badge>
                                    </td>
                                    <td className="p-3">{getStatusBadge(u)}</td>
                                    <td className="text-right p-3">
                                        {isCompanyAdmin && u.uid !== user.uid && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator/>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleRemoveUser(u.id)}>
                                                        <UserX className="mr-2 h-4 w-4"/> Supprimer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center h-24 text-muted-foreground p-3">
                                        Vous n'avez invité aucun membre pour le moment.
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
