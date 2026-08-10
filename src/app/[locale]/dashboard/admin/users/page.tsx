"use client";

import React, { useState, useMemo } from "react";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, doc, updateDoc, orderBy, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, MoreHorizontal, Loader2, ShieldAlert, UserX, UserCheck as UserCheckIcon, 
  Mail, Phone, Calendar, Shield, MessageSquare, Briefcase, Eye, Fingerprint, ExternalLink, 
  AlertCircle, Download, UserPlus, Search, Filter, Sparkles, CheckCircle2, XCircle, Clock,
  Truck, Building2, User, Star, MapPin, ArrowUpDown, RefreshCw
} from "lucide-react";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user: loggedInUser } = useAuth();
  
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // New user creation modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Fetch all users
  const usersQuery = useMemo(() => {
    const baseQuery = collection(db, "users");
    if (roleFilter !== "all") {
      return query(baseQuery, where("role", "==", roleFilter), orderBy("createdAt", "desc"));
    }
    return query(baseQuery, orderBy("createdAt", "desc"));
  }, [roleFilter]);
  
  const [usersSnapshot, loading, error] = useCollection(usersQuery);

  const allUsers = useMemo(() => {
    if (!usersSnapshot) return [];
    return usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
  }, [usersSnapshot]);

  // Analytics KPI counts
  const kpis = useMemo(() => {
    const total = allUsers.length;
    const verified = allUsers.filter(u => u.isVerified).length;
    const unverified = allUsers.filter(u => !u.isVerified && !u.isSuspended).length;
    const suspended = allUsers.filter(u => u.isSuspended).length;
    const transporters = allUsers.filter(u => u.role === "transporter" || u.role === "transporter-company").length;
    const clients = allUsers.filter(u => u.role === "client" || u.role === "client-company").length;
    const pendingKYC = allUsers.filter(u => u.documents?.identityCard?.status === "manual_verification").length;

    return { total, verified, unverified, suspended, transporters, clients, pendingKYC };
  }, [allUsers]);

  // Filtered & Sorted users list
  const filteredUsers = useMemo(() => {
    return allUsers
      .filter(user => {
        // Search term filter
        const term = searchTerm.toLowerCase();
        const firstName = (user.firstName || "").toLowerCase();
        const lastName = (user.lastName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const companyName = (user.companyName || "").toLowerCase();
        const phone = (user.phoneNumber || "").toLowerCase();
        const userId = (user.id || "").toLowerCase();

        const matchesSearch = !term || 
          firstName.includes(term) || 
          lastName.includes(term) || 
          email.includes(term) || 
          companyName.includes(term) ||
          phone.includes(term) ||
          userId.includes(term);

        // Status filter
        let matchesStatus = true;
        if (statusFilter === "verified") matchesStatus = user.isVerified && !user.isSuspended;
        if (statusFilter === "unverified") matchesStatus = !user.isVerified && !user.isSuspended;
        if (statusFilter === "suspended") matchesStatus = user.isSuspended;
        if (statusFilter === "pending_kyc") matchesStatus = user.documents?.identityCard?.status === "manual_verification";

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          const nameA = a.companyName || `${a.firstName} ${a.lastName}`;
          const nameB = b.companyName || `${b.firstName} ${b.lastName}`;
          return nameA.localeCompare(nameB);
        }
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
      });
  }, [allUsers, searchTerm, statusFilter, sortBy]);

  // User Actions
  const handleChangeRole = async (userId: string, targetRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role: targetRole });
      setSelectedUser((prev: any) => prev ? { ...prev, role: targetRole } : null);
      toast({
        title: "Rôle mis à jour ✓",
        description: `Le rôle de l'utilisateur a été changé en "${targetRole}".`,
      });
    } catch (e) {
      console.error("Error updating role:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le rôle."
      });
    }
  };

  const handleVerify = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { isVerified: true });
      toast({
        title: "Compte Vérifié avec succès ! 🎉",
        description: "L'utilisateur dispose désormais de l'accès complet.",
      });
    } catch (e) {
      console.error("Error verifying user:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Vérification échouée." });
    }
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: suspend });
      toast({
        title: `Compte ${suspend ? "suspendu 🛑" : "réactivé ✅"}`,
        description: `L'accès utilisateur a été ${suspend ? "restreint" : "rétabli"}.`,
      });
    } catch (e) {
      console.error("Error suspending user:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Action impossible." });
    }
  };

  const handleApproveManual = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        [`documents.identityCard.status`]: "approved",
        [`documents.identityCard.rejectionReason`]: null,
        isIdentityVerified: true,
        isVerified: true,
        verifiedDocNumber: selectedUser?.documents?.identityCard?.docNumber || "",
      });
      setSelectedUser((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          isIdentityVerified: true,
          isVerified: true,
          documents: {
            ...prev.documents,
            identityCard: {
              ...prev.documents.identityCard,
              status: "approved",
              rejectionReason: null,
            }
          }
        };
      });
      toast({ title: "KYC Approuvé ! ✅", description: "La pièce d'identité a été validée." });
    } catch (e) {
      console.error("Manual approve error:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Validation échouée." });
    }
  };

  const handleRejectManual = async (userId: string) => {
    const reason = prompt("Motif du refus KYC (ex: Document flou, Numéro invalide) :");
    if (reason === null) return;
    const finalReason = reason.trim() || "Le document fourni n'a pas pu être vérifié.";
    try {
      await updateDoc(doc(db, "users", userId), {
        [`documents.identityCard.status`]: "rejected",
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
              status: "rejected",
              rejectionReason: finalReason,
            }
          }
        };
      });
      toast({ title: "KYC Rejeté", description: "L'utilisateur a été notifié." });
    } catch (e) {
      console.error("Manual reject error:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Action impossible." });
    }
  };

  const handleStartChat = async (targetUser: any) => {
    if (!loggedInUser) return;
    try {
      const convosRef = collection(db, "conversations");
      const q = query(convosRef, where("participants", "array-contains", targetUser.id));
      const snap = await getDocs(q);
      
      let existingConvo = snap.docs.find(d => {
        const data = d.data();
        return data.participants.includes(loggedInUser.uid);
      });

      let convoId = "";
      if (existingConvo) {
        convoId = existingConvo.id;
      } else {
        const adminName = loggedInUser.displayName || "Support TransConnekt";
        const targetName = targetUser.companyName || `${targetUser.firstName} ${targetUser.lastName}`;
        const newConvoRef = await addDoc(collection(db, "conversations"), {
          participants: [loggedInUser.uid, targetUser.id],
          participantNames: {
            [loggedInUser.uid]: adminName,
            [targetUser.id]: targetName,
          },
          lastMessage: "Conversation d'assistance ouverte par l'administration",
          lastMessageAt: Timestamp.now(),
          unreadCount: {
            [loggedInUser.uid]: 0,
            [targetUser.id]: 0,
          },
          createdAt: Timestamp.now(),
        });
        convoId = newConvoRef.id;
      }
      
      sessionStorage.setItem("selectedConvoId", convoId);
      router.push("/dashboard/admin/messages");
    } catch (err) {
      console.error("Error starting chat:", err);
      toast({ variant: "destructive", title: "Erreur", description: "Ouverture messagerie impossible." });
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun utilisateur à exporter." });
      return;
    }

    const headers = ["ID", "Nom/Raison Sociale", "Prénom", "Email", "Téléphone", "Rôle", "Statut", "Inscrit Le"];
    const rows = filteredUsers.map(u => [
      u.id,
      `"${u.companyName || u.lastName || ""}"`,
      `"${u.firstName || ""}"`,
      `"${u.email || ""}"`,
      `"${u.phoneNumber || ""}"`,
      u.role || "client",
      u.isSuspended ? "Suspendu" : u.isVerified ? "Vérifié" : "Non vérifié",
      u.createdAt?.toDate ? format(u.createdAt.toDate(), "yyyy-MM-dd") : "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TransConnekt_Utilisateurs_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export réussi ! 📥", description: `${filteredUsers.length} utilisateurs exportés en CSV.` });
  };

  // Manual User Creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFirstName) {
      toast({ variant: "destructive", title: "Champs requis", description: "Nom et email obligatoires." });
      return;
    }
    setCreatingUser(true);
    try {
      await addDoc(collection(db, "users"), {
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        phoneNumber: newPhone,
        role: newRole,
        companyName: newCompanyName || null,
        isVerified: true,
        isSuspended: false,
        createdAt: Timestamp.now(),
      });

      toast({ title: "Utilisateur créé ! 🎉", description: `Le profil de ${newFirstName} a été ajouté.` });
      setIsCreateOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      setNewCompanyName("");
    } catch (e) {
      console.error("Create user error:", e);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer l'utilisateur." });
    } finally {
      setCreatingUser(false);
    }
  };

  // Adaptive Role Badge Renderer (High Contrast for Light & Dark)
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "transporter":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-[10px] font-bold gap-1">
            <Truck size={12} /> Transporteur
          </Badge>
        );
      case "transporter-company":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 text-[10px] font-bold gap-1">
            <Building2 size={12} /> Flotte Transport
          </Badge>
        );
      case "client-company":
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 text-[10px] font-bold gap-1">
            <Building2 size={12} /> Entreprise Client
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-[10px] font-bold gap-1">
            <Shield size={12} /> Admin System
          </Badge>
        );
      default:
        return (
          <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 text-[10px] font-bold gap-1">
            <User size={12} /> Client Particulier
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Gestion & Contrôle des Utilisateurs
                <Badge className="bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  Admin Pro
                </Badge>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Supervisez tous les profils, validez les vérifications KYC et gérez les droits d'accès.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold gap-2 shadow-sm"
          >
            <Download size={14} className="text-indigo-600 dark:text-indigo-400" /> Export CSV
          </Button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black gap-2 shadow-lg shadow-primary/25"
          >
            <UserPlus size={14} /> Créer un Profil
          </Button>
        </div>
      </div>

      {/* ANALYTICS KPIS GRID (High Contrast for Light & Dark) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
              <User size={20} />
            </span>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Total Utilisateurs</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <p className="text-[9px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Comptes Vérifiés</p>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{kpis.verified}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
              <Fingerprint size={20} className="animate-pulse" />
            </span>
            <div>
              <p className="text-[9px] uppercase font-bold text-blue-800 dark:text-blue-400">En attente KYC</p>
              <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">{kpis.pendingKYC}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </span>
            <div>
              <p className="text-[9px] uppercase font-bold text-amber-800 dark:text-amber-400">Transporteurs</p>
              <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{kpis.transporters}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-200 dark:border-sky-500/20 bg-sky-50/50 dark:bg-sky-500/5 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </span>
            <div>
              <p className="text-[9px] uppercase font-bold text-sky-800 dark:text-sky-400">Clients Fret</p>
              <p className="text-xl font-black text-sky-700 dark:text-sky-400 mt-0.5">{kpis.clients}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center shrink-0">
              <UserX size={20} />
            </span>
            <div>
              <p className="text-[9px] uppercase font-bold text-rose-800 dark:text-rose-400">Suspendus</p>
              <p className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">{kpis.suspended}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTERING & TOOLBAR */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, email, téléphone, entreprise, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Role & Status Filter dropdowns */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px] h-10 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="client">Client Particulier</SelectItem>
                <SelectItem value="client-company">Entreprise Client</SelectItem>
                <SelectItem value="transporter">Transporteur Indépendant</SelectItem>
                <SelectItem value="transporter-company">Flotte Transporteur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-10 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="verified">✅ Vérifiés</SelectItem>
                <SelectItem value="unverified">⚠️ Non vérifiés</SelectItem>
                <SelectItem value="pending_kyc">🔍 En attente KYC</SelectItem>
                <SelectItem value="suspended">🛑 Suspendus</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[160px] h-10 rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200">
                <ArrowUpDown size={12} className="mr-1.5 text-slate-400" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                <SelectItem value="newest">Plus récents</SelectItem>
                <SelectItem value="oldest">Plus anciens</SelectItem>
                <SelectItem value="name">Nom A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* USERS DATA TABLE (High Contrast Adaptive Colors) */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/80 text-slate-700 dark:text-slate-300 uppercase text-[9px] font-extrabold tracking-wider">
                <th className="p-4">Utilisateur & Identité</th>
                <th className="p-4">Rôle Plateforme</th>
                <th className="p-4">Statut & KYC</th>
                <th className="p-4">Contact & Ville</th>
                <th className="p-4">Date d'inscription</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-slate-500 mt-2">Chargement de la base d'utilisateurs...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <User className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">Aucun utilisateur trouvé.</p>
                    <p className="text-xs text-slate-500 mt-1">Modifiez vos mots-clés ou filtres de recherche.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPendingKYC = u.documents?.identityCard?.status === "manual_verification";
                  return (
                    <tr
                      key={u.id}
                      onClick={() => { setSelectedUser(u); setIsDetailsOpen(true); }}
                      className={cn(
                        "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer select-none",
                        u.isSuspended && "bg-rose-50/50 dark:bg-rose-500/5 hover:bg-rose-100/50 dark:hover:bg-rose-500/10"
                      )}
                    >
                      {/* Name & ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700 shrink-0">
                            <AvatarImage src={u.photoURL || `https://placehold.co/40x40/E0F8F8/008080/png?text=${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`} />
                            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-sm">
                              {u.companyName || `${u.firstName || ""} ${u.lastName || ""}`}
                              {u.isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-500 inline shrink-0" />}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{u.email}</p>
                            <span 
                              className="text-[9px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 font-bold"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ID: {u.id.substring(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">{renderRoleBadge(u.role)}</td>

                      {/* Status & KYC */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          {u.isSuspended ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-[9px] font-bold">
                              🛑 Suspendu
                            </Badge>
                          ) : u.isVerified ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 text-[9px] font-bold">
                              ✅ Actif Vérifié
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 text-[9px] font-bold">
                              ⚠️ Non Vérifié
                            </Badge>
                          )}

                          {isPendingKYC && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 text-[8px] font-bold animate-pulse">
                              🔍 KYC à valider
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Contact & Prefecture */}
                      <td className="p-4">
                        <div className="space-y-0.5 text-slate-800 dark:text-slate-200">
                          <p className="font-mono text-xs font-semibold">{u.phoneNumber || "Non renseigné"}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <MapPin size={10} className="text-indigo-500" />
                            {u.currentPrefecture || u.headquartersPrefecture || "Conakry"}
                          </p>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="p-4 text-slate-600 dark:text-slate-400 text-xs font-medium">
                        {u.createdAt?.toDate ? format(u.createdAt.toDate(), "dd MMM yyyy", { locale: fr }) : "N/A"}
                      </td>

                      {/* Actions dropdown */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-500">Actions Admin</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsDetailsOpen(true); }} className="gap-2">
                              <Eye size={14} className="text-indigo-600 dark:text-indigo-400" /> Fiche 360° Détaillée
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStartChat(u)} className="gap-2">
                              <MessageSquare size={14} className="text-sky-600 dark:text-sky-400" /> Démarrer un Chat
                            </DropdownMenuItem>

                            {!u.isVerified && u.role !== "admin" && (
                              <DropdownMenuItem onClick={() => handleVerify(u.id)} className="gap-2 text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck size={14} /> Valider le compte
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />

                            {u.isSuspended ? (
                              <DropdownMenuItem onClick={() => handleSuspend(u.id, false)} className="gap-2 text-emerald-600 dark:text-emerald-400">
                                <UserCheckIcon size={14} /> Réactiver le compte
                              </DropdownMenuItem>
                            ) : (
                              u.role !== "admin" && (
                                <DropdownMenuItem onClick={() => handleSuspend(u.id, true)} className="gap-2 text-rose-600 dark:text-rose-400">
                                  <UserX size={14} /> Suspendre le compte
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* RICH 360° USER DETAILS MODAL */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[650px] rounded-3xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Fiche Utilisateur 360°
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Supervision complète du profil, vérifications KYC et contrôles d'accès.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 py-2">
              {/* Header profile block */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:to-indigo-950/60 border border-slate-200 dark:border-slate-800">
                <Avatar className="h-16 w-16 border-2 border-indigo-500/30 shrink-0">
                  <AvatarImage src={selectedUser.photoURL || `https://placehold.co/80x80/E0F8F8/008080/png?text=${selectedUser.firstName?.[0] || ""}${selectedUser.lastName?.[0] || ""}`} />
                  <AvatarFallback className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-lg">{selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {selectedUser.companyName || `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{selectedUser.email}</p>
                  <div className="flex flex-wrap gap-1.5 items-center pt-1">
                    {renderRoleBadge(selectedUser.role)}
                    {selectedUser.isSuspended ? (
                      <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-[10px] font-bold">🛑 Suspendu</Badge>
                    ) : selectedUser.isVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-bold">✅ Vérifié</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-[10px] font-bold">⚠️ Non vérifié</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Informative fields grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">ID Utilisateur</span>
                  <span className="font-mono text-slate-800 dark:text-slate-300 select-all font-semibold text-[11px]">{selectedUser.id}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">Date d'inscription</span>
                  <span className="text-slate-800 dark:text-slate-300 font-medium">{selectedUser.createdAt?.toDate ? format(selectedUser.createdAt.toDate(), "PPP", { locale: fr }) : "N/A"}</span>
                </div>

                <div className="space-y-1 border-t border-slate-200 dark:border-slate-800/60 pt-2.5">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">Téléphone</span>
                  <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold">{selectedUser.phoneNumber || "Non renseigné"}</span>
                </div>

                <div className="space-y-1 border-t border-slate-200 dark:border-slate-800/60 pt-2.5">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">Localisation / Préfecture</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedUser.currentPrefecture || selectedUser.headquartersPrefecture || "Conakry"}</span>
                </div>

                {selectedUser.companyName && (
                  <div className="space-y-1 col-span-2 border-t border-slate-200 dark:border-slate-800/60 pt-2.5">
                    <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider block">Raison Sociale & NIF</span>
                    <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedUser.companyName} {selectedUser.rccm ? `(RCCM: ${selectedUser.rccm})` : ""}</span>
                  </div>
                )}
              </div>

              {/* KYC Identity Section */}
              {selectedUser.documents?.identityCard && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider block flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Vérification d'Identité (KYC)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-200 dark:border-slate-800/40 pt-3">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Type de pièce</span>
                      <span className="text-slate-800 dark:text-slate-300 font-medium">
                        {selectedUser.documents.identityCard.subType === "passport" ? "🛂 Passeport" : "🪪 Carte d'identité (CNI)"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold block">Numéro de pièce</span>
                      <span className="text-slate-900 dark:text-slate-200 font-mono font-bold">
                        {selectedUser.documents.identityCard.docNumber || "Non renseigné"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800/40 pt-2.5 flex items-center justify-between">
                    <span className="text-[9px] uppercase text-slate-500 font-bold">Pièce Téléversée</span>
                    {selectedUser.documents.identityCard.url ? (
                      <a 
                        href={selectedUser.documents.identityCard.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        <ExternalLink size={12} /> Voir la photo du document
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Aucun fichier</span>
                    )}
                  </div>

                  {/* Manual verification action block */}
                  {selectedUser.documents.identityCard.status === "manual_verification" && (
                    <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 space-y-2">
                      <p className="text-[11px] text-blue-800 dark:text-blue-300 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" /> Demande KYC en attente de décision administrative
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold py-1.5 h-auto border-0"
                          onClick={() => handleApproveManual(selectedUser.id)}
                        >
                          Approuver KYC
                        </Button>
                        <Button
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold py-1.5 h-auto border-0"
                          onClick={() => handleRejectManual(selectedUser.id)}
                        >
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Role Change Selector */}
              {selectedUser.role !== "admin" && (
                <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  <label className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider block">Changer le Rôle Utilisateur</label>
                  <Select 
                    onValueChange={(val) => handleChangeRole(selectedUser.id, val)} 
                    defaultValue={selectedUser.role}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 rounded-xl">
                      <SelectValue placeholder="Changer le rôle" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                      <SelectItem value="client">Client (Particulier)</SelectItem>
                      <SelectItem value="client-company">Client (Entreprise)</SelectItem>
                      <SelectItem value="transporter">Transporteur (Particulier)</SelectItem>
                      <SelectItem value="transporter-company">Flotte Transporteur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Actions Rapides</span>
                <div className="grid grid-cols-2 gap-2">
                  {!selectedUser.isVerified && selectedUser.role !== "admin" && (
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1.5 h-10 border-0"
                      onClick={() => {
                        handleVerify(selectedUser.id);
                        setSelectedUser((prev: any) => prev ? { ...prev, isVerified: true } : null);
                      }}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Valider le Profil
                    </Button>
                  )}

                  {selectedUser.role !== "admin" && (
                    <Button 
                      variant="outline"
                      className={cn(
                        "rounded-xl text-xs font-bold gap-1.5 h-10 border-slate-200 dark:border-slate-800",
                        selectedUser.isSuspended 
                          ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" 
                          : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      )}
                      onClick={() => {
                        const nextSuspend = !selectedUser.isSuspended;
                        handleSuspend(selectedUser.id, nextSuspend);
                        setSelectedUser((prev: any) => prev ? { ...prev, isSuspended: nextSuspend } : null);
                      }}
                    >
                      {selectedUser.isSuspended ? (
                        <><UserCheckIcon className="w-4 h-4" /> Réactiver le Compte</>
                      ) : (
                        <><UserX className="w-4 h-4" /> Suspendre le Compte</>
                      )}
                    </Button>
                  )}

                  <Button 
                    variant="outline"
                    className="border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold gap-1.5 h-10 col-span-2"
                    onClick={() => handleStartChat(selectedUser)}
                  >
                    <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    Démarrer un Chat d'Assistance Direct
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <Button 
              variant="outline" 
              className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 w-full font-bold text-xs h-10"
              onClick={() => setIsDetailsOpen(false)}
            >
              Fermer la Fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE NEW USER DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Inscrire un Nouvel Utilisateur
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Ajoutez manuellement un profil utilisateur ou une entreprise dans le réseau.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Prénom *</label>
                <Input
                  required
                  placeholder="Mamadou"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nom</label>
                <Input
                  placeholder="Diallo"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Adresse E-mail *</label>
              <Input
                required
                type="email"
                placeholder="mamadou.diallo@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Numéro de Téléphone</label>
              <Input
                placeholder="+224 620 00 00 00"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">Rôle sur TransConnekt</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200">
                  <SelectValue placeholder="Sélectionnez le rôle" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200">
                  <SelectItem value="client">Client Particulier</SelectItem>
                  <SelectItem value="client-company">Entreprise Client</SelectItem>
                  <SelectItem value="transporter">Transporteur Indépendant</SelectItem>
                  <SelectItem value="transporter-company">Flotte Transporteur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newRole === "client-company" || newRole === "transporter-company") && (
              <div className="space-y-1 animate-in fade-in-50">
                <label className="font-bold text-slate-700 dark:text-slate-300">Raison Sociale de l'Entreprise</label>
                <Input
                  placeholder="Guinée Transport Express SARL"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={creatingUser}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 px-4 border-0"
              >
                {creatingUser ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus size={14} className="mr-1" />}
                Créer l'Utilisateur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
