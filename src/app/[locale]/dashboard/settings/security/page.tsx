"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, Lock, Smartphone, KeyRound, AlertTriangle, 
  CheckCircle2, Laptop, Clock, ShieldAlert, RefreshCw 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecuritySession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

const DEMO_SESSIONS: SecuritySession[] = [
  {
    id: "sess-1",
    device: "Windows PC • Chrome Browser",
    location: "Conakry, Guinée",
    ip: "197.149.252.18",
    lastActive: "Actif maintenant",
    isCurrent: true
  },
  {
    id: "sess-2",
    device: "Samsung Galaxy S23 • App Mobile TransConnekt",
    location: "Kankan, Guinée",
    ip: "105.235.12.84",
    lastActive: "Il y a 2 heures",
    isCurrent: false
  }
];

export default function SecurityCenterPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SecuritySession[]>(DEMO_SESSIONS);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [appCheckActive, setAppCheckActive] = useState(true);

  const handleRevokeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    toast({
      title: "Session révoquée",
      description: "L'appareil sélectionné a été déconnecté avec succès."
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Centre de Sécurité & App Check
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-bold uppercase">
                  Firebase Shield
                </Badge>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Supervision des connexions, jetons App Check, authentification forte (2FA) et audit d'accès.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* APP CHECK STATUS BANNER */}
      <Card className="border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Protection Firebase App Check Activée
                <Badge className="bg-emerald-600 text-white font-bold text-[9px]">reCAPTCHA Enterprise</Badge>
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                Toutes les requêtes API et base de données Firestore sont protégées contre les accès non autorisés, bots et scripts automatisés.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 shrink-0">
            🟢 Protections 100% Actives
          </Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TWO-FACTOR AUTH & PASSWORD */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-6 shadow-xl">
          <CardHeader className="p-0 border-b border-slate-200 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" /> Authentification & Double Facteur (2FA)
            </CardTitle>
          </CardHeader>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="font-extrabold text-slate-900 dark:text-white">Authentification à Deux Facteurs (2FA)</p>
                <p className="text-[11px] text-slate-500">Exiger un code SMS/Email lors des connexions depuis un nouvel appareil.</p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
              />
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Changer le mot de passe</h4>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Mot de passe actuel"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
                />
                <Input
                  type="password"
                  placeholder="Nouveau mot de passe fort"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-10">
                Mettre à Jour le Mot de Passe
              </Button>
            </div>
          </div>
        </Card>

        {/* ACTIVE SESSIONS */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-6 shadow-xl">
          <CardHeader className="p-0 border-b border-slate-200 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Laptop className="w-5 h-5 text-indigo-500" /> Appareils & Sessions Connectées
            </CardTitle>
          </CardHeader>

          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {s.device.includes("Mobile") ? <Smartphone size={14} className="text-indigo-500" /> : <Laptop size={14} className="text-indigo-500" />}
                    {s.device}
                  </p>
                  <p className="text-[10px] text-slate-500">{s.location} • IP: {s.ip}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{s.lastActive}</p>
                </div>

                {s.isCurrent ? (
                  <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 text-[9px] font-bold">Appareil Actuel</Badge>
                ) : (
                  <Button
                    onClick={() => handleRevokeSession(s.id)}
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-xl h-8"
                  >
                    Déconnecter
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
