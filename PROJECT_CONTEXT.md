# PROJECT_CONTEXT.md — TrackGuinea / TransConnekt

## 1. Vue d'ensemble du projet
- **Nom du projet** : TrackGuinea / TransConnekt
- **Stack technique** : Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Firebase (Auth, Firestore, Storage, App Check), Mapbox GL.
- **Domaine principal** : [https://transconnekt.com](https://transconnekt.com)
- **Hébergement & Code Source** : Dépôt GitHub synchronisé, hébergement Web / App Hosting.

---

## 2. État du projet & Fonctionnalités déjà opérationnelles

### 1. Firebase App Check
- **Statut** : Installé et **ACTIF (mode fonctionnel)**.
- **Fournisseur (Provider)** : reCAPTCHA Enterprise (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`).
- **Comportement** : Les requêtes App Check retournent HTTP 200.
- **Règle absolue** : NE JAMAIS DÉSACTIVER App Check.

### 2. Compilation & Build
- **Statut** : Le projet compile sans erreur (`npm run build`).
- **Exigence** : Aucune régression. Chaque modification doit conserver un build fonctionnel.

### 3. Firebase Authentication & Règles de mot de passe
- **Règles de sécurité Firebase renforcées** :
  - Minimum 8 caractères
  - Majuscule obligatoire (`[A-Z]`)
  - Minuscule obligatoire (`[a-z]`)
  - Chiffre obligatoire (`[0-9]`)
  - Caractère spécial obligatoire (`[!@#$%^&*...]`)
- **Front-end** : Validation Zod synchronisée + affichage visuel dynamique des exigences de mot de passe + traduction claire des erreurs Firebase.

### 4. Pages d'inscription (Signup)
- **Fonctionnalités** :
  - Prise en charge des profils Client, Transporteur, Entreprise Client, Entreprise Transporteur, Admin.
  - Indicateur visuel d'exigences du mot de passe en temps réel.
  - Gestion et affichage explicite des erreurs Firebase Auth (ex: `auth/email-already-in-use`, `auth/weak-password`).
- **Règle** : Ne pas supprimer ou altérer les formulaires d'inscription.

### 5. Cartographie Mapbox
- **Utilisation** : Suivi global des courses dans le tableau de bord Admin, carte des offres, détail des expéditions.
- **Token Mapbox** : Utilisation stricte de la variable d'environnement `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. Aucune clé en dur ou chaîne littérale avec guillemets.

### 6. Système d'Emailing
- **Statut actuel** : Modèles d'e-mails natifs Firebase verrouillés (`EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`).
- **Décision** : Migration prévue vers un service SMTP personnalisé avec le domaine `@transconnekt.com` hébergé chez o2switch (Migration non encore réalisée).

### 7. Messagerie & Notifications Navigateur
- **Messagerie** : Chat en temps réel entre utilisateurs et support admin via Firestore (`conversations` & `messages`).
- **Notifications Web** : Déclenchement automatique des notifications natives HTML5 du navigateur lors de la réception de nouveaux messages (demande de permission explicite et gestion de l'état actif/arrière-plan).

### 8. SEO & Indexation Google
- **Stratégie** : Positionnement prioritaire sur les mots-clés :
  - *Transport en Guinée*
  - *Société de transport en Guinée et Afrique*
  - *Plateforme de transport en Guinée et Afrique*
  - *TransConnekt* / *TransConnekt Guinée*
- **Levée de confusion Google Brand** : Balisage JSON-LD `Organization` & `WebSite` avec `alternateName: ["Transconnect", "TrackGuinea", "TransConnekt Guinée"]` pour désambiguïser TransConnekt par rapport aux requêtes "Transconnect".
- **Indexation Vidéo** : Schema.org `VideoObject` sur la vidéo de présentation des services (`truck trancnnekt.mp4`).

---

## 3. Politiques de Sécurité & Clés API

### Règle d'or de sécurité
- **Secrets & Clés privées** : Ne JAMAIS exposer de clé secrète côté client (navigateur).
- **Clés publiques autorisées client** : `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`.
- **Clés privées** : Uniquement dans les routes API serveur (`/app/api/...`) ou variables d'environnement non `NEXT_PUBLIC_`.
- **Restrictions** : App Check, règles de sécurité Firestore/Storage et restrictions de domaine doivent rester activées.

---

## 4. Consignes pour les assistants IA (Antigravity)

1. **Lis d'abord PROJECT_CONTEXT.md**, puis travaille en tenant compte de cet état du projet.
2. **Analyse le code existant** avant toute modification.
3. **Ne supprime jamais** une fonctionnalité déjà opérationnelle.
4. **Préserve le design actuel** et effectue uniquement les changements demandés, sans modifier le reste de l'application.
5. **Assure la continuité du build** : exécute ou vérifie `npm run build` après modification.
