/**
 * Retour haptique via l'API Vibration. Fonctionne sur Android (Chrome,
 * Firefox…) mais PAS sur iOS Safari — Apple n'a jamais implémenté cette
 * API et ne prévoit pas de le faire (choix délibéré, pas un oubli). Sur
 * les appareils non supportés, ces fonctions ne font simplement rien,
 * sans erreur ni message.
 */
function vibrate(pattern) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // silencieux
    }
  }
}

// Petit "tic" sec — utilisé à chaque cran franchi pendant le glissé de
// la molette, comme le déclic mécanique d'une vraie molette crantée.
export function hapticTick() {
  vibrate(8);
}

// Vibration un peu plus marquée — pellicule armée, flash basculé.
export function hapticConfirm() {
  vibrate(20);
}

// Vibration double — déclenchement d'une photo.
export function hapticCapture() {
  vibrate([15, 40, 15]);
}
