"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ScrollText, Loader2, Truck, MapPin, ArrowRight,
  Calendar, Package, Clock, CheckCircle2, Download, RefreshCw, Users2
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const statusConfig: Record<string, { label: string; className: string }> = {
  "En attente":   { label: "En attente",   className: "bg-amber-500/10 text-amber-400 border border-amber-500/25" },
  "En cours":     { label: "En cours",     className: "bg-blue-500/10 text-blue-400 border border-blue-500/25" },
  "Livré":        { label: "Livré",        className: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25" },
  "Terminé":      { label: "Terminé",      className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" },
  "Annulé":       { label: "Annulé",       className: "bg-red-500/10 text-red-400 border border-red-500/25" },
}

export default function ContractsPage() {
  const { user, userData, loadingAuth } = useAuth()
  const [contracts, setContracts] = useState<any[]>([])
  const [driverIds, setDriverIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchContracts = useCallback(async () => {
    if (!user || !userData) return
    setLoading(true)
    try {
      let ids: string[] = []

      if (userData.role === "transporter-company" && userData.companyId) {
        const dQ = query(collection(db, "users"), where("companyId", "==", userData.companyId), where("role", "==", "transporter"))
        const dSnap = await getDocs(dQ)
        ids = dSnap.docs.map(d => d.id)
        setDriverIds(ids)
      } else {
        ids = [user.uid]
      }

      if (ids.length === 0) { setContracts([]); setLoading(false); return }

      const rQ = query(collection(db, "requests"), where("assignedTo", "in", ids.slice(0, 10)))
      const rSnap = await getDocs(rQ)
      setContracts(rSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()))
    } catch (e) {
      console.error("Error fetching contracts:", e)
    } finally {
      setLoading(false)
    }
  }, [user, userData])

  useEffect(() => { if (!loadingAuth) fetchContracts() }, [loadingAuth, fetchContracts])

  const filtered = statusFilter === "all" ? contracts : contracts.filter(c => c.status === statusFilter)

  const active = contracts.filter(c => c.status === "En cours" || c.status === "Livré").length
  const completed = contracts.filter(c => c.status === "Terminé").length
  const pending = contracts.filter(c => c.status === "En attente").length

  const exportCSV = () => {
    if (contracts.length === 0) { alert("Aucun contrat à exporter."); return }
    let csv = "data:text/csv;charset=utf-8,ID,Nature,De,A,Poids,Statut,Chauffeur,Date\n"
    contracts.forEach(c => {
      const date = c.createdAt?.toDate ? format(c.createdAt.toDate(), "dd/MM/yyyy") : ""
      csv += `"${c.id}","${c.nature || ""}","${c.from || ""}","${c.to || ""}","${c.weight || ""} ${c.weightUnit || ""}","${c.status || ""}","${c.transporterName || ""}","${date}"\n`
    })
    const link = document.createElement("a"); link.href = encodeURI(csv)
    link.download = "contrats_flotte.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  if (loadingAuth || loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400"><ScrollText size={20} /></span>
            Mes Contrats
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Courses en cours, planifiées et historique complet de vos missions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchContracts()} className="gap-2 text-muted-foreground"><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={exportCSV} className="gap-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
            <Download size={14} /> Exporter CSV
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "En cours / Livré", value: active, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: <Truck size={16}/> },
          { label: "En attente", value: pending, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: <Clock size={16}/> },
          { label: "Terminés", value: completed, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 size={16}/> },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} ${s.color} shrink-0`}>{s.icon}</span>
            <div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 rounded-xl bg-background w-[200px]"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="En attente">En attente</SelectItem>
            <SelectItem value="En cours">En cours</SelectItem>
            <SelectItem value="Livré">Livré</SelectItem>
            <SelectItem value="Terminé">Terminé</SelectItem>
            <SelectItem value="Annulé">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{filtered.length} contrat{filtered.length > 1 ? "s" : ""}</p>
      </div>

      {/* Contract cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => {
            const cfg = statusConfig[c.status] ?? { label: c.status, className: "bg-slate-500/10 text-slate-400 border-slate-500/20" }
            const isMining = c.nature?.toLowerCase().includes("simandou") || c.nature?.toLowerCase().includes("mine") || c.nature?.toLowerCase().includes("fer")
            return (
              <Card key={c.id} className={`rounded-3xl border bg-card/60 backdrop-blur-md shadow-lg overflow-hidden transition-all hover:scale-[1.01] ${isMining ? "border-amber-500/30" : "border-border/50"}`}>
                {isMining && <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-400" />}
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${isMining ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"}`}>
                        <Truck size={15} />
                      </span>
                      <div>
                        <p className="font-bold text-sm text-foreground leading-tight line-clamp-1">{c.nature || "Transport"}</p>
                        {c.transporterName && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Users2 size={10} /> {c.transporterName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${cfg.className} text-[10px] shrink-0 rounded-full`}>{cfg.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 pb-4 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin size={12} className="text-primary shrink-0" />
                    <span className="font-medium">{c.from}</span>
                    <ArrowRight size={10} className="mx-0.5" />
                    <span className="font-medium">{c.to}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1"><Package size={12} /> {c.weight} {c.weightUnit}</span>
                    {c.date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {format(c.date.toDate(), "dd MMM yyyy", { locale: fr })}
                      </span>
                    )}
                  </div>
                  {isMining && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-2 py-1">
                      ⛏️ Mission Simandou 2040
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground bg-card/40 border border-border/50 rounded-3xl gap-4">
          <ScrollText className="h-10 w-10 opacity-30" />
          <div>
            <p className="font-bold text-foreground">Aucun contrat trouvé</p>
            <p className="text-sm mt-1">Les courses assignées à vos chauffeurs apparaîtront ici.</p>
          </div>
        </div>
      )}
    </div>
  )
}
