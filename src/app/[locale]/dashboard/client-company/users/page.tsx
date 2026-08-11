"use client"

import { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, addDoc, Timestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlusCircle, MoreHorizontal, Loader2, Info, UserX, Users2, ArrowRight, Building, ShieldCheck, UserCheck } from "lucide-react";
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
                role: 'client',
                companyId: companyId,
                companyName: companyName,
                companyRole: 'member',
                isPlaceholder: true,
                createdAt: Timestamp.now(),
            });

            toast({ title: "Utilisateur invité", description: `Invitation enregistrée pour ${values.email}.` });
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
                <Button className="rounded-full bg-primary hover:bg-primary/95 text-white font-semibold shadow-md shadow-primary/10 transition-all duration-300 hover:scale-[1.02] px-5 h-11 flex items-center gap-2">
                  <PlusCircle size={18} />
                  Inviter un collaborateur
                </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Inviter un nouveau membre</DialogTitle>
                    <DialogDescription>
                        Entrez l'adresse e-mail de votre collaborateur. Il rejoindra automatiquement votre espace d'entreprise en s'inscrivant avec cette adresse.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-3">
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold">Adresse e-mail</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="collaborateur@entreprise.com" {...field} className="h-11 rounded-xl" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-full px-5">
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Envoyer l'invitation"}
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

    const isCompanyAdmin = user?.uid && userData?.companyId && user.uid === userData.companyId;

    const usersQuery = useMemo(() => {
        return userData?.companyId ? query(collection(db, 'users'), where('companyId', '==', userData.companyId)) : null;
    }, [userData?.companyId]);
    const [usersSnapshot, loading, error] = useCollection(usersQuery);

    const companyUsers = usersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];
    
    const handleRoleChange = async (userId: string, newCompanyRole: 'admin' | 'member') => {
        if (!isCompanyAdmin || userId === user?.uid) {
            toast({ variant: "destructive", title: "Action non autorisée", description: "Impossible de modifier le rôle de l'administrateur principal." });
            return;
        }
        try {
            await updateDoc(doc(db, "users", userId), {
                companyRole: newCompanyRole,
                role: newCompanyRole === 'admin' ? 'client-company' : 'client'
            });
            toast({ title: "Rôle mis à jour", description: `Le collaborateur est désormais ${newCompanyRole === 'admin' ? 'Administrateur' : 'Membre'}.` });
        } catch (error) {
          console.error("Error updating user role:", error);
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le rôle." });
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!isCompanyAdmin || userId === user?.uid) {
            toast({ variant: "destructive", title: "Action non autorisée", description: "Impossible de supprimer le compte administrateur principal." });
            return;
        }
        try {
            await deleteDoc(doc(db, "users", userId));
            toast({ title: "Utilisateur retiré" });
        } catch (error) {
            console.error("Error removing user:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de retirer le collaborateur." });
        }
    };
    
    const getStatusBadge = (user: any) => {
        if (user.isPlaceholder) {
            return <Badge className="rounded-full border-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2.5 py-0.5">En attente</Badge>
        }
        return <Badge className="rounded-full border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-2.5 py-0.5">Actif</Badge>
    }

    if (loadingAuth || !user || !userData) {
        return <div className="flex h-full w-full items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Gestion d'Équipe</h1>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Building size={14} className="text-primary"/> {userData.companyName}</p>
                </div>
                <AddUserDialog companyId={userData.companyId} companyName={userData.companyName} />
            </div>

            <Alert className="rounded-2xl border-indigo-500/25 bg-indigo-500/5 text-indigo-700 dark:text-indigo-400">
              <Info className="h-4 w-4 text-indigo-500" />
              <div className="ml-2">
                <AlertTitle className="font-bold">Comment inviter vos membres ?</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-0.5">
                  Une fois l'invitation soumise, votre collaborateur recevra les droits d'accès à l'entreprise dès qu'il créera son compte client en utilisant exactement la même adresse e-mail.
                </AlertDescription>
              </div>
            </Alert>

            <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users2 size={18}/></span>
                      Membres de l'équipe
                    </CardTitle>
                    <CardDescription>Visualisez et gérez les comptes des utilisateurs de votre structure.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                     <div className="overflow-x-auto">
                       <table className="w-full border-collapse min-w-[650px]">
                          <thead>
                              <tr className="border-b border-border/40 text-left text-xs font-bold text-muted-foreground uppercase bg-muted/20">
                                  <th className="p-4 pl-6">Nom / Profil</th>
                                  <th className="p-4">Adresse e-mail</th>
                                  <th className="p-4">Rôle</th>
                                  <th className="p-4">Statut</th>
                                  <th className="p-4 text-right pr-6"><span className="sr-only">Actions</span></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-sm">
                              {loading ? (
                                  <tr>
                                      <td colSpan={5} className="text-center h-24 p-4">
                                          <Loader2 className="mx-auto animate-spin text-primary"/>
                                      </td>
                                  </tr>
                              ) : error ? (
                                  <tr><td colSpan={5} className="text-center text-destructive p-4">Erreur: {error.message}</td></tr>
                              ) : companyUsers.length > 0 ? companyUsers.map((u: any) => (
                                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                      <td className="p-4 pl-6">
                                          <div className="flex items-center gap-3">
                                              <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                                                  <AvatarImage src={u.photoURL || `https://placehold.co/40x40/E0F8F8/008080/png?text=${u.isPlaceholder ? '?' : `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`}`} />
                                                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{u.isPlaceholder ? '?' : `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`}</AvatarFallback>
                                              </Avatar>
                                              <span className="font-semibold text-foreground">{u.isPlaceholder ? 'Invitation en attente' : `${u.firstName} ${u.lastName}`}</span>
                                          </div>
                                      </td>
                                      <td className="p-4 font-mono text-xs text-muted-foreground">{u.email}</td>
                                      <td className="p-4">
                                          <Badge variant={u.uid === userData.companyId ? 'default' : 'secondary'} className="capitalize rounded-full font-semibold px-2 py-0.5 text-[11px]">
                                              {u.uid === userData.companyId ? 'Admin' : 'Membre'}
                                          </Badge>
                                      </td>
                                      <td className="p-4">{getStatusBadge(u)}</td>
                                      <td className="text-right p-4 pr-6">
                                          {isCompanyAdmin && u.uid !== user.uid && (
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted"><MoreHorizontal size={16}/></Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent className="rounded-xl">
                                                      <DropdownMenuLabel>Actions & Rôles</DropdownMenuLabel>
                                                      <DropdownMenuSeparator/>
                                                      {u.companyRole !== 'admin' ? (
                                                          <DropdownMenuItem className="rounded-lg flex items-center font-semibold text-indigo-600 dark:text-indigo-400" onClick={() => handleRoleChange(u.id, 'admin')}>
                                                              <ShieldCheck className="mr-2 h-4 w-4 text-indigo-500"/> Nommer Administrateur
                                                          </DropdownMenuItem>
                                                      ) : (
                                                          <DropdownMenuItem className="rounded-lg flex items-center font-semibold text-slate-600 dark:text-slate-400" onClick={() => handleRoleChange(u.id, 'member')}>
                                                              <UserCheck className="mr-2 h-4 w-4 text-slate-500"/> Passer Membre
                                                          </DropdownMenuItem>
                                                      )}
                                                      <DropdownMenuSeparator/>
                                                      <DropdownMenuItem className="text-destructive focus:text-destructive rounded-lg flex items-center" onClick={() => handleRemoveUser(u.id)}>
                                                          <UserX className="mr-2 h-4 w-4"/> Retirer de l'équipe
                                                      </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                          )}
                                      </td>
                                  </tr>
                              )) : (
                                  <tr>
                                      <td colSpan={5} className="text-center h-24 text-muted-foreground p-4">
                                          Aucun membre n'est enregistré pour le moment.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                       </table>
                     </div>
                </CardContent>
            </Card>
        </div>
    )
}
