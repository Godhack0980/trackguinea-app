"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, doc, deleteDoc, updateDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import PremiumFleetMap from "@/components/premium-fleet-map";
import { useTranslation } from "@/lib/translations";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, MoreHorizontal, Loader2, UserX, Users, Mail, Phone, ShieldAlert, CheckCircle, Clock, UserPlus, Eye, EyeOff, Truck, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import InviteUserDialog from "@/components/invite-user-dialog";

export default function CompanyDriversPage() {
    const { user, userData, loadingAuth } = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    const [showDriverPassword, setShowDriverPassword] = useState(false);
    
    // Driver File states
    const [editingDriver, setEditingDriver] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({
        permitNumber: "",
        permitExpiry: "",
        medicalCheckDate: "",
        training: "",
        infractions: ""
    });

    // The user is the admin if their UID matches their company's ID.
    const isCompanyAdmin = user?.uid && userData?.companyId && user.uid === userData.companyId;

    const driversQuery = useMemo(() => {
        return userData?.companyId
            ? query(collection(db, 'users'), where('companyId', '==', userData.companyId), where('role', '==', 'transporter'))
            : null;
    }, [userData?.companyId]);

    const [driversSnapshot, loading, error] = useCollection(driversQuery);
    const companyDrivers = driversSnapshot?.docs.map(d => ({ id: d.id, ...d.data() })) || [];

    const [jobs, setJobs] = useState<any[]>([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [searchJobId, setSearchJobId] = useState("");

    // Fetch jobs for all drivers in the fleet
    useEffect(() => {
        if (companyDrivers.length === 0) {
            setJobs([]);
            return;
        }
        const fetchJobs = async () => {
            setLoadingJobs(true);
            try {
                const driverIds = companyDrivers.map(d => d.id);
                // Chunk queries by 10 to avoid firestore 'in' operator limits
                const chunks: string[][] = [];
                for (let i = 0; i < driverIds.length; i += 10) {
                    chunks.push(driverIds.slice(i, i + 10));
                }
                const allJobs: any[] = [];
                for (const chunk of chunks) {
                    const q = query(collection(db, 'requests'), where('assignedTo', 'in', chunk));
                    const snap = await getDocs(q);
                    allJobs.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
                }
                // Sort jobs by createdAt descending
                allJobs.sort((a, b) => {
                    const t1 = a.createdAt?.seconds || 0;
                    const t2 = b.createdAt?.seconds || 0;
                    return t2 - t1;
                });
                setJobs(allJobs);
            } catch (err) {
                console.error("Error fetching fleet jobs:", err);
            } finally {
                setLoadingJobs(false);
            }
        };
        fetchJobs();
    }, [companyDrivers.map(d => d.id).join(',')]);

    const handleToggleSuspend = async (driverId: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'suspendu' ? 'disponible' : 'suspendu';
            await updateDoc(doc(db, "users", driverId), {
                status: newStatus
            });
            toast({
                title: newStatus === 'suspendu' ? "Chauffeur Suspendu 🚫" : "Chauffeur Réhabilité ✅",
                description: `Le statut du chauffeur a bien été mis à jour.`
            });
        } catch (e) {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier le statut du chauffeur." });
        }
    };

    const handleRemoveDriver = async (driverId: string) => {
        if (!isCompanyAdmin || driverId === user?.uid) {
            toast({ variant: "destructive", title: "Action non autorisée", description: "Vous ne pouvez pas supprimer un administrateur." });
            return;
        }
        try {
            await deleteDoc(doc(db, "users", driverId));
            toast({ title: "Chauffeur supprimé", description: "Le chauffeur a été retiré de votre entreprise." });
        } catch {
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le chauffeur." });
        }
    };

    const handleCreateDriver = async () => {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
            toast({ variant: "destructive", title: "Champs requis", description: "Tous les champs marqués * sont obligatoires." });
            return;
        }
        setCreating(true);
        try {
            const res = await fetch('/api/create-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    companyId: userData?.companyId,
                    companyName: userData?.companyName,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
            toast({ title: "Chauffeur créé ✅", description: `Le compte de ${form.firstName} ${form.lastName} a été créé avec succès. Il peut se connecter immédiatement.` });
            setCreateDialogOpen(false);
            setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Erreur de création", description: e.message });
        } finally {
            setCreating(false);
        }
    };

    const handleSaveDriverFile = async () => {
        if (!editingDriver) return;
        try {
            await updateDoc(doc(db, "users", editingDriver.id), editForm);
            toast({ title: "Fiche conducteur mise à jour ✅", description: `Les informations de ${editingDriver.firstName} ont été enregistrées.` });
            setEditingDriver(null);
        } catch (e) {
            console.error("Save driver file error:", e);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour la fiche conducteur." });
        }
    };

    const alerts = useMemo(() => {
        const list: string[] = [];
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        companyDrivers.forEach((d: any) => {
            if (d.permitExpiry) {
                const expiryTime = new Date(d.permitExpiry).getTime();
                if (expiryTime < now) {
                    list.push(`🚫 Le permis de conduire de ${d.firstName} ${d.lastName} a EXPIRÉ le ${new Date(d.permitExpiry).toLocaleDateString('fr-FR')}.`);
                } else if (expiryTime - now < thirtyDays) {
                    list.push(`⚠️ Le permis de conduire de ${d.firstName} ${d.lastName} expire bientôt (le ${new Date(d.permitExpiry).toLocaleDateString('fr-FR')}).`);
                }
            }
            if (d.medicalCheckDate) {
                const medicalTime = new Date(d.medicalCheckDate).getTime();
                const oneYear = 365 * 24 * 60 * 60 * 1000;
                const nextCheck = medicalTime + oneYear;
                if (nextCheck < now) {
                    list.push(`🚨 La visite médicale de ${d.firstName} ${d.lastName} a EXPIRÉ (dernière le ${new Date(d.medicalCheckDate).toLocaleDateString('fr-FR')}).`);
                } else if (nextCheck - now < thirtyDays) {
                    list.push(`⚕️ La visite médicale de ${d.firstName} ${d.lastName} doit être renouvelée bientôt (dernière le ${new Date(d.medicalCheckDate).toLocaleDateString('fr-FR')}).`);
                }
            }
        });
        return list;
    }, [companyDrivers]);

    const getStatusBadge = (driver: any) => {
        if (driver.isPlaceholder) {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                <Clock size={10} /> Invitation en attente
              </span>
            );
        }
        if (driver.status === 'suspendu') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                <ShieldAlert size={10} /> Suspendu
              </span>
            );
        }
        const statusColors: Record<string, string> = {
            en_mission: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            disponible: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        };
        const s = driver.status || 'disponible';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[s] || statusColors['disponible']}`}>
            <CheckCircle size={10} /> {s === 'en_mission' ? 'En Mission' : 'Actif'}
          </span>
        );
    };

    const isLoading = loadingAuth || loading;

    if (!isCompanyAdmin && !loadingAuth) {
        return (
            <div className="p-6 max-w-2xl mx-auto mt-10">
                <Card className="shadow-lg rounded-3xl border-destructive/25 bg-destructive/5 text-destructive p-6">
                    <CardHeader className="p-0 pb-3 flex flex-row items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><ShieldAlert size={20}/></span>
                        <div><CardTitle className="text-xl font-bold">Accès non autorisé</CardTitle></div>
                    </CardHeader>
                    <CardContent className="p-0 pt-2 text-sm leading-relaxed">
                        Seuls les administrateurs de l&apos;entreprise peuvent gérer les chauffeurs.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {alerts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl p-4 space-y-2">
                    <h3 className="font-bold flex items-center gap-2 text-sm">
                        <ShieldAlert size={16} /> Alertes de Validité Chauffeurs ({alerts.length})
                    </h3>
                    <ul className="list-disc list-inside text-xs space-y-1 text-red-300">
                        {alerts.map((alert, idx) => (
                            <li key={idx}>{alert}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.drivers_title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">{t.drivers_subtitle}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Bouton Créer un Chauffeur (avec vrai compte) */}
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 font-bold transition-all">
                                <UserPlus className="h-4 w-4" /> Créer un chauffeur
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Créer un compte chauffeur</DialogTitle>
                                <DialogDescription>
                                    Le chauffeur pourra se connecter immédiatement avec ces identifiants. Partagez-lui le mot de passe en toute sécurité.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="firstName">Prénom *</Label>
                                        <Input id="firstName" placeholder="Mamadou" value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="lastName">Nom *</Label>
                                        <Input id="lastName" placeholder="Diallo" value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="driverEmail">Email *</Label>
                                    <Input id="driverEmail" type="email" placeholder="mamadou@email.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="driverPhone">Téléphone</Label>
                                    <Input id="driverPhone" type="tel" placeholder="+224 6XX XX XX XX" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="driverPassword">Mot de passe temporaire *</Label>
                                    <div className="relative">
                                        <Input 
                                            id="driverPassword" 
                                            type={showDriverPassword ? "text" : "password"} 
                                            placeholder="Min. 8 caractères" 
                                            value={form.password} 
                                            onChange={e => setForm(f => ({...f, password: e.target.value}))} 
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDriverPassword(!showDriverPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                        >
                                            {showDriverPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Partagez ce mot de passe avec le chauffeur. Il pourra le changer depuis son profil.</p>
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
                                <Button onClick={handleCreateDriver} disabled={creating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</> : <><UserPlus className="mr-2 h-4 w-4" />Créer le compte</>}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Bouton Inviter (ancien système) */}
                    {userData && (
                        <InviteUserDialog
                            companyId={userData.companyId}
                            companyName={userData.companyName}
                            role="transporter"
                            triggerButton={
                                <Button variant="outline" className="rounded-xl px-4 py-2 flex items-center gap-2 font-bold transition-all">
                                    <PlusCircle className="h-4 w-4" /> Inviter par email
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>

            <Card className="shadow-xl rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b border-border/20 pb-4">
                    <CardTitle className="text-lg font-bold text-foreground">{t.drivers_team_members}</CardTitle>
                    <CardDescription>{t.drivers_team_desc} {userData?.companyName || ""}.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                     <div className="overflow-x-auto">
                         <table className="w-full border-collapse min-w-[650px]">
                            <thead>
                                <tr className="border-b border-border/20 bg-slate-950/20 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="p-4 pl-6">{t.drivers_driver}</th>
                                    <th className="p-4">{t.drivers_contact}</th>
                                    <th className="p-4">{t.drivers_status}</th>
                                    <th className="p-4 pr-6 text-right"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20 text-sm font-medium">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="text-center h-32 p-4"><Loader2 className="mx-auto animate-spin text-primary h-8 w-8"/></td></tr>
                                ) : error ? (
                                    <tr><td colSpan={4} className="text-center text-destructive p-4">Erreur: {error.message}</td></tr>
                                ) : companyDrivers.length > 0 ? companyDrivers.map((d: any) => (
                                    <tr key={d.id} className="hover:bg-slate-900/30 transition-all">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border/50">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                        {d.isPlaceholder
                                                          ? d.email?.[0]?.toUpperCase() || '?'
                                                          : `${d.firstName?.[0] || ''}${d.lastName?.[0] || ''}`.toUpperCase()
                                                        }
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground">
                                                      {d.isPlaceholder ? 'En attente de création de compte' : `${d.firstName} ${d.lastName}`}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">ID: {d.id.substring(0, 8)}...</span>
                                                    {d.permitNumber && (
                                                      <span className="text-[10px] text-slate-300">
                                                        Permis: <strong>{d.permitNumber}</strong> (Exp: {d.permitExpiry ? new Date(d.permitExpiry).toLocaleDateString('fr-FR') : 'N/A'})
                                                      </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1.5 font-mono"><Mail size={12} className="text-indigo-400" /> {d.email}</span>
                                                {d.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-sky-400" /> {d.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">{getStatusBadge(d)}</td>
                                        <td className="text-right p-4 pr-6">
                                            {isCompanyAdmin && d.id !== user?.uid && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-800"><MoreHorizontal size={16}/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-border bg-slate-950 text-foreground">
                                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-bold">Actions Chauffeur</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-border/40"/>
                                                        <DropdownMenuItem 
                                                            className="text-indigo-400 focus:text-indigo-400 focus:bg-indigo-500/10 rounded-lg cursor-pointer" 
                                                            onClick={() => {
                                                                setEditingDriver(d);
                                                                setEditForm({
                                                                    permitNumber: d.permitNumber || "",
                                                                    permitExpiry: d.permitExpiry || "",
                                                                    medicalCheckDate: d.medicalCheckDate || "",
                                                                    training: d.training || "",
                                                                    infractions: d.infractions || ""
                                                                });
                                                            }}
                                                        >
                                                            <FileText className="mr-2 h-4 w-4"/> Fiche Conducteur
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-border/40"/>
                                                        {d.status === 'suspendu' ? (
                                                            <DropdownMenuItem className="text-emerald-400 focus:text-emerald-400 focus:bg-emerald-500/10 rounded-lg cursor-pointer" onClick={() => handleToggleSuspend(d.id, d.status)}>
                                                                <CheckCircle className="mr-2 h-4 w-4"/> Réhabiliter le Chauffeur
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem className="text-amber-500 focus:text-amber-500 focus:bg-amber-500/10 rounded-lg cursor-pointer" onClick={() => handleToggleSuspend(d.id, d.status)}>
                                                                <ShieldAlert className="mr-2 h-4 w-4"/> Suspendre le Chauffeur
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator className="bg-border/40"/>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer" onClick={() => handleRemoveDriver(d.id)}>
                                                            <UserX className="mr-2 h-4 w-4"/> Retirer de la Flotte
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center h-32 text-muted-foreground p-4">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Users className="h-8 w-8 opacity-30 text-muted-foreground" />
                                                <p className="font-bold">{t.drivers_no_drivers}</p>
                                                <p className="text-xs">{t.drivers_no_drivers_desc}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                         </table>
                     </div>
                </CardContent>
             </Card>

            {/* Espace Premium Flotte Pro */}
            {userData?.subscriptionStatus === 'active' ? (
                <div className="space-y-6 mt-10">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Truck size={18} />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">👑 Espace Premium - Flotte Pro</h2>
                            <p className="text-xs text-muted-foreground">Performances en temps réel et historique des trajets de vos chauffeurs.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tableau des performances par chauffeur */}
                        <Card className="lg:col-span-2 bg-[#0d1322]/80 border-slate-800 shadow-xl rounded-2xl p-5">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Taux de Performance par Chauffeur</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 space-y-4">
                                {companyDrivers.map((driver: any) => {
                                    const driverJobs = jobs.filter(j => j.assignedTo === driver.id);
                                    const completed = driverJobs.filter(j => j.status === 'Terminé').length;
                                    const active = driverJobs.filter(j => j.status === 'En cours').length;
                                    const total = driverJobs.length;
                                    
                                    // calculate rate
                                    const performanceRate = total > 0 ? Math.round((completed / total) * 100) : 100;
                                    const activeJob = driverJobs.find(j => j.status === 'En cours');

                                    return (
                                        <div key={driver.id} className="p-3.5 bg-slate-950/50 border border-slate-900 rounded-xl space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-slate-200">{driver.firstName} {driver.lastName}</span>
                                                    <span className="ml-2.5 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                                                        {driver.vehicleRegistration || 'Pas de véhicule'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold text-slate-400">Taux de livraison: </span>
                                                    <span className={`text-sm font-bold ${performanceRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {performanceRate}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${performanceRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                                    style={{ width: `${performanceRate}%` }} 
                                                />
                                            </div>

                                            {/* Driver activity details */}
                                            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-400">
                                                <div>Courses terminées: <span className="font-bold text-white">{completed}</span></div>
                                                <div>En mission: <span className="font-bold text-white">{active}</span></div>
                                                <div className="text-right">
                                                    {activeJob ? (
                                                        <span className="text-rose-400 animate-pulse font-medium">📍 Mission: {activeJob.from} → {activeJob.to}</span>
                                                    ) : (
                                                        <span className="text-emerald-400 font-medium">✅ Disponible</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {companyDrivers.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">Aucun chauffeur rattaché.</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Panel d'historique et de relecture sur la carte */}
                        <Card className="bg-[#0d1322]/80 border-slate-800 shadow-xl rounded-2xl p-5 space-y-4">
                            <CardHeader className="p-0">
                                <CardTitle className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Visionner un trajet sur la carte</CardTitle>
                                <CardDescription className="text-xs text-slate-400">Recherchez par ID de course pour retracer son parcours en temps réel.</CardDescription>
                            </CardHeader>
                            
                            <div className="space-y-3">
                                {/* Search input */}
                                <div className="space-y-1">
                                    <Label htmlFor="searchJobInput" className="text-xs text-slate-300">ID de la course / trajet</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="searchJobInput"
                                            placeholder="Ex: TG-REQ-12345"
                                            value={searchJobId}
                                            onChange={e => setSearchJobId(e.target.value)}
                                            className="bg-slate-950 border-slate-800 h-9 text-xs"
                                        />
                                        <Button 
                                            onClick={() => {
                                                const found = jobs.find(j => j.id.toLowerCase() === searchJobId.trim().toLowerCase());
                                                if (found) {
                                                    setSelectedJob(found);
                                                    toast({ title: "Trajet chargé 📍", description: `${found.from} → ${found.to}` });
                                                } else {
                                                    toast({ variant: "destructive", title: "Non trouvé", description: "Aucune course correspondante dans votre flotte." });
                                                }
                                            }}
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 h-9"
                                        >
                                            Rechercher
                                        </Button>
                                    </div>
                                </div>

                                {/* Select from dropdown list */}
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-300">Ou choisir parmi les courses récentes</Label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 h-9 focus:ring-1 focus:ring-indigo-500"
                                        value={selectedJob?.id || ""}
                                        onChange={e => {
                                            const found = jobs.find(j => j.id === e.target.value);
                                            if (found) setSelectedJob(found);
                                        }}
                                    >
                                        <option value="">-- Sélectionner une course --</option>
                                        {jobs.map(j => (
                                            <option key={j.id} value={j.id}>
                                                {j.nature || 'Marchandise'} ({j.from} → {j.to}) - {j.status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {selectedJob && (
                                <div className="space-y-3 pt-2">
                                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1 text-xs">
                                        <div className="font-bold text-slate-200">Détails du Trajet :</div>
                                        <div>Course ID: <span className="font-mono text-indigo-400 font-semibold">{selectedJob.id}</span></div>
                                        <div>Départ: <span className="font-semibold text-slate-300">{selectedJob.from}</span></div>
                                        <div>Arrivée: <span className="font-semibold text-slate-300">{selectedJob.to}</span></div>
                                        <div>Type: <span className="text-slate-300">{selectedJob.nature || 'Marchandise'}</span></div>
                                        {selectedJob.createdAt && (
                                            <div>
                                                Date: <span className="text-slate-300">
                                                    {new Date(selectedJob.createdAt.seconds * 1000).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                        <div>Statut: <span className={`font-bold ${selectedJob.status === 'Terminé' ? 'text-emerald-400' : 'text-rose-400'}`}>{selectedJob.status}</span></div>
                                    </div>

                                    {/* Real Map Replay rendering */}
                                    <PremiumFleetMap job={selectedJob} />
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-3xl border border-dashed border-indigo-500/30 bg-indigo-500/5 mt-10 p-8 text-center space-y-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
                    <div className="relative z-10 max-w-lg mx-auto space-y-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Truck size={24} />
                        </span>
                        <h3 className="text-xl font-bold text-white">👑 Fonctionnalités Flotte Pro réservées aux abonnés</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Abonnez-vous à <strong className="text-indigo-400">Flotte Pro (500 000 GNF/mois)</strong> pour débloquer les rapports avancés, le suivi des courses en direct sur la carte, le calcul des performances par chauffeur et l'historique complet des trajets.
                        </p>
                        <div className="pt-2">
                            <Link href="/dashboard/transporter-company/finances">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5 py-2.5 shadow-lg shadow-indigo-600/20">
                                    Découvrir et Activer Flotte Pro
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog Modification Fiche Conducteur */}
            <Dialog open={!!editingDriver} onOpenChange={(open) => !open && setEditingDriver(null)}>
                <DialogContent className="sm:max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            <FileText className="text-indigo-400" /> Fiche de {editingDriver?.firstName} {editingDriver?.lastName}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Mettez à jour les informations légales, médicales et de conformité du conducteur.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2 text-slate-300 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="permitNumber">{t.drivers_permit_number}</Label>
                                <Input id="permitNumber" placeholder="Ex: PE-2026-X12" className="bg-slate-950 border-slate-800" value={editForm.permitNumber} onChange={(e: any) => setEditForm((f: any) => ({...f, permitNumber: e.target.value}))} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="permitExpiry">{t.drivers_permit_expiry}</Label>
                                <Input id="permitExpiry" type="date" className="bg-slate-950 border-slate-800 text-slate-200" value={editForm.permitExpiry} onChange={(e: any) => setEditForm((f: any) => ({...f, permitExpiry: e.target.value}))} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="medicalCheckDate">{t.drivers_medical_check}</Label>
                            <Input id="medicalCheckDate" type="date" className="bg-slate-950 border-slate-800 text-slate-200" value={editForm.medicalCheckDate} onChange={(e: any) => setEditForm((f: any) => ({...f, medicalCheckDate: e.target.value}))} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="training">{t.drivers_training}</Label>
                            <Textarea id="training" placeholder="Ex: Formation transport..." className="bg-slate-950 border-slate-800" rows={2} value={editForm.training} onChange={(e: any) => setEditForm((f: any) => ({...f, training: e.target.value}))} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="infractions">{t.drivers_infractions}</Label>
                            <Textarea id="infractions" placeholder="Ex: Incidents..." className="bg-slate-950 border-slate-800 text-rose-300 border-rose-900/30" rows={2} value={editForm.infractions} onChange={(e: any) => setEditForm((f: any) => ({...f, infractions: e.target.value}))} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditingDriver(null)}>{t.cancel}</Button>
                        <Button onClick={handleSaveDriverFile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
                            {t.drivers_save_btn}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
