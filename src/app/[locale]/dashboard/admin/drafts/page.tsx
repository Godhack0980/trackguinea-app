"use client";

import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, doc, updateDoc, addDoc, Timestamp, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Send, AlertTriangle, Clock, Building, CheckCircle, Paperclip, ExternalLink, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const URGENCY_COLORS: Record<string, string> = {
  'Faible': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Moyen': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Urgent': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Critique': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  soumis_admin: { label: 'Soumis à l\'admin (À traiter)', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  proposé_transporteur: { label: 'Proposé au Transporteur', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  accepté: { label: 'Accepté ✅', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  refusé: { label: 'Refusé par le transporteur', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export default function AdminDraftsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [proposingTo, setProposingTo] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [proposing, setProposing] = useState(false);

  // Load all drafts
  const draftsQuery = useMemo(() => {
    return query(collection(db, 'drafts'), orderBy('createdAt', 'desc'));
  }, []);
  const [draftsSnap, loading] = useCollection(draftsQuery);
  const drafts = draftsSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];

  // Load ALL transporter users (both independent and companies)
  const transportersQuery = useMemo(() => {
    return query(collection(db, 'users'), where('role', 'in', ['transporter', 'transporter-company']));
  }, []);
  const [transportersSnap] = useCollection(transportersQuery);
  const transporters = transportersSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];

  const handlePropose = async () => {
    if (!selectedDraft || !proposingTo) return;
    setProposing(true);
    try {
      const transporter = transporters.find((t: any) => t.id === proposingTo) as any;
      const transporterName = transporter?.companyName || `${transporter?.firstName} ${transporter?.lastName}`;

      await updateDoc(doc(db, 'drafts', selectedDraft.id), {
        status: 'proposé_transporteur',
        proposedTo: proposingTo,
        proposedToName: transporterName,
        adminNote: adminNote.trim() || null,
        proposedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Notify the transporter
      await addDoc(collection(db, 'notifications'), {
        userId: proposingTo,
        message: `Nouveau contrat proposé par TransConnekt : "${selectedDraft.title}". Consultez votre espace Drafts & Contrats.`,
        href: '/dashboard/transporter/drafts',
        isRead: false,
        createdAt: Timestamp.now(),
      });

      toast({ 
        title: 'Contrat Proposé avec Succès ! ✅', 
        description: `Le contrat a été soumis à ${transporterName}.` 
      });

      setSelectedDraft(null);
      setProposingTo('');
      setAdminNote('');
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de proposer le contrat.' });
    } finally {
      setProposing(false);
    }
  };

  const formatDate = (ts: any) => {
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: fr }); } catch { return ''; }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Drafts & Contrats Clients (Intermédiation)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Examinez les projets de contrats soumis par les clients Pro et proposez-les aux transporteurs qualifiés du réseau.
          </p>
        </div>
        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold self-start">
          {drafts.filter((d: any) => d.status === 'soumis_admin').length} contrat(s) en attente de traitement
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : drafts.length === 0 ? (
        <Card className="rounded-3xl border-border/50 bg-card/60 p-12 text-center space-y-4">
          <FileText size={32} className="mx-auto text-muted-foreground/40" />
          <div>
            <h3 className="font-bold text-lg text-foreground">Aucun draft soumis</h3>
            <p className="text-xs text-muted-foreground mt-1">Les contrats soumis par les clients apparaissent ici pour traitement par l'administration.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft: any) => {
            const status = STATUS_LABELS[draft.status] || STATUS_LABELS['brouillon'];
            const urgency = URGENCY_COLORS[draft.urgency] || '';
            return (
              <Card key={draft.id} className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-md shadow-md hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${status.color}`}>
                      {status.label}
                    </span>
                    {draft.urgency && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${urgency}`}>
                        <AlertTriangle size={10} /> {draft.urgency}
                      </span>
                    )}
                  </div>

                  <CardTitle className="text-base font-bold text-foreground leading-snug">{draft.title}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-primary">{draft.type} · Client : {draft.clientName}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-4 text-xs font-medium">
                  <p className="text-muted-foreground line-clamp-3 bg-muted/20 p-3 rounded-2xl border border-border/30 leading-relaxed">
                    {draft.description}
                  </p>

                  {draft.attachmentUrl && (
                    <a href={draft.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline font-bold">
                      <Paperclip size={13} /> {draft.attachmentName || "Pièce jointe PDF"} <ExternalLink size={11} />
                    </a>
                  )}

                  {draft.proposedToName && (
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold flex items-center gap-1.5">
                      <Building size={13} /> Proposé à : <strong>{draft.proposedToName}</strong>
                    </div>
                  )}

                  {draft.status === 'soumis_admin' && (
                    <Button
                      className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 shadow-md"
                      onClick={() => setSelectedDraft(draft)}
                    >
                      <Send className="mr-2 h-4 w-4" /> Proposer à un Transporteur
                    </Button>
                  )}

                  {draft.status === 'refusé' && (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                        <p className="font-bold flex items-center gap-1"><XCircle size={13} /> Refusé par le transporteur</p>
                        {draft.refusalReason && <p className="text-[11px] mt-0.5">Raison : {draft.refusalReason}</p>}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 font-bold text-xs h-10"
                        onClick={() => setSelectedDraft(draft)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Ré-attribuer à un autre transporteur
                      </Button>
                    </div>
                  )}

                  {draft.status === 'accepté' && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle size={16} /> Contrat Validé & Signé par le transporteur !
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-border/40 bg-muted/10 text-[11px] text-muted-foreground flex justify-between items-center font-medium">
                  <span>Créé {formatDate(draft.createdAt)}</span>
                  <span>Validité : {draft.validityDays} jours</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Propose to transporter dialog */}
      <Dialog open={!!selectedDraft} onOpenChange={open => { if (!open) { setSelectedDraft(null); setProposingTo(''); setAdminNote(''); } }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="text-indigo-500" /> Proposer le Contrat à un Transporteur
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sélectionnez le transporteur partenaire (Entreprise ou Indépendant) auquel transmettre ce contrat.
            </DialogDescription>
          </DialogHeader>

          {selectedDraft && (
            <div className="bg-muted/30 rounded-2xl p-3 text-xs border border-border/40 space-y-1">
              <p className="font-extrabold text-foreground">{selectedDraft.title}</p>
              <p className="text-muted-foreground">Client : {selectedDraft.clientName} · Urgence : {selectedDraft.urgency}</p>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Sélectionner le Transporteur Partenaire *</Label>
              <Select value={proposingTo} onValueChange={setProposingTo}>
                <SelectTrigger className="rounded-xl h-11 text-xs">
                  <SelectValue placeholder="Choisir un transporteur..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-60">
                  {transporters.length === 0 ? (
                    <SelectItem value="_none" disabled>Aucun transporteur inscrit</SelectItem>
                  ) : (
                    transporters.map((t: any) => (
                      <SelectItem key={t.id} value={t.id} className="rounded-xl text-xs font-medium">
                        {t.companyName || `${t.firstName} ${t.lastName}`} ({t.role === 'transporter-company' ? 'Entreprise Pro' : 'Indépendant'}) — {t.phone || t.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Note / Consigne de l'Admin (Optionnel)</Label>
              <Textarea
                placeholder="Ex: Tarification négociée à 12 000 000 GNF par voyage. Flotte minimale recommandée : 3 camions."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border/40 pt-3">
            <Button variant="ghost" onClick={() => { setSelectedDraft(null); setProposingTo(''); setAdminNote(''); }} className="rounded-xl text-xs">
              Annuler
            </Button>
            <Button onClick={handlePropose} disabled={proposing || !proposingTo} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
              {proposing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Envoyer la proposition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
