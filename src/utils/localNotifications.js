import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * Notification "ta pellicule est développée" fiable même app fermée.
 *
 * Sur le web (PWA), on garde le mécanisme existant de DevelopClock.jsx
 * (Notification API tant qu'un onglet reste ouvert) — ce module ne fait
 * rien hors app native, aucun changement de comportement côté web.
 *
 * Sur Android/iOS natifs (Capacitor), on programme une vraie notification
 * système au niveau de l'OS, dès que la date de révélation d'une pellicule
 * est connue (première photo prise dessus) — elle se déclenchera à l'heure
 * dite même si l'app est totalement fermée, sans backend ni Cloud
 * Function, puisque c'est l'OS qui la déclenche localement.
 */

// Identifiant fixe : une seule notification de révélation "en attente" à
// la fois par appareil a du sens (reprogrammer avec le même id annule/
// remplace la précédente plutôt que d'en empiler plusieurs).
const REVEAL_NOTIFICATION_ID = 1001;

async function ensurePermission() {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

/**
 * Programme (ou reprogramme) la notification de révélation pour l'heure
 * donnée. Sans effet si l'app tourne dans un navigateur classique (pas
 * de plateforme native) ou si la permission n'est pas accordée.
 *
 * @param {number} revealAtMs
 */
export async function scheduleRevealNotification(revealAtMs) {
  if (!Capacitor.isNativePlatform()) return;
  if (!revealAtMs || revealAtMs <= Date.now()) return;

  try {
    const granted = await ensurePermission();
    if (!granted) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: REVEAL_NOTIFICATION_ID,
          title: "Ta pellicule est développée 📸",
          body: "Reviens sur Toom pour découvrir tes photos.",
          schedule: { at: new Date(revealAtMs), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    // Silencieux : l'app reste utilisable sans notification native.
  }
}

/**
 * Annule la notification de révélation programmée, si l'utilisateur
 * recharge une pellicule avant l'heure prévue (cas rare mais possible
 * via la réinitialisation d'un invité, par ex.).
 */
export async function cancelRevealNotification() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REVEAL_NOTIFICATION_ID }] });
  } catch {
    // silencieux
  }
}
