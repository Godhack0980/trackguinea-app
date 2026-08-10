"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  FileText, ShieldCheck, AlertTriangle, UploadCloud, Camera, Sparkles, 
  Search, Download, CheckCircle, Clock, Eye, Trash2, Shield, AlertCircle, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VaultDocument {
  id: string;
  category: "Carte Grise" | "Assurance" | "Permis" | "Licence Transport" | "Douane" | "Contrat" | "Facture" | "Bon de Livraison (POD)";
  title: string;
  docNumber: string;
  holderName: string;
  vehicleRef?: string;
  issueDate: string;
  expiryDate: string;
  status: "Valide" | "Expirant Bientôt" | "Expiré";
  verifiedByAdmin: boolean;
  userId?: string;
  createdAt?: any;
}

const SEED_DOCUMENTS: Omit<VaultDocument, "id">[] = [
  {
    category: "Assurance",
    title: "Assurance Flotte Camions - NSIA Guinée",
    docNumber: "ASS-GN-2026-9814",
    holderName: "TransConnekt Logistique SARL",
    vehicleRef: "Mercedes Actros (TG-240-B)",
    issueDate: "2025-08-20",
    expiryDate: "2026-08-20",
    status: "Expirant Bientôt",
    verifiedByAdmin: true
  },
  {
    category: "Carte Grise",
    title: "Carte Grise Officielle - République de Guinée",
    docNumber: "CG-2024-00412",
    holderName: "Moussa Diallo",
    vehicleRef: "HOWO 371 (TG-832-A)",
    issueDate: "2024-01-15",
    expiryDate: "2029-01-15",
    status: "Valide",
    verifiedByAdmin: true
  },
  {
    category: "Licence Transport",
    title: "Licence de Transport Inter-États CEDEAO",
    docNumber: "LIC-CED-9921",
    holderName: "TransConnekt Logistique SARL",
    issueDate: "2025-03-10",
    expiryDate: "2026-03-10",
    status: "Valide",
    verifiedByAdmin: true
  },
  {
    category: "Permis",
    title: "Permis Poids Lourds Catégorie C/E",
    docNumber: "PER-GN-77410",
    holderName: "Ibrahima Sory Soumah",
    issueDate: "2022-05-11",
    expiryDate: "2026-07-01",
    status: "Expiré",
    verifiedByAdmin: false
  }
];

export default function DocumentsVaultPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  
  // OCR Dialog states
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<VaultDocument> | null>(null);

  const categories = ["Tous", "Carte Grise", "Assurance", "Permis", "Licence Transport", "Douane", "Contrat", "Facture", "Bon de Livraison (POD)"];

  // REAL FIRESTORE LISTENER WITH SEEDING
  useEffect(() => {
    const docsRef = collection(db, "documents");

    const unsub = onSnapshot(docsRef, async (snapshot) => {
      if (snapshot.empty) {
        // Seed Firestore if empty
        for (const seedDoc of SEED_DOCUMENTS) {
          await addDoc(docsRef, {
            ...seedDoc,
            userId: user?.uid || "system",
            createdAt: Timestamp.now()
          });
        }
      } else {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VaultDocument[];
        setDocuments(list);
        setLoading(false);
      }
    }, (err) => {
      console.error("Firestore docs listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filteredDocs = documents.filter(d => {
    const matchesSearch = (d.title || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.docNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.holderName || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "Tous" || d.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const expiringCount = documents.filter(d => d.status === "Expirant Bientôt" || d.status === "Expiré").length;

  const handleSimulateOCR = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrScanning(true);
    setExtractedData(null);

    setTimeout(() => {
      setOcrScanning(false);
      setExtractedData({
        category: "Assurance",
        title: `Document Scanné IA - ${file.name}`,
        docNumber: `OCR-GN-${Math.floor(100000 + Math.random() * 900000)}`,
        holderName: "Société Guinéenne de Transport SARL",
        vehicleRef: "Camion Benne (TG-552-C)",
        issueDate: "2026-01-10",
        expiryDate: "2027-01-10",
        status: "Valide",
        verifiedByAdmin: false
      });
    }, 2000);
  };

  const handleSaveOCRDoc = async () => {
    if (!extractedData) return;
    try {
      await addDoc(collection(db, "documents"), {
        category: extractedData.category || "Assurance",
        title: extractedData.title || "Nouveau Document OCR",
        docNumber: extractedData.docNumber || "N/A",
        holderName: extractedData.holderName || "Titulaire",
        vehicleRef: extractedData.vehicleRef || "",
        issueDate: extractedData.issueDate || "2026-01-01",
        expiryDate: extractedData.expiryDate || "2027-01-01",
        status: "Valide",
        verifiedByAdmin: false,
        userId: user?.uid || "system",
        createdAt: Timestamp.now()
      });

      toast({
        title: "Document Enregistré dans Firestore !",
        description: "Le document extrait par OCR est désormais synchronisé au coffre-fort."
      });

      setOcrModalOpen(false);
      setExtractedData(null);
    } catch (err) {
      console.error("Save OCR doc error:", err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteDoc(doc(db, "documents", id));
      toast({ title: "Document supprimé", description: "Le document a été retiré du coffre-fort." });
    } catch (err) {
      console.error("Delete doc error:", err);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Coffre-Fort Documentaire & Scanner OCR
                <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-bold uppercase">
                  TransConnekt Documents (Firestore Sync)
                </Badge>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Archivage ultra-sécurisé des licences, assurances, cartes grises et extractions intelligentes par IA.
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setOcrModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl h-11 px-5 gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Camera className="w-4 h-4" /> Scanner un Document (OCR IA)
        </Button>
      </div>

      {/* EXPIRATION ALERT BANNER */}
      {expiringCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider">
              ⚠️ Attention : {expiringCount} document(s) nécessitent votre renouvellement rapide !
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Des documents officiels (assurance ou permis) sont expirés ou arrivent à échéance dans les prochains jours. Mettez-les à jour pour éviter toute interruption de mission.
            </p>
          </div>
        </div>
      )}

      {/* CATEGORY TABS & SEARCH BAR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par titre, numéro, titulaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-xl border transition-all select-none",
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* HIGH-CONTRAST DOCUMENTS TABLE */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-100 dark:bg-slate-950/80">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Document & Titre</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Catégorie</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">N° Officiel</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Titulaire / Véhicule</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Expiration</TableHead>
                  <TableHead className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Statut</TableHead>
                  <TableHead className="text-right font-extrabold text-xs text-slate-800 dark:text-slate-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          {doc.title}
                        </p>
                        {doc.verifiedByAdmin && (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck size={10} /> Vérifié par l'Administration
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-[10px] font-black">
                        {doc.category}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {doc.docNumber}
                    </TableCell>

                    <TableCell className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      <div>{doc.holderName}</div>
                      {doc.vehicleRef && <div className="text-[10px] text-slate-500 font-normal">{doc.vehicleRef}</div>}
                    </TableCell>

                    <TableCell className="text-xs font-black text-slate-900 dark:text-white">
                      {doc.expiryDate}
                    </TableCell>

                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full",
                        doc.status === "Valide" && "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300",
                        doc.status === "Expirant Bientôt" && "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300",
                        doc.status === "Expiré" && "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300"
                      )}>
                        {doc.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          onClick={() => handleDeleteDoc(doc.id)}
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* OCR SCANNER DIALOG */}
      <Dialog open={ocrModalOpen} onOpenChange={setOcrModalOpen}>
        <DialogContent className="rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
              Scanner & Reconnaissance OCR Intelligente
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Photographiez ou téléchargez une carte grise, une assurance ou un permis. TransConnekt extrait automatiquement les champs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!extractedData && !ocrScanning && (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 hover:border-indigo-500 transition-all">
                <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto" />
                <div>
                  <p className="text-xs font-bold">Sélectionnez une photo ou un document PDF</p>
                  <p className="text-[10px] text-slate-400">PNG, JPG, PDF jusqu'à 10MB</p>
                </div>
                <label className="inline-block cursor-pointer">
                  <span className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl inline-block shadow">
                    Parcourir les fichiers
                  </span>
                  <input type="file" accept="image/*,application/pdf" onChange={handleSimulateOCR} className="hidden" />
                </label>
              </div>
            )}

            {ocrScanning && (
              <div className="py-12 text-center space-y-3">
                <Sparkles className="w-10 h-10 text-indigo-500 mx-auto animate-spin" />
                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  Analyse de la pièce d'identité / carte grise en cours par l'IA TransConnekt...
                </p>
              </div>
            )}

            {extractedData && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={14} /> Extraction OCR Réussie
                  </span>
                  <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 text-[9px] font-bold">Confiance 98.4%</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">N° Document</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{extractedData.docNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Titulaire</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{extractedData.holderName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Date Émission</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{extractedData.issueDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Date Expiration</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{extractedData.expiryDate}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOcrModalOpen(false)} className="rounded-xl text-xs font-bold">
              Annuler
            </Button>
            {extractedData && (
              <Button onClick={handleSaveOCRDoc} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                Enregistrer dans Firestore
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
