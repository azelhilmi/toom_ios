/**
 * Coordonnées (en % de la largeur/hauteur du boîtier) des éléments
 * fonctionnels, mesurées précisément sur les images de référence.
 * Communes à TOUS les thèmes (par défaut, préréglés ou personnalisés) :
 * ils partagent le même moule de boîtier, seul l'habillage change.
 *
 * Le viseur et le compte-poses sont désormais rendus AU-DESSUS de
 * l'image du boîtier (pas révélés à travers une découpe) — certains
 * habillages n'ont pas de vraie transparence, cette approche marche
 * dans tous les cas sans distinction.
 */
export const HOTSPOTS = {
  landscape: {
    wheelAxis: "horizontal", // glissé gauche→droite
    mask: "/skins/mask-horizontal.webp",
    viewfinder: { x: 47.7, y: 10.9, w: 4.6, h: 7.4 },
    poseCounter: { x: 75.4, y: 65.3, w: 5.7, h: 7.5 },
    flashButton: { x: 71, y: 12.3, w: 9.3, h: 9.3 },
    shutter: { x: 49.7, y: 75.8, w: 20, h: 20 },
    filmWheel: { x: 91, y: 11, w: 26, h: 18 },
    filmWheelVisual: { x: 88.4, y: 10.8, w: 13.2, h: 7.2 },
    instructionsZone: { x: 50, y: 39, w: 88, h: 25 },
  },
  portrait: {
    wheelAxis: "vertical", // glissé haut→bas
    mask: "/skins/mask-vertical.webp",
    viewfinder: { x: 49.9, y: 7.6, w: 9.7, h: 4.1 },
    poseCounter: { x: 85.3, y: 82.6, w: 9.7, h: 3.9 },
    flashButton: { x: 84.6, y: 26.2, w: 14, h: 14 },
    shutter: { x: 48.9, y: 73.3, w: 20, h: 20 },
    filmWheel: { x: 89.9, y: 8.9, w: 13, h: 19 },
    filmWheelVisual: { x: 91.4, y: 8.8, w: 11.6, h: 12.7 },
    instructionsZone: { x: 50, y: 48, w: 86, h: 15 },
  },
};

/**
 * Thèmes préréglés (fournis avec l'app, pas d'upload nécessaire) —
 * chacun a sa propre image par orientation, mode d'emploi déjà gravé
 * dedans. À la différence d'un thème personnalisé, pas de couleur de
 * mécanisme à choisir : l'habillage est complet tel quel.
 */
export const PRESET_THEMES = {
  default: {
    name: "Jaune classique",
    swatch: "#f5c518",
    landscape: "/skins/default-horizontal.webp",
    portrait: "/skins/default-vertical.webp",
  },
  mariage: {
    name: "Mariage",
    swatch: "#e9dfc8",
    landscape: "/skins/mariage-horizontal.webp",
    portrait: "/skins/mariage-vertical.webp",
  },
  retro: {
    name: "Rétro",
    swatch: "#1a1a1a",
    landscape: "/skins/retro-horizontal.webp",
    portrait: "/skins/retro-vertical.webp",
  },
  neon90s: {
    name: "90's",
    swatch: "#ff5fae",
    landscape: "/skins/90s-horizontal.webp",
    portrait: "/skins/90s-vertical.webp",
  },
};

export function isPresetId(id) {
  return typeof id === "string" && id.startsWith("preset:");
}

export function presetKeyFromId(id) {
  return id.slice("preset:".length);
}

/**
 * Style CSS absolu (position:absolute) pour un hotspot donné, calculé
 * à partir des pourcentages ci-dessus. Le conteneur parent doit être
 * position:relative et couvrir tout le boîtier.
 */
/**
 * Position/taille (en % du conteneur parent) d'une zone `inner` à
 * l'intérieur d'une zone `outer` — utile quand la zone de clic (grande,
 * pour faciliter le geste) et le visuel réel (petit, précisément
 * calé sur le dessin du boîtier) n'ont pas le même centre.
 */
export function relativeHotspotStyle(outer, inner) {
  const outerLeft = outer.x - outer.w / 2;
  const outerTop = outer.y - outer.h / 2;
  const innerLeft = inner.x - inner.w / 2;
  const innerTop = inner.y - inner.h / 2;
  return {
    position: "absolute",
    left: `${((innerLeft - outerLeft) / outer.w) * 100}%`,
    top: `${((innerTop - outerTop) / outer.h) * 100}%`,
    width: `${(inner.w / outer.w) * 100}%`,
    height: `${(inner.h / outer.h) * 100}%`,
  };
}

export function hotspotStyle(spot) {
  return {
    position: "absolute",
    left: `${spot.x}%`,
    top: `${spot.y}%`,
    width: `${spot.w}%`,
    height: `${spot.h}%`,
    transform: "translate(-50%, -50%)",
  };
}
