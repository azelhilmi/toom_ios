import { createContext, useContext, useEffect, useState } from "react";
import { ensureSignedIn, watchAuthState } from "../firebase/auth";

const AuthContext = createContext(null);

// Si la connexion Firebase n'aboutit pas dans ce délai (config invalide,
// pas de réseau au tout premier lancement...), on arrête d'attendre
// indéfiniment : sans ça, l'app restait bloquée sur l'écran de démarrage
// sans jamais rien afficher — bug réel corrigé en septembre 2026.
const AUTH_TIMEOUT_MS = 8000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setError("timeout");
      }
    }, AUTH_TIMEOUT_MS);

    const unsub = watchAuthState((u) => {
      if (u) {
        settled = true;
        clearTimeout(timeout);
        setUser(u);
        setReady(true);
        setError(null);
      } else {
        ensureSignedIn().catch((err) => {
          console.error("Échec de la connexion Firebase :", err);
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            setError(err?.code || "unknown");
          }
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
