"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import frHome from "@/messages/fr/home.json";
import enHome from "@/messages/en/home.json";
import esHome from "@/messages/es/home.json";
import ptHome from "@/messages/pt/home.json";
import arHome from "@/messages/ar/home.json";
import deHome from "@/messages/de/home.json";
import zhHome from "@/messages/zh/home.json";

import frPricing from "@/messages/fr/pricing.json";
import enPricing from "@/messages/en/pricing.json";
import esPricing from "@/messages/es/pricing.json";
import ptPricing from "@/messages/pt/pricing.json";
import arPricing from "@/messages/ar/pricing.json";
import dePricing from "@/messages/de/pricing.json";
import zhPricing from "@/messages/zh/pricing.json";

import frOffers from "@/messages/fr/available_offers.json";
import enOffers from "@/messages/en/available_offers.json";
import esOffers from "@/messages/es/available_offers.json";
import ptOffers from "@/messages/pt/available_offers.json";
import arOffers from "@/messages/ar/available_offers.json";
import deOffers from "@/messages/de/available_offers.json";
import zhOffers from "@/messages/zh/available_offers.json";

export type Language = "fr" | "en" | "es" | "pt" | "ar" | "de" | "zh";

const homeDictionaries: Record<Language, Record<string, string>> = {
  fr: frHome,
  en: enHome,
  es: esHome,
  pt: ptHome,
  ar: arHome,
  de: deHome,
  zh: zhHome,
};

const domainDictionaries: Record<string, Record<Language, Record<string, string>>> = {
  home: homeDictionaries,
  pricing: { fr: frPricing, en: enPricing, es: esPricing, pt: ptPricing, ar: arPricing, de: dePricing, zh: zhPricing },
  available_offers: { fr: frOffers, en: enOffers, es: esOffers, pt: ptOffers, ar: arOffers, de: deOffers, zh: zhOffers },
};

export function getLanguage(): Language {
  if (typeof window === "undefined") return "fr";
  const match = window.location.pathname.match(/^\/(fr|en|es|pt|ar|de|zh)\b/);
  if (match) return match[1] as Language;
  return (document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] as Language) || "fr";
}

export function setLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  localStorage.setItem("transconnekt_lang", lang);
  window.dispatchEvent(new CustomEvent("language-change", { detail: lang }));
  
  const pathname = window.location.pathname;
  const segments = pathname.split('/');
  const activeLocales = ["fr", "en", "es", "pt", "ar", "de", "zh"];
  if (activeLocales.includes(segments[1])) {
    segments[1] = lang;
  } else {
    segments.splice(1, 0, lang);
  }
  window.location.href = segments.join('/');
}

// Flat key mapping to domain namespaces
function getDomainKey(key: string): string {
  if (key.includes('.')) return key;

  const keyToDomainMap: Record<string, string> = {
    "dashboard": "navigation",
    "drivers": "navigation",
    "fleet": "navigation",
    "customs": "navigation",
    "security": "navigation",
    "invoices": "navigation",
    "mobileWorkspace": "navigation",
    "logout": "navigation",
    "notifications": "navigation",
    "allRead": "common",
    "profile": "navigation",
    "save": "common",
    "cancel": "common",
    "delete": "common",
    "actions": "common",
    "status": "common",
    "active": "common",
    "suspended": "common",
    "available": "common",
    "onMission": "common",
    "alertExpired": "common",
    "alertExpiringSoon": "common",
    "client_tracking": "navigation",
    "client_requests": "navigation",
    "client_price_simulator": "navigation",
    "client_view_transporters": "navigation",
    "client_fleet_gallery": "navigation",
    "client_history": "navigation",
    "client_documents": "navigation",
    "client_dashboard": "navigation",
    "client_manage_users": "navigation",
    "client_contracts": "navigation",
    "transporter_home": "navigation",
    "transporter_offers": "navigation",
    "transporter_jobs": "navigation",
    "transporter_vehicle": "navigation",
    "transporter_earnings": "navigation",
    "transporter_documents": "navigation",
    "transporter_ratings": "navigation",
    "transporter_dashboard": "navigation",
    "transporter_bids": "navigation",
    "transporter_contracts": "navigation",
    "finances": "navigation",
    "reports": "navigation",
    "company_documents": "navigation",
    "hello": "common",
    "support_chat": "navigation",
    "admin_cancellations": "navigation",
    "admin_all_trips": "navigation",
    "admin_verifications": "navigation",
    "admin_messages": "navigation"
  };

  if (keyToDomainMap[key]) return `${keyToDomainMap[key]}.${key}`;
  if (key.startsWith('sim_')) return `pricing.${key}`;
  if (key.startsWith('fleet_')) return `vehicles.${key}`;
  if (key.startsWith('customs_')) return `warehouse.${key}`;
  if (key.startsWith('invoices_')) return `invoice.${key}`;
  if (key.startsWith('security_')) return `settings.${key}`;
  if (key.startsWith('client_co_')) return `client.${key}`;
  if (key.startsWith('trans_co_')) return `transporteur.${key}`;
  if (key.startsWith('drivers_')) return `driver.${key}`;
  if (key.startsWith('profile_')) return `profile.${key}`;
  if (key.startsWith('notif_')) return `notifications.${key}`;
  if (key.startsWith('req_')) return `forms.${key}`;
  if (key.startsWith('tracking_')) return `tracking.${key}`;
  if (key.startsWith('draft_')) return `client.${key}`;
  if (key.startsWith('chat_')) return `chat.${key}`;
  if (key.startsWith('auth_')) return `auth.${key}`;
  if (key.startsWith('admin_')) return `admin.${key}`;
  if (key.startsWith('contact_')) return `contact.${key}`;
  if (key.startsWith('faq_')) return `faq.${key}`;
  if (key.startsWith('footer_')) return `footer.${key}`;
  if (key.startsWith('service_')) return `services.${key}`;
  if (key.startsWith('support_')) return `support.${key}`;
  return `common.${key}`;
}

export function useTranslation() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const lang = (params?.locale as Language) || "fr";
  const nextIntlT = useTranslations();

  const isSentenceKey = (str: string) => {
    return str.includes(" ") || str.includes("'") || str.includes("(") || str.includes(":") || str.includes("é") || str.includes("è") || str.includes("à") || str.includes("ç") || str.includes("&") || str.includes("!") || str.includes("?");
  };

  const resolveTranslation = (key: string, options?: any): string => {
    if (!key || typeof key !== "string") return key;

    const currentLang = (lang || getLanguage() || "fr") as Language;

    // Handle domain prefixed keys like "pricing.home_sim_title", "available_offers.label_your_position", "home.hero_title"
    if (key.includes('.')) {
      const parts = key.split('.');
      const domain = parts[0];
      const cleanKey = parts.slice(1).join('.');

      if (domainDictionaries[domain]) {
        const langDict = domainDictionaries[domain][currentLang] || domainDictionaries[domain]["fr"];
        if (langDict && langDict[cleanKey]) {
          return langDict[cleanKey];
        }
        if (domainDictionaries[domain]["fr"] && domainDictionaries[domain]["fr"][cleanKey]) {
          return domainDictionaries[domain]["fr"][cleanKey];
        }
      }
    }

    const cleanHomeKey = key.startsWith("home.") ? key.replace("home.", "") : key;

    // 1. Direct lookup in homeDictionaries for active locale if key starts with home.
    const activeHomeDict = homeDictionaries[currentLang] || homeDictionaries["fr"];
    if (activeHomeDict && activeHomeDict[cleanHomeKey]) {
      return activeHomeDict[cleanHomeKey];
    }

    // 2. Fallback to frHome dictionary if active locale home dictionary misses the key
    if (homeDictionaries["fr"] && homeDictionaries["fr"][cleanHomeKey]) {
      return homeDictionaries["fr"][cleanHomeKey];
    }

    // 3. Check custom dicts[currentLang][key] or dicts[currentLang][cleanHomeKey] for custom overrides
    const customDict = dicts[currentLang as Exclude<Language, "fr">];
    if (customDict) {
      if (customDict[key]) return customDict[key];
      if (customDict[cleanHomeKey]) return customDict[cleanHomeKey];
    }

    // 4. For non-sentence structured keys (like client_tracking, tracking_title, etc.), try nextIntlT first
    if (!isSentenceKey(key)) {
      try {
        const mappedKey = getDomainKey(key);
        let translated = nextIntlT(mappedKey, options);
        if (translated && typeof translated === "string" && !translated.startsWith("MISSING_MESSAGE") && translated !== mappedKey) {
          return translated;
        }

        if (cleanHomeKey !== key) {
          translated = nextIntlT(cleanHomeKey, options);
          if (translated && typeof translated === "string" && !translated.startsWith("MISSING_MESSAGE") && translated !== cleanHomeKey) {
            return translated;
          }
        }
      } catch (e) {}
    }

    // 5. For French locale, return plain French text or clean label
    if (currentLang === "fr") {
      return (homeDictionaries["fr"] as Record<string, string>)[cleanHomeKey] || key;
    }

    return key;
  };

  const tProxy = new Proxy(
    (key: string, options?: any) => resolveTranslation(key, options),
    {
      get(target, prop) {
        if (typeof prop === "string") {
          return resolveTranslation(prop);
        }
        return Reflect.get(target, prop);
      }
    }
  );

  const setLang = (newLang: Language) => {
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    if (typeof window !== "undefined") {
      localStorage.setItem("transconnekt_lang", newLang);
      window.dispatchEvent(new CustomEvent("language-change", { detail: newLang }));
    }
    
    const segments = pathname.split('/');
    const activeLocales = ["fr", "en", "es", "pt", "ar", "de", "zh"];
    if (activeLocales.includes(segments[1])) {
      segments[1] = newLang;
    } else {
      segments.splice(1, 0, newLang);
    }
    window.location.href = segments.join('/');
  };

  return { t: tProxy as any, lang, setLanguage: setLang };
}


export const dicts: Record<Exclude<Language, "fr">, Record<string, string>> = {
  "en": {
    "Espace Client Pro": "Enterprise Client Portal",
    "Tableau de bord logistique entreprise": "Corporate Logistics Dashboard",
    "Collaborateurs": "Team Members",
    "Total Demandes": "Total Requests",
    "Budget Estimé": "Estimated Budget",
    "home.nav_docs": "Documentation",
    "nav_docs": "Documentation",
    "Documentation": "Documentation",
    "Galerie des Engins": "Equipment & Fleet Gallery",
    "Consultez les camions de transport disponibles dans toute la Guinée, simulez vos trajets et réservez instantanément.": "Browse available transport trucks across Guinea, simulate your routes and book instantly.",
    "Rechercher engin, marque...": "Search vehicle, brand...",
    "Toutes les préfectures": "All Prefectures",
    "Tous les types": "All Types",
    "Roues": "Wheels",
    "Tous les statuts": "All Statuses",
    "EN MISSION": "ON MISSION",
    "DISPONIBLE": "AVAILABLE",
    "Voir les angles & Simuler": "View Angles & Simulate",
    "Transporteur :": "Transporter:",
    "Contacter le vendeur": "Contact Seller",
    "Voir": "View",
    "Discuter sur WhatsApp": "Chat on WhatsApp",
    "Cette annonce est gérée et vérifiée par KIFAL AUTO / TransConnekt": "This listing is managed and verified by KIFAL AUTO / TransConnekt",
    "SIMULER VOTRE TRAJET": "SIMULATE YOUR ROUTE",
    "Estimation live": "Live estimation",
    "PRÉFECTURE D'ARRIVÉE": "DESTINATION PREFECTURE",
    "Charge / Urgences": "Cargo / Urgency",
    "Distance estimée :": "Estimated distance:",
    "Tarif estimé :": "Estimated rate:",
    "CAPACITÉ": "CAPACITY",
    "DIMENSIONS": "DIMENSIONS",
    "ROUES": "WHEELS",
    "STATUT": "STATUS",
    "Fermer": "Close",
    "Réserver la course": "Book Trip",
    "Profil en attente de vérification": "Profile Pending Verification",
    "Votre compte doit être vérifié par un administrateur avant de pouvoir créer des demandes de transport.": "Your account must be verified by an administrator before you can create transport requests.",
    "Pour faire vérifier votre compte, veuillez fournir les documents requis.": "To get your account verified, please provide the required documents.",
    "Aller à la page des documents": "Go to Documents Page",
    "Mes Demandes de Transport": "My Transport Requests",
    "Gérez l'ensemble de vos expéditions, choisissez vos transporteurs et suivez vos livraisons en temps réel.": "Manage all your shipments, select transporters and track deliveries in real time.",
    "Actualiser": "Refresh",
    "Simandou 2040": "Simandou 2040",
    "En Attente": "Pending",
    "En attente": "Pending",
    "En Cours": "In Progress",
    "En cours": "In Progress",
    "Terminées": "Completed",
    "Terminé": "Completed",
    "Flux d'activités & Budget logistique": "Activity Flow & Logistics Budget",
    "Aperçu analytique des courses effectuées et du budget logistique associé.": "Analytical overview of completed trips and associated logistics budget.",
    "Marchandises": "Cargo",
    "Répartition par type de fret.": "Distribution by cargo type.",
    "Nouvelle demande": "New Request",
    "Utilisateurs actifs rattachés": "Active connected users",
    "Demandes logistiques publiées": "Published logistics requests",
    "Dépenses totales accumulées": "Accumulated total expenses",
    "Solution logistique minière": "Mining logistics solution",
    "Espace Transporteur Pro": "Transporter Pro Portal",
    "Tableau de bord logistique flotte": "Fleet Logistics Dashboard",
    "Chauffeurs rattachés": "Connected Drivers",
    "Véhicules de la flotte": "Fleet Vehicles",
    "Missions Effectuées": "Completed Trips",
    "Estimations Chiffre d'Affaires": "Estimated Turnover",
    "Taux d'activité chauffeurs": "Driver Activity Rate",
    "Vidange & Entretien": "Maintenance & Oil Change",
    "Suivi de l'activité financière": "Financial Activity Tracking",
    "État d'utilisation de la flotte": "Fleet Utilization Status",
    "Rapports & Audit Flotte": "Fleet Reports & Audit",
    "Conducteurs En mission": "Drivers on Mission",
    "En service": "In Service",
    "En maintenance": "In Maintenance",
    "Gains": "Earnings",
    "Calculateur de Rentabilité": "Profitability Calculator",
    "Calculer": "Calculate",
    "Historique de vos courses": "Trips History",
    "Chiffre d'Affaires total": "Total Turnover",
    "Recherche d'opportunités de fret": "Search Cargo Opportunities",
    "Offres Récentes": "Recent Offers",
    "Filtre par ville": "Filter by City",
    "Mon profil": "My Profile",
    "Messagerie Support": "Support Chat",
    "Notifications": "Notifications",
    "Déconnexion": "Sign Out",
    "Bonjour": "Hello",
    "Modifier mon mot de passe": "Change Password",
    "Modifier le profil": "Edit Profile",
    "Modifier": "Edit",
    "Annuler": "Cancel",
    "Sauvegarder": "Save",
    "Imprimer / PDF": "Print / PDF",
    "Aucune notification": "No notifications",
    "Tout marquer comme lu": "Mark all as read",
    "Gestion des collaborateurs": "Team Members Management",
    "Gerez les permissions des utilisateurs de votre entreprise.": "Manage corporate user permissions.",
    "Ajoutez de nouveaux gestionnaires pour coordonner ensemble votre chaîne": "Add new managers to coordinate your supply chain together",
    "Rapports Financiers & Activités": "Financial & Activity Reports",
    "Générez instantanément des extraits d'audit logistique.": "Instantly generate logistics audit summaries.",
    "Simulateur Simandou 2040": "Simandou 2040 Simulator",
    "Estimez le coût d'acheminement de vos cargaisons": "Estimate cargo transportation costs",
    "Calculer l'itinéraire": "Calculate Route",
    "Exporter au format CSV (Fret)": "Export to CSV (Cargo)",
    "Rechercher un chauffeur...": "Search for a driver...",
    "Immatriculation": "Registration",
    "Modifier les infos": "Edit info",
    "Supprimer le véhicule": "Delete vehicle",
    "Ajouter un véhicule": "Add Vehicle",
    "Visite Technique": "Technical Inspection",
    "Assurance": "Insurance",
    "Consommation": "Consumption",
    "Kilométrage": "Mileage",
    "Détails du véhicule": "Vehicle Details",
    "Mon Profil": "My Profile",
    "Nos Services": "Our Services",
    "Expédiez en toute confiance dans toute la Guinée": "Ship with confidence across Guinea",
    "Comment ça marche ?": "How It Works",
    "Pourquoi nous ?": "Why Us",
    "Témoignages": "Testimonials",
    "Découvrez ce que nos utilisateurs pensent": "Find out what our users think",
    "Contactez-nous": "Contact Us",
    "Une solution complète pour vos expéditions de fret et logistique en Guinée.": "A complete solution for your freight shipping and logistics in Guinea.",
    "Transporteurs Vérifiés": "Verified Transporters",
    "Suivi en Temps Réel": "Real-Time Tracking",
    "Prix Compétitifs": "Competitive Prices",
    "Paiement Sécurisé": "Secure Payment",
    "Support 24/7": "24/7 Support",
    "Rapide & Fiable": "Fast & Reliable",
    "Publiez votre demande": "Post your request",
    "Choisissez votre transporteur": "Choose your transporter",
    "Suivez et validez": "Track and confirm",
    "Prêt à optimiser vos expéditions ?": "Ready to optimize your shipments?",
    "Rejoignez la plateforme leader du transport routier en Guinée.": "Join the leading road transport platform in Guinea.",
    "Inscrivez-vous gratuitement": "Sign up for free",
    "Découvrir nos services": "Explore our services",
    "Nous contacter": "Contact us",
    "Commencer maintenant": "Get started now",
    "Transport de Marchandises": "Goods Transport",
    "Envoi de Colis & Paquets": "Parcel & Package Delivery",
    "Déménagement Simplifié": "Simplified Moving",
    "Logistique Minière Simandou 2040": "Simandou 2040 Mining Logistics",
    "Transport Agricole": "Agricultural Transport",
    "Solutions Entreprises": "Enterprise Solutions",
    "Créer un compte Client": "Create Client Account",
    "Créer un compte Transporteur": "Create Transporter Account",
    "Créer un compte Administrateur": "Create Admin Account",
    "Nom complet": "Full Name",
    "Téléphone": "Phone",
    "Sujet": "Subject",
    "Message": "Message",
    "Saisissez votre e-mail": "Enter your email",
    "Saisissez votre mot de passe": "Enter your password",
    "Se connecter": "Log In",
    "S'inscrire": "Register",
    "Pas encore de compte ?": "Don't have an account yet?",
    "Déjà un compte ?": "Already have an account?",
    "Inscription Client": "Client Sign Up",
    "Créez votre compte pour commencer à envoyer vos cargaisons.": "Create your account to start shipping cargo.",
    "Prénom": "First Name",
    "Nom": "Last Name",
    "Email": "Email",
    "Préfecture de résidence": "Residence Prefecture",
    "Type d'envois fréquents": "Frequent Shipment Type",
    "Mot de passe": "Password",
    "Créer mon compte": "Create My Account",
    "ou": "or",
    "S'inscrire avec Google": "Sign up with Google",
    "Vous êtes transporteur ?": "Are you a transporter?",
    "Inscrivez-vous ici.": "Sign up here.",
    "Se connecter.": "Log in.",
    "← Retour à la page d'accueil": "← Back to Homepage",
    "Devenir Transporteur": "Become a Transporter",
    "Inscrivez-vous en tant que transporteur individuel en Guinée.": "Register as an individual transporter in Guinea.",
    "Pièce d'identité": "Identity Document",
    "Carte d'Identité Nationale": "National ID Card",
    "Passeport": "Passport",
    "Permis de Conduire": "Driver's License",
    "N° de document": "Document No.",
    "Permis": "License",
    "Expérience (ans)": "Experience (years)",
    "Ville d'attache": "Home City",
    "Immatriculation du véhicule": "Vehicle Registration",
    "Devenir transporteur": "Become transporter",
    "Vous êtes client ?": "Are you a client?",
    "Choisir": "Choose",
    "Sélectionnez": "Select",
    "Ville": "City",
    "Drafts & Contrats Cadres Pro": "Drafts & Enterprise Contracts",
    "Proposez des contrats de transport réguliers, cadres ou exclusifs gérés avec l'intermédiation directe de TransConnekt.": "Propose regular, framework or exclusive transport contracts managed through TransConnekt.",
    "Nouveau Projet de Contrat": "New Contract Project",
    "Aucun contrat soumis": "No contracts submitted",
    "Utilisez le bouton \"Nouveau Projet de Contrat\" pour transmettre vos besoins spécifiques aux équipes d'administration TransConnekt.": "Use the \"New Contract Project\" button to send your requests to TransConnekt administrators.",
    "Inviter un collaborateur": "Invite collaborator",
    "Adresse e-mail": "Email address",
    "Envoyer l'invitation": "Send invitation",
    "Brouillon": "Draft",
    "Soumis à l'admin": "Submitted to admin",
    "Proposé à un transporteur": "Proposed to carrier",
    "Accepté": "Accepted",
    "Refusé": "Rejected",
    "Rechercher": "Search",
    "Pièce Jointe": "Attachment",
    "Description": "Description",
    "Urgence": "Urgency",
    "Validité": "Validity",
    "Type de Contrat": "Contract Type",
    "Niveau d'Urgence": "Urgency Level",
    "Durée de Validité Estimée (Jours)": "Estimated Validity (Days)",
    "Description & Demandes spécifiques du Contrat": "Contract Description & Specific Requests",
    "Pièce Jointe PDF / Cahier des Charges (Optionnel)": "PDF Attachment / Specifications (Optional)",
    "Soumettre le Projet de Contrat": "Submit Contract Project",
    "Support TransConnekt": "TransConnekt Support",
    "Conseillers d'assistance technique & logistique": "Technical & logistics support advisors",
    "Rédiger un message de support...": "Write a support message...",
    "Envoyer": "Send",
    "Support Connected": "Support Connected",
    "Discutez en direct avec les conseillers d'assistance TransConnekt.": "Chat live with TransConnekt support advisors."
  },
  "es": {
    "Espace Client Pro": "Portal de Cliente Pro",
    "Tableau de bord logistique entreprise": "Tablero de Logística Corporativa",
    "Collaborateurs": "Colaboradores",
    "Total Demandes": "Total de Solicitudes",
    "Budget Estimé": "Presupuesto Estimado",
    "Simandou 2040": "Simandou 2040",
    "En Attente": "Pendiente",
    "En attente": "Pendiente",
    "En Cours": "En Curso",
    "En cours": "En curso",
    "Terminées": "Completados",
    "Terminé": "Completado",
    "Flux d'activités & Budget logistique": "Flujo de Actividades y Presupuesto Logístico",
    "Aperçu analytique des courses effectuées et du budget logistique associé.": "Resumen analítico de los viajes realizados y del presupuesto previsto.",
    "Marchandises": "Mercancías",
    "Répartition par type de fret.": "Distribución por tipo de carga.",
    "Nouvelle demande": "Nueva Solicitud",
    "Utilisateurs actifs rattachés": "Usuarios activos conectados",
    "Demandes logistiques publiées": "Solicitudes logísticas publicadas",
    "Dépenses totales accumulées": "Gastos totales acumulados",
    "Solution logistique minière": "Solución de logística minera",
    "Espace Transporteur Pro": "Portal de Transportista Pro",
    "Tableau de bord logistique flotte": "Tablero de Logística de Flota",
    "Chauffeurs rattachés": "Conductores Conectados",
    "Véhicules de la flotte": "Vehículos de la Flota",
    "Missions Effectuées": "Misiones Realizadas",
    "Estimations Chiffre d'Affaires": "Facturación Estimada",
    "Taux d'activité chauffeurs": "Tasa de Actividad de Conductores",
    "Vidange & Entretien": "Cambio de Aceite y Mantenimiento",
    "Suivi de l'activité financière": "Seguimiento de la Actividad Financiera",
    "État d'utilisation de la flotte": "Estado de Uso de la Flota",
    "Rapports & Audit Flotte": "Informes y Auditoría de Flota",
    "Conducteurs En mission": "Conductores en Misión",
    "En service": "En servicio",
    "En maintenance": "En mantenimiento",
    "Gains": "Ganancias",
    "Calculateur de Rentabilité": "Calculadora de Rentabilidad",
    "Calculer": "Calcular",
    "Historique de vos courses": "Historial de sus Viajes",
    "Chiffre d'Affaires total": "Facturación Total",
    "Recherche d'opportunités de fret": "Buscar Oportunidades de Carga",
    "Offres Récentes": "Ofertas Recientes",
    "Filtre par ville": "Filtro por Ciudad",
    "Mon profil": "Mi Perfil",
    "Messagerie Support": "Mensajería de Soporte",
    "Notifications": "Notificaciones",
    "Déconnexion": "Cerrar sesión",
    "Bonjour": "Hola",
    "Modifier mon mot de passe": "Cambiar mi contraseña",
    "Modifier le profil": "Editar Perfil",
    "Modifier": "Editar",
    "Annuler": "Cancelar",
    "Sauvegarder": "Guardar",
    "Imprimer / PDF": "Imprimir / PDF",
    "Aucune notification": "No hay notificaciones",
    "Tout marquer comme lu": "Marcar todo como leído",
    "Gestion des collaborateurs": "Gestión de Colaboradores",
    "Gerez les permissions des utilisateurs de votre entreprise.": "Gestione los permisos de los usuarios de su empresa.",
    "Ajoutez de nouveaux gestionnaires pour coordonner ensemble votre chaîne": "Agregue nuevos gestores para coordinar juntos su cadena de suministro",
    "Rapports Financiers & Activités": "Informes Financieros y de Actividades",
    "Générez instantanément des extraits d'audit logistique.": "Genere instantáneamente extractos de auditoría logística.",
    "Simulateur Simandou 2040": "Simulador Simandou 2040",
    "Estimez le coût d'acheminement de vos cargaisons": "Estime el costo de transporte de sus cargas",
    "Calculer l'itinéraire": "Calcular Ruta",
    "Exporter au format CSV (Fret)": "Exportar a CSV (Carga)",
    "Rechercher un chauffeur...": "Buscar un conductor...",
    "Immatriculation": "Matrícula",
    "Modifier les infos": "Editar información",
    "Supprimer le véhicule": "Eliminar vehículo",
    "Ajouter un véhicule": "Agregar vehículo",
    "Visite Technique": "Inspección Técnica",
    "Assurance": "Seguro",
    "Consommation": "Consumo",
    "Kilométrage": "Kilometraje",
    "Détails du véhicule": "Detalles del Vehículo",
    "Mon Profil": "Mi Perfil",
    "Nos Services": "Nuestros Servicios",
    "Expédiez en toute confiance dans toute la Guinée": "Expida con confianza en toda Guinea",
    "Comment ça marche ?": "Cómo Funciona",
    "Pourquoi nous ?": "Por Qué Nosotros",
    "Témoignages": "Testimonios",
    "Découvrez ce que nos utilisateurs pensent": "Descubra lo que piensan nuestros usuarios",
    "Contactez-nous": "Contáctenos",
    "Une solution complète pour vos expéditions de fret et logistique en Guinée.": "Una solución completa para sus envíos de carga y logística en Guinea.",
    "Transporteurs Vérifiés": "Transportistas Verificados",
    "Suivi en Temps Réel": "Seguimiento en Tiempo Real",
    "Prix Compétitifs": "Precios Competitivos",
    "Paiement Sécurisé": "Pago Seguro",
    "Support 24/7": "Soporte 24/7",
    "Rapide & Fiable": "Rápido y Confiable",
    "Publiez votre demande": "Publique su solicitud",
    "Choisissez votre transporteur": "Elija su transportista",
    "Suivez et validez": "Siga y valide",
    "Prêt à optimiser vos expéditions ?": "¿Listo para optimizar sus envíos?",
    "Rejoignez la plateforme leader du transport routier en Guinée.": "Únase a la plataforma líder de transporte por carretera en Guinea.",
    "Inscrivez-vous gratuitement": "Regístrese gratis",
    "Découvrir nos services": "Descubrir nuestros servicios",
    "Nous contacter": "Contactarnos",
    "Commencer maintenant": "Comenzar ahora",
    "Transport de Marchandises": "Transporte de Mercancías",
    "Envoi de Colis & Paquets": "Envío de Paquetes",
    "Déménagement Simplifié": "Mudanza Simplificada",
    "Logistique Minière Simandou 2040": "Logística Minera Simandou 2040",
    "Transport Agricole": "Transporte Agrícola",
    "Solutions Entreprises": "Soluciones para Empresas",
    "Créer un compte Client": "Crear Cuenta de Cliente",
    "Créer un compte Transporteur": "Crear Cuenta de Transportista",
    "Créer un compte Administrateur": "Crear Cuenta de Administrador",
    "Nom complet": "Nombre Completo",
    "Téléphone": "Teléfono",
    "Sujet": "Asunto",
    "Message": "Mensaje",
    "Saisissez votre e-mail": "Ingrese su correo electrónico",
    "Saisissez votre mot de passe": "Ingrese su contraseña",
    "Se connecter": "Iniciar Sesión",
    "S'inscrire": "Registrarse",
    "Pas encore de compte ?": "¿Aún no tiene cuenta?",
    "Déjà un compte ?": "¿Ya tiene cuenta?",
    "Inscription Client": "Registro de Cliente",
    "Créez votre compte pour commencer à envoyer vos cargaisons.": "Cree su cuenta para comenzar a enviar sus cargamentos.",
    "Prénom": "Nombre",
    "Nom": "Apellido",
    "Email": "Correo electrónico",
    "Préfecture de résidence": "Prefectura de residencia",
    "Type d'envois fréquents": "Tipo de envíos frecuentes",
    "Mot de passe": "Contraseña",
    "Créer mi cuenta": "Crear mi cuenta",
    "Créer mon compte": "Crear mi cuenta",
    "ou": "o",
    "S'inscrire avec Google": "Registrarse con Google",
    "Vous êtes transporteur ?": "¿Es transportista?",
    "Inscrivez-vous ici.": "Regístrese aquí.",
    "Se connecter.": "Iniciar sesión.",
    "← Retour à la page d'accueil": "← Volver a la página de inicio",
    "Devenir Transporteur": "Convertirse en Transportista",
    "Inscrivez-vous en tant que transporteur individuel en Guinée.": "Regístrese como transportista individual en Guinea.",
    "Pièce d'identité": "Documento de identidad",
    "Carte d'Identité Nationale": "Cédula de Identidad Nacional",
    "Passeport": "Pasaporte",
    "Permis de Conduire": "Licencia de conducir",
    "N° de document": "Nº de documento",
    "Permis": "Licencia",
    "Expérience (ans)": "Experiencia (años)",
    "Ville d'attache": "Ciudad de origen",
    "Immatriculation du véhicule": "Matrícula del vehículo",
    "Devenir transporteur": "Convertirse en transportista",
    "Vous êtes client ?": "¿Es cliente?",
    "Choisir": "Elegir",
    "Sélectionnez": "Seleccionar",
    "Ville": "Ciudad"
  },
  "pt": {
    "Espace Client Pro": "Portal do Cliente Pro",
    "Tableau de bord logistique entreprise": "Painel de Logística Corporativa",
    "Collaborateurs": "Colaboradores",
    "Total Demandes": "Total de Solicitações",
    "Budget Estimé": "Orçamento Estimado",
    "Simandou 2040": "Simandou 2040",
    "En Attente": "Pendente",
    "En attente": "Pendente",
    "En Cours": "Em Andamento",
    "En cours": "Em andamento",
    "Terminées": "Concluídos",
    "Terminé": "Concluído",
    "Flux d'activités & Budget logistique": "Fluxo de Atividades e Orçamento Logístico",
    "Aperçu analytique des courses effectuées et du budget logistique associé.": "Visão analítica das viagens realizadas e do orçamento logístico associado.",
    "Marchandises": "Mercadorias",
    "Répartition par type de fret.": "Distribuição por tipo de carga.",
    "Nouvelle demande": "Nova Solicitação",
    "Utilisateurs actifs rattachés": "Usuários ativos conectados",
    "Demandes logistiques publiées": "Solicitações logísticas publicadas",
    "Dépenses totales accumulées": "Despesas totais acumuladas",
    "Solution logistique minière": "Solução de logística mineira",
    "Espace Transporteur Pro": "Portal do Transportador Pro",
    "Tableau de bord logistique flotte": "Painel de Logística de Frota",
    "Chauffeurs rattachés": "Motoristas Conectados",
    "Véhicules de la flotte": "Veículos da Frota",
    "Missions Effectuées": "Missões Realizadas",
    "Estimations Chiffre d'Affaires": "Faturamento Estimado",
    "Taux d'activité chauffeurs": "Taxa de Atividade dos Motoristas",
    "Vidange & Entretien": "Troca de Óleo e Manutenção",
    "Suivi de l'activité financière": "Acompanhamento da Atividade Financeira",
    "État d'utilisation de la flotte": "Status de Uso da Frota",
    "Rapports & Audit Flotte": "Relatórios e Auditoria da Frota",
    "Conducteurs En mission": "Motoristas em Missão",
    "En service": "Em serviço",
    "En maintenance": "Em manutenção",
    "Gains": "Ganhos",
    "Calculateur de Rentabilité": "Calculadora de Rentabilidade",
    "Calculer": "Calcular",
    "Historique de vos courses": "Histórico de suas Viagens",
    "Chiffre d'Affaires total": "Faturamento Total",
    "Recherche d'opportunités de fret": "Buscar Oportunidades de Frete",
    "Offres Récentes": "Ofertas Recientes",
    "Filtre par ville": "Filtro por Cidade",
    "Mon profil": "Meu Perfil",
    "Messagerie Support": "Mensagens de Suporte",
    "Notifications": "Notificações",
    "Déconnexion": "Sair",
    "Bonjour": "Olá",
    "Modifier mon mot de passe": "Alterar minha senha",
    "Modifier le profil": "Editar Perfil",
    "Modifier": "Editar",
    "Annuler": "Cancelar",
    "Sauvegarder": "Salvar",
    "Imprimer / PDF": "Imprimir / PDF",
    "Aucune notification": "Nenhuma notificação",
    "Tout marquer comme lu": "Marcar tudo como lido",
    "Gestion des collaborateurs": "Gestão de Colaboradores",
    "Gerez les permissions des utilisateurs de votre entreprise.": "Gerencie as permissões dos usuários da sua empresa.",
    "Ajoutez de nouveaux gestionnaires pour coordonner ensemble votre chaîne": "Adicione novos gestores para coordenar juntos sua cadeia de suprimentos",
    "Rapports Financiers & Activités": "Relatórios Financeiros e de Atividades",
    "Générez instantanément des extraits d'audit logistique.": "Gere instantaneamente extratos de auditoria logística.",
    "Simulateur Simandou 2040": "Simulador Simandou 2040",
    "Estimez le coût d'acheminement de vos cargaisons": "Estime o custo de transporte de suas cargas",
    "Calculer l'itinéraire": "Calcular Rota",
    "Exporter au format CSV (Fret)": "Exportar para CSV (Carga)",
    "Rechercher un chauffeur...": "Buscar um motorista...",
    "Immatriculation": "Placa",
    "Modifier les infos": "Editar informações",
    "Supprimer le véhicule": "Excluir veículo",
    "Ajouter un véhicule": "Adicionar veículo",
    "Visite Technique": "Inspeção Técnica",
    "Assurance": "Seguro",
    "Consommation": "Consumo",
    "Kilométrage": "Quilometragem",
    "Détails du véhicule": "Detalhes do Veículo",
    "Mon Profil": "Meu Perfil",
    "Nos Services": "Nossos Serviços",
    "Expédiez en toute confiance dans toute la Guinée": "Envie com confiança em toda a Guiné",
    "Comment ça marche ?": "Como Funciona",
    "Pourquoi nous ?": "Por Que Nós",
    "Témoignages": "Depoimentos",
    "Découvrez ce que nos utilisateurs pensent": "Descubra o que pensam os nossos usuários",
    "Contactez-nous": "Contate-nos",
    "Une solution complète pour vos expéditions de fret et logistique en Guinée.": "Uma solução completa para seus envios de carga e logística na Guiné.",
    "Transporteurs Vérifiés": "Transportadores Verificados",
    "Suivi en Temps Réel": "Rastreamento em Tempo Real",
    "Prix Compétitifs": "Preços Competitivos",
    "Paiement Sécurisé": "Pagamento Seguro",
    "Support 24/7": "Suporte 24/7",
    "Rapide & Fiable": "Rápido e Confiável",
    "Publiez votre demande": "Publique sua solicitação",
    "Choisissez votre transporteur": "Escolha seu transportador",
    "Suivez et validez": "Acompanhe e valide",
    "Prêt à optimiser vos expéditions ?": "Pronto para otimizar seus envios?",
    "Rejoignez la plateforme leader du transport routier en Guinée.": "Junte-se à plataforma líder de transporte rodoviário na Guiné.",
    "Inscrivez-vous gratuitement": "Registre-se gratuitamente",
    "Découvrir nos services": "Descobrir nossos serviços",
    "Nous contacter": "Contatar-nos",
    "Commencer maintenant": "Começar agora",
    "Transport de Marchandises": "Transporte de Mercadorias",
    "Envoi de Colis & Paquets": "Envio de Encomendas",
    "Déménagement Simplifié": "Mudanças Simplificadas",
    "Logistique Minière Simandou 2040": "Logística Mineira Simandou 2040",
    "Transport Agricole": "Transporte Agrícola",
    "Solutions Entreprises": "Soluções Corporativas",
    "Créer un compte Client": "Criar Conta de Cliente",
    "Créer un compte Transporteur": "Criar Conta de Transportador",
    "Créer un compte Administrateur": "Criar Conta de Administrador",
    "Nom complet": "Nome Completo",
    "Téléphone": "Telefone",
    "Sujet": "Assunto",
    "Message": "Mensagem",
    "Saisissez votre e-mail": "Insira seu e-mail",
    "Saisissez votre mot de passe": "Insira sua senha",
    "Se connecter": "Entrar",
    "S'inscrire": "Cadastrar-se",
    "Pas encore de compte ?": "Ainda não tem conta?",
    "Déjà un compte ?": "Já tem conta?",
    "Inscription Client": "Registo de Cliente",
    "Créez votre compte pour commencer à envoyer vos cargaisons.": "Crie a sua conta para começar a enviar as suas cargas.",
    "Prénom": "Nome",
    "Nom": "Sobrenome",
    "Email": "E-mail",
    "Préfecture de résidence": "Prefeitura de residência",
    "Type d'envois fréquents": "Tipo de envios frequentes",
    "Mot de passe": "Senha",
    "Créer mon compte": "Criar minha conta",
    "ou": "ou",
    "S'inscrire avec Google": "Registar-se com o Google",
    "Vous êtes transporteur ?": "É transportador?",
    "Inscrivez-vous ici.": "Registe-se aqui.",
    "Se connecter.": "Iniciar sessão.",
    "← Retour à la page d'accueil": "← Voltar à página inicial",
    "Devenir Transporteur": "Tornar-se Transportador",
    "Inscrivez-vous en tant que transporteur individuel na Guiné.": "Registe-se como transportador individual na Guiné.",
    "Inscrivez-vous en tant que transporteur individuel en Guinée.": "Registe-se como transportador individual na Guiné.",
    "Pièce d'identité": "Documento de identidade",
    "Carte d'Identité Nationale": "Bilhete de Identidade Nacional",
    "Passeport": "Passaporte",
    "Permis de Conduire": "Carta de Condução",
    "N° de document": "Nº do documento",
    "Permis": "Carta",
    "Expérience (ans)": "Experiência (anos)",
    "Ville d'attache": "Cidade de origem",
    "Immatriculation du véhicule": "Matrícula do veículo",
    "Devenir transporteur": "Tornar-se transportador",
    "Vous êtes client ?": "É cliente?",
    "Choisir": "Escolher",
    "Sélectionnez": "Selecionar",
    "Ville": "Cidade"
  },
  "ar": {
    "Espace Client Pro": "بوابة العميل المحترف",
    "Tableau de bord logistique entreprise": "لوحة تحكم الخدمات اللوجستية للشركات",
    "Collaborateurs": "المتعاونون",
    "Total Demandes": "إجمالي الطلبات",
    "Budget Estimé": "الميزانية التقديرية",
    "Simandou 2040": "سيماندو 2040",
    "En Attente": "قيد الانتظار",
    "En attente": "قيد الانتظار",
    "En Cours": "قيد التنفيذ",
    "En cours": "قيد التنفيذ",
    "Terminées": "مكتملة",
    "Terminé": "مكتمل",
    "Flux d'activités & Budget logistique": "تدفق الأنشطة والميزانية اللوجستية",
    "Aperçu analytique des courses effectuées et du budget logistique associé.": "نظرة تحليلية على الرحلات المنجزة والميزانية اللوجستية المرتبطة بها.",
    "Marchandises": "البضائع",
    "Répartition par type de fret.": "التوزيع حسب نوع الشحن.",
    "Nouvelle demande": "طلب جديد",
    "Utilisateurs actifs rattachés": "المستخدمون النشطون المرتبطون",
    "Demandes logistiques publiées": "الطلبات اللوجستية المنشورة",
    "Dépenses totales accumulées": "إجمالي النفقات المتراكمة",
    "Solution logistique minière": "حل لوجستيات التعدين",
    "Espace Transporteur Pro": "بوابة الناقل المحترف",
    "Tableau de bord logistique flotte": "لوحة تحكم لوجستيات الأسطول",
    "Chauffeurs rattachés": "السائقون المرتبطون",
    "Véhicules de la flotte": "مركبات الأسطول",
    "Missions Effectuées": "المهام المنجزة",
    "Estimations Chiffre d'Affaires": "تقديرات حجم الأعمال",
    "Taux d'activité chauffeurs": "معدل نشاط السائقين",
    "Vidange & Entretien": "تغيير الزيت والصيانة",
    "Suivi de l'activité financière": "متابعة النشاط المالي",
    "État d'utilisation de la flotte": "حالة استخدام الأسطول",
    "Rapports & Audit Flotte": "تقارير وتدقيق الأسطول",
    "Conducteurs En mission": "السائقون في مهمة",
    "En service": "في الخدمة",
    "En maintenance": "في الصيانة",
    "Gains": "الأرباح",
    "Calculateur de Rentabilité": "حاسبة الربحية",
    "Calculer": "احسب",
    "Historique de vos courses": "سجل رحلاتكم",
    "Chiffre d'Affaires total": "إجمالي حجم الأعمال",
    "Recherche d'opportunités de fret": "البحث عن فرص الشحن",
    "Offres Récentes": "العروض الأخيرة",
    "Filtre par ville": "التصفية حسب المدينة",
    "Mon profil": "ملفي الشخصي",
    "Messagerie Support": "مراسلة الدعم",
    "Notifications": "الإشعارات",
    "Déconnexion": "تسجيل الخروج",
    "Bonjour": "مرحباً",
    "Modifier mon mot de passe": "تغيير كلمة المرور",
    "Modifier le profil": "تعديل الملف الشخصي",
    "Modifier": "تعديل",
    "Annuler": "إلغاء",
    "Sauvegarder": "حفظ",
    "Imprimer / PDF": "طباعة / PDF",
    "Aucune notification": "لا توجد إشعارات",
    "Tout marquer comme lu": "تحديد الكل كمقروء",
    "Gestion des collaborateurs": "إدارة المتعاونين",
    "Gerez les permissions des utilisateurs de votre entreprise.": "إدارة صلاحيات مستخدمي شركتك.",
    "Ajoutez de nouveaux gestionnaires pour coordonner ensemble votre chaîne": "إضافة مديرين جدد للتنسيق معاً في سلسلة الإمداد الخاصة بك",
    "Rapports Financiers & Activités": "التقارير المالية والأنشطة",
    "Générez instantanément des extraits d'audit logistique.": "إنشاء مقتطفات التدقيق اللوجستي على الفور.",
    "Simulateur Simandou 2040": "محاكي سيماندو 2040",
    "Estimez le coût d'acheminement de vos cargaisons": "تقدير تكلفة شحن حمولاتكم",
    "Calculer l'itinéraire": "حساب المسار",
    "Exporter au format CSV (Fret)": "تصدير بصيغة CSV (الشحن)",
    "Rechercher un chauffeur...": "البحث عن سائق...",
    "Immatriculation": "رقم اللوحة",
    "Modifier les infos": "تعديل المعلومات",
    "Supprimer le véhicule": "حذف المركبة",
    "Ajouter un véhicule": "إضافة مركبة",
    "Visite Technique": "الفحص الفني",
    "Assurance": "التأمين",
    "Consommation": "الاستهلاك",
    "Kilométrage": "المسافة المقطوعة",
    "Détails du véhicule": "تفاصيل المركبة",
    "Mon Profil": "ملفي الشخصي",
    "Nos Services": "خدماتنا",
    "Expédiez en toute confiance dans toute la Guinée": "اشحن بثقة في جميع أنحاء غينيا",
    "Comment ça marche ?": "كيف يعمل؟",
    "Pourquoi nous ?": "لماذا نحن؟",
    "Témoignages": "الشهادات",
    "Découvrez ce que nos utilisateurs pensent": "اكتشف آراء مستخدمينا",
    "Contactez-nous": "اتصل بنا",
    "Une solution complète pour vos expéditions de fret et logistique en Guinée.": "حل متكامل لشحن البضائع والخدمات اللوجستية في غينيا.",
    "Transporteurs Vérifiés": "الناقلون المعتمدون",
    "Suivi en Temps Réel": "تتبع في الوقت الحقيقي",
    "Prix Compétitifs": "أسعار تنافسية",
    "Paiement Sécurisé": "دفع آمن",
    "Support 24/7": "دعم 24/7",
    "Rapide & Fiable": "سريع وموثوق",
    "Publiez votre demande": "انشر طلبك",
    "Choisissez votre transporteur": "اختر الناقل الخاص بك",
    "Suivez et validez": "تتبع وأكد الاستلام",
    "Prêt à optimiser vos expéditions ?": "جاهز لتحسين عمليات الشحن الخاصة بك؟",
    "Rejoignez la plateforme leader du transport routier en Guinée.": "انضم إلى المنصة الرائدة للنقل البري في غينيا.",
    "Inscrivez-vous gratuitement": "سجل مجاناً",
    "Découvrir nos services": "اكتشف خدماتنا",
    "Nous contacter": "اتصل بنا",
    "Commencer maintenant": "ابدأ الآن",
    "Transport de Marchandises": "نقل البضائع",
    "Envoi de Colis & Paquets": "إرسال الطرود والطرود الصغيرة",
    "Déménagement Simplifié": "نقل الأثاث المبسط",
    "Logistique Minière Simandou 2040": "لوجستيات التعدين سيماندو 2040",
    "Transport Agricole": "النقل الزراعي",
    "Solutions Entreprises": "حلول الشركات",
    "Créer un compte Client": "إنشاء حساب عميل",
    "Créer un compte Transporteur": "إنشاء حساب ناقل",
    "Créer un compte Administrateur": "إنشاء حساب مسؤول",
    "Nom complet": "الاسم الكامل",
    "Téléphone": "الهاتف",
    "Sujet": "الموضوع",
    "Message": "الرسالة",
    "Saisissez votre e-mail": "أدخل بريدك الإلكتروني",
    "Saisissez votre mot de passe": "أدخل كلمة المرور الخاصة بك",
    "Se connecter": "تسجيل الدخول",
    "S'inscrire": "تسجيل",
    "Pas encore de compte ?": "ليس لديك حساب بعد؟",
    "Déjà un compte ?": "لديك حساب بالفعل؟",
    "Inscription Client": "تسجيل حساب العميل",
    "Créez votre compte pour commencer à envoyer vos cargaisons.": "أنشئ حسابك للبدء في شحن بضائعك.",
    "Prénom": "الاسم الأول",
    "Nom": "اللقب / العائلة",
    "Email": "البريد الإلكتروني",
    "Préfecture de résidence": "المحافظة السكنية",
    "Type d'envois fréquents": "نوع الشحنات المتكررة",
    "Mot de passe": "كلمة المرور",
    "Créer mon compte": "إنشاء حسابي",
    "ou": "أو",
    "S'inscrire avec Google": "التسجيل بواسطة جوجل",
    "Vous êtes transporteur ?": "هل أنت ناقل؟",
    "Inscrivez-vous ici.": "سجل هنا.",
    "Se connecter.": "تسجيل الدخول.",
    "← Retour à la page d'accueil": "← العودة للصفحة الرئيسية",
    "Devenir Transporteur": "كن ناقلاً معنا",
    "Inscrivez-vous en tant que transporteur individuel en Guinée.": "سجل كناقل فردي في غينيا.",
    "Pièce d'identité": "وثيقة الهوية",
    "Carte d'Identité Nationale": "بطاقة الهوية الوطنية",
    "Passeport": "جواز السفر",
    "Permis de Conduire": "رخصة القيادة",
    "N° de document": "رقم الوثيقة",
    "Permis": "الرخصة",
    "Expérience (ans)": "الخبرة (بالسنوات)",
    "Ville d'attache": "المدينة الملحق بها",
    "Immatriculation du véhicule": "رقم لوحة المركبة",
    "Devenir transporteur": "كن ناقلاً",
    "Vous êtes client ?": "هل أنت عميل؟",
    "Choisir": "اختر",
    "Sélectionnez": "حدد",
    "Ville": "المدينة",
    "Drafts & Contrats Cadres Pro": "المسودات والعقود الإطارية الاحترافية",
    "Proposez des contrats de transport réguliers, cadres ou exclusifs gérés avec l'intermédiation directe de TransConnekt.": "اقترح عقود نقل منتظمة، إطارية أو حصرية تتم إدارتها بالوساطة المباشرة لـ TransConnekt.",
    "Nouveau Projet de Contrat": "مشروع عقد جديد",
    "Aucun contrat soumis": "لم يتم تقديم أي عقد",
    "Utilisez le bouton \"Nouveau Projet de Contrat\" pour transmettre vos besoins spécifiques aux équipes d'administration TransConnekt.": "استخدم زر \"مشروع عقد جديد\" لإرسال احتياجاتك الخاصة إلى فرق إدارة TransConnekt.",
    "Inviter un collaborateur": "دعوة متعاون",
    "Adresse e-mail": "البريد الإلكتروني",
    "Envoyer l'invitation": "إرسال الدعوة",
    "Brouillon": "مسودة",
    "Soumis à l'admin": "تم تقديمه للمسؤول",
    "Proposé à un transporteur": "مقترح على ناقل",
    "Accepté": "مقبول",
    "Refusé": "مرفوض",
    "Rechercher": "بحث",
    "Pièce Jointe": "مرفق",
    "Description": "الوصف",
    "Urgence": "الاستعجال",
    "Validité": "الصلاحية",
    "Type de Contrat": "نوع العقد",
    "Niveau d'Urgence": "مستوى الاستعجال",
    "Durée de Validité Estimée (Jours)": "مدة الصلاحية التقديرية (بالأيام)",
    "Description & Demandes spécifiques du Contrat": "الوصف والطلبات الخاصة بالعقد",
    "Pièce Jointe PDF / Cahier des Charges (Optionnel)": "مرفق PDF / دفتر الشروط (اختياري)",
    "Soumettre le Projet de Contrat": "تقديم مشروع العقد",
    "Support TransConnekt": "دعم TransConnekt",
    "Conseillers d'assistance technique & logistique": "مستشاري الدعم الفني واللوجستي",
    "Rédiger un message de support...": "اكتب رسالة دعم...",
    "Envoyer": "إرسال",
    "Support Connected": "الدعم متصل",
    "Discutez en direct avec les conseillers d'assistance TransConnekt.": "تحدث مباشرة مع مستشاري الدعم في TransConnekt.",
    "Requests Management": "إدارة الطلبات",
    "My Transport Requests": "طلبات النقل الخاصة بي",
    "Consultez le statut de vos demandes et attribuez vos transporteurs.": "تحقق من حالة طلباتك وعيّن الناقلين الخاصين بك.",
    "Gérez l'ensemble de vos expéditions, choisissez vos transporteurs et suivez vos livraisons en temps réel.": "إدارة جميع شحناتك، واختيار الناقلين، ومتابعة التسليم في الوقت الفعلي.",
    "Filtrer par date (Calendrier)": "التصفية حسب التاريخ (التقويم)",
    "Rechercher par ID course, trajet, marchandise, transporteur...": "البحث حسب معرف الرحلة، المسار، البضاعة، الناقل...",
    "View applicants": "عرض المتقدمين",
    "Request cancellation": "طلب إلغاء",
    "Available Transporters": "الناقلون المتاحون",
    "Find a verified transporter for your next delivery in Guinea.": "ابحث عن ناقل معتمد لشحنتك القادمة في غينيا.",
    "Verified transporters": "ناقلون معتمدون",
    "Available now": "متاح الآن",
    "On active mission": "في مهمة نشطة",
    "Transporters List": "قائمة الناقلين",
    "Interactive Map": "خريطة تفاعلية",
    "Search by transporter name...": "البحث باسم الناقل...",
    "All cities": "جميع المدن",
    "All statuses": "جميع الحالات",
    "transporters found": "ناقلون تم العثور عليهم",
    "Voir profil": "عرض الملف الشخصي",
    "Peut accepter des demandes": "يمكنه قبول الطلبات",
    "Profil du Transporteur": "ملف الناقل الشخصي",
    "Statistiques & Évaluations": "الإحصائيات والتقييمات",
    "Informations du véhicule": "معلومات المركبة",
    "Contacter": "التواصل مع",
    "Exemples de trajets récents": "أمثلة على الرحلات الأخيرة",
    "Évaluation": "التقييم",
    "Courses terminées": "الرحلات المكتملة",
    "Années d'expérience": "سنوات الخبرة",
    "Type de véhicule": "نوع المركبة",
    "Type de permis": "نوع الرخصة",
    "Membre depuis": "عضو منذ",
    "Galerie des Engins": "معرض شاحنات النقل",
    "Consultez les camions de transport disponibles dans toute la Guinée, simulez vos trajets et réservez instantanément.": "تصفح شاحنات النقل المتاحة في جميع أنحاء غينيا، وقم بالمحاكاة والحجز فوراً.",
    "Toutes les préfectures": "جميع المحافظات",
    "Tous les types": "جميع الأنواع",
    "Tous les statuts": "جميع الحالات",
    "Roues": "عجلات",
    "Voir les angles & Simuler": "عرض التفاصيل والمحاكاة",
    "Transporteur :": "الناقل:",
    "Drafts & Contrats": "المسودات والعقود",
    "Refresh": "تحديث",
    "LIVRÉES": "مكتملة",
    "Toutes": "الكل",
    "Livrées": "مكتملة",
    "Pièce d'identité (Carte Nationale ou Passeport)": "وثيقة الهوية (بطاقة الهوية الوطنية أو جواز السفر)",
    "Document d'Identité (CNI ou Passeport)": "وثيقة الهوية (بطاقة الهوية الوطنية أو جواز السفر)",
    "Mes Documents": "المستندات الخاصة بي",
    "Profil Vérifié & Validé": "تم التحقق من الملف الشخصي والموافقة عليه",
    "Félicitations, vos documents ont été approuvés. Votre compte est pleinement actif.": "تهانينا، تم التثبت من مستنداتك وحسابك نشط بالكامل.",
    "Renseignez les informations et téléversez une copie du document pour faire vérifier votre compte.": "يرجى ملء المعلومات وتحميل نسخة من الوثيقة للتحقق من حسابك.",
    "Type de document *": "نوع الوثيقة *",
    "Choisissez le type de votre document...": "اختر نوع الوثيقة...",
    "Numéro du document": "رقم الوثيقة",
    "Date d'expiration": "تاريخ الانتهاء",
    "Enregistrer les infos": "حفظ البيانات",
    "Re-analyser le document": "إعادة تحليل الوثيقة",
    "Demander une vérification manuelle par un admin": "طلب تحقق يدوي من المسؤول",
    "Historique & Évaluations": "سجل الطلبات والتقييمات",
    "Évaluer cette course": "تقييم هذه الرحلة",
    "Votre note :": "تقييمك :",
    "Votre note": "تقييمك",
    "Votre commentaire (optionnel)": "تعليقك (اختياري)",
    "Évaluer la course": "تقييم الرحلة",
    "Donnez une note au transporteur": "أعط تقييماً للناقل",
    "Terminée le :": "اكتملت بتاريخ :",
    "Terminée le": "اكتملت بتاريخ",
    "Aucun historique": "لا يوجد سجل",
    "Vos demandes terminées ou annulées apparaîtront ici.": "ستظهر طلباتك المكتملة أو الملغاة هنا.",
    "Marchandises Générales": "بضائع عامة",
    "Fragile / Délicat": "بضائع قابلة للكسر",
    "Frigorifique / Agro": "شحن مبرد",
    "Citerne & Liquides": "صهريج وسوائل",
    "Matières Dangereuses": "مواد خطرة",
    "Saison Sèche": "الموسم الجاف",
    "Saison Pluvieuse": "الموسم الممطر",
    "Document refusé par notre système": "تم رفض الوثيقة بواسطة نظامنا",
    "Ce document n'est pas identifié comme un document officiel de la République de Guinée, ou le texte est illisible.": "هذه الوثيقة غير معرّفة كوثيقة رسمية لجمهورية غينيا، أو النص غير قابل للقراءة.",
    "Veuillez corriger le document et le téléverser de nouveau pour relancer la vérification.": "يرجى تصحيح الوثيقة وإعادة تحميلها لإعادة تشغيل الفحص.",
    "Téléversement verrouillé": "تحميل الوثيقة مغلق",
    "Veuillez renseigner le type de document, le numéro et la date d'expiration ci-dessus, puis cliquez sur « Enregistrer les infos » pour déverrouiller le téléversement.": "يرجى ملء نوع الوثيقة ورقمها وتاريخ الانتهاء أعلاه، ثم انقر فوق «حفظ البيانات» لفتح التحميل.",
    "Téléversement en cours...": "جاري التحميل...",
    "Veuillez ne pas fermer cette page.": "يرجى عدم إغلاق هذه الصفحة.",
    "Glissez-déposez votre document ici": "اسحب واسقط وثيقتك هنا",
    "Glissez un fichier ou cliquez pour remplacer": "اسحب ملفاً أو انقر للاستبدال",
    "PDF, JPEG ou PNG jusqu'à 5 Mo": "PDF أو JPEG أو PNG حتى 5 ميغابايت",
    "Document téléversé": "تم تحميل الوثيقة",
    "Téléversé le :": "تم التحميل بتاريخ :",
    "Téléversé le": "تم التحميل بتاريخ",
    "Voir": "عرض",
    "Nom & Prénom": "الاسم واللقب",
    "Résultats de la vérification :": "نتائج التحقق :",
    "Score de confiance :": "مستوى الثقة :",
    "Alertes détectées :": "التنبيهات المكتشفة :",
    "Document non officiel ou illisible.": "وثيقة غير رسمية أو غير قابلة للقراءة.",
    "Vérification manuelle en cours": "الفحص اليدوي قيد الإجراء",
    "Votre demande a été transmise à un administrateur général pour vérification manuelle. Vous recevrez une notification dès que vos documents auront été vérifiés.": "تم نقل طلبك إلى المسؤول العام للفحص اليدوي. ستتلقى إشعاراً بمجرد التحقق من مستنداتك.",
    "Prévisualisation du Document": "معاينة الوثيقة",
    "Profil en attente de vérification": "الملف الشخصي في انتظار التحقق",
    "Votre compte doit être vérifié par un administrateur avant de pouvoir créer des demandes de transport.": "يجب التحقق من حسابك بواسطة المسؤول قبل أن تتمكن من إنشاء طلبات النقل.",
    "Pour faire vérifier votre compte, veuillez fournir les documents requis.": "للتحقق من حسابك، يرجى تقديم المستندات المطلوبة.",
    "Aller à la page des documents": "الانتقال إلى صفحة المستندات",
    "home.nav_docs": "التوثيق",
    "nav_docs": "التوثيق",
    "Documentation": "التوثيق",
    "normale": "عادية",
    "fragile": "هشة / قابلة للكسر",
    "frigorifique": "مبردة",
    "liquide": "سائلة",
    "dangereuse": "خطرة",
    "seche": "الموسم الجاف",
    "pluvieuse": "الموسم الممطر"
  },
  "de": {
    "Espace Client Pro": "Enterprise-Kundenportal",
    "Tableau de bord logistique entreprise": "Logistik-Dashboard für Unternehmen",
    "Collaborateurs": "Mitarbeiter",
    "Total Demandes": "Gesamtanzahl Anfragen",
    "Budget Estimé": "Geschätztes Budget",
    "Simandou 2040": "Simandou 2040",
    "En Attente": "In Wartestellung",
    "En attente": "In Wartestellung",
    "En Cours": "In Bearbeitung",
    "En cours": "In Bearbeitung",
    "Terminées": "Abgeschlossen",
    "Terminé": "Abgeschlossen",
    "Flux d'activités & Budget logistique": "Aktivitätsfluss & Logistikbudget",
    "Aperçu analytique des courses effectuées et du budget logistique associé.": "Analytische Übersicht der durchgeführten Fahrten und des zugehörigen Budgets.",
    "Marchandises": "Waren",
    "Répartition par type de fret.": "Verteilung nach Frachtart.",
    "Nouvelle demande": "Neue Anfrage",
    "Utilisateurs actifs rattachés": "Aktive verknüpfte Benutzer",
    "Demandes logistiques publiées": "Veröffentlichte Logistikanfragen",
    "Dépenses totales accumulées": "Gesamte angehäufte Ausgaben",
    "Solution logistique minière": "Bergbaulogistik-Lösung",
    "Espace Transporteur Pro": "Transporteur-Pro-Portal",
    "Tableau de bord logistique flotte": "Flottenlogistik-Dashboard",
    "Chauffeurs rattachés": "Verknüpfte Fahrer",
    "Véhicules de la flotte": "Flottenfahrzeuge",
    "Missions Effectuées": "Durchgeführte Missionen",
    "Estimations Chiffre d'Affaires": "Umsatzschätzungen",
    "Taux d'activity chauffeurs": "Aktivitätsrate der Fahrer",
    "Taux d'activité chauffeurs": "Aktivitätsrate der Fahrer",
    "Vidange & Entretien": "Ölwechsel & Wartung",
    "Suivi de l'activité financière": "Verfolgung der Finanzaktivität",
    "État d'utilisation de la flotte": "Nutzungsstatus der Flotte",
    "Rapports & Audit Flotte": "Flottenberichte & Audit",
    "Conducteurs En mission": "Fahrer im Einsatz",
    "En service": "Im Dienst",
    "En maintenance": "In Wartung",
    "Gains": "Einnahmen",
    "Calculateur de Rentabilité": "Rentabilitätsrechner",
    "Calculer": "Berechnen",
    "Historique de vos courses": "Verlauf Ihrer Fahrten",
    "Chiffre d'Affaires total": "Gesamtumsatz",
    "Recherche d'opportunités de fret": "Suche nach Frachtmöglichkeiten",
    "Offres Récentes": "Kürzliche Angebote",
    "Filtre par ville": "Nach Stadt filtern",
    "Mon profil": "Mein Profil",
    "Messagerie Support": "Support-Chat",
    "Notifications": "Benachrichtigungen",
    "Déconnexion": "Abmelden",
    "Bonjour": "Hallo",
    "Modifier mon mot de passe": "Passwort ändern",
    "Modifier le profil": "Profil bearbeiten",
    "Modifier": "Bearbeiten",
    "Annuler": "Abbrechen",
    "Sauvegarder": "Speichern",
    "Imprimer / PDF": "Drucken / PDF",
    "Aucune notification": "Keine Benachrichtigungen",
    "Tout marquer comme lu": "Alle als gelesen markieren",
    "Gestion des collaborateurs": "Mitarbeiterverwaltung",
    "Gerez les permissions des utilisateurs de votre entreprise.": "Verwalten Sie die Berechtigungen Ihrer Unternehmensbenutzer.",
    "Ajoutez de nouveaux gestionnaires pour coordonner ensemble votre chaîne": "Fügen Sie neue Manager hinzu, um Ihre Lieferkette gemeinsam zu koordinieren",
    "Rapports Financiers & Activités": "Finanz- & Aktivitätsberichte",
    "Générez instantanément des extraits d'audit logistique.": "Erstellen Sie sofort Auszüge aus dem Logistikaudit.",
    "Simulateur Simandou 2040": "Simandou-2040-Simulator",
    "Estimez le coût d'acheminement de vos cargaisons": "Schätzen Sie die Transportkosten Ihrer Ladung",
    "Calculer l'itinéraire": "Route berechnen",
    "Exporter au format CSV (Fret)": "Als CSV exportieren (Fracht)",
    "Rechercher un chauffeur...": "Fahrer suchen...",
    "Immatriculation": "Kennzeichen",
    "Modifier les infos": "Infos bearbeiten",
    "Supprimer le véhicule": "Fahrzeug löschen",
    "Ajouter un véhicule": "Fahrzeug hinzufügen",
    "Visite Technique": "Technische Inspektion",
    "Assurance": "Versicherung",
    "Consommation": "Verbrauch",
    "Kilométrage": "Kilometerstand",
    "Détails du véhicule": "Fahrzeugdetails",
    "Mon Profil": "Mein Profil",
    "Nos Services": "Unsere Dienstleistungen",
    "Expédiez en toute confiance dans toute la Guinée": "Versenden Sie mit Vertrauen in ganz Guinea",
    "Comment ça marche ?": "Wie es funktioniert",
    "Pourquoi nous ?": "Warum wir?",
    "Témoignages": "Bewertungen",
    "Découvrez ce que nos utilisateurs pensent": "Finden Sie heraus, was unsere Nutzer denken",
    "Contactez-nous": "Kontaktieren Sie uns",
    "Une solution complète pour vos expéditions de fret et logistique en Guinée.": "Eine komplette Lösung für Ihren Frachtversand und Ihre Logistik in Guinea.",
    "Transporteurs Vérifiés": "Verifizierte Transporteure",
    "Suivi en Temps Réel": "Echtzeit-Verfolgung",
    "Prix Compétitifs": "Wettbewerbsfähige Preise",
    "Paiement Sécurisé": "Sichere Zahlung",
    "Support 24/7": "24/7 Support",
    "Rapide & Fiable": "Schnell & Zuverlässig",
    "Publiez votre demande": "Veröffentlichen Sie Ihre Anfrage",
    "Choisissez votre transporteur": "Wählen Sie Ihren Transporteur",
    "Suivez et validez": "Verfolgen und bestätigen",
    "Prêt à optimiser vos expéditions ?": "Bereit, Ihre Sendungen zu optimieren?",
    "Rejoignez la plateforme leader du transport routier en Guinée.": "Treten Sie der führenden Plattform für Straßentransport in Guinea bei.",
    "Inscrivez-vous gratuitement": "Kostenlos registrieren",
    "Découvrir nos services": "Unsere Dienstleistungen entdecken",
    "Nous contacter": "Kontaktieren Sie uns",
    "Commencer maintenant": "Jetzt starten",
    "Transport de Marchandises": "Gütertransport",
    "Envoi de Colis & Paquets": "Paketversand",
    "Déménagement Simplifié": "Vereinfachter Umzug",
    "Logistique Minière Simandou 2040": "Bergbaulogistik Simandou 2040",
    "Transport Agricole": "Landwirtschaftlicher Transport",
    "Solutions Entreprises": "Unternehmenslösungen",
    "Créer un compte Client": "Kundenkonto erstellen",
    "Créer un compte Transporteur": "Transporteurkonto erstellen",
    "Créer un compte Administrateur": "Admin-Konto erstellen",
    "Nom complet": "Vollständiger Name",
    "Téléphone": "Telefon",
    "Sujet": "Betreff",
    "Message": "Nachricht",
    "Saisissez votre e-mail": "Geben Sie Ihre E-Mail-Adresse ein",
    "Saisissez votre mot de passe": "Geben Sie Ihr Passwort ein",
    "Se connecter": "Anmelden",
    "S'inscrire": "Registrieren",
    "Pas encore de compte ?": "Noch kein Konto?",
    "Déjà un compte ?": "Bereits ein Konto?",
    "Inscription Client": "Kundenregistrierung",
    "Créez votre compte pour commencer à envoyer vos cargaisons.": "Erstellen Sie Ihr Konto, um mit dem Versand von Ladungen zu beginnen.",
    "Prénom": "Vorname",
    "Nom": "Nachname",
    "Email": "E-Mail",
    "Préfecture de résidence": "Präfektur des Wohnsitzes",
    "Type d'envois fréquents": "Häufige Versandart",
    "Mot de passe": "Passwort",
    "Créer mon compte": "Konto erstellen",
    "ou": "oder",
    "S'inscrire avec Google": "Mit Google registrieren",
    "Vous êtes transporteur ?": "Sind Sie Transporteur?",
    "Inscrivez-vous ici.": "Registrieren Sie sich hier.",
    "Se connecter.": "Anmelden.",
    "← Retour à la page d'accueil": "← Zurück zur Startseite",
    "Devenir Transporteur": "Transporteur werden",
    "Inscrivez-vous en tant que transporteur individuel en Guinée.": "Registrieren Sie sich als selbstständiger Transporteur in Guinea.",
    "Pièce d'identité": "Ausweisdokument",
    "Carte d'Identité Nationale": "Nationaler Personalausweis",
    "Passeport": "Reisepass",
    "Permis de Conduire": "Führerschein",
    "N° de document": "Dokumentennummer",
    "Permis": "Führerschein",
    "Expérience (ans)": "Erfahrung (Jahre)",
    "Ville d'attache": "Heimatstadt",
    "Immatriculation du véhicule": "Fahrzeugkennzeichen",
    "Devenir transporteur": "Transporteur werden",
    "Vous êtes client ?": "Sind Sie Kunde?",
    "Choisir": "Wählen",
    "Sélectionnez": "Auswählen",
    "Ville": "Stadt"
  },
  "zh": {
    "Espace Client Pro": "大宗货主工作台",
    "Tableau de bord logistique entreprise": "企业物流数据监控",
    "Collaborateurs": "企业协作人员",
    "Total Demandes": "全部发货请求",
    "Budget Estimé": "预估总预算",
    "Simandou 2040": "西芒杜 2040 矿业项目",
    "En Attente": "待处理 / 待命",
    "En attente": "等待中",
    "En Cours": "运输中 / 执行中",
    "En cours": "进行中",
    "Terminées": "已送达 / 已完成",
    "Terminé": "已完成",
    "Flux d'activités & Budget logistique": "物流流向与资金预算监控",
    "Aperçu analytique des courses effectuées et du budget logistique associé.": "已完成运输任务及相关物流预算的数据分析概述。",
    "Marchandises": "大宗商品",
    "Répartition par type de fret.": "按货物类别进行分布统计。",
    "Nouvelle demande": "发布新货源",
    "Utilisateurs actifs rattachés": "已关联的激活用户",
    "Demandes logistiques publiées": "已发布的物流请求数量",
    "Dépenses totales accumulées": "累计支付的物流运费",
    "Solution logistique minière": "矿山特种运输解决方案",
    "Espace Transporteur Pro": "物流公司工作台",
    "Tableau de bord logistique flotte": "车队日常调度控制台",
    "Chauffeurs rattachés": "车队关联司机",
    "Véhicules de la flotte": "登记可用车辆",
    "Missions Effectuées": "已承运运力次数",
    "Estimations Chiffre d'Affaires": "车队预计总收入",
    "Taux d'activity chauffeurs": "司机每日出勤率",
    "Taux d'activité chauffeurs": "司机每日出勤率",
    "Vidange & Entretien": "车辆保养与机油更换",
    "Suivi de l'activité financière": "车队账单与流水审计",
    "État d'utilisation de la flotte": "卡车出勤与空闲状态",
    "Rapports & Audit Flotte": "车队运营报告生成",
    "Conducteurs En mission": "执行 mission 中的卡车司机",
    "En service": "运营中",
    "En maintenance": "检修维护中",
    "Gains": "净收益",
    "Calculateur de Rentabilité": "卡车运营收益计算器",
    "Calculer": "开始计算",
    "Historique de vos courses": "历史运输账单",
    "Chiffre d'Affaires total": "累计营业额",
    "Recherche d'opportunités de fret": "在线查找实时货源",
    "Offres Récentes": "最新发布的货源",
    "Filtre par ville": "按省份城市筛选",
    "Mon profil": "个人信息",
    "Messagerie Support": "在线客服通道",
    "Notifications": "消息中心",
    "Déconnexion": "安全退出",
    "Bonjour": "您好",
    "Modifier mon mot de passe": "修改账户密码",
    "Modifier le profil": "完善企业信息",
    "Modifier": "修改",
    "Annuler": "取消",
    "Sauvegarder": "保存",
    "Imprimer / PDF": "打印 / 导出 PDF",
    "Aucune notification": "暂无未读消息",
    "Tout marquer comme lu": "全部标记为已读",
    "Gestion des collaborateurs": "协作人员权限管理",
    "Gerez les permissions des utilisateurs de votre entreprise.": "管理您的企业内部调度人员权限。",
    "Ajoutez de nouveaux gestionnaires pour coordonner ensemble votre chaîne": "添加新的管理员，协同调度和监控您的供应链环节",
    "Rapports Financiers & Activités": "财务状况与活动报表",
    "Générez instantanément des extraits d'audit logistique.": "一键生成并导出您的物流供应链审计报告。",
    "Simulateur Simandou 2040": "西芒杜2040铁矿运输模拟器",
    "Estimez le coût d'acheminement de vos cargaisons": "智能估算您的矿区车队到港运费",
    "Calculer l'itinéraire": "自动计算卡车行驶路线",
    "Exporter au format CSV (Fret)": "以CSV表格形式导出账单",
    "Rechercher un chauffeur...": "快速查找司机名称...",
    "Immatriculation": "车牌号码",
    "Modifier les infos": "修改车辆配置",
    "Supprimer le véhicule": "下线此车辆",
    "Ajouter un véhicule": "录入新卡车",
    "Visite Technique": "车辆技术年检",
    "Assurance": "卡车商业保险",
    "Consommation": "百公里油耗 (L)",
    "Kilométrage": "总行驶里程 (km)",
    "Détails du véhicule": "卡车详细性能配置",
    "Mon Profil": "个人资料",
    "Nos Services": "核心业务",
    "Expédiez en toute confiance dans toute la Guinée": "覆盖几内亚全境的安全运送服务",
    "Comment ça marche ?": "服务指南",
    "Pourquoi nous ?": "我们的优势",
    "Témoignages": "客户评价",
    "Découvrez ce que nos utilisateurs pensent": "阅读合作伙伴对我们的评价",
    "Contactez-nous": "联系我们",
    "Une solution complète pour vos expéditions de fret et logistique en Guinée.": "为您提供几内亚本土最专业的物流货运管理平台。",
    "Transporteurs Vérifiés": "审核认证车队",
    "Suivi en Temps Réel": "北斗/GPS实时追踪",
    "Prix Compétitifs": "运费公开透明",
    "Paiement Sécurisé": "平台担保支付",
    "Support 24/7": "7x24客服在线",
    "Rapide & Fiable": "时效精准可靠",
    "Publiez votre demande": "一键发布运输请求",
    "Choisissez votre transporteur": "在线选择承运商",
    "Suivez et validez": "运输监控与签收",
    "Prêt à optimiser vos expéditions ?": "准备好优化您的货物运输效率了吗？",
    "Rejoignez la plateforme leader du transport routier en Guinée.": "加入几内亚最专业的数字卡车物流调度平台。",
    "Inscrivez-vous gratuitement": "免费注册使用",
    "Découvrir nos services": "查看具体服务",
    "Nous contacter": "取得联系",
    "Commencer maintenant": "立即体验",
    "Transport de Marchandises": "大宗普货运输",
    "Envoi de Colis & Paquets": "包裹快递投递",
    "Déménagement Simplifié": "企业居民搬家",
    "Logistique Minière Simandou 2040": "西芒杜2040重型矿山物流",
    "Transport Agricole": "绿色农产品运输",
    "Solutions Entreprises": "大宗企业物流方案",
    "Créer un compte Client": "创建货主个人账户",
    "Créer un compte Transporteur": "创建独立司机账户",
    "Créer un compte Administrateur": "创建管理员账户",
    "Nom complet": "真实姓名",
    "Téléphone": "联系电话",
    "Sujet": "留言主题",
    "Message": "具体内容描述",
    "Saisissez votre e-mail": "请输入您的电子邮箱地址",
    "Saisissez votre mot de passe": "请输入您的账户密码",
    "Se connecter": "登录系统",
    "S'inscrire": "注册新账户",
    "Pas encore de compte ?": "还没有账户吗？",
    "Déjà un compte ?": "已有账户吗？",
    "Inscription Client": "货主注册",
    "Créez votre compte pour commencer à envoyer vos cargaisons.": "创建货主账户，开启几内亚全境一键发货体验。",
    "Prénom": "名 (First Name)",
    "Nom": "姓 (Last Name)",
    "Email": "电子邮箱",
    "Préfecture de résidence": "常驻省份 / 地点",
    "Type d'envois fréquents": "主要发货种类",
    "Mot de passe": "设置登录密码",
    "Créer mon compte": "立即注册发货",
    "ou": "或者",
    "S'inscrire avec Google": "通过 Google 账户一键注册",
    "Vous êtes transporteur ?": "您是卡车司机或车队吗？",
    "Inscrivez-vous ici.": "点击此处注册卡车工作台。",
    "Se connecter.": "立即登录系统。",
    "← Retour à la page d'accueil": "← 返回平台首页",
    "Devenir Transporteur": "加入我们成为司机伙伴",
    "Inscrivez-vous en tant que transporteur individuel en Guinée.": "在几内亚入驻成为自由承运人或卡车车主。",
    "Pièce d'identité": "上传证件类别",
    "Carte d'Identité Nationale": "几内亚国民身份证",
    "Passeport": "个人护照",
    "Permis de Conduire": "机动车驾驶证",
    "N° de document": "证件号码",
    "Permis": "准驾车型",
    "Expérience (ans)": "驾龄 (年)",
    "Ville d'attache": "车辆常驻城市",
    "Immatriculation du véhicule": "卡车车牌号码",
    "Devenir transporteur": "入驻为司机",
    "Vous êtes client ?": "您是货主或大宗企业吗？",
    "Choisir": "请选择",
    "Sélectionnez": "请选择一项",
    "Ville": "所属城市",
    "Galerie des Engins": "工程车辆与车队展厅",
    "Consultez les camions de transport disponibles dans toute la Guinée, simulez vos trajets et réservez instantanément.": "浏览几内亚全境可用的运输卡车，实时模拟路线并立即预订。",
    "Rechercher engin, marque...": "搜索车辆、品牌...",
    "Toutes les préfectures": "所有省份",
    "Tous les types": "所有车型",
    "Roues": "车轮数",
    "Tous les statuts": "所有状态",
    "EN MISSION": "执行任务中",
    "DISPONIBLE": "空闲可用",
    "Voir les angles & Simuler": "查看多角度图并模拟",
    "Transporteur :": "承运商：",
    "Contacter le vendeur": "联系车主/销售",
    "Voir": "查看",
    "Discuter sur WhatsApp": "通过 WhatsApp 沟通",
    "Cette annonce est gérée et vérifiée par KIFAL AUTO / TransConnekt": "本车源由 KIFAL AUTO / TransConnekt 官方审核与管理",
    "SIMULER VOTRE TRAJET": "路线行程模拟",
    "Estimation live": "实时估算",
    "PRÉFECTURE D'ARRIVÉE": "目的地省份",
    "Charge / Urgences": "货物类型 / 紧急程度",
    "Distance estimée :": "预估距离：",
    "Tarif estimé :": "预估价格：",
    "CAPACITÉ": "载重容量",
    "DIMENSIONS": "尺寸规格",
    "ROUES": "车轮",
    "STATUT": "状态",
    "Fermer": "关闭",
    "Réserver la course": "立即预订行程"
  }
};

export function useDomTranslation() {
  const { lang } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Build a reverse dictionary for reverting previous translations back to French
    const revDict: Record<string, string> = {};
    for (const langKey of Object.keys(dicts)) {
      const d = dicts[langKey as Exclude<Language, "fr">];
      for (const k of Object.keys(d)) {
        if (d[k]) {
          revDict[d[k]] = k;
        }
      }
    }

    const replaceWordOrPhrase = (text: string, key: string, replacement: string): string => {
      if (text.includes('@')) return text; // Skip emails completely
      if (key.includes(' ') || key.includes('/') || key.includes('-') || key.length > 5) {
        if (text.includes(key)) {
          return text.split(key).join(replacement);
        }
        return text;
      }
      // Single word short key (e.g. "ou"): require word boundary \b
      try {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'g');
        return text.replace(regex, replacement);
      } catch (e) {
        return text;
      }
    };

    const translateNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const originalVal = node.nodeValue || "";
        const val = originalVal.trim();
        if (!val || originalVal.includes('@')) return; // Do not alter text with email addresses

        // 1. Check if the entire text node matches a previously-translated value (revert to French first)
        let frenchText = val;
        if (revDict[val]) {
          frenchText = revDict[val];
        }

        // 2. If target language is not French, translate the French text
        if (lang !== "fr" && dicts[lang as Exclude<Language, "fr">]) {
          const targetDict = dicts[lang as Exclude<Language, "fr">];
          if (targetDict[frenchText]) {
            // Preserve original whitespace padding
            const leadingSpace = originalVal.match(/^\s*/)?.[0] || "";
            const trailingSpace = originalVal.match(/\s*$/)?.[0] || "";
            node.nodeValue = leadingSpace + targetDict[frenchText] + trailingSpace;
          } else {
            // Mixed or combined nodes: check for substring matches with word boundaries for short terms
            let updatedText = originalVal;
            const sortedKeys = Object.keys(targetDict).sort((a, b) => b.length - a.length);
            let hasChanged = false;
            for (const key of sortedKeys) {
              if (key.length > 1) {
                const nextText = replaceWordOrPhrase(updatedText, key, targetDict[key]);
                if (nextText !== updatedText) {
                  updatedText = nextText;
                  hasChanged = true;
                }
              }
            }
            if (hasChanged) {
              node.nodeValue = updatedText;
            }
          }
        } else if (lang === "fr" && revDict[val]) {
          // Revert to French
          const leadingSpace = originalVal.match(/^\s*/)?.[0] || "";
          const trailingSpace = originalVal.match(/^\s*$/)?.[0] || "";
          node.nodeValue = leadingSpace + frenchText + trailingSpace;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        // Translate placeholders dynamically
        const placeholder = el.getAttribute('placeholder');
        if (placeholder && lang !== "fr" && dicts[lang as Exclude<Language, "fr">]) {
          const targetDict = dicts[lang as Exclude<Language, "fr">];
          const cleanPlaceholder = placeholder.trim();
          if (targetDict[cleanPlaceholder]) {
            el.setAttribute('placeholder', targetDict[cleanPlaceholder]);
          } else {
            const sortedKeys = Object.keys(targetDict).sort((a, b) => b.length - a.length);
            let updatedPlaceholder = placeholder;
            let hasChanged = false;
            for (const key of sortedKeys) {
              if (key.length > 1) {
                const nextPlaceholder = replaceWordOrPhrase(updatedPlaceholder, key, targetDict[key]);
                if (nextPlaceholder !== updatedPlaceholder) {
                  updatedPlaceholder = nextPlaceholder;
                  hasChanged = true;
                }
              }
            }
            if (hasChanged) {
              el.setAttribute('placeholder', updatedPlaceholder);
            }
          }
        }

        const parentTagName = el.tagName.toUpperCase();
        if (parentTagName === 'SCRIPT' || parentTagName === 'STYLE') return;

        for (let i = 0; i < el.childNodes.length; i++) {
          translateNode(el.childNodes[i]);
        }
      }
    };

    // Watch DOM mutations and translate
    // CRITICAL: Use a flag to prevent infinite loops when we modify nodeValue
    let isTranslating = false;

    const observer = new MutationObserver((mutations) => {
      if (isTranslating) return; // Prevent re-entrant calls
      isTranslating = true;
      try {
        for (const mutation of mutations) {
          for (const addedNode of Array.from(mutation.addedNodes)) {
            translateNode(addedNode);
          }
        }
      } finally {
        isTranslating = false;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial translation pass
    isTranslating = true;
    try {
      translateNode(document.body);
    } finally {
      isTranslating = false;
    }

    return () => {
      observer.disconnect();
    };
  }, [lang]);
}


export function translateNotificationMessage(message: string, lang: Language): string {
  if (lang === "fr") return message;

  let msg = message;

  msg = msg.replace(
    /Votre demande d'annulation pour la course (#\w+) a été rejetée\./g,
    "Your cancellation request for trip $1 was rejected."
  );

  msg = msg.replace(
    /Votre demande d'annulation pour la course (#\w+) a été acceptée\./g,
    "Your cancellation request for trip $1 was approved."
  );

  msg = msg.replace(
    /Votre document '([^']+)' a été refusé par l'IA\. Raison : (.*)/g,
    "Your document '$1' was rejected by the AI. Reason: $2"
  );
  msg = msg.replace(
    /Votre document '([^']+)' a été refusé par notre système\. Raison : (.*)/g,
    "Your document '$1' was rejected by our system. Reason: $2"
  );
  msg = msg.replace(
    /Votre document '([^']+)' a été refusé par l'administrateur\. Raison : (.*)/g,
    "Your document '$1' was rejected by the administrator. Reason: $2"
  );

  msg = msg.replace(
    /Ce document n'est pas identifié comme un document officiel de la République de Guinée, ou le texte est illisible\./g,
    "This document is not identified as an official document of the Republic of Guinea, or the text is illegible."
  );
  msg = msg.replace(
    /Le nom et prénom figurant sur le document ne correspondent pas à ceux de votre profil\./g,
    "The first and last name on the document do not match your profile."
  );

  msg = msg.replace(
    /Votre document '([^']+)' a été accepté\./g,
    "Your document '$1' was approved."
  );

  msg = msg.replace(
    /Vous avez été sélectionné pour la course "([^"]+)". En attente de paiement du client\./g,
    "You have been selected for the trip \"$1\". Waiting for client payment."
  );

  msg = msg.replace(
    /([^ ]+ [^ ]+) a postulé à votre demande "([^"]+)"\./g,
    "$1 applied to your request \"$2\"."
  );

  const directTranslations: Record<string, string> = {
    "Nouveau message de support reçu": "New support message received",
    "Votre compte a été vérifié et approuvé par l'administrateur !": "Your account has been verified and approved by the administrator!",
    "Votre compte a été suspendu pour non-conformité.": "Your account has been suspended for non-compliance.",
  };

  if (directTranslations[msg]) {
    return directTranslations[msg];
  }

  return msg;
}
