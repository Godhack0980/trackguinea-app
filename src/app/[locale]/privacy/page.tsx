"use client";

import React from "react";
import Link from "next/link";
import SharedHeader from "@/components/shared-header";
import SharedFooter from "@/components/shared-footer";
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft, CheckCircle2, UserCheck, MapPin, HardDrive, Bell } from "lucide-react";
import { useTranslation } from "@/lib/translations";

export default function PrivacyPolicyPage() {
  const { lang } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <SharedHeader />

      {/* Hero Section */}
      <div className="relative pt-28 pb-16 bg-gradient-to-b from-indigo-950/40 via-background to-background border-b border-border/40 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="container px-4 mx-auto relative z-10 max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} /> Protection de la Vie Privée
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Politique de Confidentialité
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Chez TransConnekt, la sécurité et la confidentialité de vos données personnelles et logistiques sont au cœur de nos engagements en République de Guinée.
          </p>
          <p className="text-xs text-muted-foreground/60 pt-2">
            Dernière mise à jour : 24 Juillet 2026 | Conforme aux directives réglementaires
          </p>
        </div>
      </div>

      {/* Content Section */}
      <main className="container px-4 py-12 mx-auto max-w-4xl flex-grow space-y-10">

        {/* Intro Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Lock className="text-indigo-400" size={20} /> 1. Préambule & Responsable du Traitement
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            La présente Politique de Confidentialité décrit la manière dont la plateforme <strong>TransConnekt</strong> (éditée par InformAfrik SARL / TransConnekt Guinée, enregistrée sous le numéro RCCM de Conakry) collecte, utilise, stocke et protège les données à caractère personnel des utilisateurs (clients expéditeurs, entreprises partenaires et transporteurs routiers).
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            En accédant et en utilisant nos services web et mobiles, vous acceptez les pratiques décrites dans la présente politique.
          </p>
        </div>

        {/* Collected Data */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserCheck className="text-primary" size={20} /> 2. Données Personnelles Collectées
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dans le cadre du bon fonctionnement de nos services de fret et de logistique, nous collectons les catégories de données suivantes :
          </p>
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" /> Profil & Identification
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nom, prénom, adresse email, numéro de téléphone, nom de l'entreprise, ville de résidence/d'attache.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" /> Documents Officiels
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Copies des pièces d'identité (CNI, Passeport), permis de conduire, carte grise et attestations d'assurance (pour la vérification des transporteurs).
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <MapPin size={16} className="text-rose-400" /> Géolocalisation Temps Réel
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Coordonnées GPS transmises par les véhicules et chauffeurs lors de la prise en charge et de la livraison des marchandise.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <HardDrive size={16} className="text-amber-400" /> Données de Transaction
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Historique des offres, factures, devis simulés, évaluations et références de paiement Mobile Money (Orange Money, MTN Mobile Money).
              </p>
            </div>
          </div>
        </div>

        {/* Purpose */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Eye className="text-primary" size={20} /> 3. Finalités de l'Utilisation des Données
          </h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong>Mise en relation directe :</strong> Connecter les expéditeurs aux camionneurs et entreprises de transport certifiés dans toutes les préfectures de Guinée.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong>Suivi en temps réel :</strong> Permettre le suivi GPS des marchandises en transit sur les axes routiers (Conakry, Kindia, Mamou, Kankan, Nzérékoré, Boké, etc.).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong>Vérification & Sécurité :</strong> Analyser la validité des documents de transport et garantir la sécurité des chargements.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong>Communication & Support :</strong> Envoyer des notifications d'avancement de livraison et assurer l'assistance technique 24/7.</span>
            </li>
          </ul>
        </div>

        {/* Security & Retention */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={20} /> 4. Stockage, Sécurité & Conservation
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vos données sont hébergées sur des infrastructures sécurisées chiffrées (SSL/TLS 256 bits). Nous mettons en œuvre des mesures de sécurité strictes pour prévenir tout accès non autorisé, perte ou altération de vos informations.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Durée de conservation :</strong> Vos données de compte sont conservées durant toute la période d'activité de votre compte. Les factures et données de livraison sont archivées conformément aux durées légales comptables en vigueur en Guinée (5 ans).
          </p>
        </div>

        {/* Sharing */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">5. Partage des Données à des Tiers</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TransConnekt ne vend ni ne loue vos données personnelles à des tiers. Les données ne sont partagées qu'avec :
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-2">
            <li>Le transporteur ou l'expéditeur partenaire strictement concerné par l'exécution de la course.</li>
            <li>Les prestataires de paiement agréés (Orange Money, MTN Mobile Money, services bancaires).</li>
            <li>Les autorités publiques ou judiciaires guinéennes uniquement en cas de réquisition légale conforme.</li>
          </ul>
        </div>

        {/* User Rights */}
        <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="text-indigo-400" size={20} /> 6. Vos Droits & Contact
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conformément à la réglementation sur la protection des données, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pour exercer vos droits ou pour toute question concernant cette politique, vous pouvez nous contacter :
          </p>
          <div className="pt-2 text-xs sm:text-sm text-foreground font-semibold space-y-1">
            <p>📧 Email : <a href="mailto:info@informafrik.com" className="text-indigo-400 hover:underline">info@informafrik.com</a></p>
            <p>📞 Téléphone : +224 612 00 01 02 / +224 669 99 83 39</p>
            <p>📍 Siège social : Conakry, République de Guinée</p>
          </div>
        </div>

        <div className="pt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all shadow-md"
          >
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>
        </div>

      </main>

      <SharedFooter />
    </div>
  );
}
