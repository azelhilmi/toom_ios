/**
 * Télécharge l'image sous forme de fichier classique. Fonctionne bien
 * sur desktop et Android. Sur iOS Safari, un lien de téléchargement sur
 * une data URL ouvre généralement l'image dans un nouvel onglet plutôt
 * que de l'enregistrer directement — préférer shareImage() sur iOS pour
 * un vrai "Enregistrer dans Photos" via la feuille de partage native.
 */
export function downloadImage(dataUrl, filename = "toom.jpg") {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Ouvre la feuille de partage native (Web Share API avec fichier), qui
 * propose "Enregistrer l'image" / "Enregistrer dans Photos" selon l'OS.
 * C'est le moyen le plus fiable d'enregistrer réellement dans la
 * pellicule du téléphone, en particulier sur iOS Safari.
 *
 * @returns {Promise<"shared"|"cancelled"|"unsupported">}
 */
export async function shareImage(dataUrl, filename = "toom.jpg") {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], filename, { type: blob.type });

  if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
    return "unsupported";
  }
  try {
    await navigator.share({ files: [file], title: "Toom" });
    return "shared";
  } catch (err) {
    return err.name === "AbortError" ? "cancelled" : "unsupported";
  }
}

/**
 * Ouvre la feuille de partage native pour un texte/lien (pas un
 * fichier) — utilisé pour inviter à un événement. Sur les navigateurs
 * qui ne supportent pas l'API, l'appelant doit prévoir un repli
 * (copie dans le presse-papiers par exemple).
 *
 * @returns {Promise<"shared"|"cancelled"|"unsupported">}
 */
export async function shareInvite({ title, text, url }) {
  if (!navigator.share) return "unsupported";
  try {
    await navigator.share({ title, text, url });
    return "shared";
  } catch (err) {
    return err.name === "AbortError" ? "cancelled" : "unsupported";
  }
}
