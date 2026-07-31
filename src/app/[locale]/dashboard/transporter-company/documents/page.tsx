"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { db, storage } from "@/lib/firebase"
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import { createNotification } from "@/lib/notifications"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Briefcase, FileText, Upload, CheckCircle2, AlertTriangle,
  Clock, ExternalLink, ShieldCheck, XCircle, Building, RefreshCw,
  Loader2, Eye, Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CompanyDocConfig {
  key: string
  label: string
  description: string
  required: boolean
  storageFolder: string
}

const COMPANY_DOCS: CompanyDocConfig[] = [
  { key: "rccm", label: "Registre du Commerce (RCCM)", description: "Document officiel d'enregistrement de votre société au registre du commerce de Guinée.", required: true, storageFolder: "rccm" },
  { key: "nif", label: "Numéro d'Identification Fiscale (NIF)", description: "Attestation fiscale délivrée par la Direction Générale des Impôts de Guinée.", required: true, storageFolder: "nif" },
  { key: "fleetInsurance", label: "Assurance Flotte Véhicules", description: "Police d'assurance couvrant l'ensemble des véhicules de votre flotte.", required: true, storageFolder: "fleet-insurance" },
  { key: "taxCertificate", label: "Attestation de Régularité Fiscale", description: "Attestation prouvant que votre entreprise est en règle vis-à-vis des obligations fiscales.", required: true, storageFolder: "tax-certificate" },
  { key: "socialSecurity", label: "Attestation CNSS", description: "Attestation de cotisation à la Caisse Nationale de Sécurité Sociale.", required: true, storageFolder: "cnss" },
  { key: "bankDetails", label: "RIB / Coordonnées Bancaires", description: "Relevé d'identité bancaire pour les virements de paiements clients.", required: false, storageFolder: "bank-details" },
  { key: "operatingLicense", label: "Autorisation d'Exploitation Transport", description: "Licence de transport de marchandises délivrée par le Ministère des Transports.", required: false, storageFolder: "operating-license" },
]

type DocStatus = "uploaded" | "pending" | "approved" | "rejected" | "missing"

interface DocInfo {
  url?: string
  fileName?: string
  uploadedAt?: any
  status?: DocStatus
  rejectionReason?: string
}

interface DocCardProps {
  cfg: CompanyDocConfig
  docInfo: DocInfo
  userId: string
  onRefresh: () => void
}

function DocCard({ cfg, docInfo, userId, onRefresh }: DocCardProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const status: DocStatus = docInfo?.status ?? (docInfo?.url ? "pending" : "missing")

  const statusCfg = {
    approved: { label: "Validé", icon: <CheckCircle2 size={13}/>, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", dotColor: "bg-emerald-400", pulse: false },
    pending:  { label: "En examen", icon: <Clock size={13}/>, className: "bg-amber-500/10 text-amber-400 border-amber-500/25", dotColor: "bg-amber-400", pulse: true },
    uploaded: { label: "Téléversé", icon: <Clock size={13}/>, className: "bg-sky-500/10 text-sky-400 border-sky-500/25", dotColor: "bg-sky-400", pulse: true },
    rejected: { label: "Rejeté", icon: <XCircle size={13}/>, className: "bg-red-500/10 text-red-400 border-red-500/25", dotColor: "bg-red-400", pulse: false },
    missing:  { label: "Manquant", icon: <AlertTriangle size={13}/>, className: "bg-slate-500/10 text-slate-400 border-slate-500/25", dotColor: "bg-slate-500", pulse: false },
  }[status]

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "Taille max : 5 Mo." }); return
    }
    if (!["application/pdf","image/jpeg","image/png"].includes(file.type)) {
      toast({ variant: "destructive", title: "Format non supporté", description: "PDF, JPEG ou PNG uniquement." }); return
    }

    setUploading(true); setProgress(0)

    const fileName = `${cfg.key}-${Date.now()}-${file.name}`
    const storageRef = ref(storage, `company-documents/${userId}/${cfg.storageFolder}/${fileName}`)

    // Delete old file if exists
    if (docInfo?.fileName) {
      try { await deleteObject(ref(storage, `company-documents/${userId}/${cfg.storageFolder}/${docInfo.fileName}`)) } catch {}
    }

    try {
      const task = uploadBytesResumable(storageRef, file)
      const url = await new Promise<string>((resolve, reject) => {
        task.on("state_changed",
          snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          async () => { try { resolve(await getDownloadURL(task.snapshot.ref)) } catch(e) { reject(e) } }
        )
      })

      await updateDoc(doc(db, "users", userId), {
        [`companyDocuments.${cfg.key}.url`]: url,
        [`companyDocuments.${cfg.key}.fileName`]: fileName,
        [`companyDocuments.${cfg.key}.uploadedAt`]: Timestamp.now(),
        [`companyDocuments.${cfg.key}.status`]: "pending",
        [`companyDocuments.${cfg.key}.rejectionReason`]: null,
      })

      // Notify admins
      const adminsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "admin")))
      for (const admin of adminsSnap.docs) {
        await createNotification({
          userId: admin.id,
          message: `Un document entreprise a été soumis : "${cfg.label}" — en attente de vérification administrative.`,
          href: "/dashboard/admin/verification"
        })
      }

      await createNotification({
        userId,
        message: `Votre document "${cfg.label}" a été téléversé avec succès et est en cours d'examen par l'administration.`,
        href: "/dashboard/transporter-company/documents"
      })

      toast({ title: "Document téléversé ✓", description: "En cours d'examen par l'administration." })
      onRefresh()
    } catch (e: any) {
      console.error("Upload error:", e)
      toast({ variant: "destructive", title: "Erreur de téléversement", description: e?.message ?? "Vérifiez votre connexion." })
    } finally {
      setUploading(false); setProgress(0)
    }
  }

  const handleDelete = async () => {
    if (!docInfo?.fileName) return
    setDeleting(true)
    try {
      await deleteObject(ref(storage, `company-documents/${userId}/${cfg.storageFolder}/${docInfo.fileName}`))
      await updateDoc(doc(db, "users", userId), {
        [`companyDocuments.${cfg.key}`]: null,
      })
      toast({ title: "Document supprimé." })
      onRefresh()
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur lors de la suppression." })
    } finally {
      setDeleting(false)
    }
  }

  const canUpload = status === "missing" || status === "rejected"
  const hasFile = !!docInfo?.url

  return (
    <Card className={cn(
      "rounded-3xl border bg-card/60 backdrop-blur-md shadow-md transition-all hover:shadow-lg",
      status === "approved" ? "border-emerald-500/20" :
      status === "pending" || status === "uploaded" ? "border-amber-500/20" :
      status === "rejected" ? "border-red-500/25" : "border-border/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
              status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
              status === "pending" || status === "uploaded" ? "bg-amber-500/10 text-amber-400" :
              status === "rejected" ? "bg-red-500/10 text-red-400" : "bg-slate-500/10 text-slate-400"
            )}>
              <FileText size={16}/>
            </span>
            <div>
              <CardTitle className="text-sm font-bold text-foreground leading-tight">
                {cfg.label}
                {cfg.required && <span className="text-red-400 ml-1 text-xs">*</span>}
              </CardTitle>
            </div>
          </div>
          <Badge className={`${statusCfg.className} border text-[10px] font-bold rounded-full px-2 py-1 flex items-center gap-1 shrink-0`}>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusCfg.dotColor, statusCfg.pulse ? "animate-pulse" : "")} />
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{cfg.description}</p>

        {uploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
              <span>Téléversement en cours...</span><span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {status === "rejected" && docInfo?.rejectionReason && (
          <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl p-2.5">
            <XCircle size={13} className="shrink-0 mt-0.5" />
            <span>Rejeté : {docInfo.rejectionReason}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", statusCfg.dotColor, statusCfg.pulse ? "animate-pulse" : "")} />
            <span className="text-[11px] text-muted-foreground">{cfg.required ? "Obligatoire" : "Facultatif"}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasFile && (
              <>
                <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground" asChild>
                  <a href={docInfo.url} target="_blank" rel="noopener noreferrer"><Eye size={12} /> Voir</a>
                </Button>
                <Button variant="ghost" size="sm" disabled={deleting} onClick={handleDelete}
                  className="h-8 rounded-xl text-xs gap-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10">
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </Button>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = "" }} />
            {(canUpload || hasFile) && (
              <Button size="sm" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className={cn("h-8 rounded-xl text-xs gap-1.5 font-bold",
                  status === "rejected"
                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                )}>
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {status === "rejected" ? "Re-soumettre" : hasFile ? "Remplacer" : "Téléverser"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function CompanyDocumentsPage() {
  const { user, userData } = useAuth()
  const [companyDocs, setCompanyDocs] = useState<Record<string, DocInfo>>({})
  const [loading, setLoading] = useState(true)

  const fetchDocs = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, "users", user.uid))
      const data = snap.data()
      setCompanyDocs(data?.companyDocuments ?? {})
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const getStatus = (key: string): DocStatus => {
    const d = companyDocs[key]
    if (!d?.url) return "missing"
    return d.status ?? "uploaded"
  }

  const uploadedCount = COMPANY_DOCS.filter(d => ["uploaded","pending","approved"].includes(getStatus(d.key))).length
  const approvedCount = COMPANY_DOCS.filter(d => getStatus(d.key) === "approved").length
  const missingCount = COMPANY_DOCS.filter(d => ["missing","rejected"].includes(getStatus(d.key))).length
  const completionPct = Math.round((uploadedCount / COMPANY_DOCS.length) * 100)

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400"><Briefcase size={20} /></span>
            Documents Entreprise
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pièces légales obligatoires de <span className="font-semibold text-foreground">{userData?.companyName ?? "votre entreprise"}</span>.
            Les admins reçoivent une notification à chaque soumission.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDocs} className="gap-2 text-muted-foreground self-start">
          <RefreshCw size={14} /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Téléversés", value: uploadedCount, icon: <CheckCircle2 size={16}/>, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Validés", value: approvedCount, icon: <ShieldCheck size={16}/>, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" },
          { label: "Manquants", value: missingCount, icon: <AlertTriangle size={16}/>, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.border} ${s.bg.replace("10","5")}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} ${s.color} shrink-0`}>{s.icon}</span>
            <div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Dossier administratif complété</span>
          <span className={completionPct >= 80 ? "text-emerald-400" : completionPct >= 50 ? "text-amber-400" : "text-red-400"}>
            {completionPct}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted/30 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700",
            completionPct >= 80 ? "bg-emerald-500" : completionPct >= 50 ? "bg-amber-500" : "bg-red-500"
          )} style={{ width: `${completionPct}%` }} />
        </div>
        {missingCount > 0 && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {missingCount} document{missingCount > 1 ? "s" : ""} requis manquant{missingCount > 1 ? "s" : ""} — votre compte peut être restreint.
          </p>
        )}
      </div>

      {/* Document cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {COMPANY_DOCS.map(cfg => (
          <DocCard
            key={cfg.key}
            cfg={cfg}
            docInfo={companyDocs[cfg.key] ?? {}}
            userId={user!.uid}
            onRefresh={fetchDocs}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        * Documents obligatoires. Formats acceptés : PDF, JPEG, PNG — taille max 5 Mo.
      </p>
    </div>
  )
}
