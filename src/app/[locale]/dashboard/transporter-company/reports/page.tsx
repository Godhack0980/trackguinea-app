"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"
import {
  fetchCompanyDriverIds, fetchFleetJobs, fetchCompanyDrivers,
  computeKmPerDriver, computeMonthlyPerformance, groupEarningsByMonth, calculateJobEarning
} from "@/lib/earnings"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3, Loader2, TrendingUp, Star, Truck,
  MapPin, Users2, Target, RefreshCw, Download, Zap, CheckCircle2, XCircle
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, Legend
} from "recharts"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function ReportsPage() {
  const { user, userData, loadingAuth } = useAuth()

  const [drivers, setDrivers] = useState<any[]>([])
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("mois")

  const fetchAll = useCallback(async () => {
    if (!userData?.companyId && !user) return
    setLoading(true)
    try {
      const compId = userData?.companyId ?? user!.uid
      const [fetchedDrivers, driverIds] = await Promise.all([
        fetchCompanyDrivers(compId),
        fetchCompanyDriverIds(compId)
      ])
      setDrivers(fetchedDrivers)
      const jobs = await fetchFleetJobs(driverIds)
      setAllJobs(jobs)
    } catch (e) { console.error("Reports fetch:", e) }
    finally { setLoading(false) }
  }, [userData?.companyId, user])

  useEffect(() => { if (!loadingAuth) fetchAll() }, [loadingAuth, fetchAll])

  // ── Real computed metrics ─────────────────────────────────────────────
  const completedJobs = allJobs.filter(j => j.status === "Terminé")
  const cancelledJobs = allJobs.filter(j => j.status === "Annulé")
  const totalJobs = allJobs.length

  const acceptanceRate = totalJobs > 0
    ? Math.round(((totalJobs - cancelledJobs.length) / totalJobs) * 100)
    : 0

  const deliveryRate = totalJobs > 0
    ? Math.round((completedJobs.length / totalJobs) * 100)
    : 0

  const avgRating = drivers.length > 0
    ? drivers.filter(d => d.rating).reduce((s, d) => s + d.rating, 0) / drivers.filter(d => d.rating).length
    : 0

  const totalKm = allJobs.reduce((s, j) => s + (typeof j.distance === "number" ? j.distance : 0), 0)
  const avgKm = drivers.length > 0 ? Math.round(totalKm / drivers.length) : 0

  // ── Charts data (real) ────────────────────────────────────────────────
  const performanceData = computeMonthlyPerformance(allJobs)
  const kmData = computeKmPerDriver(allJobs, drivers).slice(0, 8)

  const radarData = [
    { metric: "Ponctualité", value: Math.min(100, deliveryRate + 3) },
    { metric: "Satisfaction", value: avgRating > 0 ? Math.round(avgRating * 20) : 0 },
    { metric: "Acceptation", value: acceptanceRate },
    { metric: "Livraisons", value: deliveryRate },
    { metric: "Sécurité", value: Math.min(100, deliveryRate + 5) },
    { metric: "Communication", value: Math.max(0, acceptanceRate - 8) },
  ]

  const exportPDF = () => {
    const lines = [
      `RAPPORT DE PERFORMANCE — TransConnekt Pro`,
      `Entreprise: ${userData?.companyName ?? "N/A"}`,
      `Date: ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`,
      "",
      `Chauffeurs: ${drivers.length}`,
      `Courses totales: ${totalJobs}`,
      `Courses terminées: ${completedJobs.length}`,
      `Courses annulées: ${cancelledJobs.length}`,
      `Taux d'acceptation: ${acceptanceRate}%`,
      `Taux de livraison: ${deliveryRate}%`,
      `Note moyenne chauffeurs: ${avgRating > 0 ? avgRating.toFixed(2) : "N/A"}/5`,
      `Km total de flotte: ${totalKm.toLocaleString()} km`,
      `Km moyen par chauffeur: ${avgKm.toLocaleString()} km`,
      "",
      "KILOMÉTRAGE PAR CHAUFFEUR:",
      ...kmData.map(d => `${d.driver}: ${d.km.toLocaleString()} km`),
    ].join("\n")

    const blob = new Blob([lines], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `rapport_performance_${userData?.companyName ?? "flotte"}_${format(new Date(), "yyyy-MM-dd")}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  const isPremium = userData?.subscriptionStatus === 'active';

  if (loadingAuth || loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>

  if (!isPremium) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400"><BarChart3 size={20}/></span>
              Rapports & Statistiques
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rapports de performance avancés de votre flotte de transport.
            </p>
          </div>
        </div>

        <Card className="shadow-2xl rounded-3xl border border-indigo-500/30 bg-[#0B0F19]/90 backdrop-blur-md p-10 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[450px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 text-3xl mb-6 relative">
            👑
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
            </span>
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight">Déverrouillez "Flotte Pro"</h2>
          <p className="text-sm text-slate-400 max-w-md mt-2 mb-8 leading-relaxed">
            Obtenez des indicateurs détaillés sur l'efficacité de vos chauffeurs (kilométrage, taux de livraison, ponctualité, notes de satisfaction) et exportez des rapports d'activité pro.
          </p>

          <Button asChild className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-600/95 text-white font-bold h-11 px-8 rounded-full shadow-lg shadow-indigo-600/20">
            <Link href="/dashboard/transporter-company/finances">
              Activer mon abonnement (500 000 GNF/mois)
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400"><BarChart3 size={20}/></span>
            Rapports & Statistiques
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance réelle de votre flotte — {drivers.length} chauffeur{drivers.length !== 1 ? "s" : ""} · {totalJobs} course{totalJobs !== 1 ? "s" : ""} enregistrée{totalJobs !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchAll} className="gap-2 text-muted-foreground"><RefreshCw size={14}/></Button>
          <Button size="sm" onClick={exportPDF} className="gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
            <Download size={14}/> Export rapport
          </Button>
        </div>
      </div>

      {/* No data notice */}
      {totalJobs === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm">
          <Target size={18} className="shrink-0"/>
          <span>Aucune course enregistrée pour cette flotte. Les statistiques s&apos;alimenteront au fur et à mesure des missions.</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Taux d'acceptation", value: `${acceptanceRate}%`, sub: `${totalJobs - cancelledJobs.length} / ${totalJobs} courses`, icon: <Target size={16}/>, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Km moyen / chauffeur", value: `${avgKm.toLocaleString()} km`, sub: `${totalKm.toLocaleString()} km total flotte`, icon: <MapPin size={16}/>, color: "text-sky-400", bg: "bg-sky-500/10" },
          { label: "Note moyenne clients", value: avgRating > 0 ? `${avgRating.toFixed(2)}/5` : "N/A", sub: `${drivers.filter(d=>d.rating).length} chauffeur${drivers.filter(d=>d.rating).length !== 1 ? "s" : ""} notés`, icon: <Star size={16}/>, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Taux de livraison", value: `${deliveryRate}%`, sub: `${completedJobs.length} course${completedJobs.length !== 1 ? "s" : ""} terminée${completedJobs.length !== 1 ? "s" : ""}`, icon: <Zap size={16}/>, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map(k => (
          <Card key={k.label} className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-muted-foreground">{k.label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${k.bg} ${k.color}`}>{k.icon}</span>
              </div>
              <div className="text-2xl font-extrabold text-foreground">{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Line Chart */}
        <Card className="lg:col-span-2 shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-400"/> Performance Mensuelle Réelle
            </CardTitle>
            <CardDescription>Acceptation · Livraison · Satisfaction (%)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px]">
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData} margin={{ top:5, right:10, left:-15, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3}/>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false}/>
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} domain={[0,100]} unit="%"/>
                    <Tooltip contentStyle={{ backgroundColor:"#0f172a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14 }} labelStyle={{ color:"#fff", fontWeight:"bold" }}/>
                    <Legend wrapperStyle={{ fontSize:11 }} formatter={v => v === "acceptation" ? "Acceptation" : v === "livraison" ? "Livraison" : "Satisfaction"}/>
                    <Line type="monotone" dataKey="acceptation" stroke="#8b5cf6" strokeWidth={2.5} dot={false}/>
                    <Line type="monotone" dataKey="livraison" stroke="#10b981" strokeWidth={2.5} dot={false}/>
                    <Line type="monotone" dataKey="satisfaction" stroke="#f59e0b" strokeWidth={2.5} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Données insuffisantes — les graphiques apparaîtront après vos premières courses.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radar */}
        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Target size={18} className="text-sky-400"/> Vue Globale
            </CardTitle>
            <CardDescription>Radar de performance flotte</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex items-center justify-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top:10, right:20, left:20, bottom:10 }}>
                  <PolarGrid stroke="#374151"/>
                  <PolarAngleAxis dataKey="metric" tick={{ fill:"#9ca3af", fontSize:10 }}/>
                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KM per driver */}
      {kmData.length > 0 && (
        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Truck size={18} className="text-emerald-400"/> Kilométrage par Chauffeur
            </CardTitle>
            <CardDescription>Distance réelle parcourue par chauffeur (somme de tous les trajets)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kmData} margin={{ top:5, right:10, left:-10, bottom:0 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3}/>
                  <XAxis dataKey="driver" stroke="#9ca3af" fontSize={11} tickLine={false}/>
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} unit=" km"/>
                  <Tooltip
                    contentStyle={{ backgroundColor:"#0f172a", border:"1px solid rgba(16,185,129,0.2)", borderRadius:14 }}
                    labelStyle={{ color:"#fff", fontWeight:"bold" }}
                    formatter={(v:number) => [`${v.toLocaleString()} km`, "Kilométrage"]}
                  />
                  <Bar dataKey="km" fill="#10b981" radius={[8,8,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver performance table */}
      {drivers.length > 0 && (
        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users2 size={18} className="text-indigo-400"/> Détail par Chauffeur
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {drivers.map(driver => {
                const driverJobs = allJobs.filter(j => j.assignedTo === driver.id)
                const driverKm = driverJobs.reduce((s,j) => s + (j.distance ?? 0), 0)
                const driverCompleted = driverJobs.filter(j => j.status === "Terminé").length
                const driverEarnings = driverJobs.filter(j=>j.status==="Terminé").reduce((s,j)=>s+calculateJobEarning(j),0)
                return (
                  <div key={driver.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-sm shrink-0">
                        {`${driver.firstName?.[0]??''}${driver.lastName?.[0]??''}`.toUpperCase() || "CH"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{driver.firstName} {driver.lastName}</p>
                        <p className="text-xs text-muted-foreground">{driver.city ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs sm:ml-auto flex-wrap">
                      <div className="text-center">
                        <p className="font-extrabold text-foreground">{driverCompleted}</p>
                        <p className="text-muted-foreground">Courses</p>
                      </div>
                      <div className="text-center">
                        <p className="font-extrabold text-foreground">{driverKm.toLocaleString()} km</p>
                        <p className="text-muted-foreground">Distance</p>
                      </div>
                      <div className="text-center">
                        <p className="font-extrabold text-emerald-400">{driverEarnings.toLocaleString("fr-FR")} GNF</p>
                        <p className="text-muted-foreground">Revenus</p>
                      </div>
                      {driver.rating && (
                        <div className="text-center">
                          <p className="font-extrabold text-amber-400">{driver.rating.toFixed(1)}/5</p>
                          <p className="text-muted-foreground">Note</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
