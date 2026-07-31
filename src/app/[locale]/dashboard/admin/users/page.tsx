
"use client"

import { useState, useMemo } from "react"
import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, orderBy, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, MoreHorizontal, Loader2, ShieldAlert, UserX, UserCheck as UserCheckIcon, Mail, Phone, Calendar, Shield, MessageSquare, Briefcase, Eye, Fingerprint, ExternalLink, AlertCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"

export default function AdminUsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user: loggedInUser } = useAuth();
  
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setSelectedUser((prev: any) => prev ? { ...prev, role: newRole } : null);
      toast({
        title: "Rôle modifié",
        description: `Le rôle de l'utilisateur a été mis à jour vers "${newRole}".`,
      });
    } catch (e) {
      console.error("Error changing user role:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le rôle de l'utilisateur."
      });
    }
  }

  const handleStartChat = async (targetUser: any) => {
    if (!loggedInUser) return;
    try {
      // Find if conversation already exists
      const convosRef = collection(db, 'conversations');
      const q = query(
        convosRef,
        where('participants', 'array-contains', targetUser.id)
      );
      const snap = await getDocs(q);
      
      let existingConvo = snap.docs.find(d => {
        const data = d.data();
        return data.participants.includes(loggedInUser.uid);
      });

      let convoId = "";
      if (existingConvo) {
        convoId = existingConvo.id;
      } else {
        // Create new conversation
        const adminName = loggedInUser.displayName || 'Support TransConnekt';
        const targetName = targetUser.companyName || `${targetUser.firstName} ${targetUser.lastName}`;
        const newConvoRef = await addDoc(collection(db, 'conversations'), {
          participants: [loggedInUser.uid, targetUser.id],
          participantNames: {
            [loggedInUser.uid]: adminName,
            [targetUser.id]: targetName,
          },
          lastMessage: "Conversation démarrée par l'admin",
          lastMessageAt: Timestamp.now(),
          unreadCount: {
            [loggedInUser.uid]: 0,
            [targetUser.id]: 0,
          },
          createdAt: Timestamp.now(),
        });
        convoId = newConvoRef.id;
      }
      
      sessionStorage.setItem('selectedConvoId', convoId);
      router.push('/dashboard/admin/messages');
    } catch (err) {
      console.error("Error starting chat:", err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'ouvrir la messagerie."
      });
    }
  };
  
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
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
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

  const handleApproveManual = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        [`documents.identityCard.status`]: 'approved',
        [`documents.identityCard.rejectionReason`]: null,
        isIdentityVerified: true,
        verifiedDocNumber: selectedUser?.documents?.identityCard?.docNumber || "",
        verifiedDocExpiry: selectedUser?.documents?.identityCard?.expiryDate ? new Date(selectedUser.documents.identityCard.expiryDate.toDate()).toISOString().split('T')[0] : "",
      });
      setSelectedUser((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          isIdentityVerified: true,
          verifiedDocNumber: prev.documents?.identityCard?.docNumber || "",
          documents: {
            ...prev.documents,
            identityCard: {
              ...prev.documents.identityCard,
              status: 'approved',
              rejectionReason: null,
            }
          }
        };
      });
      toast({ title: "Document approuvé", description: "Le document de l'utilisateur a été validé manuellement." });
    } catch (e) {
      console.error("Manual approve error:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'approuver le document." });
    }
  };

  const handleRejectManual = async (userId: string) => {
    const reason = prompt("Raison du refus (ex: Photo illisible, Numéro incorrect) :");
    if (reason === null) return;
    const finalReason = reason.trim() || "Le document fourni n'a pas pu être validé manuellement.";
    try {
      await updateDoc(doc(db, "users", userId), {
        [`documents.identityCard.status`]: 'rejected',
        [`documents.identityCard.rejectionReason`]: finalReason,
        isIdentityVerified: false,
      });
      setSelectedUser((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          isIdentityVerified: false,
          documents: {
            ...prev.documents,
            identityCard: {
              ...prev.documents.identityCard,
              status: 'rejected',
              rejectionReason: finalReason,
            }
          }
        };
      });
      toast({ title: "Document refusé", description: "La demande a été rejetée." });
    } catch (e) {
      console.error("Manual reject error:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de rejeter le document." });
    }
  };

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
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
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
                  <tr
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setIsDetailsOpen(true);
                    }}
                    className={`hover:bg-muted/30 transition cursor-pointer select-none ${user.isSuspended ? 'bg-destructive/10' : ''}`}
                  >
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-3">
                           <Avatar className="hidden h-9 w-9 sm:flex">
                               <AvatarImage src={user.photoURL || `https://placehold.co/40x40/E0F8F8/008080/png?text=${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`} alt="Avatar" />
                              <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="grid gap-1">
                              <p className="font-medium">{user.companyName || `${user.firstName} ${user.lastName}`}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded w-max border border-indigo-500/20 select-all" onClick={(e) => e.stopPropagation()}>ID: {user.id}</span>
                          </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </td>
                    <td className="p-3">{getStatusBadge(user)}</td>
                    <td className="p-3">{user.createdAt ? format(user.createdAt.toDate(), 'PPP') : 'N/A'}</td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setIsDetailsOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4"/> Voir les détails
                          </DropdownMenuItem>
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
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-indigo-400" />
              Fiche de l'utilisateur
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Consultez les informations détaillées et gérez le profil.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-4">
              {/* Header profile block */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                <Avatar className="h-16 w-16 border border-slate-700">
                  <AvatarImage src={selectedUser.photoURL || `https://placehold.co/80x80/E0F8F8/008080/png?text=${selectedUser.firstName?.[0] || ''}${selectedUser.lastName?.[0] || ''}`} />
                  <AvatarFallback className="bg-indigo-950 text-indigo-300 font-bold text-lg">{selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white leading-tight">
                    {selectedUser.companyName || `${selectedUser.firstName} ${selectedUser.lastName}`}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 capitalize font-mono text-[10px]">
                      {selectedUser.role}
                    </Badge>
                    {selectedUser.isSuspended ? (
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-medium text-[10px]">
                        Suspendu
                      </Badge>
                    ) : selectedUser.role !== 'admin' && !selectedUser.isVerified ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium text-[10px]">
                        Non vérifié
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium text-[10px]">
                        Actif
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Informative fields grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/50">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ID Utilisateur</span>
                  <span className="text-xs font-mono select-all text-slate-300">{selectedUser.id}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date d'inscription</span>
                  <span className="text-xs text-slate-300">{selectedUser.createdAt ? format(selectedUser.createdAt.toDate(), 'PPP') : 'N/A'}</span>
                </div>

                <div className="space-y-1 col-span-2 border-t border-slate-800/60 pt-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Adresse e-mail</span>
                  <span className="text-xs text-indigo-400 font-semibold">{selectedUser.email}</span>
                </div>

                <div className="space-y-1 col-span-2 border-t border-slate-800/60 pt-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Téléphone</span>
                  <span className="text-xs text-slate-300">{selectedUser.phoneNumber || 'Non renseigné'}</span>
                </div>

                {selectedUser.companyName && (
                  <div className="space-y-1 col-span-2 border-t border-slate-800/60 pt-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> Raison Sociale</span>
                    <span className="text-xs text-slate-300">{selectedUser.companyName}</span>
                  </div>
                )}
              </div>

              {/* Identity Verification Details & Manual Verification */}
              {selectedUser.documents?.identityCard && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-indigo-400" /> Informations d'identité
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-800/40 pt-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Type de pièce</span>
                      <span className="text-slate-300">
                        {selectedUser.documents.identityCard.subType === 'passport' ? '🛂 Passeport' : '🪪 Carte d\'identité (CNI)'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Numéro de pièce</span>
                      <span className="text-slate-300 font-mono font-semibold">
                        {selectedUser.documents.identityCard.docNumber || 'Non renseigné'}
                      </span>
                    </div>

                    <div className="space-y-1 border-t border-slate-800/30 pt-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Date de naissance</span>
                      <span className="text-slate-300">
                        {selectedUser.dateOfBirth ? format(new Date(selectedUser.dateOfBirth), 'dd MMMM yyyy', { locale: fr }) : 'Non extraite'}
                      </span>
                    </div>

                    <div className="space-y-1 border-t border-slate-800/30 pt-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Nationalité</span>
                      <span className="text-indigo-300 font-medium">
                        {selectedUser.nationality || 'Non extraite'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/40 pt-3 flex flex-col gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Fichier soumis</span>
                    {selectedUser.documents.identityCard.url ? (
                      <a 
                        href={selectedUser.documents.identityCard.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-semibold"
                      >
                        <ExternalLink size={14} /> Voir le document soumis
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Aucun fichier téléversé</span>
                    )}
                  </div>

                  {/* Manual verification action block */}
                  {selectedUser.documents.identityCard.status === 'manual_verification' && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-2">
                      <p className="text-[11px] text-blue-300 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Demande de vérification manuelle en attente
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold py-1.5 h-auto"
                          onClick={() => handleApproveManual(selectedUser.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-bold py-1.5 h-auto"
                          onClick={() => handleRejectManual(selectedUser.id)}
                        >
                          Refuser
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modify Role Option */}
              {selectedUser.role !== 'admin' && (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Modifier le Rôle</label>
                  <Select 
                    onValueChange={(val) => handleChangeRole(selectedUser.id, val)} 
                    defaultValue={selectedUser.role}
                  >
                    <SelectTrigger className="w-full bg-slate-900 border-slate-800">
                      <SelectValue placeholder="Changer le rôle" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="client">Client (Particulier)</SelectItem>
                      <SelectItem value="client-company">Client (Entreprise)</SelectItem>
                      <SelectItem value="transporter">Transporteur (Particulier)</SelectItem>
                      <SelectItem value="transporter-company">Transporteur (Entreprise)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Actions Section */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block pl-1">Actions d'administration</span>
                <div className="grid grid-cols-2 gap-2">
                  {selectedUser.role !== 'admin' && !selectedUser.isVerified && (
                    <Button 
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs gap-1.5"
                      onClick={() => {
                        handleVerify(selectedUser.id);
                        setSelectedUser((prev: any) => prev ? { ...prev, isVerified: true } : null);
                      }}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Vérifier le profil
                    </Button>
                  )}

                  {selectedUser.role !== 'admin' && (
                    <Button 
                      variant="outline"
                      className={`w-full rounded-xl text-xs gap-1.5 border-slate-800 ${
                        selectedUser.isSuspended 
                          ? 'text-green-400 hover:bg-green-500/10 hover:text-green-300' 
                          : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                      }`}
                      onClick={() => {
                        const nextSuspend = !selectedUser.isSuspended;
                        handleSuspend(selectedUser.id, nextSuspend);
                        setSelectedUser((prev: any) => prev ? { ...prev, isSuspended: nextSuspend } : null);
                      }}
                    >
                      {selectedUser.isSuspended ? (
                        <>
                          <UserCheckIcon className="w-4 h-4" />
                          Activer le compte
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          Suspendre le compte
                        </>
                      )}
                    </Button>
                  )}

                  <Button 
                    variant="outline"
                    className="w-full border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl text-xs gap-1.5 col-span-2"
                    onClick={() => handleStartChat(selectedUser)}
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    Ouvrir la messagerie
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t border-slate-800/60 pt-4">
            <Button 
              variant="outline" 
              className="rounded-xl border-slate-800 text-slate-300 hover:bg-slate-800 w-full"
              onClick={() => setIsDetailsOpen(false)}
            >
              Fermer la fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
