import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./AppSplash.css";

// Durée minimale d'affichage, même si l'app est prête plus vite — pour
// que la marque ait le temps de s'installer, pas juste un flash.
const MIN_DURATION_MS = 2600;
const FADE_DURATION_MS = 450;

export default function AppSplash() {
  const { ready } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), MIN_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const canHide = ready && minTimeDone;

  useEffect(() => {
    if (!canHide) return;
    const t = setTimeout(() => setRemoved(true), FADE_DURATION_MS);
    return () => clearTimeout(t);
  }, [canHide]);

  if (removed) return null;

  return (
    <div className={`app-splash ${canHide ? "app-splash--hide" : ""}`}>
      <img src="/brand/icon-512.png" alt="Toom" className="app-splash__logo" />
      <p className="app-splash__tagline">We'll see tomorrow</p>
    </div>
  );
}
