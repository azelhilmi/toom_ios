import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { listenActiveThemeId, listenMyThemes, getThemeBackground } from "../firebase/firestore";
import { isPresetId, presetKeyFromId } from "../utils/hotspots";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [activeThemeId, setActiveThemeIdState] = useState(null);
  const [myThemes, setMyThemes] = useState([]);
  const [customSkin, setCustomSkin] = useState(null);
  const [maskColor, setMaskColor] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    return listenActiveThemeId(user.uid, setActiveThemeIdState);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return listenMyThemes(user.uid, setMyThemes);
  }, [user?.uid]);

  // Quand le thème actif (ou la liste, le temps qu'elle arrive) change,
  // recharge le fond correspondant — jamais en temps réel, à la demande.
  // Un thème préréglé ("preset:xxx") ou l'absence de thème ne nécessite
  // aucun chargement Firestore : customSkin reste null, CameraBody se
  // charge de résoudre l'image préréglée à partir de presetId.
  useEffect(() => {
    if (!activeThemeId || isPresetId(activeThemeId)) {
      setCustomSkin(null);
      setMaskColor(null);
      return;
    }
    const theme = myThemes.find((t) => t.id === activeThemeId);
    if (!theme || !user?.uid) return;
    let cancelled = false;
    getThemeBackground(user.uid, activeThemeId, theme.chunkCount).then((bg) => {
      if (!cancelled) {
        setCustomSkin(bg);
        setMaskColor(theme.maskColor || null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeThemeId, myThemes, user?.uid]);

  const presetId = isPresetId(activeThemeId) ? presetKeyFromId(activeThemeId) : "default";

  return (
    <ThemeContext.Provider
      value={{ customSkin, maskColor, presetId, activeThemeId, myThemes, setActiveThemeIdState }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans un ThemeProvider");
  return ctx;
}
