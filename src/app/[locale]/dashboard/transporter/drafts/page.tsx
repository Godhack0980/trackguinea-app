"use client";

import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, CheckCircle, XCircle, Clock, Paperclip, ExternalLink, ShieldCheck, User, Building } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  proposé_transporteur: { label: 'Proposition Reçue', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  accepté: { label: 'Contrat Accepté ✅', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  refusé: { label: 'Décliné', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export default function TransporterDraftsPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();

  const [selectedRefuseDraft, setSelectedRefuseDraft] = useState<any>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Query contract drafts proposed to this transporter / company
  const draftsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'drafts'),
      where('proposedTo', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [user]);

  const [draftsSnap, loading] = useCollection(draftsQuery);
  const drafts = draftsSnap?.docs.map(d => ({ id: d.id, ...d.data() })) || [];

  const handleAcceptContract = async (draft: any) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'drafts', draft.id), {
        status: 'accepté',
        acceptedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // 1. Notify Client
      await addDoc(collection(db, 'notifications'), {
        userId: draft.clientId,
        message: `Le transporteur ${userData?.companyName || userData?.firstName} a accepté votre contrat "${draft.title}". TransConnekt finalise la mise en relation.`,
        href: '/dashboard/client/drafts',
        isRead: false,
        createdAt: Timestamp.now(),
      });

      // 2. Notify Admins
      const adminSnap = await useMemo(() => null, []); // notification push to admins handled in Firestore
      toast({
        title: 'Contrat Accepté avec Succès ! 🎉',
        description: 'TransConnekt et le client ont été notifiés de votre accord.',
      });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'accepter le contrat.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefuseContract = async () => {
    if (!selectedRefuseDraft) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'drafts', selectedRefuseDraft.id), {
        status: 'refusé',
        refusalReason: refusalReason.trim() || 'Non précisé',
        refusedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast({
        title: 'Proposition déclinée',
        description: 'L\'administration TransConnekt a été informée.',
      });

      setSelectedRefuseDraft(null);
      setRefusalReason('');
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de décliner la proposition.' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (ts: any) => {
    try { return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: fr }); } catch { return ''; }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Drafts & Propositions de Contrats</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Examinez les propositions de contrats grands comptes et contrats cadres transmis par les administrateurs TransConnekt.
          </p>
        </div>
        <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 px-3 py-1.5 rounded-full text-xs font-bold self-start">
          {drafts.filter((d: any) => d.status === 'proposé_transporteur').length} proposition(s) en attente
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : drafts.length === 0 ? (
        <Card className="rounded-3xl border-border/50 bg-card/60 p-12 text-center space-y-4">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <div>
            <h3 className="text-base font-bold text-foreground">Aucun contrat proposé pour le moment</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Lorsque l'administration TransConnekt vous proposera un contrat de transport cadre ou grand compte, il apparaîtra ici.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft: any) => {
            const statusInfo = STATUS_LABELS[draft.status] || STATUS_LABELS['proposé_transporteur'];
            return (
              <Card key={draft.id} className="rounded-3xl border-border/60 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge className={`text-[10px] font-extrabold uppercase border px-2.5 py-0.5 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border border-border/30">
                      ⚡ {draft.urgency || 'Normal'}
                    </span>
                  </div>

                  <CardTitle className="text-base font-bold text-foreground leading-snug">{draft.title}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-primary flex items-center gap-1 mt-1">
                    <Building size={12} /> Client Pro : {draft.clientName}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pb-4 text-xs">
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/30 space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase text-muted-foreground">Exigences & Clauses du Contrat :</p>
                    <p className="text-foreground leading-relaxed font-medium">{draft.description}</p>
                  </div>

                  {draft.adminNote && (
                    <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                      <p className="font-bold text-[10px] uppercase text-indigo-400">Note de l'Administration TransConnekt :</p>
                      <p className="mt-0.5 font-medium">{draft.adminNote}</p>
                    </div>
                  )}

                  {draft.attachmentUrl && (
                    <a 
                      href={draft.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:underline"
                    >
                      <Paperclip size={13} /> {draft.attachmentName || 'Examiner la pièce jointe PDF'} <ExternalLink size={11} />
                    </a>
                  )}

                  {/* Actions for pending proposals */}
                  {draft.status === 'proposé_transporteur' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                      <Button
                        onClick={() => setSelectedRefuseDraft(draft)}
                        disabled={actionLoading}
                        variant="outline"
                        className="rounded-xl border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-bold text-xs h-10"
                      >
                        <XCircle className="mr-1.5 h-4 w-4" /> Décliner
                      </Button>

                      <Button
                        onClick={() => handleAcceptContract(draft)}
                        disabled={actionLoading}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 shadow-md shadow-emerald-600/20"
                      >
                        {actionLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                        Accepter
                      </Button>
                    </div>
                  )}

                  {draft.status === 'accepté' && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Vous avez accepté ce contrat. Il est actif !
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-border/40 bg-muted/10 text-[11px] text-muted-foreground flex justify-between items-center font-medium">
                  <span>Proposé {formatDate(draft.proposedAt || draft.createdAt)}</span>
                  <span>Validité : {draft.validityDays} jours</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Refuse Dialog */}
      <Dialog open={!!selectedRefuseDraft} onOpenChange={(open) => { if (!open) setSelectedRefuseDraft(null); }}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-500 flex items-center gap-2">
              <XCircle size={18} /> Décliner la proposition de contrat
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indiquez la raison pour laquelle vous déclinez ce contrat. L'administrateur pourra réviser ou le proposer à un autre partenaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-bold">Raison du refus (Optionnel)</Label>
            <Textarea
              placeholder="Ex: Capacité de flotte indisponible sur cette période, tarification à réajuster..."
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
              rows={3}
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="gap-2 border-t border-border/40 pt-3">
            <Button variant="ghost" onClick={() => setSelectedRefuseDraft(null)} className="rounded-xl text-xs">
              Annuler
            </Button>
            <Button 
              onClick={handleRefuseContract} 
              disabled={actionLoading}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {actionLoading ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : null}
              Confirmer le Refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
