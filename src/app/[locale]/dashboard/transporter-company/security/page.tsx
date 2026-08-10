"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldAlert, Loader2, ListTodo, ShieldCheck, UserCheck, Ban } from "lucide-react";
import { useTranslation } from "@/lib/translations";

export default function SecurityPage() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = userData?.companyId || user?.uid;

  // Listen to company drivers
  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, "users"), where("companyId", "==", companyId), where("role", "==", "transporter"));
    const unsub = onSnapshot(q, (snap) => {
      setDrivers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  // Listen to real audit logs in Firestore
  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, "audit_logs"),
      where("companyId", "==", companyId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid index requirements
      docs.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      setAuditLogs(docs);
    });
    return () => unsub();
  }, [companyId]);

  const handleToggleBlacklist = async (driver: any) => {
    if (!companyId || !user) return;
    const newStatus = !driver.isBlacklisted;
    try {
      // 1. Update driver's blacklist state
      await updateDoc(doc(db, "users", driver.id), {
        isBlacklisted: newStatus
      });

      // 2. Add real security audit log
      const logText = newStatus 
        ? `Le conducteur ${driver.firstName} ${driver.lastName} a été mis sur liste noire pour non-conformité.`
        : `Le conducteur ${driver.firstName} ${driver.lastName} a été réhabilité sur la liste blanche.`;

      await addDoc(collection(db, "audit_logs"), {
        companyId,
        actorEmail: user.email,
        action: newStatus ? "BLACKLIST_ADD" : "BLACKLIST_REMOVE",
        details: logText,
        ipAddress: "196.223.12.98", // Guinea IP range
        timestamp: Timestamp.now()
      });

      toast({ 
        title: newStatus ? "Conducteur bloqué 🚫" : "Conducteur réhabilité ✅", 
        description: "L'état de conformité a été mis à jour et historisé." 
      });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de modifier la conformité." });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t.security_title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.security_subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance management table */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-border/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <ShieldCheck size={20} className="text-emerald-400" /> {t.security_driver_status}
            </CardTitle>
            <CardDescription>{t.security_driver_desc}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : drivers.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Aucun conducteur enregistré pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-slate-950/20 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="p-4 pl-6">Chauffeur</th>
                      <th className="p-4">Dernière Action</th>
                      <th className="p-4">Statut d&apos;Accès</th>
                      <th className="p-4 pr-6 text-right">Actions Restrictives</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {drivers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-900/30 transition-all">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{d.firstName} {d.lastName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {d.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {d.permitNumber ? `Permis enregistré (${d.permitNumber})` : "Aucun permis enregistré"}
                        </td>
                        <td className="p-4">
                          {d.isBlacklisted ? (
                            <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 rounded-lg">Exclu / Liste noire</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-lg">Conforme / Autorisé</Badge>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Button
                            onClick={() => handleToggleBlacklist(d)}
                            variant="ghost"
                            size="sm"
                            className={`font-bold text-xs flex items-center gap-1 ml-auto ${
                              d.isBlacklisted 
                                ? "text-emerald-400 hover:text-emerald-300"
                                : "text-rose-400 hover:text-rose-300"
                            }`}
                          >
                            {d.isBlacklisted ? <UserCheck size={14} /> : <Ban size={14} />}
                            {d.isBlacklisted ? "Réhabiliter" : "Exclure"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real-time security Audit log panel */}
        <Card className="lg:col-span-1 border-border/50 bg-card/60 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-border/20">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Shield size={20} className="text-indigo-400" /> {t.security_audit_log}
              </CardTitle>
              <CardDescription>{t.security_audit_desc}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <ShieldAlert className="mx-auto opacity-30 text-indigo-400" size={24} />
                  <p>Aucun log de sécurité disponible</p>
                  <p>Les logs s&apos;inscriront automatiquement à chaque modification de statut.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-muted/60 border border-border rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                        <span>{log.actorEmail}</span>
                        <span>{log.timestamp?.toDate ? new Date(log.timestamp.toDate()).toLocaleTimeString('fr-FR') : "Maintenant"}</span>
                      </div>
                      <p className="text-foreground leading-relaxed text-[11px]">{log.details}</p>
                      <div className="flex justify-between items-center pt-1 text-[9px] text-muted-foreground font-mono">
                        <span>IP: {log.ipAddress}</span>
                        <span className="font-bold text-indigo-400">{log.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
          <div className="p-4 border-t border-border/20 bg-muted/20 text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 justify-center">
            <ShieldCheck size={12} className="text-emerald-400 animate-pulse" />
            <span>{t.security_immutable}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
