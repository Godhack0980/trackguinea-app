"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  ShieldAlert, Landmark, AlertTriangle, FileText, CheckCircle2, Clock, 
  MessageSquare, Lock, Scale, Eye, MapPin, Upload, Image as ImageIcon, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DisputeCase {
  id: string;
  tripId: string;
  clientName: string;
  transporterName: string;
  motive: "Marchandise endommagée" | "Livraison en retard" | "Prix différent de l'offre" | "Marchandise non livrée";
  amountGNF: number;
  escrowStatus: "Paiement Sécurisé (Bloqué)" | "Libéré au Transporteur" | "Remboursé au Client" | "En Arbitrage";
  disputeStatus: "Nouveau" | "En Cours d'Instruction" | "Preuves Soumises" | "Résolu";
  createdAt: string;
  description: string;
  evidenceCount: number;
}

const SEED_DISPUTES: Omit<DisputeCase, "id">[] = [
  {
    tripId: "TG-CRS-8841",
    clientName: "Soguipah SA",
    transporterName: "Kankan Transport Express",
    motive: "Marchandise endommagée",
    amountGNF: 14500000,
    escrowStatus: "En Arbitrage",
    disputeStatus: "En Cours d'Instruction",
    createdAt: "2026-08-05",
    description: "Sacs de ciment altérés par la pluie durant le trajet Conakry-Kankan. Bâche défectueuse.",
    evidenceCount: 3
  },
  {
    tripId: "TG-CRS-2104",
    clientName: "Bauxite Trading Guinea",
    transporterName: "Diallo & Frères Logistique",
    motive: "Livraison en retard",
    amountGNF: 8900000,
    escrowStatus: "Paiement Sécurisé (Bloqué)",
    disputeStatus: "Nouveau",
    createdAt: "2026-08-07",
    description: "Retard de 28 heures sur le créneau convenu au port de Kamsar sans notification.",
    evidenceCount: 1
  }
];

export default function DisputeResolutionCenterPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [openNewDisputeModal, setOpenNewDisputeModal] = useState(false);

  // New dispute form state
  const [tripIdInput, setTripIdInput] = useState("");
  const [motiveInput, setMotiveInput] = useState<DisputeCase["motive"]>("Marchandise endommagée");
  const [descInput, setDescInput] = useState("");

  // REAL FIRESTORE LISTENERS & SEEDING
  useEffect(() => {
    const disputesRef = collection(db, "disputes");

    const unsub = onSnapshot(disputesRef, async (snapshot) => {
      if (snapshot.empty) {
        for (const seed of SEED_DISPUTES) {
          await addDoc(disputesRef, {
            ...seed,
            userId: user?.uid || "system",
            createdTimestamp: Timestamp.now()
          });
        }
      } else {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DisputeCase[];
        setDisputes(list);
        setLoading(false);
      }
    }, (err) => {
      console.error("Firestore disputes listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleCreateDispute = async () => {
    if (!tripIdInput || !descInput) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez remplir la référence de course et la description." });
      return;
    }

    try {
      await addDoc(collection(db, "disputes"), {
        tripId: tripIdInput,
        clientName: userData?.companyName || userData?.firstName || "Votre Entreprise",
        transporterName: "Transporteur Attribué",
        motive: motiveInput,
        amountGNF: 9500000,
        escrowStatus: "En Arbitrage",
        disputeStatus: "Nouveau",
        createdAt: new Date().toISOString().split("T")[0],
        description: descInput,
        evidenceCount: 1,
        userId: user?.uid || "system",
        createdTimestamp: Timestamp.now()
      });

      toast({
        title: "Litige enregistré dans Firestore !",
        description: "Le dossier a été ouvert et transmis au centre d'arbitrage TransConnekt. Les fonds restent bloqués."
      });

      setOpenNewDisputeModal(false);
      setTripIdInput("");
      setDescInput("");
    } catch (err) {
      console.error("Create dispute error:", err);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Scale className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Centre de Résolution des Litiges & Séquestre
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 text-[10px] font-bold uppercase">
                  Garantie TransConnekt (Firestore Sync)
                </Badge>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Système de paiement séquestre protégé avec arbitrage impartial des contestations de livraison.
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setOpenNewDisputeModal(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl h-11 px-5 gap-2 shadow-lg shadow-rose-600/20"
        >
          <ShieldAlert className="w-4 h-4" /> Ouvrir une Réclamation Litige
        </Button>
      </div>

      {/* ESCROW GUARANTEE BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-1">
          <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" /> Sécurité des Fonds
          </span>
          <p className="text-sm font-black text-emerald-400">Paiement Bloqué à la Commande</p>
          <p className="text-[11px] text-slate-400 leading-tight">L'argent est conservé en compte séquestre neutre jusqu'à validation de la livraison sans réserve.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-1">
          <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
            <Scale className="w-3 h-3 text-indigo-400" /> Délais de Réclamation
          </span>
          <p className="text-sm font-black text-indigo-400">48h après Réception POD</p>
          <p className="text-[11px] text-slate-400 leading-tight">Chaque client dispose de 48 heures pour signaler une anomalie avant libération automatique des fonds.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-1">
          <span className="text-[9px] uppercase font-bold text-slate-400 block flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400" /> Arbitrage TransConnekt
          </span>
          <p className="text-sm font-black text-amber-400">Preuves GPS & Photos POD</p>
          <p className="text-[11px] text-slate-400 leading-tight">L'équipe d'administration tranche sur la base des relevés télématiques et photos de livraison horodatées.</p>
        </div>
      </div>

      {/* DISPUTES HIGH-CONTRAST TABLE */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <CardTitle className="text-base font-black text-slate-900 dark:text-white">
            Dossiers de Litige en Cours (Firestore)
          </CardTitle>
        </CardHeader>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin h-8 w-8 text-rose-500" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-100 dark:bg-slate-950/80">
              <TableRow className="border-b border-slate-200 dark:border-slate-800">
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Réf. Litige & Course</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Motif de Réclamation</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Parties Prénommées</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Montant Séquestre</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">État du Séquestre</TableHead>
                <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Statut Dossier</TableHead>
                <TableHead className="text-right font-extrabold text-xs text-slate-800 dark:text-slate-200">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((d) => (
                <TableRow key={d.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-mono font-bold text-slate-900 dark:text-white text-xs">{d.id}</p>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">{d.tripId}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge className="bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 text-[10px] font-bold">
                      {d.motive}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                    <div>👤 Client : <strong>{d.clientName}</strong></div>
                    <div className="text-[10px] text-slate-500 font-medium">🚚 Transporteur : {d.transporterName}</div>
                  </TableCell>

                  <TableCell className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                    {d.amountGNF.toLocaleString("fr-FR")} GNF
                  </TableCell>

                  <TableCell>
                    <Badge className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                      d.escrowStatus === "Paiement Sécurisé (Bloqué)" && "bg-emerald-100 text-emerald-900 border border-emerald-300",
                      d.escrowStatus === "En Arbitrage" && "bg-amber-100 text-amber-900 border border-amber-300"
                    )}>
                      🔒 {d.escrowStatus}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 text-[10px] font-bold">
                      {d.disputeStatus}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      onClick={() => { setSelectedDispute(d); setOpenDetailModal(true); }}
                      variant="outline"
                      className="h-8 text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700"
                    >
                      <Eye size={12} className="mr-1" /> Dossier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* NEW DISPUTE MODAL */}
      <Dialog open={openNewDisputeModal} onOpenChange={setOpenNewDisputeModal}>
        <DialogContent className="rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Ouvrir un Litige sur une Course
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Veuillez fournir la référence de la course et le motif de réclamation. Les fonds en séquestre resteront bloqués.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold">ID / Code de la Course (#TG-CRS-XXXX)</label>
              <Input
                placeholder="Ex: TG-CRS-8841"
                value={tripIdInput}
                onChange={(e) => setTripIdInput(e.target.value)}
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold">Motif de la Réclamation</label>
              <select
                value={motiveInput}
                onChange={(e) => setMotiveInput(e.target.value as any)}
                className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 text-xs font-semibold"
              >
                <option value="Marchandise endommagée">Marchandise endommagée</option>
                <option value="Livraison en retard">Livraison en retard</option>
                <option value="Prix différent de l'offre">Prix différent de l'offre</option>
                <option value="Marchandise non livrée">Marchandise non livrée</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold">Description détaillée des faits</label>
              <Textarea
                placeholder="Expliquez précisément l'anomalie constatée lors du transit..."
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNewDisputeModal(false)} className="rounded-xl text-xs font-bold">
              Annuler
            </Button>
            <Button onClick={handleCreateDispute} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold">
              Soumettre dans Firestore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
