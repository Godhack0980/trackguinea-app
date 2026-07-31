"use client";

import React, { useState } from "react";
import Link from "next/link";
import SharedHeader from "@/components/shared-header";
import SharedFooter from "@/components/shared-footer";
import { BookOpen, Download, Printer, ExternalLink, ArrowLeft, ShieldCheck, FileText, CheckCircle2, Search, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicDocumentationPage() {
  const [activeTab, setActiveTab] = useState<'interactive' | 'download'>('interactive');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <SharedHeader />

      {/* Hero Section */}
      <div className="relative pt-28 pb-16 bg-gradient-to-b from-indigo-950/40 via-background to-background border-b border-border/40 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="container px-4 mx-auto relative z-10 max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <BookOpen size={14} /> Centre d'Aide & Documentation Officielle
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Documentation Complète TransConnekt
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Consultez le manuel d'utilisation officiel de la plateforme, découvrez les guides étape par étape et téléchargez les formats imprimables.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="rounded-2xl border-border/60 bg-card/60 hover:bg-muted font-bold text-xs gap-2"
            >
              <Printer size={16} className="text-indigo-400" /> Imprimer / PDF
            </Button>
            <Button
              asChild
              className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2 shadow-lg shadow-indigo-600/20"
            >
              <a href="/docs/transconnekt_documentation.html" target="_blank" download>
                <Download size={16} /> Télécharger HTML
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-2xl border-border/60 bg-card/60 hover:bg-muted font-bold text-xs gap-2"
            >
              <a href="/docs/transconnekt_documentation.md" download>
                <FileText size={16} className="text-emerald-400" /> Télécharger Markdown (.MD)
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Documentation Section */}
      <main className="container px-4 py-10 mx-auto max-w-5xl flex-grow space-y-8">
        
        {/* Banner Quick Links */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl border border-border/40 bg-card space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-sm text-foreground">Guides Expéditeurs</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Création de demandes, suivi des colis par GPS et validation de devis.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-border/40 bg-card space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-sm text-foreground">Espace Transporteurs</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Audit de conformité (250k GNF), commission de 2,5% et offres de fret.
            </p>
          </div>

          <div className="p-5 rounded-3xl border border-border/40 bg-card space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-sm text-foreground">Tracking & API</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Suivi GPS en temps réel sur les 33 préfectures de Guinée.
            </p>
          </div>
        </div>

        {/* Embedded Interactive Viewer */}
        <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-border/40 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-muted-foreground ml-2">Manuel d'utilisation interactif v1.0</span>
            </div>
            <a
              href="/docs/transconnekt_documentation.html"
              target="_blank"
              className="text-xs text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              Ouvrir plein écran <ExternalLink size={14} />
            </a>
          </div>
          <iframe
            src="/docs/transconnekt_documentation.html"
            className="w-full h-[750px] border-none bg-slate-900"
            title="Documentation TransConnekt"
          />
        </div>

        {/* Back Link */}
        <div className="text-center pt-4">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-card hover:bg-muted border border-border/60 text-foreground font-semibold text-sm transition-all shadow-md"
          >
            <ArrowLeft size={16} /> Page Comment ça marche
          </Link>
        </div>

      </main>

      <SharedFooter />
    </div>
  );
}
