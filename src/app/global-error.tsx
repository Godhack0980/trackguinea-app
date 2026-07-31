'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TransConnekt Global Unhandled Error:", error);
    if (typeof window !== 'undefined') {
      const hasAttempted = sessionStorage.getItem('transconnekt_global_err_auto_redirect');
      if (!hasAttempted) {
        sessionStorage.setItem('transconnekt_global_err_auto_redirect', 'true');
        const timer = setTimeout(() => {
          window.location.href = '/fr';
        }, 100);
        return () => clearTimeout(timer);
      } else {
        sessionStorage.removeItem('transconnekt_global_err_auto_redirect');
      }
    }
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-2xl font-bold">
            T
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">
              Interruption du réseau ou du service
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Une connexion instable a interrompu le chargement. Cliquez ci-dessous pour recharger l'application TransConnekt.
            </p>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/fr';
              } else {
                reset();
              }
            }}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Réessayer / Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
