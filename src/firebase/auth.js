import { signInAnonymously, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./init";

/**
 * Connecte l'utilisateur de façon anonyme s'il ne l'est pas déjà.
 * Utilisé aussi bien pour le propriétaire de l'app que pour un invité
 * d'événement : dans les deux cas, pas de mot de passe, juste un uid
 * stable stocké par Firebase Auth (persistant tant que le cache
 * navigateur n'est pas vidé).
 */
export async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

/**
 * Associe un nom affiché à l'utilisateur courant (cas d'un invité qui
 * saisit son nom en ouvrant un lien d'invitation) et crée/actualise son
 * document users/{uid}.
 */
export async function setDisplayName(name) {
  const user = await ensureSignedIn();
  await updateProfile(user, { displayName: name });
  await setDoc(
    doc(db, "users", user.uid),
    { displayName: name, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return user;
}

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}
