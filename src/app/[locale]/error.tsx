'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Home, ShieldAlert, MessageCircle, Truck } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TransConnekt Client Exception Caught:", error);
    if (typeof window !== 'undefined') {
      const hasAttempted = sessionStorage.getItem('transconnekt_err_auto_reset');
      if (!hasAttempted) {
        sessionStorage.setItem('transconnekt_err_auto_reset', 'true');
        const timer = setTimeout(() => {
          reset();
        }, 300);
        return () => clearTimeout(timer);
      } else {
        sessionStorage.removeItem('transconnekt_err_auto_reset');
      }
    }
  }, [error, reset]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden font-sans">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Truck className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">TransConnekt</span>
        </div>

        {/* Central Status Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
          <WifiOff className="h-10 w-10 animate-pulse" />
        </div>

        {/* Friendly Title & Explanation */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Interruption temporaire du service
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Une instabilité réseau ou une interruption temporaire s'est produite lors du chargement. Pas d'inquiétude, vos données restent enregistrées en toute sécurité.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer (Recharger la page)
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/fr';
              }
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Home className="h-4 w-4 text-slate-400" />
            Retour à l'accueil
          </button>
        </div>

        {/* Support Link Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
            Données protégées
          </span>
          <a
            href="https://wa.me/224625555514"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Assistance Support
          </a>
        </div>

      </div>
    </div>
  );
}
