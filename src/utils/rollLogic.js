/**
 * Détermine si la pellicule existante doit être réutilisée pour une
 * nouvelle photo, ou si une pellicule neuve doit être créée à la place.
 *
 * Règle : tant qu'une pellicule n'a pas atteint sa date de révélation,
 * on continue de l'utiliser — pleine ou non. Une fois développée
 * (revealAt <= maintenant), on repart TOUJOURS sur une neuve, même si
 * elle n'était pas pleine. Sans cette dernière condition, une photo
 * prise longtemps après coup sur une pellicule jamais remplie hérite
 * de sa date de révélation déjà dépassée et s'affiche immédiatement,
 * sans les 24h d'attente — c'est le bug réel corrigé en septembre 2026.
 *
 * @param {{ revealAt?: { toMillis: () => number } | null }} rollData
 * @param {number} nowMs
 * @returns {boolean} true si la pellicule existante peut être réutilisée
 */
export function canReuseRoll(rollData, nowMs) {
  if (!rollData) return false;
  const isDeveloped = rollData.revealAt ? rollData.revealAt.toMillis() <= nowMs : false;
  return !isDeveloped;
}

/**
 * Calcule la date de révélation (en millisecondes epoch) : le lendemain
 * du jour de la première photo, à 10h00 heure locale de l'appareil qui a
 * pris la photo. Logique pure et partagée par les deux backends de
 * stockage (pellicules Firestore — événements — et pellicules locales
 * IndexedDB — usage perso hors événement, voir localPhotoStorage.js) :
 * une seule règle de calcul, jamais dupliquée.
 *
 * @param {Date|number} firstPhotoDate
 * @returns {number} timestamp epoch en millisecondes
 */
export function computeRevealAtMs(firstPhotoDate) {
  const d = new Date(firstPhotoDate);
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d.getTime();
}
