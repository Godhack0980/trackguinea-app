"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, ShieldCheck, Truck, ArrowRight, Key } from 'lucide-react';
import Link from 'next/link';

export default function TrackingPortalPage() {
  const [trackingId, setTrackingId] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingId.trim()) {
      router.push(`/tracking/${trackingId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-primary font-black text-xl tracking-wider">TRANSCONNEKT</span>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white text-xs font-bold rounded-xl">
              Espace Client / Transporteur
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="container max-w-4xl mx-auto px-4 py-16 flex-grow flex items-center justify-center">
        <div className="w-full space-y-8 text-center">
          
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold uppercase tracking-wider">
              <ShieldCheck size={14} /> Traçabilité GPS Logistique Guinée & Afrique de l'Ouest
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Suivi de Colis & Cargaisons en Direct
            </h1>
            <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed font-medium">
              Saisissez votre numéro de suivi pour géolocaliser votre marchandise en temps réel sur la carte interactive.
            </p>
          </div>

          {/* Search Box Card */}
          <Card className="max-w-xl mx-auto border-slate-800 bg-slate-900/80 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <Input
                  placeholder="Entrez votre numéro de suivi (ex: ID-7NS50q...)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="pl-12 h-14 rounded-2xl bg-slate-950 border-slate-800 text-white text-sm placeholder:text-slate-500 font-mono focus:ring-primary"
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm gap-2 shadow-lg shadow-primary/20">
                Suivre mon colis maintenant <ArrowRight size={16} />
              </Button>
            </form>
          </Card>

          {/* Features highlight */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-6 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <div className="text-primary font-bold text-xs flex items-center gap-1.5">
                <MapPin size={14} /> Suivi GPS Réel
              </div>
              <p className="text-[11px] text-slate-400">Position du camion rafraîchie en temps réel avec calcul d'itinéraire.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <Key size={14} /> Code OTP Sécurisé
              </div>
              <p className="text-[11px] text-slate-400">Validation de livraison sécurisée avec code secret confidentiel.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-1">
              <div className="text-indigo-400 font-bold text-xs flex items-center gap-1.5">
                <Truck size={14} /> 12 Pays Couverts
              </div>
              <p className="text-[11px] text-slate-400">Suivi transfrontalier Guinée, Sénégal, Mali, Côte d'Ivoire...</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        © 2026 TransConnekt — Plateforme Logistique de Transport et de Traçabilité
      </footer>
    </div>
  );
}
