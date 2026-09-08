/**
 * Tente de passer en plein écran natif du navigateur. Les navigateurs
 * exigent un geste utilisateur pour l'autoriser, donc cette fonction doit
 * être appelée depuis un handler de clic/tap — jamais au chargement de
 * la page.
 *
 * IMPORTANT : Safari sur iOS ne supporte PAS l'API Fullscreen pour les
 * éléments génériques (seulement pour <video>). C'est une limitation de
 * WebKit, pas un bug de l'app — sur iPhone/iPad, le seul moyen d'obtenir
 * un vrai plein écran (sans barre Safari) est d'ajouter l'app à l'écran
 * d'accueil ("Partager" → "Sur l'écran d'accueil"), ce que permet le
 * manifest.json + les balises meta déjà configurées dans index.html.
 */
export async function requestAppFullscreen() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      // Safari desktop / anciens WebKit
      await el.webkitRequestFullscreen();
    }
  } catch {
    // Silencieux : iOS Safari (et certains contextes) ne le permettent
    // simplement pas — ce n'est pas une erreur à remonter à l'utilisateur.
  }
}

export function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}
