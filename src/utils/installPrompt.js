import { useEffect, useState, useCallback } from "react";
import { isStandalone } from "./fullscreen";

/**
 * Détecte iOS (iPhone/iPad, y compris iPadOS qui se fait passer pour un
 * Mac avec écran tactile) pour adapter les instructions d'installation :
 * Safari sur iOS n'expose aucune API d'installation, contrairement à
 * Chrome/Android qui déclenche un vrai événement "beforeinstallprompt".
 */
function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isAppleTouch = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleTouch || isIPadOS;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome; // "accepted" | "dismissed"
  }, [deferredPrompt]);

  return {
    isStandalone: isStandalone() || installed,
    isIOS: detectIOS(),
    canInstallNative: !!deferredPrompt,
    promptInstall,
  };
}
