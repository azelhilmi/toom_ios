/**
 * Résolution cible : 10×15 cm à 300 dpi (qualité labo photo, "sans
 * perte" visible à l'impression) = 1181 × 1772 px sur le grand côté.
 * On ne recadre jamais à un ratio fixe : on limite juste le plus grand
 * côté de la capture native à cette valeur (jamais d'agrandissement si
 * la caméra sort une image plus petite).
 */
const PRINT_LONG_EDGE = 1772;
const IMAGE_QUALITY = 0.82;

/**
 * Capture le flux vidéo dans un canvas, applique le rendu "pellicule
 * bon marché" (teinte chaude, vignette, grain) et renvoie un Blob à
 * pleine résolution d'impression, encodé en WebP (25-35% plus léger
 * qu'un JPEG à qualité équivalente — précieux vu qu'on stocke tout en
 * base64 dans Firestore). Repli automatique en JPEG si le navigateur ne
 * sait pas encoder de WebP (très rare aujourd'hui, mais gratuit à couvrir).
 *
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<Blob>}
 */
export async function captureFramePrintQuality(videoEl, { eventName = null } = {}) {
  const nativeLong = Math.max(videoEl.videoWidth, videoEl.videoHeight);
  const scale = Math.min(1, PRINT_LONG_EDGE / nativeLong);
  const width = Math.round(videoEl.videoWidth * scale);
  const height = Math.round(videoEl.videoHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Rendu "pellicule bon marché des années 90-2000", version vieillie :
  // moins de punch, plus de sépia, comme un tirage qui a pris la
  // lumière. Baked dans l'image (pas un filtre CSS d'aperçu) : la photo
  // garde ce rendu même une fois téléchargée/imprimée.
  ctx.filter = "sepia(0.42) saturate(1.15) contrast(1.04) brightness(1.02) hue-rotate(-10deg) blur(0.4px)";
  ctx.drawImage(videoEl, 0, 0, width, height);

  applyAgedWash(ctx, width, height);
  applyVignette(ctx, width, height);
  applyGrain(ctx, width, height, 12);
  applyDustAndScratches(ctx, width, height);

  drawDateStamp(ctx, width, height, { eventName });

  const bordered = addAgedBorder(canvas);

  const webpBlob = await canvasToBlob(bordered, "image/webp", IMAGE_QUALITY);
  if (webpBlob && webpBlob.type === "image/webp") return webpBlob;

  // Repli : navigateur sans encodage WebP (canvas.toBlob renvoie alors
  // soit null, soit silencieusement un PNG non compressé selon les cas).
  return canvasToBlob(bordered, "image/jpeg", IMAGE_QUALITY);
}

/**
 * Ajoute un contour façon tirage physique — blanc cassé, légèrement
 * vieilli (grain très fin + coins qui jaunissent un peu), autour de la
 * photo. Appliqué en tout dernier : le date-stamp gravé plus haut est
 * déjà à l'intérieur de la zone image, jamais recouvert par le cadre.
 */
function addAgedBorder(sourceCanvas) {
  const border = Math.round(sourceCanvas.width * 0.045);
  const out = document.createElement("canvas");
  out.width = sourceCanvas.width + border * 2;
  out.height = sourceCanvas.height + border * 2;
  const ctx = out.getContext("2d");

  // Blanc cassé plutôt que blanc pur — un vrai tirage n'est jamais
  // neutre, et un dégradé très subtil évite l'aplat trop "numérique".
  const gradient = ctx.createLinearGradient(0, 0, out.width, out.height);
  gradient.addColorStop(0, "#f7f2e7");
  gradient.addColorStop(0.5, "#faf7f0");
  gradient.addColorStop(1, "#f4efe2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, out.width, out.height);

  // Grain très fin sur le cadre seulement (pas sur la photo).
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);

  // Légers coins jaunis, comme un vieux tirage rangé dans un album.
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  const corner = ctx.createRadialGradient(0, 0, 0, 0, 0, out.width * 0.35);
  corner.addColorStop(0, "rgba(214, 186, 132, 0.35)");
  corner.addColorStop(1, "rgba(214, 186, 132, 0)");
  for (const [cx, cy] of [[0, 0], [out.width, 0], [0, out.height], [out.width, out.height]]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = corner;
    ctx.fillRect(-out.width * 0.35, -out.height * 0.35, out.width * 0.7, out.height * 0.7);
    ctx.restore();
  }
  ctx.restore();

  ctx.drawImage(sourceCanvas, border, border);
  return out;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/**
 * Convertit un Blob en data URL base64 (ex. "data:image/jpeg;base64,...").
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Capture le flux vidéo et renvoie directement la data URL base64 en
 * pleine résolution d'impression. À cette résolution, le résultat
 * dépasse presque toujours la limite de 1 Mo par document Firestore :
 * voir splitBase64 dans firebase/firestore.js pour le découpage en
 * plusieurs documents qui permet de rester sur le plan gratuit.
 *
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<string>}
 */
export async function captureFrameAsBase64(videoEl, options) {
  const blob = await captureFramePrintQuality(videoEl, options);
  return blobToBase64(blob);
}

/**
 * Déduit l'extension de fichier appropriée ("webp" ou "jpg") à partir
 * d'une data URL, pour nommer correctement les fichiers téléchargés/
 * partagés quel que soit le format réellement utilisé (WebP normalement,
 * JPEG en repli sur les rares navigateurs qui ne savent pas encoder WebP).
 */
export function extensionFromDataUrl(dataUrl) {
  const match = /^data:image\/(\w+);/.exec(dataUrl);
  const type = match?.[1];
  if (type === "webp") return "webp";
  if (type === "jpeg" || type === "jpg") return "jpg";
  return "jpg";
}

function applyVignette(ctx, width, height) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(20,15,5,0.35)");
  ctx.save();
  ctx.filter = "none";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function applyGrain(ctx, width, height, intensity) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Lavis chaud et légèrement inégal par-dessus toute l'image, comme un
 * tirage qui a pris la lumière avec le temps — plus marqué sur les
 * bords, jamais tout à fait uniforme.
 */
function applyAgedWash(ctx, width, height) {
  ctx.save();
  ctx.filter = "none";
  ctx.globalCompositeOperation = "multiply";
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(214, 178, 122, 0.9)");
  gradient.addColorStop(0.5, "rgba(224, 196, 150, 1)");
  gradient.addColorStop(1, "rgba(206, 166, 110, 0.9)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Quelques poussières et rayures fines semi-transparentes, comme sur
 * une vieille pellicule scannée — en nombre et opacité limités pour
 * rester discret, pas façon filtre Instagram appuyé.
 */
function applyDustAndScratches(ctx, width, height) {
  ctx.save();
  ctx.filter = "none";

  // Poussières : petits points clairs épars.
  const dustCount = Math.round((width * height) / 90000);
  ctx.fillStyle = "rgba(255, 250, 240, 0.5)";
  for (let i = 0; i < dustCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 1.2 + 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rayures : quelques traits verticaux fins et courts, opacité faible.
  const scratchCount = Math.round(width / 500) + 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < scratchCount; i++) {
    const x = Math.random() * width;
    const yStart = Math.random() * height * 0.6;
    const len = height * (0.2 + Math.random() * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, yStart);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, yStart + len);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Grave la ligne "date-stamp" orangée en bas de la photo, comme les
 * appareils compacts/jetables des années 90 qui impressionnaient la
 * date directement sur le négatif : date et nom de l'événement (le cas
 * échéant), sur une seule ligne discrète, police monospace façon
 * afficheur digital rétro.
 */
function drawDateStamp(ctx, width, height, { eventName }) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const parts = [`${pad(d.getDate())} ${pad(d.getMonth() + 1)} ${String(d.getFullYear()).slice(2)}`];
  if (eventName) parts.push(eventName.toUpperCase());
  const text = parts.join("   ");

  const fontSize = Math.max(14, Math.round(width * 0.022));
  ctx.save();
  ctx.filter = "none";
  ctx.font = `700 ${fontSize}px "Courier New", monospace`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  const x = width - fontSize * 0.9;
  const y = height - fontSize * 1.1;

  // Léger halo sombre pour rester lisible quel que soit le fond de la photo.
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = fontSize * 0.25;
  ctx.fillStyle = "#ff7a1a";
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Redimensionne une image (Blob/File) et la convertit en WebP optimisé.
 * Idéal pour les backgrounds personnalisés : réduit la taille
 * au minimum pour les écrans mobile tout en gardant un bon rendu.
 *
 * @param {Blob|File} imageBlob - Image source
 * @param {number} maxWidth - Largeur maximale (défaut: 420 pour le boîtier)
 * @param {number} quality - Qualité WebP (0.0-1.0, défaut: 0.75)
 * @returns {Promise<Blob>}
 */
export async function resizeToWebP(imageBlob, maxWidth = 420, quality = 0.75) {
  // Les photos iPhone sont souvent en HEIC/HEIF par défaut — un format
  // que <img>/canvas ne savent PAS décoder nativement dans la plupart
  // des navigateurs. Sans conversion préalable, l'image échoue
  // silencieusement au chargement (onerror), d'où "Échec du traitement
  // de l'image" même sur un fichier parfaitement valide.
  const isHeic = /image\/hei[cf]/i.test(imageBlob.type) || /\.hei[cf]$/i.test(imageBlob.name || "");
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: imageBlob, toType: "image/jpeg", quality: 0.9 });
    imageBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxWidth / img.width);
      const newWidth = Math.round(img.width * ratio);
      const newHeight = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            canvas.toBlob((fallbackBlob) => {
              resolve(fallbackBlob || imageBlob);
            }, 'image/jpeg', quality);
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Format d'image non supporté (${imageBlob.type || "inconnu"})`));
    };

    img.src = url;
  });
}

/**
 * Convertit une image en base64 WebP optimisée pour le stockage.
 * @param {Blob|File} imageBlob - Image source
 * @param {number} maxWidth - Largeur maximale
 * @param {number} quality - Qualité de compression
 * @returns {Promise<string>} - Data URL base64
 */
export async function imageToOptimizedBase64(imageBlob, maxWidth = 420, quality = 0.75) {
  const optimizedBlob = await resizeToWebP(imageBlob, maxWidth, quality);
  return blobToBase64(optimizedBlob);
}
