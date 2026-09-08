import {
  doc, getDoc, getDocs, setDoc, updateDoc, increment, serverTimestamp,
  collection, addDoc, query, where, orderBy, limit, onSnapshot, Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./init";
import { captureFrameAsBase64 } from "../utils/imageCompression";
import { canReuseRoll } from "../utils/rollLogic";

const DAILY_SHOTS = 24;
/**
 * Date de révélation : le lendemain du jour de la première photo, à
 * 10h00 heure locale (celle de l'appareil qui prend la photo) — plus
 * prévisible qu'un délai glissant de 24h qui tombait à une heure
 * différente selon le moment de la prise de vue.
 */
function computeRevealAt(firstPhotoDate) {
  const d = new Date(firstPhotoDate);
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return Timestamp.fromDate(d);
}

/**
 * Récupère la pellicule "active" de l'utilisateur, ou en crée une
 * nouvelle. Une pellicule reste active tant qu'elle n'est pas à la fois
 * (a) épuisée (24 poses utilisées) ET (b) développée (24h écoulées
 * depuis la 1ère photo de cette pellicule). Dans ce cas seulement, une
 * nouvelle pellicule de 24 poses est créée. C'est ce qui implémente
 * "24h après la 1ère photo, tout se révèle d'un coup" + "il faut
 * attendre le développement pour recharger une pellicule" — sans Cloud
 * Function, juste en choisissant quel document réutiliser ou créer.
 */
export async function getOrCreateActiveRoll(uid, theme = "kodak-funsaver") {
  const q = query(
    collection(db, "cameras"),
    where("ownerId", "==", uid),
    where("type", "==", "daily"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    const existing = snap.docs[0];
    const data = existing.data();
    // Tant que la pellicule n'a pas atteint sa date de révélation, on
    // continue de l'utiliser (pleine ou non). Une fois développée, on
    // repart sur une neuve dans tous les cas — voir canReuseRoll pour
    // le pourquoi (et ses tests dans rollLogic.test.js).
    if (canReuseRoll(data, Date.now())) {
      return existing.id;
    }
  }

  const cameraId = `${uid}_roll_${Date.now()}`;
  await setDoc(doc(db, "cameras", cameraId), {
    ownerId: uid,
    type: "daily",
    shotsAllowed: DAILY_SHOTS,
    shotsUsed: 0,
    theme,
    firstPhotoAt: null,
    revealAt: null,
    createdAt: serverTimestamp(),
  });
  return cameraId;
}

export function listenToRoll(cameraId, callback) {
  return onSnapshot(doc(db, "cameras", cameraId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// Taille max d'un morceau de base64 par document (marge sous la limite
// Firestore de 1 Mo). À la résolution d'impression 10×15 (1181×1772),
// une photo dépasse presque toujours cette taille : on la découpe donc
// en plusieurs documents "photoDataChunks" plutôt que de dégrader la
// qualité, ce qui permet de rester sur le plan gratuit Spark.
const CHUNK_SIZE = 650_000;

/**
 * Prend une photo : capture le flux vidéo en pleine résolution
 * d'impression, encode en base64, découpe en morceaux, puis écrit :
 *  - photos/{photoId}                 → métadonnées légères (qui, quand, révélation)
 *  - photoData/{photoId}              → manifeste (nombre de morceaux)
 *  - photoDataChunks/{photoId}_{i}     → les morceaux de l'image (lourd)
 * Séparer métadonnées et image évite de télécharger les octets quand on
 * liste juste la galerie ; l'image n'est récupérée que lorsque la photo
 * doit réellement s'afficher (voir getPhotoBase64).
 *
 * La date de révélation (+24h) est fixée UNE SEULE FOIS, sur la
 * pellicule elle-même, au moment de la toute première photo prise sur
 * ce rouleau. Toutes les photos suivantes de la même pellicule héritent
 * de cette même date : le développement se fait pour tout le rouleau
 * d'un coup, comme demandé, pas photo par photo.
 */
export async function takePhoto({ cameraId, ownerId, videoEl, flashUsed, guestName = null, eventId = null, eventName = null, revealAtOverride = null }) {
  const base64 = await captureFrameAsBase64(videoEl, { eventName });

  const cameraRef = doc(db, "cameras", cameraId);
  let revealAt = revealAtOverride;
  const cameraUpdates = { shotsUsed: increment(1) };

  if (!revealAtOverride) {
    const cameraSnap = await getDoc(cameraRef);
    const cameraData = cameraSnap.data() || {};
    revealAt = cameraData.revealAt || null;
    if (!cameraData.firstPhotoAt) {
      const firstPhotoAt = Timestamp.now();
      revealAt = computeRevealAt(firstPhotoAt.toDate());
      cameraUpdates.firstPhotoAt = firstPhotoAt;
      cameraUpdates.revealAt = revealAt;
    }
  }

  const photoId = `${cameraId}_${Date.now()}`;

  await setDoc(doc(db, "photos", photoId), {
    cameraId,
    ownerId,
    takenAt: Timestamp.now(),
    revealAt,
    flashUsed: !!flashUsed,
    guestName,
    eventId,
  });

  const chunkCount = Math.ceil(base64.length / CHUNK_SIZE);
  await setDoc(doc(db, "photoData", photoId), { ownerId, eventId, chunkCount });
  await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      setDoc(doc(db, "photoDataChunks", `${photoId}_${i}`), {
        ownerId,
        eventId,
        data: base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      })
    )
  );

  await updateDoc(cameraRef, cameraUpdates);

  return photoId;
}

export function listenToPhotos(ownerId, callback) {
  const q = query(
    collection(db, "photos"),
    where("ownerId", "==", ownerId),
    orderBy("takenAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Récupère l'image (base64) d'une photo précise en réassemblant ses
 * morceaux. Appelé uniquement au moment où une photo doit réellement
 * s'afficher (révélée, easter egg, ou visionneuse plein écran), jamais
 * lors du simple listing de la galerie.
 */
export async function getPhotoBase64(photoId) {
  const manifestSnap = await getDoc(doc(db, "photoData", photoId));
  if (!manifestSnap.exists()) return null;
  const { chunkCount } = manifestSnap.data();

  const chunkSnaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => getDoc(doc(db, "photoDataChunks", `${photoId}_${i}`)))
  );
  return chunkSnaps.map((snap) => snap.data()?.data || "").join("");
}

/**
 * Supprime entièrement une photo : sa métadonnée, son manifeste et tous
 * ses morceaux d'image. Utilisé par la réinitialisation de pellicule
 * d'un invité (voir resetGuestRoll).
 */
export async function deletePhoto(photoId) {
  const manifestSnap = await getDoc(doc(db, "photoData", photoId));
  const chunkCount = manifestSnap.exists() ? manifestSnap.data().chunkCount : 0;

  const batch = writeBatch(db);
  batch.delete(doc(db, "photos", photoId));
  batch.delete(doc(db, "photoData", photoId));
  for (let i = 0; i < chunkCount; i++) {
    batch.delete(doc(db, "photoDataChunks", `${photoId}_${i}`));
  }
  await batch.commit();
}

// ---------- Événements ----------

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function inviteCodeExists(code) {
  const snap = await getDocs(query(collection(db, "events"), where("inviteCode", "==", code)));
  return !snap.empty;
}

/**
 * Code d'invitation lisible (ex: "EVG-THOMAS") plutôt qu'une suite de
 * caractères aléatoires — dérivé du type d'événement et du nom, avec
 * un suffixe numérique en cas de collision (rare mais possible).
 */
async function makeInviteCode(eventType, name) {
  const base = `${eventType ? slugify(eventType) + "-" : ""}${slugify(name)}`.slice(0, 40) || "EVENT";
  let code = base;
  let suffix = 2;
  while (await inviteCodeExists(code)) {
    code = `${base}-${suffix}`;
    suffix++;
  }
  return code;
}

export async function createEvent(organizerId, { name, eventType = null, shotsPerGuest, revealDate }) {
  const inviteCode = await makeInviteCode(eventType, name);
  const docRef = await addDoc(collection(db, "events"), {
    organizerId,
    name,
    eventType,
    shotsPerGuest,
    revealAt: Timestamp.fromDate(new Date(revealDate)),
    inviteCode,
    createdAt: serverTimestamp(),
  });
  return { eventId: docRef.id, inviteCode };
}

/**
 * Met à jour les réglages d'un événement (nom, thème, couleurs
 * personnalisées, nombre de poses par défaut pour les nouveaux invités,
 * date de révélation). N'affecte pas rétroactivement les invités déjà
 * inscrits — voir syncGuestShotsAllowed pour ça.
 */
export async function updateEvent(eventId, updates) {
  const payload = { ...updates };
  if (payload.revealDate) {
    payload.revealAt = Timestamp.fromDate(new Date(payload.revealDate));
    delete payload.revealDate;
  }
  await updateDoc(doc(db, "events", eventId), payload);
}

/**
 * Applique un nouveau quota de poses à tous les invités déjà inscrits
 * (pas seulement aux futurs arrivants). Utile si l'organisateur change
 * d'avis après coup.
 */
export async function syncGuestShotsAllowed(eventId, shotsAllowed) {
  const q = query(collection(db, "cameras"), where("eventId", "==", eventId), where("type", "==", "event"));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { shotsAllowed }));
  await batch.commit();
}

/**
 * Réinitialise la pellicule d'un invité : supprime toutes ses photos de
 * cet événement et remet son compteur de poses à zéro, pour qu'il
 * puisse recommencer une pellicule complète.
 */
export async function resetGuestRoll(eventId, guestUid) {
  const q = query(
    collection(db, "photos"),
    where("eventId", "==", eventId),
    where("ownerId", "==", guestUid)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deletePhoto(d.id)));

  const cameraId = `${eventId}_${guestUid}`;
  await updateDoc(doc(db, "cameras", cameraId), { shotsUsed: 0 });
}

export async function getEvent(eventId) {
  const snap = await getDoc(doc(db, "events", eventId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- Thème imposé par un événement ----------
//
// L'organisateur peut imposer un thème (fond + couleur du mécanisme)
// à TOUS ses invités, qui prime alors sur leur thème personnel pour
// la durée de l'événement. Même stratégie de découpage que pour les
// thèmes personnels — voir plus bas.

const EVENT_THEME_CHUNK_SIZE = 650_000;

function eventThemeChunkRef(eventId, i) {
  return doc(db, "events", eventId, "themeChunks", String(i));
}

export async function saveEventTheme(eventId, { maskColor, backgroundBase64 }) {
  const chunkCount = Math.ceil(backgroundBase64.length / EVENT_THEME_CHUNK_SIZE);
  const batch = writeBatch(db);
  // themePresetId effacé : un fond personnalisé (upload ou copie d'un
  // thème perso) et un préréglé sont mutuellement exclusifs.
  batch.set(
    doc(db, "events", eventId),
    { themeMaskColor: maskColor, themeChunkCount: chunkCount, themePresetId: null },
    { merge: true }
  );
  for (let i = 0; i < chunkCount; i++) {
    batch.set(eventThemeChunkRef(eventId, i), {
      data: backgroundBase64.slice(i * EVENT_THEME_CHUNK_SIZE, (i + 1) * EVENT_THEME_CHUNK_SIZE),
    });
  }
  await batch.commit();
}

/**
 * Impose un thème PRÉRÉGLÉ (fourni avec l'app) à tous les invités —
 * aucune image à uploader ni à dupliquer, juste une référence. Efface
 * un éventuel fond personnalisé précédemment défini (exclusif).
 */
export async function saveEventThemePreset(eventId, presetId) {
  const event = await getEvent(eventId);
  const chunkCount = event?.themeChunkCount || 0;
  const batch = writeBatch(db);
  batch.set(
    doc(db, "events", eventId),
    { themePresetId: presetId, themeMaskColor: null, themeChunkCount: 0 },
    { merge: true }
  );
  for (let i = 0; i < chunkCount; i++) {
    batch.delete(eventThemeChunkRef(eventId, i));
  }
  await batch.commit();
}

export async function clearEventTheme(eventId) {
  const event = await getEvent(eventId);
  const chunkCount = event?.themeChunkCount || 0;
  const batch = writeBatch(db);
  batch.set(doc(db, "events", eventId), { themeMaskColor: null, themeChunkCount: 0, themePresetId: null }, { merge: true });
  for (let i = 0; i < chunkCount; i++) {
    batch.delete(eventThemeChunkRef(eventId, i));
  }
  await batch.commit();
}

/**
 * Charge le thème imposé d'un événement (fond personnalisé + couleur,
 * OU référence à un préréglé), ou null si l'organisateur n'en a pas
 * défini.
 */
export async function getEventTheme(eventId) {
  const event = await getEvent(eventId);
  if (event?.themePresetId) return { presetId: event.themePresetId };
  if (!event?.themeChunkCount) return null;
  const chunkSnaps = await Promise.all(
    Array.from({ length: event.themeChunkCount }, (_, i) => getDoc(eventThemeChunkRef(eventId, i)))
  );
  const background = chunkSnaps.map((snap) => snap.data()?.data || "").join("");
  return { background, maskColor: event.themeMaskColor || null };
}

/**
 * Écoute les événements créés par cet utilisateur (organisateur), pour
 * lui permettre d'accéder directement à leur tableau de bord depuis le
 * menu sans avoir à retrouver le lien.
 */
export function listenMyEvents(uid, callback) {
  const q = query(collection(db, "events"), where("organizerId", "==", uid));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function getEventByInviteCode(inviteCode) {
  const q = query(collection(db, "events"), where("inviteCode", "==", inviteCode));
  return new Promise((resolve) => {
    const unsub = onSnapshot(q, (snap) => {
      unsub();
      resolve(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    });
  });
}

/**
 * Un invité rejoint un événement : on crée sa pellicule dédiée
 * (cameras/{eventId_uid}) avec le quota de poses défini par l'organisateur.
 */
export async function joinEvent(eventId, uid, guestName, shotsAllowed) {
  await setDoc(doc(db, "events", eventId, "guests", uid), {
    name: guestName,
    joinedAt: serverTimestamp(),
  });
  const cameraId = `${eventId}_${uid}`;
  await setDoc(doc(db, "cameras", cameraId), {
    ownerId: uid,
    type: "event",
    eventId,
    guestName,
    shotsAllowed,
    shotsUsed: 0,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return cameraId;
}

export function listenEventGuests(eventId, callback) {
  const q = collection(db, "events", eventId, "guests");
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function listenEventPhotos(eventId, callback) {
  const q = query(collection(db, "photos"), where("eventId", "==", eventId), orderBy("takenAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

/**
 * Supprime entièrement un événement : l'événement lui-même, ses
 * invités, son thème imposé (s'il existe), toutes les photos qui lui
 * sont rattachées (avec leurs morceaux d'image) et les pellicules des
 * invités. Irréversible.
 */
export async function deleteEvent(eventId) {
  // Photos de l'événement (avec leurs morceaux d'image — potentiellement
  // nombreuses, on les supprime une par une plutôt qu'en un seul batch
  // pour ne pas risquer de dépasser la limite de 500 opérations).
  const photosSnap = await getDocs(query(collection(db, "photos"), where("eventId", "==", eventId)));
  await Promise.all(photosSnap.docs.map((d) => deletePhoto(d.id)));

  // Invités et pellicules associées.
  const guestsSnap = await getDocs(collection(db, "events", eventId, "guests"));
  await Promise.all(
    guestsSnap.docs.map((g) =>
      Promise.all([
        deleteDoc(doc(db, "events", eventId, "guests", g.id)),
        deleteDoc(doc(db, "cameras", `${eventId}_${g.id}`)).catch(() => {}),
      ])
    )
  );

  // Thème imposé, s'il existe.
  const event = await getEvent(eventId);
  const themeChunkCount = event?.themeChunkCount || 0;
  const batch = writeBatch(db);
  for (let i = 0; i < themeChunkCount; i++) {
    batch.delete(eventThemeChunkRef(eventId, i));
  }
  batch.delete(doc(db, "events", eventId));
  await batch.commit();
}

// ---------- Thèmes personnalisés (plusieurs, nommés) ----------
//
// Un thème = un nom + une image de fond (le corps de l'appareil) +
// une couleur pour le mécanisme (boutons/molette/grip, gris par
// défaut — "transparent" est une valeur valide, qui masque le
// mécanisme et laisse voir le fond partout).
//
// userThemes/{uid}                          → { activeThemeId }
// userThemes/{uid}/themes/{themeId}         → manifeste (nom, couleur, nb morceaux)
// userThemes/{uid}/themes/{themeId}/chunks/{i} → morceaux du fond (voir photoDataChunks)

const THEME_CHUNK_SIZE = 650_000;

function themeChunkRef(uid, themeId, i) {
  return doc(db, "userThemes", uid, "themes", themeId, "chunks", String(i));
}

/**
 * Crée un nouveau thème nommé. Retourne son identifiant.
 */
export async function saveTheme(uid, { name, maskColor, backgroundBase64, thumbnail }) {
  const themeRef = doc(collection(db, "userThemes", uid, "themes"));
  const chunkCount = Math.ceil(backgroundBase64.length / THEME_CHUNK_SIZE);
  const batch = writeBatch(db);
  batch.set(themeRef, { name, maskColor, chunkCount, thumbnail: thumbnail || null, createdAt: serverTimestamp() });
  for (let i = 0; i < chunkCount; i++) {
    batch.set(themeChunkRef(uid, themeRef.id, i), {
      data: backgroundBase64.slice(i * THEME_CHUNK_SIZE, (i + 1) * THEME_CHUNK_SIZE),
    });
  }
  await batch.commit();
  return themeRef.id;
}

/**
 * Écoute la liste des thèmes de l'utilisateur (métadonnées seulement —
 * nom, couleur — jamais le fond, trop lourd pour une simple liste).
 */
export function listenMyThemes(uid, callback) {
  return onSnapshot(collection(db, "userThemes", uid, "themes"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Charge le fond (lourd) d'un thème précis, à la demande — jamais en
 * temps réel, uniquement quand ce thème doit réellement s'afficher.
 */
export async function getThemeBackground(uid, themeId, chunkCount) {
  if (!chunkCount) return null;
  const chunkSnaps = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) => getDoc(themeChunkRef(uid, themeId, i)))
  );
  return chunkSnaps.map((snap) => snap.data()?.data || "").join("");
}

export async function deleteTheme(uid, themeId, chunkCount) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "userThemes", uid, "themes", themeId));
  for (let i = 0; i < (chunkCount || 0); i++) {
    batch.delete(themeChunkRef(uid, themeId, i));
  }
  await batch.commit();
}

/**
 * Définit le thème actif (ou revient au thème par défaut si themeId
 * est null).
 */
export async function setActiveTheme(uid, themeId) {
  await setDoc(doc(db, "userThemes", uid), { activeThemeId: themeId }, { merge: true });
}

/**
 * Écoute quel thème est actif — léger, ne charge pas le fond associé
 * (à faire séparément avec getThemeBackground une fois l'id connu).
 */
export function listenActiveThemeId(uid, callback) {
  return onSnapshot(doc(db, "userThemes", uid), (snap) => {
    callback(snap.exists() ? snap.data().activeThemeId || null : null);
  });
}
