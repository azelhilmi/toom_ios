import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Retour haptique via @capacitor/haptics. Contrairement à l'ancienne
 * implémentation basée sur l'API Vibration web (navigator.vibrate), qui ne
 * fonctionne jamais sur iOS (Apple ne l'a jamais implémentée, choix
 * délibéré), ce plugin pilote le vrai Taptic Engine sur iOS et les effets
 * de vibration natifs sur Android. Dans le PWA web (hors app native), le
 * plugin retombe automatiquement sur navigator.vibrate — le comportement
 * existant est donc conservé à l'identique sur le web, et ajouté pour de
 * bon sur iOS natif.
 *
 * Toutes les fonctions sont "fire and forget" : jamais d'erreur ni de
 * message si l'appareil ne supporte rien (ancien comportement conservé).
 */
function safeHaptic(trigger) {
  try {
    Promise.resolve(trigger()).catch(() => {});
  } catch {
    // silencieux
  }
}

// Petit "tic" sec — utilisé à chaque cran franchi pendant le glissé de
// la molette, comme le déclic mécanique d'une vraie molette crantée.
export function hapticTick() {
  safeHaptic(() => Haptics.impact({ style: ImpactStyle.Light }));
}

// Vibration un peu plus marquée — pellicule armée, flash basculé.
export function hapticConfirm() {
  safeHaptic(() => Haptics.impact({ style: ImpactStyle.Medium }));
}

// Retour "action réussie" — déclenchement d'une photo.
export function hapticCapture() {
  safeHaptic(() => Haptics.notification({ type: NotificationType.Success }));
}
