# Toom 📷

Appareil photo jetable virtuel : pas d'aperçu, révélation 24h après, un rouleau
de 24 poses par jour, et un mode événement pour centraliser les photos de tes
invités.

## Stack

- React + Vite
- Firebase Auth (anonyme), Firestore, Hosting — **100% plan gratuit Spark, sans carte bancaire**

Les photos sont compressées puis stockées directement en base64 dans
Firestore (pas de Firebase Storage). Depuis février 2026, Firebase Storage
exige le plan payant Blaze même pour un usage à 0€ — cette architecture
l'évite complètement. Voir `src/utils/imageCompression.js` pour le détail
de la compression adaptative.

## 1. Créer le projet Firebase

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet**.
2. Une fois créé, ajoute une **application Web** (icône `</>`) → note la config qui s'affiche (elle ressemble au contenu de `.env.example`).
3. Active les produits suivants (menu de gauche) :
   - **Authentication** → onglet *Sign-in method* → active **Anonyme**.
   - **Firestore Database** → *Créer une base de données* → mode production, région de ton choix (proche de tes utilisateurs, ex. `eur3`).

   (Pas besoin d'activer Firebase Storage — les photos sont stockées dans Firestore.)

## 2. Configurer le projet local

```bash
cd toom
npm install
cp .env.example .env
```

Remplis `.env` avec les valeurs récupérées à l'étape 1 (préfixe `VITE_` déjà en place, ne pas y toucher).

```bash
npm run dev
```

L'app tourne sur `http://localhost:5173`. Le navigateur va demander l'accès à
la caméra — indispensable pour prendre des photos.

## 3. Déployer les règles de sécurité et les index

```bash
npm install -g firebase-tools   # si pas déjà installé
firebase login
```

Édite `.firebaserc` et remplace `REMPLACE_PAR_TON_PROJECT_ID` par l'ID de ton
projet (visible dans Paramètres du projet sur la Console Firebase).

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Build et déploiement sur Firebase Hosting (gratuit)

```bash
npm run build
firebase deploy --only hosting
```

Ton app est en ligne sur `https://<ton-project-id>.web.app`.

Pour les mises à jour suivantes, il suffit de relancer `npm run build` puis
`firebase deploy --only hosting`.

## Limites du plan gratuit à garder en tête

| Ressource | Quota gratuit (Spark) | Impact dans Toom |
|---|---|---|
| Firestore — opérations | 50k lectures / 20k écritures / jour | Chaque photo en résolution d'impression (10×15 @ 300dpi, WebP) est découpée en 1-2 documents ("morceaux") pour rester sous la limite de 1 Mo/document. Une pellicule de 24 photos représente donc ~50-70 écritures — largement sous le quota gratuit pour un usage perso ou un petit événement. |
| Firestore — stockage | 1 Go au total | Chaque photo pèse ~400 Ko à 1 Mo en pleine résolution d'impression, encodée en WebP (voir `src/utils/imageCompression.js`, repli JPEG automatique sur les rares navigateurs sans support WebP). 1 Go représente donc plusieurs centaines de photos. |
| Cloud Functions | **Non disponibles sans passer au plan Blaze** | L'app n'en utilise pas : le développement se fait pellicule entière — 24h après la 1ère photo du rouleau, toutes ses photos se révèlent ensemble, en comparant l'heure côté client à `revealAt` (fixé une fois pour tout le rouleau). Une nouvelle pellicule de 24 poses n'est proposée qu'une fois l'ancienne épuisée ET développée. Voir la note dans `firestore.rules` pour le compromis de sécurité que ça implique. |
| Firebase Storage | **Nécessite désormais le plan Blaze depuis février 2026** | Non utilisé dans cette version : les photos sont stockées en base64 dans Firestore, ce qui évite complètement d'avoir à activer Blaze. |
| Hosting | 10 Go stockés, 360 Mo transférés/jour | Le bundle fait ~235 Ko gzippé, très confortable. |

## Structure du projet

```
src/
  firebase/       # init, auth, requêtes Firestore (métadonnées + images base64)
  context/        # AuthContext (connexion anonyme auto), ThemeContext
  components/
    Camera/       # CameraBody, Viewfinder, FilmWheel, PoseCounter, FlashButton
    Gallery/      # Gallery (+ easter egg), PhotoCard
    UI/           # NavBar
  pages/          # une page par route
  utils/          # compression + encodage base64 adaptatif, hook caméra
  styles/         # themes.css (variables par thème), global.css
firestore.rules
firebase.json
```

## Ajouter un thème

Ouvre `src/styles/themes.css` et ajoute un bloc `[data-theme="mon-theme"] { ... }`
avec les mêmes variables que les thèmes existants. Il apparaîtra automatiquement
dans le sélecteur de thème de la page de création d'événement
(`AVAILABLE_THEMES` dans `src/context/ThemeContext.jsx`).

## Easter egg

Dans la galerie, 10 clics en moins de 5 secondes révèlent toutes les photos
avant l'heure. C'est une triche assumée côté interface — voir la note dans
`firestore.rules` pour le détail du modèle de sécurité.

## Roadmap suggérée (non implémenté ici)

- Notifications (email/push) quand une pellicule est développée
- Export/téléchargement d'un événement en zip par l'organisateur
- Modération des photos par l'organisateur avant reveal
- PWA (installable, fonctionnement hors-ligne partiel)
