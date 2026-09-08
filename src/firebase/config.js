// Configuration Firebase
// Récupère ces valeurs dans la Console Firebase :
// Paramètres du projet > Général > Vos applications > Config SDK
//
// IMPORTANT : ces clés sont publiques par nature (elles partent dans le
// bundle client). La sécurité réelle vient des règles Firestore/Storage
// (voir firestore.rules et storage.rules à la racine du projet), pas du
// secret de ces valeurs.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
