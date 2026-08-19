# VolleyStats — Guide d'installation et de publication

Ce dossier contient une **PWA** (Progressive Web App) complète et autonome. Pas de build, pas de dépendances : juste des fichiers HTML/CSS/JS à héberger.

Les données du match sont sauvegardées automatiquement sur l'appareil (`localStorage`) : fermer l'appli ou recharger la page ne fait pas perdre la saisie en cours. Le bouton **Réinitialiser le match** efface tout volontairement.

---

## Partie 1 — Utiliser l'appli tout de suite, sans Play Store

### Étape 1 : héberger les fichiers

Il faut que les fichiers soient servis en HTTPS (obligatoire pour qu'un service worker et l'installation fonctionnent). Trois options gratuites, du plus simple au plus flexible :

**Option A — Netlify Drop (le plus rapide, aucun compte requis pour tester)**
1. Allez sur https://app.netlify.com/drop
2. Glissez le dossier entier (avec `index.html` à la racine) dans la zone de dépôt
3. Netlify vous donne une URL en `https://...netlify.app` immédiatement

**Option B — Vercel ou Netlify avec compte (recommandé si vous gardez l'appli longtemps)**
1. Créez un compte gratuit sur https://vercel.com ou https://netlify.com
2. Créez un nouveau projet, déposez le dossier (ou liez un dépôt GitHub)
3. Vous obtenez une URL stable, modifiable plus tard

**Option C — GitHub Pages**
1. Créez un dépôt GitHub, ajoutez les fichiers
2. Activez GitHub Pages dans les paramètres du dépôt (branche `main`, dossier racine)
3. URL du type `https://votre-pseudo.github.io/volley-stats/`

### Étape 2 : installer sur tablette ou téléphone

**Sur Android (Chrome) :**
1. Ouvrez l'URL dans Chrome
2. Menu (⋮) → **Ajouter à l'écran d'accueil** (ou un bandeau d'installation apparaît automatiquement)
3. L'icône ballon apparaît sur l'écran d'accueil, l'appli s'ouvre en plein écran, sans barre d'adresse

**Sur iPhone/iPad (Safari) :**
1. Ouvrez l'URL dans Safari (l'installation ne fonctionne qu'à partir de Safari, pas Chrome)
2. Bouton de partage (carré avec flèche) → **Sur l'écran d'accueil**

À ce stade, l'appli fonctionne comme une appli native : icône dédiée, plein écran, utilisable hors-ligne (grâce au service worker), données conservées entre les sessions. **Aucune publication, aucun compte développeur, aucun coût.**

---

## Partie 2 — Publier sur le Google Play Store (optionnel)

Si vous voulez une fiche officielle sur le Play Store (visibilité, installation en un clic sans manipulation Chrome), on empaquette la PWA dans une **TWA** (Trusted Web Activity) : un emballage Android très léger qui affiche votre PWA déjà hébergée. Le code de l'appli reste exactement celui-ci ; rien à réécrire.

### Pré-requis

- L'appli doit être hébergée en HTTPS avec une URL stable (Partie 1, étape 1)
- Un compte développeur Google Play : **25 $ US, paiement unique** — https://play.google.com/console/signup
- Un ordinateur avec Node.js installé (pour l'outil d'empaquetage)

### Étape 1 : générer le projet Android avec PWABuilder (le plus simple)

1. Allez sur https://www.pwabuilder.com
2. Entrez l'URL de votre PWA hébergée
3. PWABuilder analyse le `manifest.json` et le service worker (déjà fournis dans ce projet) et affiche un score de compatibilité
4. Cliquez sur **Package for stores** → **Android**
5. Téléchargez le package généré (fichier `.aab` signé, prêt pour Play Store)

C'est l'option recommandée : aucune ligne de commande, tout se fait dans le navigateur.

### Étape 1 (bis) — alternative en ligne de commande avec Bubblewrap

Si vous préférez garder le contrôle total :

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://votre-url.app/manifest.json
bubblewrap build
```

Bubblewrap pose quelques questions (nom du package Android, ex: `com.votrenom.volleystats`, version, signature), puis génère le `.aab`.

### Étape 2 : vérifier l'association numérique (Digital Asset Links)

Pour qu'Android affiche l'appli en plein écran sans barre d'adresse, il faut prouver que vous possédez à la fois le site et l'appli. PWABuilder et Bubblewrap génèrent un fichier `assetlinks.json` à déposer à :

```
https://votre-url.app/.well-known/assetlinks.json
```

L'outil vous donne le contenu exact à coller — copiez-le tel quel.

### Étape 3 : créer la fiche sur Google Play Console

1. Connectez-vous à https://play.google.com/console
2. **Créer une application** → renseignez nom, langue, catégorie (Sport)
3. Importez le fichier `.aab` dans la section **Production** (ou **Test interne** pour essayer avant publication publique)
4. Renseignez les éléments obligatoires :
   - Icône 512×512 (utilisez `icons/icon-512.png` fourni, déjà à la bonne taille)
   - Au moins 2 captures d'écran (téléphone) — faites des captures de l'appli installée
   - Description courte et longue
   - Politique de confidentialité (une simple page indiquant que les données restent sur l'appareil suffit, puisqu'il n'y a pas de collecte serveur)
   - Classification du contenu (questionnaire Google, rapide)
5. Soumettez pour revue

### Étape 4 : délai de revue

Google revoit généralement les nouvelles applications en **quelques heures à quelques jours**. Une fois approuvée, l'appli apparaît sur le Play Store avec mises à jour automatiques : si vous modifiez les fichiers web hébergés, les utilisateurs reçoivent le changement immédiatement (la TWA charge le contenu en direct), sans repasser par une revue Google — sauf si vous changez le `manifest.json` ou les permissions Android.

---

## Récapitulatif des coûts et délais

| Étape | Coût | Délai |
|---|---|---|
| Hébergement (Netlify/Vercel/GitHub Pages) | Gratuit | Immédiat |
| Installation écran d'accueil (Partie 1) | Gratuit | Immédiat |
| Compte développeur Google Play | 25 $ US (une fois) | Immédiat |
| Empaquetage TWA (PWABuilder) | Gratuit | ~10 minutes |
| Revue Google avant publication | Gratuit | Quelques heures à quelques jours |

---

## Fichiers du projet

```
volley-pwa/
├── index.html       — structure des deux écrans (Saisie / Dashboard)
├── style.css        — mise en forme, palette et typographie
├── app.js           — logique du match, stockage local, rendu
├── manifest.json     — identité PWA (nom, icônes, couleurs)
├── sw.js            — service worker (fonctionnement hors-ligne)
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-maskable-512.png
```
