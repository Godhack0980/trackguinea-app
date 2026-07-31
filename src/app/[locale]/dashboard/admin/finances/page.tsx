"use client";

import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, doc, updateDoc, getDocs, addDoc, Timestamp, increment, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Landmark, Wallet, ShieldCheck, CheckCircle2, XCircle, ArrowDownLeft, BadgeAlert, Coins, Phone, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { createNotification } from "@/lib/notifications";

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: string;
  phoneOrAccount: string;
  driverName?: string;
  companyName?: string;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: any;
}

interface Transaction {
  id: string;
  requestId?: string;
  userId: string;
  type: 'deposit' | 'payout' | 'withdrawal' | 'commission' | 'subscription' | 'refund';
  amount: number;
  method?: string;
  status: string;
  timestamp: any;
}

export default function AdminFinancesPage() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalEscrow: 0,
    totalCommissions: 0,
    activeSubscriptions: 0,
    pendingWithdrawalsAmount: 0
  });

  const fetchFinancesData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch pending withdrawals
      const wQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
      const wSnap = await getDocs(wQuery);
      const wList = wSnap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal));
      setWithdrawals(wList);

      // 2. Fetch all transactions
      const tQuery = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
      const tSnap = await getDocs(tQuery);
      const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(tList);

      // 3. Fetch active premium companies
      const uQuery = query(collection(db, "users"), where("subscriptionStatus", "==", "active"));
      const uSnap = await getDocs(uQuery);

      // Calculate stats
      const totalCommissions = tList
        .filter(t => t.type === 'commission' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // Total escrow held: deposits that are not yet released or refunded
      // We can also query requests where paymentStatus === 'escrow_held'
      const rSnap = await getDocs(query(collection(db, "requests"), where("paymentStatus", "==", "escrow_held")));
      const totalEscrow = rSnap.docs.reduce((sum, d) => sum + (d.data().priceTotal || d.data().price || 0), 0);

      const pendingWithdrawalsAmount = wList
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount, 0);

      setStats({
        totalEscrow,
        totalCommissions,
        activeSubscriptions: uSnap.size,
        pendingWithdrawalsAmount
      });
    } catch (e) {
      console.error("Error loading admin finances data:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données financières."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFinancesData();
  }, [fetchFinancesData]);

  const handleWithdrawalAction = async (withdrawal: Withdrawal, approve: boolean) => {
    setActionLoadingId(withdrawal.id);
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawal.id);
      const driverRef = doc(db, "users", withdrawal.userId);

      if (approve) {
        // 1. Check if driver wallet exists and has enough balance
        const driverSnap = await getDoc(driverRef);
        if (!driverSnap.exists()) {
          throw new Error("Compte chauffeur introuvable");
        }
        
        const currentBalance = driverSnap.data().walletBalance || 0;
        if (currentBalance < withdrawal.amount) {
          toast({
            variant: "destructive",
            title: "Solde insuffisant",
            description: `Le solde du chauffeur (${currentBalance.toLocaleString()} GNF) est inférieur au montant demandé.`
          });
          setActionLoadingId(null);
          return;
        }

        // 2. Deduct from driver wallet balance
        await updateDoc(driverRef, {
          walletBalance: increment(-withdrawal.amount)
        });

        // 3. Update withdrawal doc
        await updateDoc(withdrawalRef, { status: 'paid', paidAt: Timestamp.now() });

        // 4. Log transaction
        await addDoc(collection(db, "transactions"), {
          userId: withdrawal.userId,
          type: 'withdrawal',
          amount: withdrawal.amount,
          method: withdrawal.method,
          status: 'completed',
          timestamp: Timestamp.now()
        });

        // 5. Notify the transporter
        await createNotification({
          userId: withdrawal.userId,
          message: `Votre demande de retrait de ${withdrawal.amount.toLocaleString()} GNF via ${withdrawal.method === 'orange-money' ? 'Orange Money' : 'Virement'} a été validée et payée.`,
          href: `/dashboard/transporter/earnings`
        });

        toast({ title: "Retrait validé ✓", description: "Le paiement a été marqué comme réglé." });
      } else {
        // Reject withdrawal
        await updateDoc(withdrawalRef, { status: 'rejected' });

        await createNotification({
          userId: withdrawal.userId,
          message: `Votre demande de retrait de ${withdrawal.amount.toLocaleString()} GNF a été rejetée. Veuillez vérifier vos coordonnées.`,
          href: `/dashboard/transporter/earnings`
        });

        toast({ title: "Retrait rejeté", description: "La demande a été classée sans suite." });
      }

      await fetchFinancesData();
    } catch (e: any) {
      console.error("Error processing withdrawal:", e);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e.message || "Impossible de mettre à jour le statut de la demande."
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-border/40 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <Landmark className="text-primary" /> Supervision Financière
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Surveillez les dépôts séquestres, encaissez les commissions et arbitrez les retraits de gains.</p>
      </div>

      {/* Admin financial stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Séquestres en cours", value: `${stats.totalEscrow.toLocaleString("fr-FR")} GNF`, sub: "Fonds clients bloqués", icon: <Coins size={16}/>, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Commissions cumulées", value: `${stats.totalCommissions.toLocaleString("fr-FR")} GNF`, sub: "Gains nets TransConnekt", icon: <Landmark size={16}/>, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Abonnements Actifs", value: stats.activeSubscriptions.toString(), sub: "Membres Flotte Pro", icon: <ShieldCheck size={16}/>, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Retraits en attente", value: `${stats.pendingWithdrawalsAmount.toLocaleString("fr-FR")} GNF`, sub: `${withdrawals.filter(w=>w.status==='pending').length} demandes`, icon: <Wallet size={16}/>, color: "text-sky-400", bg: "bg-sky-500/10" },
        ].map(k => (
          <Card key={k.label} className="shadow-lg rounded-2xl border-border/50 bg-card/60 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold text-muted-foreground">{k.label}</CardTitle>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${k.bg} ${k.color}`}>{k.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-extrabold text-foreground leading-tight">{k.value}</div>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Withdrawals */}
        <Card className="lg:col-span-2 shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border/20 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BadgeAlert className="text-sky-400" /> Demandes de Retrait Actives
            </CardTitle>
            <CardDescription>Arbitrez et validez les virements vers les portefeuilles des chauffeurs.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : withdrawals.filter(w => w.status === 'pending').length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-foreground">Aucune demande active</p>
                <p className="text-xs mt-1">Tous les retraits de gains ont été réglés.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {withdrawals.filter(w => w.status === 'pending').map(w => (
                  <div key={w.id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-muted/5 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{w.driverName || w.companyName || 'Transporteur'}</span>
                        <Badge className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400">UID: {w.userId.slice(0,8)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone size={12} /> {w.method === 'orange-money' ? 'Orange Money' : w.method === 'mtn-momo' ? 'MTN MoMo' : 'Virement'} : <strong className="text-foreground">{w.phoneOrAccount}</strong>
                      </p>
                      <p className="text-[10px] text-muted-foreground">Demande reçue le {w.createdAt?.toDate ? format(w.createdAt.toDate(), "dd MMMM yyyy HH:mm", { locale: fr }) : '—'}</p>
                    </div>

                    <div className="flex items-center gap-3.5 sm:ml-auto">
                      <div className="text-right">
                        <p className="font-extrabold text-white text-base">{w.amount.toLocaleString()} GNF</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          disabled={actionLoadingId === w.id}
                          onClick={() => handleWithdrawalAction(w, false)}
                          className="h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold"
                        >
                          <XCircle size={12} className="mr-1" /> Rejeter
                        </Button>
                        <Button 
                          size="sm" 
                          disabled={actionLoadingId === w.id}
                          onClick={() => handleWithdrawalAction(w, true)}
                          className="h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/10"
                        >
                          {actionLoadingId === w.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <CheckCircle2 size={12} className="mr-1" />}
                          Valider
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log / Financial Transactions */}
        <Card className="shadow-lg rounded-3xl border-border/50 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt size={18} className="text-indigo-400" /> Flux de Caisse
              </CardTitle>
              <CardDescription>Grand livre d&apos;audit des flux financiers récents.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 max-h-[350px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-center py-10 text-xs text-muted-foreground">Aucune transaction comptabilisée.</p>
              ) : (
                <div className="divide-y divide-border/10">
                  {transactions.slice(0, 10).map(t => {
                    const isIncoming = t.type === 'deposit' || t.type === 'commission' || t.type === 'subscription';
                    return (
                      <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isIncoming ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {isIncoming ? <ArrowDownLeft size={14} /> : <Coins size={14} />}
                          </span>
                          <div>
                            <p className="font-bold text-foreground">
                              {t.type === 'deposit' && 'Dépôt Séquestre'}
                              {t.type === 'commission' && 'Commission perçue'}
                              {t.type === 'payout' && 'Versement Chauffeur'}
                              {t.type === 'withdrawal' && 'Retrait validé'}
                              {t.type === 'subscription' && 'Abonnement Flotte Pro'}
                              {t.type === 'refund' && 'Remboursement Client'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t.timestamp?.toDate ? format(t.timestamp.toDate(), "dd/MM HH:mm") : '—'}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${isIncoming ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {isIncoming ? '+' : '-'}{t.amount.toLocaleString()} GNF
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
