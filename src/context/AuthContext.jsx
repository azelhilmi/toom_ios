import { createContext, useContext, useEffect, useState } from "react";
import { ensureSignedIn, watchAuthState } from "../firebase/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = watchAuthState((u) => {
      if (u) {
        setUser(u);
        setReady(true);
      } else {
        ensureSignedIn();
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
