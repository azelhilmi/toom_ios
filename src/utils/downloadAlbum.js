import JSZip from "jszip";
import { getPhotoBase64 } from "../firebase/firestore";
import { extensionFromDataUrl } from "./imageCompression";

/**
 * Télécharge un ensemble de photos (déjà révélées) sous forme d'une
 * archive zip. Récupère chaque image à la demande (pas de cache global
 * pour éviter de garder plusieurs Mo par photo en mémoire inutilement).
 *
 * @param {Array<{id: string}>} photos - photos révélées à inclure
 * @param {string} zipFilename - nom du fichier zip final
 * @param {(done: number, total: number) => void} onProgress
 */
export async function downloadPhotosAsZip(photos, zipFilename, onProgress) {
  const zip = new JSZip();

  for (let i = 0; i < photos.length; i++) {
    const dataUrl = await getPhotoBase64(photos[i].id);
    if (dataUrl) {
      const ext = extensionFromDataUrl(dataUrl);
      const base64Data = dataUrl.split(",")[1];
      zip.file(`toom-${String(i + 1).padStart(2, "0")}.${ext}`, base64Data, { base64: true });
    }
    onProgress?.(i + 1, photos.length);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
