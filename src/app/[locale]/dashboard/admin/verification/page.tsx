"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { collection, query, where, doc, updateDoc, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldCheck, AlertTriangle, UserCheck, CheckCircle, FileText, Briefcase, Eye, ExternalLink, XCircle, ChevronDown, ChevronUp } from "lucide-react"
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
}) => {
  const isRejected = docInfo?.status === 'rejected';
  const isApproved = docInfo?.status === 'approved';
  
  return (
    <div className={cn(
      "p-3 rounded-xl border flex items-center justify-between transition-all gap-4 text-xs bg-white dark:bg-[#070A13]",
      docInfo?.url 
        ? (isRejected ? "border-red-500/35 bg-red-500/5 text-slate-900 dark:text-slate-100" : isApproved ? "border-emerald-500/25 bg-emerald-500/5 text-slate-900 dark:text-slate-100" : "border-slate-200 dark:border-slate-800") 
        : "border-red-500/20 bg-red-500/5"
    )}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <FileText className={cn("h-4 w-4 shrink-0", docInfo?.url ? "text-indigo-600 dark:text-indigo-400" : "text-red-500 dark:text-red-400")} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{title}</p>
          {docInfo?.url ? (
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 truncate">
              N°: {docInfo.docNumber || 'N/A'} {docInfo.expiryDate && `| Exp: ${format(docInfo.expiryDate.toDate(), 'dd/MM/yyyy')}`}
            </p>
          ) : (
            <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 font-semibold">Pièce manquante</p>
          )}
        </div>
      </div>

      {docInfo?.url && (
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Badge */}
          {isApproved && <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">Validé</span>}
          {isRejected && <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25" title={docInfo.rejectionReason}>Rejeté</span>}
          {docInfo.status === 'pending' && <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">En attente</span>}
          
          <Button asChild size="sm" variant="outline" className="h-7 px-2.5 rounded-lg border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-transparent">
            <a href={docInfo.url} target="_blank" rel="noopener noreferrer">
              Voir
            </a>
          </Button>

          {!isApproved && onApprove && onReject && (
            <div className="flex gap-1.5">
              <Button size="sm" onClick={onApprove} className="h-7 px-2.5 rounded-lg text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                Accepter
              </Button>
              <Button size="sm" onClick={onReject} variant="outline" className="h-7 px-2.5 rounded-lg text-[10px] text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 bg-white dark:bg-transparent">
                Rejeter
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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

  const isUserReadyForVerification = useCallback((u: any) => {
    const docs = u.documents || {};
    const isTransporter = u.role === 'transporter';
    const isClient = u.role === 'client';
    const isTransporterCompany = u.role === 'transporter-company';
    
    if (isTransporter) {
        return Object.keys(transporterDocumentTypes).every(key => docs[key as DocumentKey]?.status === 'approved');
    } else if (isClient) {
        return docs.identityCard?.status === 'approved';
    } else if (isTransporterCompany) {
        const companyDocs = u.companyDocuments || {};
        const requiredCompanyKeys = ['rccm', 'nif', 'fleetInsurance', 'taxCertificate', 'socialSecurity'];
        return requiredCompanyKeys.every(key => companyDocs[key]?.status === 'approved');
    }
    return true; 
  }, []);

  const sortedUserDocs = useMemo(() => {
    return [...userDocs].sort((a, b) => {
      const aReady = isUserReadyForVerification(a);
      const bReady = isUserReadyForVerification(b);
      if (aReady && !bReady) return -1;
      if (!aReady && bReady) return 1;
      return 0;
    });
  }, [userDocs, isUserReadyForVerification]);

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
    const [isExpanded, setIsExpanded] = useState(false);
    const documents = user.documents || {};
    const isTransporter = user.role === 'transporter';
    const isClient = user.role === 'client';
    const isTransporterCompany = user.role === 'transporter-company';
    
    let allDocumentsUploaded = false;
    let totalRequiredCount = 0;
    let approvedCount = 0;

    if (isTransporter) {
        totalRequiredCount = 5;
        const keys: DocumentKey[] = ['identityCard', 'license', 'insurance', 'carteGrise', 'technicalVisit'];
        approvedCount = keys.filter(k => documents[k]?.status === 'approved').length;
        allDocumentsUploaded = approvedCount === totalRequiredCount;
    } else if (isClient) {
        totalRequiredCount = 1;
        approvedCount = documents.identityCard?.status === 'approved' ? 1 : 0;
        allDocumentsUploaded = approvedCount === totalRequiredCount;
    } else if (isTransporterCompany) {
        totalRequiredCount = 5;
        const companyDocs = user.companyDocuments || {};
        const requiredCompanyKeys = ['rccm', 'nif', 'fleetInsurance', 'taxCertificate', 'socialSecurity'];
        approvedCount = requiredCompanyKeys.filter(key => companyDocs[key]?.status === 'approved').length;
        allDocumentsUploaded = approvedCount === totalRequiredCount;
    } else {
        allDocumentsUploaded = true; 
    }

    // AI recommendation status calculation
    let aiRecommendationText = "Dossier incomplet";
    let aiBadgeStyle = "bg-red-500/10 text-red-400 border border-red-500/20";

    if (allDocumentsUploaded) {
      aiRecommendationText = "Approbation Suggérée (Confiance > 90%)";
      aiBadgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
    } else if (approvedCount > 0) {
      // Check if there are any warning values in the document objects
      const hasWarnings = Object.values(documents).some((d: any) => d?.warnings && d.warnings.length > 0) || 
                          Object.values(user.companyDocuments || {}).some((d: any) => d?.warnings && d.warnings.length > 0);
      if (hasWarnings) {
        aiRecommendationText = "Audit requis (Alerte IA détectée)";
        aiBadgeStyle = "bg-rose-500/10 text-rose-400 border border-rose-500/25";
      } else {
        aiRecommendationText = "Audit manuel recommandé";
        aiBadgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
      }
    }

    return (
        <Card className="shadow-md rounded-2xl border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-[#0B0F19]/45 overflow-hidden transition-all">
            <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-200 dark:border-border/50">
                            <AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'US'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.companyName || `${user.firstName} ${user.lastName}`}</CardTitle>
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100/60 dark:border-border/30">{getRoleLabel(user.role)}</span>
                            </div>
                            <CardDescription className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</CardDescription>
                        </div>
                     </div>
                    
                     <div className="flex items-center gap-3 flex-wrap">
                        {totalRequiredCount > 0 && (
                          <div className="text-left md:text-right shrink-0">
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{approvedCount}/{totalRequiredCount} validés</p>
                            <div className="w-20 bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${(approvedCount / totalRequiredCount) * 100}%` }} />
                            </div>
                          </div>
                        )}

                        <Badge className={cn("text-[9px] uppercase tracking-wider px-2 py-0.5 font-bold rounded shrink-0", aiBadgeStyle)}>
                          {aiRecommendationText}
                        </Badge>

                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-8 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 bg-white dark:bg-transparent"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                            {isExpanded ? "Masquer" : "Inspecter"}
                          </Button>

                          <Button 
                            onClick={() => handleVerify(user.id)} 
                            disabled={!allDocumentsUploaded}
                            size="sm"
                            className="rounded-xl h-8 font-bold bg-primary hover:bg-primary/95 text-white text-[11px]"
                          >
                            <UserCheck className="mr-1.5 h-3.5 w-3.5"/>
                            Valider le compte
                          </Button>
                        </div>
                     </div>
                </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-4 space-y-4 pt-4 border-t border-slate-100 dark:border-border/10 bg-slate-50/50 dark:bg-slate-950/10">
                  {(isTransporter || isClient || isTransporterCompany) && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Pièces justificatives requises</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="p-3 rounded-xl border border-border/20 bg-[#070A13] space-y-1 max-w-xl">
                          <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-1.5"><Briefcase size={12} className="text-sky-400" /> Informations Légales</h4>
                          <p className="text-xs font-medium"><span className="text-muted-foreground">Registre du Commerce (RCCM):</span> <span className="font-mono text-foreground font-bold">{user.rccm || 'Non renseigné'}</span></p>
                          <p className="text-xs font-medium"><span className="text-muted-foreground">Adresse administrative:</span> <span className="text-foreground">{user.address || 'Non renseignée'}</span></p>
                      </div>
                   )}

                  {!allDocumentsUploaded && (
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 text-[11px] font-semibold flex items-center gap-2 border border-amber-500/20 max-w-xl">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0"/>
                          Certaines pièces justificatives obligatoires n&apos;ont pas encore été téléversées et approuvées pour permettre la validation finale.
                      </div>
                  )}
              </CardContent>
            )}
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

           <div className="grid gap-4">
                {sortedUserDocs.map(user => (
                    <UserVerificationCard key={user.id} user={user} />
                ))}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
