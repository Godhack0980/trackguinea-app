"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc } from "firebase/firestore"
import {
  fetchCompanyDriverIds, fetchFleetJobs, fetchCompanyInvoices,
  calculateJobEarning, groupEarningsByMonth, generateInvoiceFromJob,
  createWithdrawalRequest
} from "@/lib/earnings"
import { createNotification } from "@/lib/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Wallet, Loader2, Download, TrendingUp, Receipt,
  CheckCircle2, Clock, AlertCircle, RefreshCw, Users2, Landmark, Zap, Plus
} from "lucide-react"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend
} from "recharts"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function FinancesPage() {
  const { user, userData, loadingAuth } = useAuth()
  const { toast } = useToast()

  const [driverIds, setDriverIds] = useState<string[]>([])
  const [fleetJobs, setFleetJobs] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingInvoices, setGeneratingInvoices] = useState(false)
  const [subMethod, setSubMethod] = useState<'orange_money' | 'mtn_momo' | 'bank_transfer'>('orange_money')

  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [withdrawMethod, setWithdrawMethod] = useState<'orange_money' | 'mtn_momo' | 'bank_transfer'>('orange_money')
  const [withdrawPhoneOrAccount, setWithdrawPhoneOrAccount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [requestingWithdraw, setRequestingWithdraw] = useState(false)

  const handleSubscribe = async (method: string) => {
    if (!user) return;
    try {
      const compId = userData?.companyId || user.uid;
      const userRef = doc(db, 'users', compId);
      
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const expiryDate = new Date(Date.now() + thirtyDays);

      if (method === 'bank_transfer') {
        await updateDoc(userRef, {
          subscriptionStatus: 'pending_payment',
          subscriptionExpires: Timestamp.fromDate(expiryDate),
          subscriptionMethod: method
        });

        await addDoc(collection(db, 'transactions'), {
          userId: compId,
          type: 'subscription',
          amount: 500000,
          method: method,
          status: 'pending',
          timestamp: Timestamp.now()
        });

        toast({
          title: "Facture Générée ✓",
          description: "La facture proforma a été générée. Veuillez effectuer le virement bancaire pour activer l'abonnement."
        });
      } else {
        await updateDoc(userRef, {
          subscriptionStatus: 'active',
          subscriptionExpires: Timestamp.fromDate(expiryDate),
          subscriptionMethod: method
        });

        await addDoc(collection(db, 'transactions'), {
          userId: compId,
          type: 'subscription',
          amount: 500000,
          method: method,
          status: 'completed',
          timestamp: Timestamp.now()
        });

        toast({
          title: "Abonnement Activé ✓",
          description: `Votre abonnement Flotte Pro a été activé avec succès via ${method === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}.`
        });
      }
      fetchAll();
    } catch (e) {
      console.error("Subscription activation error:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'activer l'abonnement."
      });
    }
  };

  const handleRequestWithdrawal = async () => {
    const amt = parseFloat(withdrawAmount)
    if (isNaN(amt) || amt <= 0) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez entrer un montant valide." })
      return
    }
    if (amt > availableBalance) {
      toast({ variant: "destructive", title: "Erreur", description: "Le montant demandé dépasse votre solde disponible." })
      return
    }
    if (!withdrawPhoneOrAccount.trim()) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez préciser le numéro de téléphone ou coordonnées de compte." })
      return
    }
    
    setRequestingWithdraw(true)
    try {
      const compId = userData?.companyId || user!.uid
      await createWithdrawalRequest({
        userId: compId,
        amount: amt,
        method: withdrawMethod,
        phoneOrAccount: withdrawPhoneOrAccount,
        companyName: userData?.companyName || "Entreprise",
      })

      // Notify admins
      const adminsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "admin")))
      for (const admin of adminsSnap.docs) {
        await createNotification({
          userId: admin.id,
          message: `${userData?.companyName || "Une entreprise"} demande un retrait de ${amt.toLocaleString("fr-FR")} GNF par ${withdrawMethod.toUpperCase()}.`,
          href: "/dashboard/admin"
        })
      }

      toast({ title: "Demande soumise ✓", description: "Votre demande de retrait a été envoyée pour vérification." })
      setShowWithdrawDialog(false)
      setWithdrawAmount("")
      setWithdrawPhoneOrAccount("")
      fetchAll()
    } catch (e: any) {
      console.error("Withdrawal error:", e)
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer la demande de retrait." })
    } finally {
      setRequestingWithdraw(false)
    }
  }

  const fetchAll = useCallback(async () => {
    if (!userData?.companyId && !user) return
    setLoading(true)
    try {
      const compId = userData?.companyId ?? user!.uid
      const [ids, fetchedInvoices, withdrawalsSnap] = await Promise.all([
        fetchCompanyDriverIds(compId),
        fetchCompanyInvoices(compId),
        getDocs(query(collection(db, "withdrawals"), where("userId", "==", compId)))
      ])
      setDriverIds(ids)
      const jobs = await fetchFleetJobs(ids)
      setFleetJobs(jobs)
      setInvoices(fetchedInvoices)
      setWithdrawals(withdrawalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    } catch (e) {
      console.error("Finances fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [userData?.companyId, user])

  useEffect(() => { if (!loadingAuth) fetchAll() }, [loadingAuth, fetchAll])

  // ── Real computed metrics ──────────────────────────────────────────────
  const completedJobs = fleetJobs.filter(j => j.status === "Terminé")
  const totalRevenue = completedJobs.reduce((s, j) => s + calculateJobEarning(j), 0)
  const paidInvoicesAmt = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0)
  const pendingInvoicesAmt = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0)

  const completedWithdrawalsAmt = withdrawals
    .filter(w => w.status === "completed")
    .reduce((s, w) => s + w.amount, 0)
  const pendingWithdrawalsAmt = withdrawals
    .filter(w => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0)
  const availableBalance = Math.max(0, paidInvoicesAmt - completedWithdrawalsAmt - pendingWithdrawalsAmt)

  // Jobs not yet invoiced
  const invoicedJobIds = new Set(invoices.map(i => i.jobId))
  const uninvoicedJobs = completedJobs.filter(j => !invoicedJobIds.has(j.id))

  // Monthly chart — per month split by driver vs fleet total
  const monthlyRevenue = groupEarningsByMonth(completedJobs).map(m => ({
    month: m.month,
    flotte: m.gains,
    parCourse: Math.round(m.gains / Math.max(m.count, 1)),
  }))

  // ── Auto-generate missing invoices ────────────────────────────────────
  const handleGenerateInvoices = async () => {
    if (uninvoicedJobs.length === 0) {
      toast({ title: "Aucune facture à générer", description: "Toutes les courses sont déjà facturées." })
      return
    }
    setGeneratingInvoices(true)
    try {
      let created = 0
      for (const job of uninvoicedJobs) {
        await generateInvoiceFromJob(job, userData)
        created++
      }

      // Notify admins
      const adminsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "admin")))
      for (const admin of adminsSnap.docs) {
        await createNotification({
          userId: admin.id,
          message: `${userData?.companyName ?? "Entreprise"} a généré ${created} nouvelle${created > 1 ? "s" : ""} facture${created > 1 ? "s" : ""}.`,
          href: "/dashboard/admin"
        })
      }

      toast({ title: `${created} facture${created > 1 ? "s" : ""} générée${created > 1 ? "s" : ""} ✓` })
      fetchAll()
    } catch (e) {
      console.error("Invoice generation error:", e)
      toast({ variant: "destructive", title: "Erreur lors de la génération des factures." })
    } finally {
      setGeneratingInvoices(false)
    }
  }

  const handleMarkPaid = async (invoiceId: string, clientId: string, amount: number) => {
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        status: "paid",
        paidAt: Timestamp.now()
      })
      if (clientId) {
        await createNotification({
          userId: clientId,
          message: `Votre paiement de ${amount.toLocaleString("fr-FR")} GNF a été confirmé par ${userData?.companyName ?? "le transporteur"}.`,
          href: "/dashboard/client-company"
        })
      }
      toast({ title: "Facture marquée comme payée ✓" })
      fetchAll()
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la mise à jour." })
    }
  }

  const exportReport = () => {
    const lines = [
      `RAPPORT COMPTABLE — TransConnekt Pro`,
      `Entreprise: ${userData?.companyName ?? "N/A"}`,
      `Date d'export: ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`,
      "",
      `Chiffre d'affaires (courses terminées): ${totalRevenue.toLocaleString("fr-FR")} GNF`,
      `Factures payées: ${paidInvoicesAmt.toLocaleString("fr-FR")} GNF`,
      `Factures en attente: ${pendingInvoicesAmt.toLocaleString("fr-FR")} GNF`,
      `Courses terminées: ${completedJobs.length}`,
      `Chauffeurs de la flotte: ${driverIds.length}`,
      "",
      "DÉTAIL DES FACTURES:",
      ...invoices.map(i => {
        const date = i.createdAt?.toDate ? format(i.createdAt.toDate(), "dd/MM/yyyy") : ""
        return `${i.id.slice(0,8).toUpperCase()} | ${i.clientName ?? "N/A"} | ${i.amount?.toLocaleString("fr-FR")} GNF | ${i.status === "paid" ? "Payé" : "En attente"} | ${date}`
      })
    ].join("\n")

    const blob = new Blob([lines], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `rapport_comptable_${userData?.companyName ?? "entreprise"}_${format(new Date(), "yyyy-MM-dd")}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  if (loadingAuth || loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><Wallet size={20} /></span>
            Finances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Facturation, revenus de flotte et suivi des paiements clients — données réelles.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={fetchAll} className="gap-2 text-muted-foreground"><RefreshCw size={14} /></Button>
          {uninvoicedJobs.length > 0 && (
            <Button size="sm" disabled={generatingInvoices} onClick={handleGenerateInvoices}
              className="gap-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20">
              {generatingInvoices ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Générer {uninvoicedJobs.length} facture{uninvoicedJobs.length > 1 ? "s" : ""}
            </Button>
          )}
          <Button size="sm" onClick={exportReport} className="gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
            <Download size={14} /> Rapport comptable
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Chiffre d'affaires", value: `${totalRevenue.toLocaleString("fr-FR")} GNF`, sub: `${completedJobs.length} course${completedJobs.length !== 1 ? "s" : ""} terminée${completedJobs.length !== 1 ? "s" : ""}`, icon: <Landmark size={16}/>, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Factures payées", value: `${paidInvoicesAmt.toLocaleString("fr-FR")} GNF`, sub: `${invoices.filter(i=>i.status==="paid").length} facture${invoices.filter(i=>i.status==="paid").length !== 1 ? "s" : ""}`, icon: <CheckCircle2 size={16}/>, color: "text-sky-400", bg: "bg-sky-500/10" },
          { label: "En attente de paiement", value: `${pendingInvoicesAmt.toLocaleString("fr-FR")} GNF`, sub: `${invoices.filter(i=>i.status!=="paid").length} facture${invoices.filter(i=>i.status!=="paid").length !== 1 ? "s" : ""}`, icon: <Clock size={16}/>, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Non encore facturées", value: uninvoicedJobs.length.toString(), sub: "Courses à facturer", icon: <Zap size={16}/>, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map(k => (
          <Card key={k.label} className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground">{k.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${k.bg} ${k.color}`}>{k.icon}</span>
              </div>
              <div className="text-xl font-extrabold text-foreground leading-tight">{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Flotte Pro Subscription Management Card */}
      <Card className="shadow-lg rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950 to-slate-900 shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200">👑</span>
              Abonnement TransConnekt "Flotte Pro"
            </h3>
            <p className="text-xs text-slate-200 max-w-xl leading-relaxed">
              Activez des rapports avancés, des performances détaillées de vos chauffeurs, des cartes carburant partenaires et accédez en priorité aux appels d'offres miniers et industriels.
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {userData?.subscriptionStatus === 'active' ? (
              <div className="text-right">
                <Badge className="bg-indigo-600 text-white border border-indigo-400 px-3 py-1 font-bold text-xs">
                  💎 FLOTTE PRO ACTIF
                </Badge>
                <p className="text-[10px] text-slate-200 mt-1">
                  Expire le {userData.subscriptionExpires?.toDate ? format(userData.subscriptionExpires.toDate(), "dd MMM yyyy", { locale: fr }) : '—'}
                </p>
              </div>
            ) : userData?.subscriptionStatus === 'pending_payment' ? (
              <div className="flex flex-col items-end gap-1.5">
                <Badge className="bg-amber-600 text-white border border-amber-400 px-3 py-1 font-bold text-xs">
                  ⏳ EN ATTENTE DE VIREMENT
                </Badge>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold text-white">
                      Voir RIB & Instructions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-border max-w-md bg-slate-950 text-slate-100">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <span>📋</span> Facture Proforma & RIB
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-400">
                        Veuillez effectuer un virement bancaire de <strong>500 000 GNF</strong> pour activer votre abonnement Flotte Pro.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3 text-xs border-y border-border/20 my-2">
                      <div className="bg-slate-900 p-3 rounded-xl border border-border/10 space-y-2">
                        <div className="flex justify-between"><span className="text-slate-400">Banque :</span><strong className="text-slate-200">Société Générale de Banques en Guinée (SGBG)</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400">Titulaire :</span><strong className="text-slate-200">TransConnekt SARL</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400">Numéro de Compte :</span><strong className="text-slate-200 font-mono select-all">GN92 2004 0100 1029 3847 5610 32</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400">Code Swift / BIC :</span><strong className="text-slate-200 font-mono">SGBGGNCN</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400">Libellé du virement :</span><strong className="text-indigo-400 font-mono">SUB-PRO-{(userData?.companyId || user?.uid || '').slice(0, 6).toUpperCase()}</strong></div>
                      </div>
                      <p className="text-[10px] text-amber-500 italic">
                        ⚠️ Une fois le virement effectué, notre équipe administrative validera votre accès sous 24h ouvrées.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => toast({ title: "Signalé ✓", description: "Notre équipe a été notifiée de votre virement." })}>
                        J'ai effectué le virement
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={subMethod} onValueChange={(v: any) => setSubMethod(v)}>
                  <SelectTrigger className="w-36 h-9 rounded-xl bg-slate-950 border-slate-800 text-xs text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-slate-950 border-slate-800 text-slate-100">
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                    <SelectItem value="bank_transfer">Facture Virement</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => handleSubscribe(subMethod)}
                  className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-bold text-xs h-9 rounded-xl px-4 shadow-md shadow-indigo-600/10"
                >
                  S'abonner (500k GNF)
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Revenue Chart & Payouts/Withdrawals side-by-side */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Chart */}
        <div className="lg:col-span-2">
          {monthlyRevenue.length > 0 ? (
            <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md h-full">
              <CardHeader className="border-b border-border/20 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" /> Revenus Mensuels de la Flotte
                </CardTitle>
                <CardDescription>Chiffre d&apos;affaires mensuel réel (GNF)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3}/>
                      <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false}/>
                      <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                      <Tooltip
                        contentStyle={{ backgroundColor:"#0f172a", border:"1px solid rgba(16,185,129,0.2)", borderRadius:14 }}
                        labelStyle={{ color:"#fff", fontWeight:"bold" }}
                        formatter={(v:number)=>[`${v.toLocaleString("fr-FR")} GNF`, "Revenus"]}
                      />
                      <Area type="monotone" dataKey="flotte" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#finGrad)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md h-full flex flex-col justify-center items-center p-6 text-center text-muted-foreground min-h-[300px]">
              <TrendingUp size={24} className="opacity-20 mb-2" />
              <p className="text-xs">Pas de données de facturation mensuelle disponibles.</p>
            </Card>
          )}
        </div>

        {/* Right Column: Balance & Withdrawals */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md h-full flex flex-col justify-between">
            <div>
              <CardHeader className="border-b border-border/20 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Landmark size={18} className="text-indigo-400" /> Solde & Retraits
                </CardTitle>
                <CardDescription>Demandez et gérez vos retraits de gains réels</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-border/30 rounded-2xl p-5 text-center space-y-2">
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider block">Solde Disponible</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {availableBalance.toLocaleString("fr-FR")} <span className="text-sm font-bold text-slate-800 dark:text-slate-100">GNF</span>
                  </div>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                    Somme des factures payées moins les retraits validés et demandes en attente.
                  </p>
                </div>

                <Dialog open={showWithdrawDialog} onOpenChange={(val) => {
                  setShowWithdrawDialog(val);
                  if (!val) {
                    setWithdrawAmount("");
                    setWithdrawPhoneOrAccount("");
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      disabled={availableBalance <= 0}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl h-11 transition-all"
                    >
                      <Plus size={16} className="mr-1" /> Demander un retrait
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl border-border bg-slate-950 text-slate-100 max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Demander un Retrait</DialogTitle>
                      <DialogDescription className="text-xs">
                        Transférez vos gains vers votre compte Mobile Money ou bancaire guinéen.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Moyen de retrait</Label>
                        <Select value={withdrawMethod} onValueChange={(v: any) => setWithdrawMethod(v)}>
                          <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-xs text-slate-100 rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-950 border-slate-800 text-slate-100 rounded-xl">
                            <SelectItem value="orange_money">Orange Money (Guinée)</SelectItem>
                            <SelectItem value="mtn_momo">MTN MoMo (Guinée)</SelectItem>
                            <SelectItem value="bank_transfer">Virement Bancaire (Guinée)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">Montant à retirer (GNF)</Label>
                        <Input 
                          type="number"
                          placeholder={`Max: ${availableBalance} GNF`}
                          value={withdrawAmount}
                          onChange={e => setWithdrawAmount(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-xs h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-muted-foreground">
                          {withdrawMethod === 'bank_transfer' ? "Coordonnées Bancaires (RIB, Banque)" : "Numéro de téléphone Orange / MTN"}
                        </Label>
                        <Input 
                          placeholder={withdrawMethod === 'bank_transfer' ? "RIB, IBAN, Nom de la banque..." : "Ex: 622 XX XX XX"}
                          value={withdrawPhoneOrAccount}
                          onChange={e => setWithdrawPhoneOrAccount(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-xs h-10 rounded-xl"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="ghost" disabled={requestingWithdraw} onClick={() => setShowWithdrawDialog(false)} className="rounded-xl">Annuler</Button>
                      <Button 
                        onClick={handleRequestWithdrawal} 
                        disabled={!withdrawAmount || !withdrawPhoneOrAccount || requestingWithdraw}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                      >
                        {requestingWithdraw ? "Envoi..." : "Confirmer le Retrait"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

            <div className="space-y-2 pt-2 border-t border-border/10">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Retraits Récents</h4>
              {withdrawals.length > 0 ? (
                <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                  {withdrawals.map(w => {
                    const date = w.createdAt?.toDate ? format(w.createdAt.toDate(), "dd/MM/yyyy") : "—"
                    const isCompleted = w.status === "completed"
                    const isPending = w.status === "pending"
                    return (
                      <div key={w.id} className="flex justify-between items-center p-2 bg-slate-950/20 border border-border/10 rounded-xl text-[10px]">
                        <div>
                          <p className="font-bold text-slate-200">{w.amount.toLocaleString("fr-FR")} GNF</p>
                          <p className="text-[9px] text-muted-foreground font-mono">{w.method.toUpperCase()} · {date}</p>
                        </div>
                        <Badge className={`text-[8px] font-bold border rounded-full px-2 py-0.5 ${isCompleted ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isPending ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                          {isCompleted ? "Validé" : isPending ? "En attente" : "Rejeté"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-4 italic">
                  Aucune transaction récente.
                </p>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  </div>

      {/* Invoices table */}
      <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Receipt size={18} className="text-primary"/> Factures Clients
          </CardTitle>
          <CardDescription>
            {invoices.length > 0
              ? `${invoices.length} facture${invoices.length > 1 ? "s" : ""} — cliquez "Marquer payé" pour confirmer un paiement reçu`
              : "Aucune facture générée. Utilisez le bouton ci-dessus pour créer des factures depuis vos courses terminées."}
          </CardDescription>
        </CardHeader>
        {invoices.length > 0 && (
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {invoices.map(inv => {
                const isPaid = inv.status === "paid"
                const date = inv.createdAt?.toDate ? format(inv.createdAt.toDate(), "dd MMM yyyy", { locale: fr }) : "—"
                return (
                  <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0"><Receipt size={15}/></span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{inv.clientName ?? "Client"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{inv.id.slice(0,8).toUpperCase()} · {date}</p>
                        <p className="text-xs text-muted-foreground">{inv.nature} · {inv.from} → {inv.to}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
                      <p className="text-sm font-extrabold text-foreground">{inv.amount?.toLocaleString("fr-FR")} GNF</p>
                      <Badge className={`border text-[10px] rounded-full px-2.5 py-1 font-bold ${isPaid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-amber-500/10 text-amber-400 border-amber-500/25"}`}>
                        {isPaid ? "Payé" : "En attente"}
                      </Badge>
                      {!isPaid && (
                        <Button size="sm" onClick={() => handleMarkPaid(inv.id, inv.clientId, inv.amount)}
                          className="h-8 rounded-xl text-xs gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold">
                          <CheckCircle2 size={12}/> Marquer payé
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
