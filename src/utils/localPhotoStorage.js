/**
 * Stockage local (IndexedDB) des pellicules et photos PERSO (hors
 * événement) — voir l'étude discutée avec l'utilisateur : chaque photo
 * perso écrivait jusqu'ici 3 familles de documents Firestore (photos,
 * photoData, photoDataChunks), qui s'accumulent indéfiniment dans le
 * stockage du plan gratuit, partagé entre TOUS les utilisateurs de l'app.
 * La date de révélation n'a jamais été une vraie protection serveur
 * (voir firestore.rules) : rien n'est perdu en sécurité à stocker ça en
 * local, uniquement du confort de synchronisation multi-appareil — déjà
 * inexistant de toute façon avec l'auth anonyme (un compte = un appareil).
 *
 * Les événements (plusieurs invités + organisateur, doivent voir les
 * mêmes photos depuis des appareils différents) restent sur Firestore,
 * inchangé — voir firebase/firestore.js.
 *
 * Convention de dispatch : un id de pellicule/photo local commence
 * toujours par "local_" (voir getOrCreateLocalRoll). firebase/firestore.js
 * route takePhoto/getPhotoBase64/deletePhoto/listenToRoll vers ce module
 * ou vers Firestore selon ce préfixe — aucun appelant (pages, composants)
 * n'a besoin de savoir où une photo est réellement stockée.
 *
 * Contrairement à Firestore, IndexedDB n'a pas de limite de taille par
 * document : pas besoin de découper l'image en morceaux, elle est stockée
 * telle quelle en un seul enregistrement.
 */
import { canReuseRoll, computeRevealAtMs } from "./rollLogic";
import { captureFrameAsBase64 } from "./imageCompression";
import { scheduleRevealNotification } from "./localNotifications";

const DB_NAME = "toom-local";
const DB_VERSION = 1;
const ROLLS_STORE = "rolls";
const PHOTOS_STORE = "photos";
const DAILY_SHOTS = 24;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROLLS_STORE)) {
        db.createObjectStore(ROLLS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        const store = db.createObjectStore(PHOTOS_STORE, { keyPath: "id" });
        store.createIndex("byOwner", "ownerId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getRecord(storeName, id) {
  const db = await openDb();
  return promisify(db.transaction(storeName, "readonly").objectStore(storeName).get(id));
}

async function putRecord(storeName, value) {
  const db = await openDb();
  await promisify(db.transaction(storeName, "readwrite").objectStore(storeName).put(value));
  return value;
}

async function deleteRecord(storeName, id) {
  const db = await openDb();
  await promisify(db.transaction(storeName, "readwrite").objectStore(storeName).delete(id));
}

async function getAllByOwner(ownerId) {
  const db = await openDb();
  const store = db.transaction(PHOTOS_STORE, "readonly").objectStore(PHOTOS_STORE);
  return promisify(store.index("byOwner").getAll(ownerId));
}

// Émetteur en mémoire minimaliste, pour imiter onSnapshot de Firestore :
// une seule pellicule/photo perso vue depuis un seul onglet à la fois,
// pas besoin de plus pour rester réactif après chaque écriture locale.
const rollListeners = new Map();
function notifyRoll(id) {
  (rollListeners.get(id) || []).forEach((cb) => cb());
}

const photoListeners = new Set();
function notifyPhotos() {
  photoListeners.forEach((cb) => cb());
}

// Habille une valeur ms en objet compatible avec l'API des Timestamp
// Firestore (`.toMillis()`, `.toDate()`) déjà utilisée partout ailleurs
// dans l'app (CameraPage, GalleryPage, DevelopClock…) — leur évite tout
// changement pour consommer des données venues du stockage local.
function msTimestamp(ms) {
  if (ms == null) return null;
  return { toMillis: () => ms, toDate: () => new Date(ms) };
}

function isLocalId(id) {
  return typeof id === "string" && id.startsWith("local_");
}

function rollToPublic(roll) {
  if (!roll) return null;
  return {
    ...roll,
    firstPhotoAt: msTimestamp(roll.firstPhotoAt),
    revealAt: msTimestamp(roll.revealAt),
  };
}

function photoToPublic(photo) {
  return {
    ...photo,
    takenAt: msTimestamp(photo.takenAt),
    revealAt: msTimestamp(photo.revealAt),
  };
}

/**
 * Équivalent local de getOrCreateActiveRoll (firebase/firestore.js) :
 * même règle de réutilisation (canReuseRoll), mêmes champs, mais stockée
 * dans IndexedDB plutôt que dans la collection Firestore "cameras".
 */
export async function getOrCreateLocalRoll(uid, theme = "kodak-funsaver") {
  const db = await openDb();
  const store = db.transaction(ROLLS_STORE, "readonly").objectStore(ROLLS_STORE);
  const all = await promisify(store.getAll());
  const mine = all
    .filter((r) => r.ownerId === uid)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (mine.length > 0) {
    const existing = mine[0];
    const comparable = { revealAt: msTimestamp(existing.revealAt) };
    if (canReuseRoll(comparable, Date.now())) {
      return existing.id;
    }
  }

  const id = `local_${uid}_roll_${Date.now()}`;
  await putRecord(ROLLS_STORE, {
    id,
    ownerId: uid,
    type: "daily",
    shotsAllowed: DAILY_SHOTS,
    shotsUsed: 0,
    theme,
    firstPhotoAt: null,
    revealAt: null,
    createdAt: Date.now(),
  });
  return id;
}

export function listenToLocalRoll(rollId, callback) {
  const push = async () => callback(rollToPublic(await getRecord(ROLLS_STORE, rollId)));
  if (!rollListeners.has(rollId)) rollListeners.set(rollId, new Set());
  rollListeners.get(rollId).add(push);
  push();
  return () => rollListeners.get(rollId)?.delete(push);
}

/**
 * Équivalent local de takePhoto (firebase/firestore.js), pour les
 * pellicules perso uniquement (id préfixé "local_"). Pas de découpage en
 * morceaux : IndexedDB n'a pas la limite de 1 Mo/document de Firestore.
 */
export async function takeLocalPhoto({ cameraId, ownerId, videoEl, flashUsed }) {
  const base64 = await captureFrameAsBase64(videoEl, {});

  const roll = await getRecord(ROLLS_STORE, cameraId);
  let revealAt = roll?.revealAt ?? null;
  if (!roll?.firstPhotoAt) {
    const firstPhotoAt = Date.now();
    revealAt = computeRevealAtMs(firstPhotoAt);
    await putRecord(ROLLS_STORE, { ...roll, firstPhotoAt, revealAt, shotsUsed: (roll?.shotsUsed || 0) + 1 });
  } else {
    await putRecord(ROLLS_STORE, { ...roll, shotsUsed: (roll.shotsUsed || 0) + 1 });
  }
  notifyRoll(cameraId);

  // App native uniquement (no-op sur le web PWA) : programme la
  // notification système dès que la date de révélation de cette
  // pellicule perso est connue — voir localNotifications.js.
  if (revealAt) {
    scheduleRevealNotification(revealAt);
  }

  const photoId = `local_${cameraId}_${Date.now()}`;
  await putRecord(PHOTOS_STORE, {
    id: photoId,
    cameraId,
    ownerId,
    takenAt: Date.now(),
    revealAt,
    flashUsed: !!flashUsed,
    guestName: null,
    eventId: null,
    base64,
  });
  notifyPhotos();

  return { photoId, revealAtMs: revealAt };
}

export function listenToLocalPhotos(ownerId, callback) {
  const push = async () => callback((await getAllByOwner(ownerId)).map(photoToPublic));
  photoListeners.add(push);
  push();
  return () => photoListeners.delete(push);
}

export async function getLocalPhotoBase64(photoId) {
  const record = await getRecord(PHOTOS_STORE, photoId);
  return record?.base64 || null;
}

export async function deleteLocalPhoto(photoId) {
  await deleteRecord(PHOTOS_STORE, photoId);
  notifyPhotos();
}

export { isLocalId };
