
"use client"

import { useCollection } from "react-firebase-hooks/firestore"
import { collection, query, where, doc, updateDoc, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShieldCheck, AlertTriangle, UserCheck, CheckCircle, FileText, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { createNotification } from "@/lib/notifications"

type DocumentKey = 'identityCard' | 'license' | 'insurance' | 'carteGrise';

interface DocumentInfo {
  url?: string;
  fileName?: string;
  uploadedAt?: Timestamp;
  docNumber?: string;
  issueDate?: Timestamp;
  expiryDate?: Timestamp;
}

const transporterDocumentTypes: Record<DocumentKey, string> = {
  identityCard: "Carte d'identité",
  license: "Permis de conduire",
  insurance: "Assurance véhicule",
  carteGrise: "Carte grise"
};

const DocumentDetail = ({ title, docInfo }: { title: string, docInfo: DocumentInfo | undefined }) => (
    <div className="p-3 rounded-md border flex flex-col gap-2 bg-background/50 flex-grow">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground"/>
                <span className="font-semibold text-sm">{title}</span>
            </div>
            {docInfo?.url ? (
                 <Button asChild variant="link" size="sm" className="p-0 h-auto">
                    <a href={docInfo.url} target="_blank" rel="noopener noreferrer">Voir le fichier</a>
                </Button>
            ) : (
                <span className="text-xs text-destructive">Manquant</span>
            )}
        </div>
        {docInfo?.url && (
            <div className="text-xs space-y-1 pt-2 border-t mt-2">
                 <p><span className="text-muted-foreground">Numéro:</span> <span className="font-mono">{docInfo.docNumber || 'N/A'}</span></p>
                 {docInfo.issueDate && <p><span className="text-muted-foreground">Délivré le:</span> {format(docInfo.issueDate.toDate(), 'P', {locale: fr})}</p>}
                 <p><span className="text-muted-foreground">Expire le:</span> {docInfo.expiryDate ? format(docInfo.expiryDate.toDate(), 'P', {locale: fr}) : 'N/A'}</p>
            </div>
        )}
    </div>
);

const getRoleLabel = (role: string) => {
    switch (role) {
        case 'client': return 'Client';
        case 'transporter': return 'Transporteur';
        case 'client-company': return 'Client (Entreprise)';
        case 'transporter-company': return 'Transporteur (Entreprise)';
        default: return 'Utilisateur';
    }
}

export default function AdminVerificationPage() {
  const { toast } = useToast();
  
  const unverifiedUsersQuery = query(
    collection(db, 'users'), 
    where('role', '!=', 'admin'),
    where('isVerified', '==', false),
    orderBy('role'),
    orderBy('createdAt', 'desc')
  );
  
  const [users, loading, error] = useCollection(unverifiedUsersQuery);

  const handleVerify = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { isVerified: true });
      
      await createNotification({
        userId: userId,
        message: 'Votre compte a été vérifié ! Vous avez maintenant accès à la plateforme.',
        href: '/dashboard/profile'
      });

      toast({
        title: "Utilisateur vérifié !",
        description: "L'utilisateur a maintenant accès à la plateforme.",
        className: "bg-green-100 text-green-800",
      });
    } catch (e) {
      console.error("Error verifying user:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vérifier l'utilisateur."
      });
    }
  }

  const UserVerificationCard = ({ user }: { user: any }) => {
    const documents = user.documents || {};
    const isTransporter = user.role === 'transporter';
    const isClient = user.role === 'client';
    
    let allDocumentsUploaded = false;
    if (isTransporter) {
        allDocumentsUploaded = Object.keys(transporterDocumentTypes).every(key => documents[key as DocumentKey]?.url);
    } else if (isClient) {
        allDocumentsUploaded = !!documents.identityCard?.url;
    } else {
        // For companies, we can auto-verify for now, as they don't upload docs in the same way.
        allDocumentsUploaded = true; 
    }

    return (
        <Card key={user.id} className="bg-background shadow-md rounded-2xl border-border">
            <CardHeader>
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={user.photoURL || `https://placehold.co/48x48/E0F8F8/008080/png?text=${user.firstName?.[0]}${user.lastName?.[0]}`} alt="Avatar" />
                            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{user.companyName || `${user.firstName} ${user.lastName}`}</CardTitle>
                                <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                            </div>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                    <Button onClick={() => handleVerify(user.id)} disabled={!allDocumentsUploaded}>
                        <UserCheck className="mr-2 h-4 w-4"/>
                        Vérifier le profil
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {(isTransporter || isClient) && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Documents et informations :</h4>
                      <div className={`grid sm:grid-cols-2 ${isTransporter ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-4`}>
                          {isTransporter ? (
                            (Object.keys(transporterDocumentTypes) as DocumentKey[]).map(key => (
                                <DocumentDetail key={key} title={transporterDocumentTypes[key]} docInfo={documents[key]} />
                            ))
                          ) : isClient && documents.identityCard ? (
                             <DocumentDetail title="Pièce d'identité" docInfo={documents.identityCard} />
                          ) : null}
                      </div>
                  </div>
                )}
                 {user.role.includes('company') && (
                    <div className="p-3 rounded-md border flex items-center gap-3 bg-background/50">
                        <Briefcase className="h-4 w-4 text-muted-foreground"/>
                        <p className="text-sm font-medium">RCCM: <span className="font-mono">{user.rccm || 'N/A'}</span></p>
                        <p className="text-sm font-medium">Adresse: <span className="font-normal">{user.address || 'N/A'}</span></p>
                    </div>
                 )}

                {!allDocumentsUploaded && (
                    <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4"/>
                        Le profil ne peut être vérifié tant que tous les documents requis ne sont pas fournis.
                    </div>
                )}
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><ShieldCheck /> Vérification des Utilisateurs</h1>
      <Card className="shadow-md rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Utilisateurs en attente</CardTitle>
          <CardDescription>Examinez les profils et approuvez les nouveaux utilisateurs pour leur donner accès à la plateforme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {loading && (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
           )}
           {error && <p className="text-destructive text-center">Erreur: {error.message}</p>}
           
           {!loading && users?.docs.length === 0 && (
            <div className="text-center py-10 text-muted-foreground bg-muted/50 rounded-lg">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-4 font-semibold">Aucun utilisateur en attente</p>
                <p className="text-sm mt-1">Tous les utilisateurs inscrits ont été vérifiés.</p>
            </div>
           )}

           <div className="grid gap-6">
                {users?.docs.map(userDoc => (
                    <UserVerificationCard key={userDoc.id} user={{ id: userDoc.id, ...userDoc.data() }} />
                ))}
           </div>
        </CardContent>
      </Card>
    </div>
  )
}
