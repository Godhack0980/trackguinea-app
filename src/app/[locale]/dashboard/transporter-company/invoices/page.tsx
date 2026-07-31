"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Coins, Plus, Trash2, Printer, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { useTranslation } from "@/lib/translations";

export default function InvoicesPage() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invoice Selection for rendering
  const [selectedInvoiceMission, setSelectedInvoiceMission] = useState<any | null>(null);

  // Form for logging a cost
  const [costForm, setCostForm] = useState({
    missionId: "",
    fuelCost: "",
    tollCost: "",
    driverAllowance: "",
    otherCost: "",
    notes: ""
  });

  const companyId = userData?.companyId || user?.uid;

  // Listen to missions (requests that are assigned to this transporter)
  useEffect(() => {
    if (!companyId) return;
    
    // We fetch bids of this transporter to get associated requests
    const bidsQuery = query(
      collection(db, "bids"),
      where("transporterId", "==", companyId),
      where("status", "==", "Accepté")
    );

    const unsubBids = onSnapshot(bidsQuery, (bidsSnap) => {
      const activeRequestIds = bidsSnap.docs.map(doc => doc.data().requestId);
      if (activeRequestIds.length === 0) {
        setMissions([]);
        setLoading(false);
        return;
      }

      // Fetch requests
      const requestsQuery = query(collection(db, "requests"));
      const unsubRequests = onSnapshot(requestsQuery, (reqSnap) => {
        const list = reqSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((req: any) => activeRequestIds.includes(req.id));

        setMissions(list);
        setLoading(false);
      });

      return () => unsubRequests();
    });

    return () => unsubBids();
  }, [companyId]);

  // Listen to costs logged
  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, "mission_costs"), where("companyId", "==", companyId));
    const unsub = onSnapshot(q, (snap) => {
      setCosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [companyId]);

  // Compute analytics
  const analytics = useMemo(() => {
    let totalRevenue = 0;
    let totalExpenses = 0;

    // Completed missions revenue
    missions.forEach((m: any) => {
      if (m.status === "Terminé" && m.price) {
        totalRevenue += Number(m.price);
      }
    });

    // Expenses
    costs.forEach((c: any) => {
      totalExpenses += Number(c.fuelCost || 0) + Number(c.tollCost || 0) + Number(c.driverAllowance || 0) + Number(c.otherCost || 0);
    });

    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 100;

    return { totalRevenue, totalExpenses, netProfit, margin };
  }, [missions, costs]);

  const handleLogCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !costForm.missionId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner une mission." });
      return;
    }

    try {
      const fuel = Number(costForm.fuelCost) || 0;
      const toll = Number(costForm.tollCost) || 0;
      const allowance = Number(costForm.driverAllowance) || 0;
      const other = Number(costForm.otherCost) || 0;

      await addDoc(collection(db, "mission_costs"), {
        missionId: costForm.missionId,
        companyId,
        fuelCost: fuel,
        tollCost: toll,
        driverAllowance: allowance,
        otherCost: other,
        notes: costForm.notes,
        createdAt: Timestamp.now()
      });

      toast({ title: "Frais enregistrés ✅", description: "Les coûts opérationnels ont été liés à la mission." });
      setCostForm({ missionId: "", fuelCost: "", tollCost: "", driverAllowance: "", otherCost: "", notes: "" });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les frais." });
    }
  };

  const handleDeleteCost = async (costId: string) => {
    try {
      await updateDoc(doc(db, "mission_costs", costId), {
        deleted: true // or remove doc
      });
      // to keep it simple, we delete
      // await deleteDoc(doc(db, "mission_costs", costId))
    } catch {}
  };

  // HTML Print Window Renderer for dynamic vector PDF generation
  const handlePrintInvoice = (mission: any) => {
    const missionCost = costs.find(c => c.missionId === mission.id) || { fuelCost: 0, tollCost: 0, driverAllowance: 0, otherCost: 0 };
    const priceVal = Number(mission.price) || 0;
    const totalTolls = Number(missionCost.tollCost) || 0;
    const allowance = Number(missionCost.driverAllowance) || 0;
    
    // Invoice Math
    const subtotal = priceVal;
    const vat = Math.round(subtotal * 0.18); // TVA 18% in Guinea
    const total = subtotal + vat;

    const printContent = `
      <html>
        <head>
          <title>Facture_${mission.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 800; color: #4f46e5; }
            .invoice-details { text-align: right; font-size: 14px; line-height: 1.5; }
            .address-box { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; }
            .address-col { width: 48%; }
            .title { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #0f172a; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; padding: 12px; font-size: 12px; font-weight: 700; text-align: left; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
            td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
            .total-section { display: flex; justify-content: flex-end; }
            .total-table { width: 350px; }
            .total-table td { padding: 8px 12px; border: none; }
            .total-table tr.grand-total td { font-size: 16px; font-weight: 800; color: #4f46e5; border-top: 1px solid #e2e8f0; }
            .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">TRANSCONNEKT</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Plateforme Logistique Guinéenne</div>
            </div>
            <div class="invoice-details">
              <strong style="font-size: 16px;">FACTURE</strong><br/>
              N° : INV-2026-${mission.id.substring(7, 12).toUpperCase()}<br/>
              Date : ${new Date().toLocaleDateString('fr-FR')}<br/>
              Échéance : Paiement immédiat
            </div>
          </div>

          <div class="address-box">
            <div class="address-col">
              <strong style="color: #64748b;">ÉMETTEUR (TRANSPORTEUR) :</strong><br/>
              <strong>${userData?.companyName || "Entreprise de Transport"}</strong><br/>
              ID Transporteur: ${companyId.substring(0, 8)}<br/>
              Guinée
            </div>
            <div class="address-col">
              <strong style="color: #64748b;">DESTINATAIRE (CLIENT) :</strong><br/>
              <strong>${mission.clientName || "Client Importateur"}</strong><br/>
              ID Client: ${mission.clientId?.substring(0, 8) || "N/A"}<br/>
              Guinea
            </div>
          </div>

          <div class="title">Détails du transport</div>
          <table>
            <thead>
              <tr>
                <th>Description du Service</th>
                <th>Trajet (Départ → Arrivée)</th>
                <th>Véhicule / Chauffeur</th>
                <th style="text-align: right;">Montant (GNF)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Transport Logistique Fret Routier</strong><br/>Nature: ${mission.nature || "Marchandise"} | Poids: ${mission.weight || "N/A"} t</td>
                <td>${mission.from} &rarr; ${mission.to}</td>
                <td>${mission.vehicleRegistration || "Attribué"} / ${mission.assignedDriverName || "Chauffeur"}</td>
                <td style="text-align: right;">${priceVal.toLocaleString('fr-FR')} GNF</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <table class="total-table">
              <tr>
                <td>Sous-total :</td>
                <td style="text-align: right;">${subtotal.toLocaleString('fr-FR')} GNF</td>
              </tr>
              <tr>
                <td>TVA (18%) :</td>
                <td style="text-align: right;">${vat.toLocaleString('fr-FR')} GNF</td>
              </tr>
              <tr class="grand-total">
                <td><strong>TOTAL NET :</strong></td>
                <td style="text-align: right;"><strong>${total.toLocaleString('fr-FR')} GNF</strong></td>
              </tr>
            </table>
          </div>

          <div class="footer">
            Facture générée numériquement par la plateforme TransConnekt. Conforme au code des douanes et impôts de la République de Guinée.
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.invoices_title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.invoices_subtitle}</p>
        </div>
      </div>

      {/* Cartes d'Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-[#0d1322]/80 shadow-xl rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase">{t.invoices_rev}</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><ArrowUpRight size={16}/></span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-white">{analytics.totalRevenue.toLocaleString('fr-FR')} GNF</h3>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Missions complétées uniquement</p>
          </div>
        </Card>

        <Card className="border-border/50 bg-[#0d1322]/80 shadow-xl rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase">{t.invoices_exp}</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400"><ArrowDownRight size={16}/></span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-white">{analytics.totalExpenses.toLocaleString('fr-FR')} GNF</h3>
            <p className="text-[10px] text-rose-400 font-semibold mt-0.5">Carburant, Péage & Indemnités</p>
          </div>
        </Card>

        <Card className="border-border/50 bg-[#0d1322]/80 shadow-xl rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase">{t.invoices_net}</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400"><Wallet size={16}/></span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-white">{analytics.netProfit.toLocaleString('fr-FR')} GNF</h3>
            <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">Marge sur coûts directs</p>
          </div>
        </Card>

        <Card className="border-border/50 bg-[#0d1322]/80 shadow-xl rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase">{t.invoices_margin}</span>
            <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400"><Coins size={16}/></span>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-white">{analytics.margin}%</h3>
            <p className="text-[10px] text-yellow-400 font-semibold mt-0.5">Taux de profit moyen</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Costs Card */}
        <Card className="lg:col-span-1 border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Coins size={20} className="text-indigo-400" /> {t.invoices_log_cost}
            </CardTitle>
            <CardDescription>Renseignez les coûts réels d&apos;un trajet spécifique.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogCost} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="missionId">Sélectionner la Mission *</Label>
                <select
                  id="missionId"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 h-9 focus:ring-1 focus:ring-indigo-500"
                  value={costForm.missionId}
                  onChange={e => setCostForm(f => ({ ...f, missionId: e.target.value }))}
                >
                  <option value="">-- Choisir une mission --</option>
                  {missions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.from} → {m.to} ({m.nature || "Fret"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fuelCost">Gazole / Carburant (GNF)</Label>
                  <Input 
                    id="fuelCost" 
                    type="number"
                    placeholder="Ex: 850000"
                    className="bg-slate-950 border-slate-800"
                    value={costForm.fuelCost}
                    onChange={e => setCostForm(f => ({ ...f, fuelCost: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tollCost">Frais de péage & Route (GNF)</Label>
                  <Input 
                    id="tollCost" 
                    type="number"
                    placeholder="Ex: 120000"
                    className="bg-slate-950 border-slate-800"
                    value={costForm.tollCost}
                    onChange={e => setCostForm(f => ({ ...f, tollCost: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="driverAllowance">Indemnité Chauffeur (GNF)</Label>
                  <Input 
                    id="driverAllowance" 
                    type="number"
                    placeholder="Ex: 250000"
                    className="bg-slate-950 border-slate-800"
                    value={costForm.driverAllowance}
                    onChange={e => setCostForm(f => ({ ...f, driverAllowance: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="otherCost">Frais Divers (GNF)</Label>
                  <Input 
                    id="otherCost" 
                    type="number"
                    placeholder="Ex: 50000"
                    className="bg-slate-950 border-slate-800"
                    value={costForm.otherCost}
                    onChange={e => setCostForm(f => ({ ...f, otherCost: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes / Ravitaillement</Label>
                <Input 
                  id="notes" 
                  placeholder="Commentaire ou N° ticket"
                  className="bg-slate-950 border-slate-800"
                  value={costForm.notes}
                  onChange={e => setCostForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <Plus size={16} /> {t.invoices_save_cost}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Facturation & Téléchargement Invoices */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              {t.invoices_auto}
            </CardTitle>
            <CardDescription>{t.invoices_auto_desc}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : missions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2">
                <FileText size={32} className="mx-auto opacity-30 text-indigo-400" />
                <p className="font-bold">Aucune course enregistrée</p>
                <p className="text-xs">Les factures apparaîtront dès que vous aurez des courses acceptées ou complétées.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[650px] text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-slate-950/20 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="p-4 pl-6">Course / Mission</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Tarif (GNF)</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 pr-6 text-right">Facture PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {missions.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-900/30 transition-all">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{m.from} → {m.to}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {m.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-300">{m.clientName || "Client"}</td>
                        <td className="p-4 font-bold text-white">
                          {Number(m.price || 0).toLocaleString('fr-FR')} GNF
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            m.status === "Terminé" 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button 
                            onClick={() => handlePrintInvoice(m)}
                            variant="ghost" 
                            size="sm"
                            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 ml-auto"
                          >
                            <Printer size={14} /> Imprimer / PDF
                          </Button>
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
