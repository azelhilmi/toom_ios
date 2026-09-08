import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { firebaseConfig } from "./config";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistance hors-ligne : les lectures déjà vues restent disponibles
// sans réseau (galerie, pellicule en cours), et les écritures (prise de
// vue) sont mises en file et rejouées automatiquement à la reconnexion
// au lieu d'échouer silencieusement. multiTabManager permet en plus de
// garder plusieurs onglets/fenêtres synchronisés sur le même cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
