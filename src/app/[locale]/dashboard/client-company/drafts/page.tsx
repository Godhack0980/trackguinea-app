"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FilePlus2, Loader2, FileText, Clock, CheckCircle, AlertTriangle, Send, Paperclip, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const URGENCY_LEVELS = ['Faible', 'Moyen', 'Urgent', 'Critique'];
const CONTRACT_TYPES = ['Transport Minier', 'Transport de Marchandises', 'Logistique Entreprise', 'Déménagement', 'Transport Agricole', 'Autre'];

const URGENCY_COLORS: Record<string, string> = {
  'Faible': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Moyen': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Urgent': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Critique': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: <FileText size={11} /> },
  soumis_admin: { label: 'Soumis à l\'admin', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: <Send size={11} /> },
  proposé_transporteur: { label: 'Proposé à un transporteur', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: <Send size={11} /> },
  accepté: { label: 'Accepté', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={11} /> },
  refusé: { label: 'Refusé', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <AlertTriangle size={11} /> },
};

export default function ClientCompanyDraftsPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    urgency: '',
    validityDays: '30',
  });

  const draftsQuery = useMemo(() => {
    return user
      ? query(
          collection(db, 'drafts'),
          where('clientId', '==', user.uid)
        )
      : null;
  }, [user?.uid]);

  const [draftsSnap, loading] = useCollection(draftsQuery);
  const drafts = useMemo(() => {
    if (!draftsSnap) return [];
    return draftsSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
  }, [draftsSnap]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileInput(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.type || !form.urgency) {
      toast({ variant: 'destructive', title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }
    setSubmitting(true);
    try {
      let attachmentUrl = "";
      let attachmentName = "";

      // Optional file upload
      if (fileInput) {
        const storageRef = ref(storage, `drafts/${user?.uid}/${Date.now()}_${fileInput.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, fileInput);
        attachmentUrl = await getDownloadURL(uploadTask.ref);
        attachmentName = fileInput.name;
      }

      await addDoc(collection(db, 'drafts'), {
        title: form.title,
        description: form.description,
        type: form.type,
        urgency: form.urgency,
        validityDays: parseInt(form.validityDays) || 30,
        status: 'soumis_admin',
        clientId: user?.uid,
        clientName: userData?.companyName || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
        attachmentUrl,
        attachmentName,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast({ title: 'Draft soumis ✅', description: 'Votre draft a été soumis à l\'administrateur TransConnekt.' });
      setDialogOpen(false);
      setFileInput(null);
      setForm({ title: '', description: '', type: '', urgency: '', validityDays: '30' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de soumettre le draft.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ts: any) => {
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: fr }); } catch { return ''; }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Drafts & Contrats</h1>
          <p className="text-sm text-muted-foreground mt-1">Publiez vos appels d&apos;offres et contrats de transport. L&apos;admin TransConnekt les soumettra aux transporteurs appropriés.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 font-bold">
              <FilePlus2 className="h-4 w-4" /> Nouveau Draft
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Créer un Draft / Appel d&apos;Offres</DialogTitle>
              <DialogDescription>
                Décrivez votre besoin de transport. Il sera transmis à l&apos;admin TransConnekt qui contactera les transporteurs pros pour vous.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1">
                <Label>Titre du contrat *</Label>
                <Input placeholder="Ex: Transport de minerai Boke → Conakry" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Niveau d&apos;urgence *</Label>
                  <Select value={form.urgency} onValueChange={v => setForm(f => ({...f, urgency: v}))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{URGENCY_LEVELS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Durée de validité (jours) *</Label>
                <Input type="number" min="1" max="365" value={form.validityDays} onChange={e => setForm(f => ({...f, validityDays: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <Label>Description complète *</Label>
                <Textarea
                  placeholder="Décrivez en détail : marchandises, volumes, fréquence, lieux de chargement/déchargement, exigences particulières..."
                  value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 cursor-pointer">
                  <Paperclip size={14} className="text-indigo-400" /> Ajouter un document ou une image (Facultatif)
                </Label>
                <Input type="file" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} className="rounded-xl" />
                {fileInput && <p className="text-xs text-indigo-400">Fichier sélectionné : {fileInput.name}</p>}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-primary hover:bg-primary/90 text-white">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi...</> : <><Send className="mr-2 h-4 w-4" />Soumettre à l&apos;admin</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText size={28} className="text-primary" />
          </div>
          <h3 className="font-bold text-lg">Aucun draft pour l&apos;instant</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Créez votre premier appel d&apos;offres pour le soumettre à l&apos;admin TransConnekt.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drafts.map((draft: any) => {
            const status = STATUS_LABELS[draft.status] || STATUS_LABELS['brouillon'];
            const urgency = URGENCY_COLORS[draft.urgency] || URGENCY_COLORS['Faible'];
            return (
              <Card key={draft.id} className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${urgency}`}>
                        <AlertTriangle size={10} /> {draft.urgency}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold leading-tight">{draft.title}</CardTitle>
                    <CardDescription className="text-xs">{draft.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{draft.description}</p>
                    {draft.attachmentUrl && (
                      <div className="pt-2">
                        <a href={draft.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl transition-all">
                          <Paperclip size={12} /> {draft.attachmentName || "Pièce jointe"} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </CardContent>
                </div>
                <CardContent className="pt-0 pb-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-3 border-t border-border/20">
                    <Clock size={11} />
                    <span>Valide {draft.validityDays} jour{draft.validityDays > 1 ? 's' : ''}</span>
                    <span className="mx-1">·</span>
                    <span>{formatDate(draft.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
