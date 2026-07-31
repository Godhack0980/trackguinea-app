"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, query, where, doc, updateDoc, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldCheck, AlertTriangle, UserCheck, CheckCircle, FileText, Briefcase, Eye, ExternalLink, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { createNotification } from "@/lib/notifications"
import { cn } from "@/lib/utils"

type DocumentKey = 'identityCard' | 'license' | 'insurance' | 'carteGrise' | 'technicalVisit';

interface DocumentInfo {
  url?: string;
  fileName?: string;
  uploadedAt?: Timestamp;
  docNumber?: string;
  issueDate?: Timestamp;
  expiryDate?: Timestamp;
  status?: 'approved' | 'rejected' | 'pending' | 'processing';
  rejectionReason?: string;
  confidence?: number;
  warnings?: string[];
}

const transporterDocumentTypes: Record<DocumentKey, string> = {
  identityCard: "Carte d'identité",
  license: "Permis de conduire",
  insurance: "Assurance véhicule",
  carteGrise: "Carte grise",
  technicalVisit: "Attestation de visite technique"
};

const companyDocumentTypes: Record<string, string> = {
  rccm: "Registre du Commerce (RCCM)",
  nif: "Numéro d'Identification Fiscale (NIF)",
  fleetInsurance: "Assurance Flotte Véhicules",
  taxCertificate: "Attestation de Régularité Fiscale",
  socialSecurity: "Attestation CNSS",
  bankDetails: "RIB / Coordonnées Bancaires",
  operatingLicense: "Autorisation d'Exploitation Transport",
};

const DocumentDetail = ({
  title,
  docInfo,
  onApprove,
  onReject
}: {
  title: string
  docInfo: DocumentInfo | undefined
  onApprove?: () => void
  onReject?: () => void
}) => (
    <div className={cn(
      "p-3.5 rounded-2xl border flex flex-col justify-between bg-slate-900/40 min-h-[145px] transition-all",
      docInfo?.url 
        ? (docInfo.status === 'rejected' ? "border-red-500/35 bg-red-500/5 text-red-300" : docInfo.status === 'approved' ? "border-emerald-500/20" : "border-indigo-500/20") 
        : "border-red-500/20"
    )}>
        <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
              <FileText className={cn("h-3.5 w-3.5", docInfo?.url ? "text-indigo-400" : "text-red-400")} />
              {title}
            </span>
            {docInfo?.url ? (
              <div className="flex items-center gap-2">
                 {docInfo.status === 'approved' && <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Validé</span>}
                 {docInfo.status === 'rejected' && <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Rejeté</span>}
                 {docInfo.status === 'processing' && <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">Analyse...</span>}
                 {docInfo.status === 'pending' && <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">En attente</span>}
                 <Button asChild variant="outline" size="sm" className="h-7 rounded-lg border-border/50 hover:bg-slate-800 text-[10px] font-bold">
                    <a href={docInfo.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      Visualiser <ExternalLink size={10} />
                    </a>
                </Button>
              </div>
            ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Manquant</span>
            )}
        </div>
        {docInfo?.url ? (
            <div className="text-[10px] space-y-1 pt-2 border-t border-border/20 mt-2 font-medium">
                 <p className="flex justify-between"><span className="text-muted-foreground">Numéro:</span> <span className="font-mono text-foreground font-semibold">{docInfo.docNumber || 'N/A'}</span></p>
                 {docInfo.issueDate && <p className="flex justify-between"><span className="text-muted-foreground">Émis le:</span> <span className="text-foreground">{format(docInfo.issueDate.toDate(), 'dd/MM/yyyy')}</span></p>}
                 <p className="flex justify-between"><span className="text-muted-foreground">Expire le:</span> <span className="text-foreground">{docInfo.expiryDate ? format(docInfo.expiryDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</span></p>
                 {docInfo.confidence !== undefined && (
                   <p className="flex justify-between">
                     <span className="text-muted-foreground">Confiance IA:</span>
                     <span className={cn(
                       "font-bold",
                       docInfo.confidence >= 80 ? "text-emerald-400" : docInfo.confidence >= 50 ? "text-amber-400" : "text-rose-400"
                     )}>
                       {docInfo.confidence}%
                     </span>
                   </p>
                 )}
                 {docInfo.status === 'rejected' && docInfo.rejectionReason && (
                   <p className="text-[9px] text-red-400 mt-1 leading-normal font-semibold border-t border-red-500/10 pt-1">Raison: {docInfo.rejectionReason}</p>
                 )}
                 {docInfo.warnings && docInfo.warnings.length > 0 && (
                    <div className="text-[9px] text-amber-400 mt-1 border-t border-amber-500/10 pt-1 space-y-0.5">
                      <p className="font-bold flex items-center gap-0.5">
                        <AlertTriangle size={10} className="shrink-0" /> Alertes IA :
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground/80">
                        {docInfo.warnings.map((w, idx) => (
                          <li key={idx} className="truncate" title={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                 )}

                 {/* Admin Actions */}
                 {docInfo.status !== 'approved' && onApprove && onReject && (
                   <div className="flex gap-1.5 pt-2 border-t border-border/10 mt-2">
                     <Button size="sm" onClick={onApprove} className="h-6 rounded-lg text-[9px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex-grow font-bold border border-emerald-500/20">
                       Accepter
                     </Button>
                     <Button size="sm" onClick={onReject} variant="outline" className="h-6 rounded-lg text-[9px] text-red-400 hover:bg-red-500/10 hover:text-red-400 flex-grow font-bold border-red-500/20">
                       Rejeter
                     </Button>
                   </div>
                 )}
            </div>
        ) : (
          <div className="text-[10px] text-muted-foreground/60 italic pt-2 border-t border-border/10 mt-2">
            Non renseigné par le transporteur.
          </div>
        )}
    </div>
);

const getRoleLabel = (role: string) => {
    switch (role) {
        case 'client': return 'Client Particulier';
        case 'transporter': return 'Transporteur';
        case 'client-company': return 'Client Entreprise';
        case 'transporter-company': return 'Flotte Transport';
        default: return 'Utilisateur';
    }
}

export default function AdminVerificationPage() {
  const { toast } = useToast();
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnverified = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '!=', 'admin'),
        where('isVerified', '==', false),
        orderBy('role'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setUserDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      console.error("Error fetching unverified users:", e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUnverified(); }, [fetchUnverified]);

  const handleVerify = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { isVerified: true });
      
      await createNotification({
        userId: userId,
        message: 'Votre compte a été vérifié ! Vous avez maintenant accès à la plateforme.',
        href: '/dashboard/profile'
      });

      toast({
        title: "Compte validé avec succès !",
        description: "L'utilisateur a été notifié de son approbation administrative.",
      });
      fetchUnverified(); // Refresh list after verifying
    } catch (e) {
      console.error("Error verifying user:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de valider cet utilisateur."
      });
    }
  }

  const handleApproveDoc = async (userId: string, docKey: string, isCompanyDoc: boolean, title: string) => {
    try {
      const field = isCompanyDoc ? `companyDocuments.${docKey}.status` : `documents.${docKey}.status`;
      await updateDoc(doc(db, "users", userId), { [field]: 'approved' });
      
      await createNotification({
        userId,
        message: `Votre document "${title}" a été approuvé par l'administration.`,
        href: isCompanyDoc ? '/dashboard/transporter-company/documents' : '/dashboard/transporter/documents'
      });

      toast({ title: "Document approuvé ✓" });
      fetchUnverified();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  }

  const handleRejectDoc = async (userId: string, docKey: string, isCompanyDoc: boolean, title: string) => {
    const reason = prompt("Raison du rejet :");
    if (reason === null) return;
    try {
      const fieldStatus = isCompanyDoc ? `companyDocuments.${docKey}.status` : `documents.${docKey}.status`;
      const fieldReason = isCompanyDoc ? `companyDocuments.${docKey}.rejectionReason` : `documents.${docKey}.rejectionReason`;
      await updateDoc(doc(db, "users", userId), {
        [fieldStatus]: 'rejected',
        [fieldReason]: reason || "Non conforme"
      });
      
      await createNotification({
        userId,
        message: `Votre document "${title}" a été rejeté par l'administration. Raison: ${reason || 'Non conforme'}`,
        href: isCompanyDoc ? '/dashboard/transporter-company/documents' : '/dashboard/transporter/documents'
      });

      toast({ title: "Document rejeté ✓" });
      fetchUnverified();
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur" });
    }
  }

  const UserVerificationCard = ({ user }: { user: any }) => {
    const documents = user.documents || {};
    const isTransporter = user.role === 'transporter';
    const isClient = user.role === 'client';
    const isTransporterCompany = user.role === 'transporter-company';
    
    let allDocumentsUploaded = false;
    if (isTransporter) {
        allDocumentsUploaded = Object.keys(transporterDocumentTypes).every(key => documents[key as DocumentKey]?.status === 'approved');
    } else if (isClient) {
        allDocumentsUploaded = documents.identityCard?.status === 'approved';
    } else if (isTransporterCompany) {
        const companyDocs = user.companyDocuments || {};
        const requiredCompanyKeys = ['rccm', 'nif', 'fleetInsurance', 'taxCertificate', 'socialSecurity'];
        allDocumentsUploaded = requiredCompanyKeys.every(key => companyDocs[key]?.status === 'approved');
    } else {
        allDocumentsUploaded = true; 
    }

    return (
        <Card className="shadow-lg rounded-3xl border border-border/50 bg-card/65 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.005]">
            <CardHeader className="pb-4 border-b border-border/20 bg-slate-950/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border border-border/50">
                            <AvatarFallback className="bg-indigo-500/10 text-indigo-400 font-bold text-sm">
                                {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'US'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-base font-bold text-foreground">{user.companyName || `${user.firstName} ${user.lastName}`}</CardTitle>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-border/30">{getRoleLabel(user.role)}</span>
                            </div>
                            <CardDescription className="text-xs font-mono text-muted-foreground/80 mt-0.5">{user.email}</CardDescription>
                        </div>
                     </div>
                    
                     <Button 
                       onClick={() => handleVerify(user.id)} 
                       disabled={!allDocumentsUploaded}
                       className="rounded-xl font-bold bg-primary hover:bg-primary/95 text-white"
                     >
                        <UserCheck className="mr-2 h-4 w-4"/>
                        Valider l&apos;Utilisateur
                     </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
                {(isTransporter || isClient || isTransporterCompany) && (
                  <div>
                    <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-3">Auditer les pièces justificatives</h4>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {isTransporter ? (
                          (Object.keys(transporterDocumentTypes) as DocumentKey[]).map(key => (
                              <DocumentDetail
                                key={key}
                                title={transporterDocumentTypes[key]}
                                docInfo={documents[key]}
                                onApprove={() => handleApproveDoc(user.id, key, false, transporterDocumentTypes[key])}
                                onReject={() => handleRejectDoc(user.id, key, false, transporterDocumentTypes[key])}
                              />
                          ))
                        ) : isClient ? (
                           <DocumentDetail
                             title="Pièce d'identité"
                             docInfo={documents.identityCard}
                             onApprove={() => handleApproveDoc(user.id, 'identityCard', false, "Pièce d'identité")}
                             onReject={() => handleRejectDoc(user.id, 'identityCard', false, "Pièce d'identité")}
                           />
                        ) : isTransporterCompany ? (
                           Object.keys(companyDocumentTypes).map(key => (
                              <DocumentDetail
                                key={key}
                                title={companyDocumentTypes[key]}
                                docInfo={user.companyDocuments?.[key]}
                                onApprove={() => handleApproveDoc(user.id, key, true, companyDocumentTypes[key])}
                                onReject={() => handleRejectDoc(user.id, key, true, companyDocumentTypes[key])}
                              />
                           ))
                        ) : null}
                    </div>
                  </div>
                )}
                 {user.role.includes('company') && (
                    <div className="p-3.5 rounded-2xl border border-border/30 bg-slate-900/40 space-y-1">
                        <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2"><Briefcase size={14} className="text-sky-400" /> Informations Légales</h4>
                        <p className="text-xs font-medium"><span className="text-muted-foreground">Registre du Commerce (RCCM):</span> <span className="font-mono text-foreground font-bold">{user.rccm || 'Non renseigné'}</span></p>
                        <p className="text-xs font-medium"><span className="text-muted-foreground">Adresse administrative:</span> <span className="text-foreground">{user.address || 'Non renseignée'}</span></p>
                    </div>
                 )}

                {!allDocumentsUploaded && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 text-xs font-semibold flex items-center gap-2 border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0"/>
                        Tous les justificatifs obligatoires n&apos;ont pas encore été téléversés et approuvés.
                    </div>
                )}
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Vérification des Comptes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Validez l&apos;authenticité des conducteurs et entreprises rejoignant le réseau.</p>
        </div>
      </div>

      <Card className="shadow-xl rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="border-b border-border/20 pb-4">
          <CardTitle className="text-lg font-bold text-foreground">Dossiers administratifs à instruire</CardTitle>
          <CardDescription>Auditez les scans des pièces officielles et activez les comptes qualifiés.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
           {loading && (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
             </div>
           )}
           {error && <p className="text-destructive text-center font-semibold">Erreur: {error.message}</p>}
           
           {!loading && userDocs.length === 0 && (
            <div className="text-center py-16 text-muted-foreground bg-slate-900/30 rounded-3xl border border-border/40 gap-3 flex flex-col items-center">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <div>
                  <p className="font-bold text-foreground text-lg">Aucun dossier en attente</p>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">Tous les utilisateurs actuellement inscrits ont été audités et validés.</p>
                </div>
            </div>
           )}

           <div className="grid gap-6">
                {userDocs.map(user => (
                    <UserVerificationCard key={user.id} user={user} />
                ))}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
