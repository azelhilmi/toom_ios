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
