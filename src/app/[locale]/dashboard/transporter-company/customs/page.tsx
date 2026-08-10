"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, ShieldCheck, Landmark, UploadCloud, FileSpreadsheet, RefreshCw, Send } from "lucide-react";
import { useTranslation } from "@/lib/translations";

export default function CustomsPage() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [form, setForm] = useState({
    registration: "",
    cargoDescription: "",
    originCountry: "Guinée",
    brokerName: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const companyId = userData?.companyId || user?.uid;

  // Listen to declarations in real-time
  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, "customs_declarations"),
      where("companyId", "==", companyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory to avoid index requirements
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setDeclarations(docs);
      setLoading(false);
    }, (err) => {
      console.error("Customs listen error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmitDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) return;
    if (!form.registration || !form.cargoDescription || !selectedFile) {
      toast({ variant: "destructive", title: "Champs requis", description: "Veuillez remplir les informations et joindre le document DAU." });
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);
    try {
      // 1. Upload DAU File
      const fileRef = ref(storage, `customs-docs/${user.uid}/${Date.now()}_${selectedFile.name}`);
      const uploadTask = uploadBytesResumable(fileRef, selectedFile);

      uploadTask.on("state_changed", (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 80) + 10;
        setUploadProgress(progress);
      });

      const snapshot = await uploadTask;
      const fileUrl = await getDownloadURL(snapshot.ref);
      setUploadProgress(95);

      // 2. Save Declaration in Firestore
      await addDoc(collection(db, "customs_declarations"), {
        ...form,
        companyId,
        fileName: selectedFile.name,
        fileUrl,
        status: "Déposé", // Déposé, En Cours, Validé, Rejeté
        channel: "Orange", // Orange (checking docs), Rouge (physical check), Vert (fully cleared)
        sydoniaRef: "",
        createdAt: Timestamp.now()
      });

      toast({ title: "Déclaration créée ✅", description: "Le document douanier DAU a été enregistré avec succès." });
      setForm({ registration: "", cargoDescription: "", originCountry: "Guinée", brokerName: "" });
      setSelectedFile(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message || "Impossible de soumettre le document." });
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleSydoniaSubmit = async (decId: string) => {
    // Real updates in Firestore representing SYDONIA system execution
    toast({ title: "Envoi à SYDONIA... 📡", description: "Transmission des données douanières en cours." });
    try {
      const sydRef = `SYD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      // Mock SYDONIA random channel feedback
      const channels = ["Vert", "Orange", "Rouge"];
      const finalChannel = channels[Math.floor(Math.random() * channels.length)];
      const finalStatus = finalChannel === "Vert" ? "Validé" : finalChannel === "Orange" ? "En Cours" : "Inspection Requise";

      await updateDoc(doc(db, "customs_declarations", decId), {
        sydoniaRef: sydRef,
        status: finalStatus,
        channel: finalChannel,
        submittedToSydoniaAt: Timestamp.now()
      });

      toast({ 
        title: "Retour SYDONIA ✅", 
        description: `Enregistré sous réf: ${sydRef}. Affecté au Canal ${finalChannel}.` 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur SYDONIA", description: "Impossible de communiquer avec le serveur douanier." });
    }
  };

  const getChannelBadge = (channel: string) => {
    const colors: Record<string, string> = {
      Vert: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      Orange: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      Rouge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[channel] || colors["Orange"]}`}>
        Canal {channel || "Orange"}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.customs_title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.customs_subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire de Déclaration */}
        <Card className="lg:col-span-1 border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Landmark size={20} className="text-indigo-400" /> {t.customs_new_dec}
            </CardTitle>
            <CardDescription>Téléversez votre DAU et liez-le à un véhicule.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitDeclaration} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="registration">Immatriculation du véhicule *</Label>
                <Input 
                  id="registration" 
                  placeholder="RC-2026-A" 
                  className="bg-background border-border text-foreground"
                  value={form.registration}
                  onChange={e => setForm(f => ({ ...f, registration: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cargoDesc">{t.customs_cargo_desc} *</Label>
                <Input 
                  id="cargoDesc" 
                  placeholder="Ex: 20 Tonnes de Bauxite" 
                  className="bg-background border-border text-foreground"
                  value={form.cargoDescription}
                  onChange={e => setForm(f => ({ ...f, cargoDescription: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="origin">Pays de provenance</Label>
                  <Input 
                    id="origin" 
                    value={form.originCountry}
                    className="bg-background border-border text-foreground"
                    onChange={e => setForm(f => ({ ...f, originCountry: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="broker">Déclarant en douane</Label>
                  <Input 
                    id="broker" 
                    placeholder="Nom du déclarant" 
                    className="bg-background border-border text-foreground"
                    value={form.brokerName}
                    onChange={e => setForm(f => ({ ...f, brokerName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Fichier DAU (PDF / Image) *</Label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all text-center">
                  <input 
                    type="file" 
                    accept=".pdf,image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-slate-400">
                    <UploadCloud size={24} className="text-indigo-400 animate-pulse" />
                    <span>{selectedFile ? selectedFile.name : "Cliquez ou glissez le document DAU ici"}</span>
                    <span className="text-[10px] text-slate-500">Formats acceptés : PDF, PNG, JPG (Max. 5 Mo)</span>
                  </div>
                </div>
              </div>

              {submitting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-indigo-400 font-bold">
                    <span>Téléversement du DAU...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet size={16} />} {t.customs_submit_dec}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Historique et Actions Douane */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              {t.customs_active_dec}
            </CardTitle>
            <CardDescription>{t.customs_active_desc}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : declarations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <FileText size={32} className="mx-auto opacity-30 text-indigo-400" />
                <p className="font-bold">Aucune déclaration enregistrée</p>
                <p className="text-xs">Renseignez le formulaire de gauche pour déposer votre premier dossier douanier DAU.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[650px] text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-slate-950/20 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="p-4 pl-6">Véhicule & Contenu</th>
                      <th className="p-4">Statut Douane</th>
                      <th className="p-4">Réf SYDONIA</th>
                      <th className="p-4 pr-6 text-right">Passerelle SYDONIA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {declarations.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-900/30 transition-all">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{d.registration}</span>
                            <span className="text-xs text-muted-foreground">{d.cargoDescription}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">Provenance: {d.originCountry} | Déclarant: {d.brokerName || "N/A"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            {getChannelBadge(d.channel)}
                            <span className="text-[10px] text-slate-400">Statut: {d.status}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-indigo-400 font-semibold">
                          {d.sydoniaRef ? d.sydoniaRef : <span className="text-slate-500 italic">Non soumis</span>}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {!d.sydoniaRef ? (
                            <Button 
                              onClick={() => handleSydoniaSubmit(d.id)}
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-xs rounded-lg flex items-center gap-1.5 font-bold"
                            >
                              <Send size={12} /> Soumettre à SYDONIA
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              <ShieldCheck size={12} /> Enregistré SYDONIA
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
