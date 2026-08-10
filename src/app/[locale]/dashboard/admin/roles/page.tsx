"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, Timestamp, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Users, Building2, ShieldCheck, KeyRound, MapPin, CheckCircle2, 
  Plus, Edit, Loader2, UserCheck, ShieldAlert 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Agency {
  id: string;
  name: string;
  city: string;
  country: string;
  activeTransportsCount: number;
  managerName: string;
}

interface UserRolePermission {
  roleKey: string;
  roleName: string;
  description: string;
  permissions: {
    viewFinances: boolean;
    manageFleet: boolean;
    manageUsers: boolean;
    acceptRequests: boolean;
    viewAnalytics: boolean;
  };
}

const DEFAULT_ROLES: UserRolePermission[] = [
  {
    roleKey: "owner",
    roleName: "Propriétaire (Owner)",
    description: "Accès intégral sans restriction à l'ensemble du système et des finances.",
    permissions: { viewFinances: true, manageFleet: true, manageUsers: true, acceptRequests: true, viewAnalytics: true }
  },
  {
    roleKey: "admin",
    roleName: "Administrateur Site",
    description: "Gestion opérationnelle, supervision des chauffeurs et traitement des demandes.",
    permissions: { viewFinances: true, manageFleet: true, manageUsers: true, acceptRequests: true, viewAnalytics: true }
  },
  {
    roleKey: "dispatcher",
    roleName: "Dispatcher / Régulateur",
    description: "Attribution des missions aux chauffeurs et suivi du transit GPS en temps réel.",
    permissions: { viewFinances: false, manageFleet: true, manageUsers: false, acceptRequests: true, viewAnalytics: false }
  },
  {
    roleKey: "accountant",
    roleName: "Comptable / Finance",
    description: "Gestion des factures, paiements séquestres et suivi de la trésorerie.",
    permissions: { viewFinances: true, manageFleet: false, manageUsers: false, acceptRequests: false, viewAnalytics: true }
  },
  {
    roleKey: "driver",
    roleName: "Chauffeur",
    description: "Accès exclusif à l'interface mobile de mission et soumission des reçus POD.",
    permissions: { viewFinances: false, manageFleet: false, manageUsers: false, acceptRequests: false, viewAnalytics: false }
  }
];

const SEED_AGENCIES: Omit<Agency, "id">[] = [
  { name: "Agence Centrale Conakry", city: "Conakry", country: "Guinée", activeTransportsCount: 42, managerName: "Amadou Bah" },
  { name: "Agence Régionale Kindia", city: "Kindia", country: "Guinée", activeTransportsCount: 18, managerName: "Mamadou Sow" },
  { name: "Agence Logistique Labé", city: "Labé", country: "Guinée", activeTransportsCount: 14, managerName: "Ousmane Diallo" },
  { name: "Hub International Bamako", city: "Bamako", country: "Mali", activeTransportsCount: 29, managerName: "Ibrahim Traoré" },
  { name: "Hub Maritime Dakar", city: "Dakar", country: "Sénégal", activeTransportsCount: 22, managerName: "Sékou Diop" }
];

export default function RolesAndAgenciesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [roles, setRoles] = useState<UserRolePermission[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);

  // Agency Creation Modal
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [newAgencyCity, setNewAgencyCity] = useState("Conakry");
  const [newAgencyCountry, setNewAgencyCountry] = useState("Guinée");
  const [newAgencyManager, setNewAgencyManager] = useState("");

  // REAL FIRESTORE LISTENERS & SEEDING FOR AGENCIES
  useEffect(() => {
    const agenciesRef = collection(db, "agencies");

    const unsub = onSnapshot(agenciesRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const seed of SEED_AGENCIES) {
          await addDoc(agenciesRef, {
            ...seed,
            createdAt: Timestamp.now()
          });
        }
      } else {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Agency[];
        setAgencies(list);
        setLoading(false);
      }
    }, (err) => {
      console.error("Firestore agencies listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateAgency = async () => {
    if (!newAgencyName || !newAgencyManager) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez renseigner le nom et le responsable de l'agence." });
      return;
    }

    try {
      await addDoc(collection(db, "agencies"), {
        name: newAgencyName,
        city: newAgencyCity,
        country: newAgencyCountry,
        activeTransportsCount: 0,
        managerName: newAgencyManager,
        createdAt: Timestamp.now()
      });

      toast({
        title: "Agence créée dans Firestore !",
        description: `L'agence "${newAgencyName}" a été ajoutée au réseau TransConnekt.`
      });

      setAgencyModalOpen(false);
      setNewAgencyName("");
      setNewAgencyManager("");
    } catch (err) {
      console.error("Create agency error:", err);
    }
  };

  const handleTogglePermission = (roleKey: string, permKey: keyof UserRolePermission["permissions"]) => {
    setRoles(roles.map(r => {
      if (r.roleKey === roleKey) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [permKey]: !r.permissions[permKey]
          }
        };
      }
      return r;
    }));

    toast({
      title: "Matrice de permissions mise à jour",
      description: `La permission pour le rôle ${roleKey} a été modifiée.`
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Gestion des Rôles (RBAC) & Multi-Agences
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-bold uppercase">
                  TransConnekt Company (Firestore Sync)
                </Badge>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Structure hiérarchique multi-sites (Conakry, Kindia, Labé, Bamako, Dakar) & matrice de permissions.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setAgencyModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl h-11 px-5 gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Ajouter une Agence / Hub
        </Button>
      </div>

      {/* AGENCIES MULTI-SITE GRID */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-500" /> Réseau d'Agences & Hubs Logistiques ({agencies.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencies.map((agency) => (
              <Card key={agency.id} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm">
                      {agency.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} className="text-indigo-500" /> {agency.city}, {agency.country}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 text-[10px] font-bold">
                    {agency.activeTransportsCount} transports actifs
                  </Badge>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-500">Responsable d'agence :</span>
                  <span className="font-bold text-slate-900 dark:text-white">{agency.managerName}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RBAC PERMISSIONS MATRIX */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-500" /> Matrice Précise des Rôles & Autorisations (RBAC)
        </h2>

        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-slate-100 dark:bg-slate-950/80">
              <TableRow className="border-b border-slate-200 dark:border-slate-800">
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Rôle & Périmètre</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200 text-center">Finances & Tarifs</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200 text-center">Gestion Flotte</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200 text-center">Gestion Utilisateurs</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200 text-center">Acceptation Demandes</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200 text-center">Analytics BI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.roleKey} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-black text-slate-900 dark:text-white text-xs">{r.roleName}</p>
                      <p className="text-[11px] text-slate-500">{r.description}</p>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <Switch
                      checked={r.permissions.viewFinances}
                      onCheckedChange={() => handleTogglePermission(r.roleKey, "viewFinances")}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <Switch
                      checked={r.permissions.manageFleet}
                      onCheckedChange={() => handleTogglePermission(r.roleKey, "manageFleet")}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <Switch
                      checked={r.permissions.manageUsers}
                      onCheckedChange={() => handleTogglePermission(r.roleKey, "manageUsers")}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <Switch
                      checked={r.permissions.acceptRequests}
                      onCheckedChange={() => handleTogglePermission(r.roleKey, "acceptRequests")}
                    />
                  </TableCell>

                  <TableCell className="text-center">
                    <Switch
                      checked={r.permissions.viewAnalytics}
                      onCheckedChange={() => handleTogglePermission(r.roleKey, "viewAnalytics")}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* CREATE AGENCY DIALOG */}
      <Dialog open={agencyModalOpen} onOpenChange={setAgencyModalOpen}>
        <DialogContent className="rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Ajouter une Nouvelle Agence / Hub
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Renseignez l'implantation géographique et le responsable d'agence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold">Nom de l'Agence (ex: Agence Centrale Kankan)</label>
              <Input
                placeholder="Ex: Agence Régionale Kankan"
                value={newAgencyName}
                onChange={(e) => setNewAgencyName(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold">Ville</label>
                <Input
                  placeholder="Ex: Kankan"
                  value={newAgencyCity}
                  onChange={(e) => setNewAgencyCity(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold">Pays</label>
                <Input
                  placeholder="Ex: Guinée"
                  value={newAgencyCountry}
                  onChange={(e) => setNewAgencyCountry(e.target.value)}
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold">Nom du Responsable d'Agence</label>
              <Input
                placeholder="Ex: Lansana Camara"
                value={newAgencyManager}
                onChange={(e) => setNewAgencyManager(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAgencyModalOpen(false)} className="rounded-xl text-xs font-bold">
              Annuler
            </Button>
            <Button onClick={handleCreateAgency} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
              Créer dans Firestore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
