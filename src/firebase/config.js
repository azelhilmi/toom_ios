// Configuration Firebase
// Récupère ces valeurs dans la Console Firebase :
// Paramètres du projet > Général > Vos applications > Config SDK
//
// IMPORTANT : ces clés sont publiques par nature (elles partent dans le
// bundle client). La sécurité réelle vient des règles Firestore/Storage
// (voir firestore.rules et storage.rules à la racine du projet), pas du
// secret de ces valeurs.
//
// Valeurs codées en dur en repli (fallback) : ce dépôt mobile est buildé
// par GitHub Actions, qui n'a pas accès au fichier .env local (jamais
// commit, par convention). Sans repli, l'app se retrouvait avec une config
// vide et restait bloquée indéfiniment sur l'écran de démarrage — bug réel
// corrigé en septembre 2026. import.meta.env reste prioritaire si un .env
// est présent (dev local), sinon ces valeurs s'appliquent.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDY29r76hUYG5cFrWca5piitp_St_1__Gk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mytoom-cf9dd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mytoom-cf9dd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mytoom-cf9dd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "843569764625",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:843569764625:web:899363ce3d5aeea6db14b0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZKRD5LHRH0",
};
