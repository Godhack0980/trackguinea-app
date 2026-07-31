"use client";

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/translations';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Plus, 
  Loader2, 
  Paperclip, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink,
  FileCheck,
  Send,
  Building,
  UploadCloud,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export default function ClientDraftsPage() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const { t, lang } = useTranslation();

  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Cadre Régulier');
  const [urgency, setUrgency] = useState('Normale');
  const [validityDays, setValidityDays] = useState(30);
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Query Client's submitted drafts
  const draftsQuery = user
    ? query(
        collection(db, 'drafts'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
    : null;

  const [draftsSnapshot, loadingDrafts] = useCollection(draftsQuery);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Fichier trop lourd', description: 'Le fichier ne doit pas dépasser 10 Mo.' });
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `drafts/${user?.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload error:', error);
          setUploading(false);
          toast({ variant: 'destructive', title: 'Erreur téléversement', description: 'Échec de l\'envoi du fichier.' });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setAttachmentUrl(downloadURL);
          setAttachmentName(file.name);
          setUploading(false);
          toast({ title: 'Pièce jointe ajoutée ! 📄' });
        }
      );
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !user) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Veuillez remplir le titre et la description.' });
      return;
    }

    setSubmitting(true);
    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      const userData = userDoc.docs[0]?.data() || {};

      await addDoc(collection(db, 'drafts'), {
        title,
        type,
        urgency,
        validityDays: Number(validityDays),
        description,
        attachmentUrl,
        attachmentName,
        clientId: user.uid,
        clientName: userData.companyName || `${userData.firstName} ${userData.lastName}`,
        clientPhone: userData.phone || '',
        clientEmail: user.email || '',
        status: 'soumis_admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Notify Admins
      const adminUsersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnap = await getDocs(adminUsersQuery);
      adminSnap.forEach((aDoc) => {
        addDoc(collection(db, 'notifications'), {
          userId: aDoc.id,
          message: `Nouveau contrat Pro soumis par ${userData.companyName || userData.firstName} : "${title}".`,
          href: '/dashboard/admin/drafts',
          isRead: false,
          createdAt: Timestamp.now(),
        });
      });

      toast({
        title: 'Draft / Contrat Soumis avec Succès ! 📄',
        description: 'Votre projet de contrat a été transmis aux administrateurs TransConnekt.',
      });

      setOpenModal(false);
      setTitle('');
      setDescription('');
      setAttachmentUrl('');
      setAttachmentName('');
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'enregistrer le contrat.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ts: any) => {
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: lang === 'fr' ? fr : enUS }); } catch { return ''; }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            {t.draft_title || "Drafts & Contrats Cadres Pro"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t.draft_subtitle || "Proposez des contrats de transport réguliers, cadres ou exclusifs gérés avec l'intermédiation directe de TransConnekt."}
          </p>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-white font-extrabold text-xs h-11 px-5 gap-2 shadow-lg shadow-primary/20">
              <Plus size={16} /> {t.draft_new_btn || "Nouveau Projet de Contrat"}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg rounded-3xl bg-card border-border shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="text-primary" /> {t.draft_modal_title || "Soumettre un Projet de Contrat / Draft"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {t.draft_modal_subtitle || "TransConnekt servira d'intermédiaire direct pour soumettre et négocier ce contrat auprès de nos transporteurs partenaires."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateDraft} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t.draft_form_title_label || "Titre du Projet de Contrat *"}</Label>
                <Input 
                  placeholder={t.draft_form_title_placeholder || "Ex: Transport Régulier Ciment Kankan-Conakry 2026"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t.draft_form_type_label || "Type de Contrat"}</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="rounded-xl text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Cadre Régulier">Cadre Régulier</SelectItem>
                      <SelectItem value="Volume Exclusif">Volume Exclusif</SelectItem>
                      <SelectItem value="Projet Minière/Simandou">Projet Minière/Simandou</SelectItem>
                      <SelectItem value="Distribution Spot">Distribution Spot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">{t.draft_form_urgency_label || "Niveau d'Urgence"}</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger className="rounded-xl text-xs h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Normale">Normale</SelectItem>
                      <SelectItem value="Haute (Urgent)">Haute (Urgent)</SelectItem>
                      <SelectItem value="Critique (Simandou)">Critique (Simandou)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t.draft_form_validity_label || "Durée de Validité Estimée (Jours)"}</Label>
                <Input 
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="rounded-xl text-xs"
                  min={7}
                  max={365}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t.draft_form_desc_label || "Description & Demandes spécifiques du Contrat *"}</Label>
                <Textarea 
                  placeholder={t.draft_form_desc_placeholder || "Précisez vos volumes mensuels, les itinéraires réguliers, vos conditions tarifaires souhaitées..."}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl text-xs min-h-[100px]"
                  required
                />
              </div>

              {/* PDF Attachment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t.draft_form_file_label || "Pièce Jointe PDF / Cahier des Charges (Optionnel)"}</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.png,.jpg"
                    onChange={handleFileUpload}
                    className="rounded-xl text-xs cursor-pointer bg-muted/40"
                    disabled={uploading}
                  />
                  {uploading && <Loader2 className="animate-spin text-primary shrink-0" size={18} />}
                </div>
                {attachmentName && (
                  <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} /> {attachmentName}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={submitting || uploading}
                  className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs h-11 gap-2 shadow-lg shadow-primary/20"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  {submitting ? (t.draft_submitting || "Soumission...") : (t.draft_submit_btn || "Soumettre le Projet de Contrat")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List of Drafts */}
      {loadingDrafts ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : draftsSnapshot && !draftsSnapshot.empty ? (
        <div className="grid md:grid-cols-2 gap-4">
          {draftsSnapshot.docs.map((docSnap) => {
            const draft = { id: docSnap.id, ...docSnap.data() } as any;

            let statusBadge = (
              <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]">
                <Clock size={12} className="mr-1" /> En examen Admin
              </Badge>
            );

            if (draft.status === 'proposé_transporteur') {
              statusBadge = (
                <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px]">
                  <UserCheck size={12} className="mr-1" /> Proposé à : {draft.proposedToName}
                </Badge>
              );
            } else if (draft.status === 'accepté') {
              statusBadge = (
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px]">
                  <CheckCircle2 size={12} className="mr-1" /> Contrat Signé / Accepté
                </Badge>
              );
            } else if (draft.status === 'refusé') {
              statusBadge = (
                <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px]">
                  <XCircle size={12} className="mr-1" /> Décliné par le transporteur
                </Badge>
              );
            }

            return (
              <Card key={draft.id} className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-foreground line-clamp-1">{draft.title}</CardTitle>
                      <CardDescription className="text-[11px] text-muted-foreground">
                        {draft.type} • {formatDate(draft.createdAt)}
                      </CardDescription>
                    </div>
                    {statusBadge}
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <p className="text-muted-foreground line-clamp-3 leading-relaxed">{draft.description}</p>

                  {draft.attachmentUrl && (
                    <div className="pt-1">
                      <a 
                        href={draft.attachmentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                      >
                        <Paperclip size={14} /> {draft.attachmentName || 'Voir le cahier des charges (PDF)'} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {draft.adminNote && (
                    <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 text-[11px] space-y-1">
                      <span className="font-extrabold text-primary flex items-center gap-1">
                        <ShieldCheck size={14} /> Note de l'Administrateur TransConnekt :
                      </span>
                      <p className="text-muted-foreground">{draft.adminNote}</p>
                    </div>
                  )}

                  {draft.refusalReason && draft.status === 'refusé' && (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] space-y-1">
                      <span className="font-extrabold text-rose-500 flex items-center gap-1">
                        <AlertCircle size={14} /> Motif du refus par le transporteur :
                      </span>
                      <p className="text-muted-foreground">{draft.refusalReason}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-muted/20 border-t border-border/30 px-4 py-3 flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>Urgence : <strong className="text-foreground">{draft.urgency}</strong></span>
                  <span>Validité : <strong className="text-foreground">{draft.validityDays} jours</strong></span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border/60 rounded-3xl text-center bg-card/40 space-y-3">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <h3 className="font-bold text-foreground text-base">
              {t.draft_empty_title || "Aucun contrat soumis"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {t.draft_empty_desc || "Utilisez le bouton \"Nouveau Projet de Contrat\" pour transmettre vos besoins spécifiques aux équipes d'administration TransConnekt."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
