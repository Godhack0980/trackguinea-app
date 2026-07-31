"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy } from "firebase/firestore"
import {
  calculateJobEarning, groupEarningsByMonth,
  fetchTransporterJobs, createWithdrawalRequest, BASE_PRICE_PER_KM, SIMANDOU_BONUS
} from "@/lib/earnings"
import { createNotification } from "@/lib/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Wallet, TrendingUp, Loader2, Download, ArrowUpRight,
  Truck, Calendar, MapPin, ArrowRight, Zap, CreditCard, RefreshCw, Phone, Clock
} from "lucide-react"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar
} from "recharts"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface WithdrawalData {
  method: string
  phoneOrAccount: string
}

export default function TransporterEarningsPage() {
  const { user, userData, loadingAuth } = useAuth()
  const { toast } = useToast()

  const [jobs, setJobs] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [withdrawMethod, setWithdrawMethod] = useState("orange-money")
  const [withdrawContact, setWithdrawContact] = useState("")

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [fetchedJobs, wSnap] = await Promise.all([
        fetchTransporterJobs(user.uid),
        getDocs(query(
          collection(db, "withdrawals"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        ))
      ])
      setJobs(fetchedJobs)
      setWithdrawals(wSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error("Earnings fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { if (!loadingAuth) fetchAll() }, [loadingAuth, fetchAll])

  // Computed metrics
  const dbBalance = userData?.walletBalance || 0;
  const pendingWithdrawal = withdrawals.filter(w => w.status === "pending").reduce((s, w) => s + w.amount, 0)
  const availableBalance = Math.max(0, dbBalance - pendingWithdrawal);
  const totalEarnings = userData?.totalEarnings || 0;
  const monthlyChart = groupEarningsByMonth(jobs)

  const now = new Date()
  const thisMonthJobs = jobs.filter(j => {
    try { return j.createdAt?.toDate?.()?.getMonth() === now.getMonth() } catch { return false }
  })
  const thisMonthEarnings = thisMonthJobs.reduce((s, j) => s + calculateJobEarning(j), 0)

  const thisWeekJobs = jobs.filter(j => {
    try {
      const d = j.createdAt?.toDate?.()
      if (!d) return false
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 7
    } catch { return false }
  })
  const thisWeekEarnings = thisWeekJobs.reduce((s, j) => s + calculateJobEarning(j), 0)
  const avgPerJob = jobs.length > 0 ? Math.round(totalEarnings / jobs.length) : 0

  const handleWithdraw = async () => {
    if (!user || !withdrawContact.trim()) {
      toast({ variant: "destructive", title: "Coordonnées requises", description: "Veuillez saisir votre numéro ou IBAN." })
      return
    }
    if (availableBalance <= 0) {
      toast({ variant: "destructive", title: "Solde insuffisant", description: "Aucun gain disponible pour le retrait." })
      return
    }
    setIsSubmitting(true)
    try {
      const withdrawalId = await createWithdrawalRequest({
        userId: user.uid,
        amount: availableBalance,
        method: withdrawMethod,
        phoneOrAccount: withdrawContact,
        driverName: `${userData?.firstName ?? ""} ${userData?.lastName ?? ""}`.trim()
      })

      // Notify user
      await createNotification({
        userId: user.uid,
        message: `Votre demande de retrait de ${availableBalance.toLocaleString("fr-FR")} GNF a été soumise avec succès. Délai estimé : 2–5 jours ouvrables.`,
        href: "/dashboard/transporter/earnings"
      })

      // Notify admins
      const adminsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "admin")))
      for (const admin of adminsSnap.docs) {
        await createNotification({
          userId: admin.id,
          message: `Le transporteur ${userData?.firstName ?? ""} ${userData?.lastName ?? ""} demande un retrait de ${availableBalance.toLocaleString("fr-FR")} GNF via ${withdrawMethod === "orange-money" ? "Orange Money" : "Virement bancaire"}.`,
          href: "/dashboard/admin"
        })
      }

      toast({ title: "Retrait soumis ✓", description: `Demande #${withdrawalId.slice(0, 8).toUpperCase()} créée. Traitement sous 2 à 5 jours ouvrables.` })
      setShowWithdrawForm(false)
      setWithdrawContact("")
      fetchAll()
    } catch (e) {
      console.error("Withdrawal error:", e)
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de soumettre la demande de retrait." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingAuth || loading) return (
    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"><Wallet size={20} /></span>
            Mes Revenus
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Historique réel de vos gains et gestion de vos retraits.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAll} className="gap-2 text-muted-foreground self-start">
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Gains Totaux", value: `${totalEarnings.toLocaleString("fr-FR")} GNF`, sub: `${jobs.length} course${jobs.length !== 1 ? "s" : ""} terminée${jobs.length !== 1 ? "s" : ""}`, icon: <Wallet size={16}/>, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Ce mois", value: `${thisMonthEarnings.toLocaleString("fr-FR")} GNF`, sub: `${thisMonthJobs.length} course${thisMonthJobs.length !== 1 ? "s" : ""}`, icon: <Calendar size={16}/>, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Cette semaine", value: `${thisWeekEarnings.toLocaleString("fr-FR")} GNF`, sub: `${thisWeekJobs.length} course${thisWeekJobs.length !== 1 ? "s" : ""}`, icon: <TrendingUp size={16}/>, color: "text-sky-400", bg: "bg-sky-500/10" },
          { label: "Solde disponible", value: `${availableBalance.toLocaleString("fr-FR")} GNF`, sub: pendingWithdrawal > 0 ? `${pendingWithdrawal.toLocaleString("fr-FR")} GNF en traitement` : "Prêt au retrait", icon: <Zap size={16}/>, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(kpi => (
          <Card key={kpi.label} className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-muted-foreground">{kpi.label}</CardTitle>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>{kpi.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-extrabold text-foreground leading-tight">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" /> Gains mensuels (6 derniers mois)
            </CardTitle>
            <CardDescription>Basé sur vos courses réellement terminées</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {monthlyChart.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14 }}
                      labelStyle={{ color: "#fff", fontWeight: "bold" }}
                      formatter={(v: number) => [`${v.toLocaleString("fr-FR")} GNF`, "Gains"]}
                    />
                    <Area type="monotone" dataKey="gains" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#earningsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée — complétez vos premières courses pour voir votre graphique.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Panel */}
        <Card className="shadow-lg rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-slate-900/80 backdrop-blur-md p-6 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"><CreditCard size={16} /></span>
              Retrait d&apos;Argent
            </h3>
            <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Gains totaux :</span>
                <span className="text-foreground font-bold">{totalEarnings.toLocaleString("fr-FR")} GNF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">En cours de traitement :</span>
                <span className="text-amber-400 font-bold">- {pendingWithdrawal.toLocaleString("fr-FR")} GNF</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2">
                <span className="text-slate-300 font-bold">Solde disponible :</span>
                <span className="text-emerald-400 font-extrabold">{availableBalance.toLocaleString("fr-FR")} GNF</span>
              </div>
            </div>

            {showWithdrawForm ? (
              <div className="mt-4 space-y-3">
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">Méthode de paiement</Label>
                  <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                    <SelectTrigger className="mt-1 h-9 rounded-xl bg-background text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="orange-money">📱 Orange Money</SelectItem>
                      <SelectItem value="mtn-momo">📱 MTN MoMo</SelectItem>
                      <SelectItem value="bank">🏦 Virement Bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-muted-foreground">
                    {withdrawMethod === "bank" ? "Numéro de compte / IBAN" : "Numéro de téléphone"}
                  </Label>
                  <Input
                    value={withdrawContact}
                    onChange={e => setWithdrawContact(e.target.value)}
                    placeholder={withdrawMethod === "bank" ? "Ex: GN 12 1234..." : "Ex: 622 XX XX XX"}
                    className="mt-1 h-9 rounded-xl bg-background text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleWithdraw} disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-10 font-bold text-sm">
                    {isSubmitting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <ArrowUpRight size={14} className="mr-2" />}
                    Confirmer
                  </Button>
                  <Button onClick={() => setShowWithdrawForm(false)} variant="outline" className="rounded-full h-10 px-4 text-sm">Annuler</Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowWithdrawForm(true)}
                disabled={availableBalance <= 0}
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-11 font-bold shadow-md shadow-emerald-500/20"
              >
                <ArrowUpRight size={15} className="mr-2" /> Demander un retrait
              </Button>
            )}
          </div>

          {/* Recent withdrawals */}
          {withdrawals.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Derniers retraits</p>
              {withdrawals.slice(0, 3).map(w => (
                <div key={w.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{w.method === "orange-money" ? "Orange Money" : w.method === "mtn-momo" ? "MTN MoMo" : "Virement"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{w.amount?.toLocaleString("fr-FR")} GNF</span>
                    <Badge className={`text-[9px] rounded-full px-1.5 py-0.5 ${w.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : w.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"} border`}>
                      {w.status === "paid" ? "Payé" : w.status === "rejected" ? "Rejeté" : "En cours"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Job history */}
      <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Historique des paiements</CardTitle>
          <CardDescription>Détail de toutes vos courses rémunérées — tarif {BASE_PRICE_PER_KM.toLocaleString("fr-FR")} GNF/km · bonus Simandou ×{SIMANDOU_BONUS}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map(job => {
                const earning = calculateJobEarning(job)
                const isMining = job.nature?.toLowerCase().includes("simandou") || job.nature?.toLowerCase().includes("mine")
                return (
                  <div key={job.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${isMining ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10" : "bg-muted/20 border-border/30 hover:bg-muted/30"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${isMining ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        <Truck size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{job.nature || "Transport"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={11} /> {job.from} <ArrowRight size={10} /> {job.to}
                          {job.distance && <span className="ml-1">· {job.distance} km</span>}
                        </p>
                        {job.createdAt && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} /> {format(job.createdAt.toDate(), "dd MMM yyyy", { locale: fr })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-emerald-400">+{earning.toLocaleString("fr-FR")} GNF</p>
                      {isMining && <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">⛏️ Simandou</Badge>}
                      {!isMining && <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">Payé</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-14 text-center text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto opacity-30 mb-3" />
              <p className="font-semibold text-foreground">Aucune course terminée</p>
              <p className="text-sm mt-1">Complétez vos premières missions pour voir vos revenus ici.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
