"use client";

import React, { useState } from "react";
import Link from "next/link";
import SharedHeader from "@/components/shared-header";
import SharedFooter from "@/components/shared-footer";
import { 
  FileText, 
  ShieldAlert, 
  Truck, 
  CheckCircle2, 
  ArrowLeft, 
  Scale, 
  AlertTriangle, 
  CreditCard, 
  Gavel, 
  Navigation, 
  Building2, 
  FileCheck2, 
  UserCheck, 
  Coins, 
  Award,
  AlertCircle
} from "lucide-react";
import { useTranslation } from "@/lib/translations";
import { cn } from "@/lib/utils";

export default function TermsOfUsePage() {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'transporter' | 'client'>('transporter');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <SharedHeader />

      {/* Hero Section */}
      <div className="relative pt-28 pb-16 bg-gradient-to-b from-indigo-950/40 via-background to-background border-b border-border/40 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="container px-4 mx-auto relative z-10 max-w-4xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <Scale size={14} /> Cadre Légal & Réglementaire • Guinée
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Conditions Générales d'Utilisation (CGU)
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Règles et conditions d'accès régissant la plateforme numérique de transport et de fret <strong>TransConnekt</strong>, éditée par <strong>Informafrik SARLU</strong> en République de Guinée.
          </p>

          {/* Section Switcher Tabs */}
          <div className="flex justify-center pt-4">
            <div className="p-1.5 rounded-2xl bg-muted/40 border border-border/50 backdrop-blur-md inline-flex gap-2">
              <button
                onClick={() => setActiveTab('transporter')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer",
                  activeTab === 'transporter' 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Truck size={16} /> Espace Transporteurs (CGU Officieuses)
              </button>
              <button
                onClick={() => setActiveTab('client')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer",
                  activeTab === 'client' 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Building2 size={16} /> Espace Clients & Général
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <main className="container px-4 py-12 mx-auto max-w-4xl flex-grow space-y-10">

        {/* TAB 1: TRANSPORTER CGU (SPECIFIC USER TEXT) */}
        {activeTab === 'transporter' && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* Financial Highlights Badge Card */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl border border-indigo-500/30 bg-indigo-500/5 backdrop-blur-md space-y-2 relative overflow-hidden">
                <div className="absolute top-3 right-3 p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Coins size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Frais d'inscription Uniques</span>
                <div className="text-3xl font-extrabold text-white">250 000 GNF</div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Forfaitaire et unique à la création de compte. Couvre l'audit de conformité documentaire, la configuration de l'espace pro et l'accès au suivi GPS 24/7. Non-remboursable.
                </p>
              </div>

              <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md space-y-2 relative overflow-hidden">
                <div className="absolute top-3 right-3 p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Award size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Commission de Service</span>
                <div className="text-3xl font-extrabold text-white">2,5 %</div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  Perçue sur le coût total de chaque opération de transport validée et effectuée via la plateforme TransConnekt.
                </p>
              </div>
            </div>

            {/* Header metadata */}
            <div className="p-6 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Informafrik SARLU</span>
                <span className="text-xs text-muted-foreground">Dernière mise à jour : 04.06.2026</span>
              </div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                CONDITIONS GÉNÉRALES D'UTILISATION (CGU) – ESPACE TRANSPORTEURS
              </h2>
            </div>

            {/* Préambule */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="text-indigo-400" size={18} /> PRÉAMBULE
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les présentes Conditions Générales d’Utilisation (ci-après « CGU ») ont pour objet de définir les conditions d'accès et d'utilisation de la Plateforme <strong>TransConnekt</strong> (ci-après « la Plateforme »), éditée par la société <strong>Informafrik sarlu</strong>, par les professionnels du transport (ci-après « le Transporteur »).
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed font-semibold">
                Le Transporteur déclare avoir pris connaissance et accepté sans réserve les présentes CGU lors de la création de son compte sur la Plateforme.
              </p>
            </div>

            {/* Article 1 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Truck className="text-primary" size={18} /> ARTICLE 1 : OBJET DE LA PLATEFORME
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La Plateforme est une solution numérique de mise en relation mettant en contact des professionnels du transport (marchandises, engins lourds, carburant, etc.) avec des clients (particuliers ou entreprises) situés en République de Guinée. Elle intègre un système de suivi et de géolocalisation en temps réel des cargaisons pour garantir la sécurité et la transparence des trajets.
              </p>
            </div>

            {/* Article 2 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileCheck2 className="text-emerald-400" size={18} /> ARTICLE 2 : CONDITIONS D'ACCÈS ET INSCRIPTION DES TRANSPORTEURS
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pour pouvoir proposer ses services sur la Plateforme, le Transporteur doit obligatoirement être un professionnel déclaré en République de Guinée. Lors de son inscription, il s'engage à fournir des informations exactes et à jour, notamment :
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground pl-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Le registre du commerce et du crédit mobilier (RCCM) ou agrément de transport valide.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Les pièces d'identité du gérant et des chauffeurs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Permis de conduire biométrique</strong> des chauffeurs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Les documents d'immatriculation, de contrôle technique (visite technique) et les assurances valides de chaque engin/véhicule enregistré.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>Les licences spécifiques requises pour le transport de matières dangereuses (ex: carburant), le cas échéant.</span>
                </li>
              </ul>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-400" />
                <span><strong>TransConnekt</strong> se réserve le droit de refuser ou de suspendre l'accès à tout Transporteur dont le dossier serait incomplet ou non conforme à la législation guinéenne.</span>
              </div>
            </div>

            {/* Article 3 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Navigation className="text-rose-400" size={18} /> ARTICLE 3 : GÉOLOCALISATION EN TEMPS RÉEL
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Le système de géolocalisation est une fonctionnalité essentielle de la Plateforme, acceptée expressément par le Transporteur.
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400 mt-2 shrink-0" />
                  <span><strong>Obligation d'activation :</strong> Le Transporteur s'engage à activer le système de géolocalisation (via l’application mobile ou le boîtier connecté) dès le début de la prise en charge de la marchandise et jusqu'à la livraison finale au client.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400 mt-2 shrink-0" />
                  <span><strong>Transparence :</strong> Les données de localisation sont partagées en temps réel avec le Client expéditeur/destinataire et l'administration de la Plateforme à des fins de sécurité, de suivi de trajet et de preuve de livraison.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400 mt-2 shrink-0" />
                  <span><strong>Respect de la vie privée :</strong> La géolocalisation ne doit être active que dans le cadre strict de l'exécution d'une mission de transport acceptée sur la Plateforme.</span>
                </li>
              </ul>
            </div>

            {/* Article 4 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserCheck className="text-indigo-400" size={18} /> ARTICLE 4 : OBLIGATIONS DU TRANSPORTEUR
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border/30 bg-muted/20 space-y-1">
                  <h4 className="font-bold text-xs text-foreground">1. Sécurité et Conformité</h4>
                  <p className="text-xs text-muted-foreground">Maintenir ses engins en parfait état de marche et respecter scrupuleusement le code de la route guinéen.</p>
                </div>
                <div className="p-4 rounded-2xl border border-border/30 bg-muted/20 space-y-1">
                  <h4 className="font-bold text-xs text-foreground">2. Fidélité à la Plateforme</h4>
                  <p className="text-xs text-muted-foreground">Ne pas contourner la Plateforme pour traiter directement avec un Client rencontré via celle-ci.</p>
                </div>
                <div className="p-4 rounded-2xl border border-border/30 bg-muted/20 space-y-1">
                  <h4 className="font-bold text-xs text-foreground">3. Qualité de service</h4>
                  <p className="text-xs text-muted-foreground">Respecter les délais de livraison convenus, sauf cas de force majeure (pannes majeures, intempéries, barrages routiers).</p>
                </div>
                <div className="p-4 rounded-2xl border border-border/30 bg-muted/20 space-y-1">
                  <h4 className="font-bold text-xs text-foreground">4. Signalement d'incident</h4>
                  <p className="text-xs text-muted-foreground">Signaler immédiatement via la Plateforme tout incident, retard, accident ou anomalie durant le trajet.</p>
                </div>
              </div>
            </div>

            {/* Article 5 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CreditCard className="text-emerald-400" size={18} /> ARTICLE 5 : CONDITIONS FINANCIÈRES, INSCRIPTION ET COMMISSIONS
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <span><strong>Frais d'inscription uniques :</strong> L'accès initial à la Plateforme et la validation du compte professionnel du Transporteur sont soumis au paiement de frais d'inscription forfaitaires et uniques de <strong>250 000 GNF</strong> (deux cent cinquante mille francs guinéens). Ces frais couvrent l'audit de conformité des documents, la configuration de l'espace transporteur et l'accès aux outils de géolocalisation. Ils sont payables une seule fois lors de la création du compte et ne sont pas remboursables.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <span><strong>Frais de Service (Commission sur opération) :</strong> En contrepartie du service de mise en relation, de la mise à disposition des outils technologiques et du suivi des cargaisons en temps réel, la Plateforme perçoit une commission de <strong>2,5 %</strong> (deux virgule cinq pour cent) sur le coût total de chaque opération de transport validée et effectuée via la Plateforme.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                  <span><strong>Modalités de facturation et paiement :</strong> Les tarifs de transport sont calculés par la Plateforme ou fixés par devis accepté. Les paiements de la part des clients sont collectés via les moyens intégrés (Mobile Money Orange Money, MTN, virements bancaires). Les montants dus au Transporteur lui sont reversés après déduction de la commission de 2,5 %, selon le calendrier de reversement défini dans son espace professionnel.</span>
                </li>
              </ul>
            </div>

            {/* Article 6 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="text-amber-400" size={18} /> ARTICLE 6 : LIMITATION DE RESPONSABILITÉ DE LA PLATEFORME
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span><strong>Rôle d'intermédiaire :</strong> <strong>TransConnekt</strong> agit exclusivement en tant qu'intermédiaire numérique. Sa responsabilité ne saurait être engagée en cas de litige commercial entre le Transporteur et le Client portant sur la nature, l'état ou la conformité de la marchandise.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span><strong>Dommages et Pertes :</strong> Le Transporteur demeure seul responsable des marchandises, carburants ou engins lourds qui lui sont confiés. Il lui appartient de souscrire aux assurances "Marchandises transportées" (Assurance Faculté) appropriées.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span><strong>Disponibilité du réseau :</strong> La Plateforme ne peut être tenue responsable des interruptions temporaires de la géolocalisation liées à une panne de couverture réseau des opérateurs télécoms en Guinée.</span>
                </li>
              </ul>
            </div>

            {/* Article 7 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5 space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="text-rose-400" size={18} /> ARTICLE 7 : SUSPENSION ET RÉSILIATION DU COMPTE
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                En cas de non-respect des présentes CGU (fraude, non-activation répétée de la géolocalisation, retards abusifs, défaut d'assurance à jour, violences verbales ou physiques), <strong>TransConnekt</strong> se réserve le droit de :
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
                <li>Suspendre temporairement l'accès du Transporteur aux demandes de transport.</li>
                <li>Résilier définitivement le compte du Transporteur, sans préavis ni indemnité.</li>
              </ul>
            </div>

            {/* Article 8 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="text-indigo-400" size={18} /> ARTICLE 8 : PROTECTION DES DONNÉES PERSONNELLES
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                La Plateforme s'engage à traiter les données personnelles des Transporteurs et de leurs chauffeurs conformément aux lois en vigueur en Guinée relatives à la protection des données à caractère personnel. Les données de localisation sont archivées de manière sécurisée pour la durée légale nécessaire à la preuve des transactions.
              </p>
            </div>

            {/* Article 9 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Gavel className="text-indigo-400" size={18} /> ARTICLE 9 : LOI APPLICABLE ET JURIDICTION COMPÉTENTE
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les présentes CGU sont régies par le droit de la République de Guinée. Tout litige relatif à leur interprétation ou à leur exécution, qui ne pourrait être résolu à l'amiable, sera soumis à la compétence exclusive du <strong>Tribunal de Commerce de Conakry</strong>.
              </p>
            </div>

          </div>
        )}

        {/* TAB 2: CLIENT & GENERAL CGU */}
        {activeTab === 'client' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Section 1 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-md space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="text-indigo-400" size={20} /> 1. Objet & Acceptation des CGU Client
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les présentes Conditions Générales d'Utilisation régissent l'utilisation de la plateforme <strong>TransConnekt</strong> par les clients expéditeurs et entreprises opérant en République de Guinée.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Truck className="text-primary" size={20} /> 2. Description des Services aux Expéditeurs
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" /> Réservation de Fret
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Mise en relation rapide avec des camions et transporteurs certifiés pour marchandises, conteneurs et agrégats.
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-400" /> Suivi GPS en direct
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Visibilité complète sur le trajet du camion en temps réel jusqu'à la livraison finale.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="text-rose-400" size={20} /> 3. Marchandises Interdites
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Il est strictement interdit d'expédier des armes, produits illicites ou explosifs. Les chargements doivent respecter le Poids Total Autorisé en Charge (PTAC).
              </p>
            </div>

            {/* Section 4 */}
            <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Gavel className="text-indigo-400" size={20} /> 4. Droit Applicable
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Soumis au Droit de la République de Guinée / Compétence du <strong>Tribunal de Commerce de Conakry</strong>.
              </p>
            </div>
          </div>
        )}

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
