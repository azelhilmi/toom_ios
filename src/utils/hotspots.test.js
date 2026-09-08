import { describe, it, expect } from "vitest";
import { HOTSPOTS } from "./hotspots";

const MIN_MARGIN = 5; // % — la marge de sécurité demandée à plusieurs reprises

function bounds(spot) {
  return {
    top: spot.y - spot.h / 2,
    bottom: spot.y + spot.h / 2,
    left: spot.x - spot.w / 2,
    right: spot.x + spot.w / 2,
  };
}

function verticalGap(a, b) {
  // Distance verticale entre deux zones qui se chevauchent en x — sinon
  // Infinity (elles ne peuvent pas se toucher, colonnes différentes).
  const aB = bounds(a);
  const bB = bounds(b);
  const overlapsHorizontally = aB.left < bB.right && aB.right > bB.left;
  if (!overlapsHorizontally) return Infinity;
  if (aB.bottom <= bB.top) return bB.top - aB.bottom;
  if (bB.bottom <= aB.top) return aB.top - bB.bottom;
  return -Infinity; // chevauchement réel
}

describe.each(Object.keys(HOTSPOTS))("hotspots.%s", (orientation) => {
  const layout = HOTSPOTS[orientation];
  const actionZones = ["viewfinder", "poseCounter", "flashButton", "shutter", "filmWheel"];

  it("la zone d'instructions garde une marge d'au moins 5% avec chaque zone d'action", () => {
    for (const key of actionZones) {
      const gap = verticalGap(layout.instructionsZone, layout[key]);
      expect(gap, `instructionsZone vs ${key}`).toBeGreaterThanOrEqual(MIN_MARGIN);
    }
  });

  it("aucune zone d'action ne chevauche une autre", () => {
    for (let i = 0; i < actionZones.length; i++) {
      for (let j = i + 1; j < actionZones.length; j++) {
        const a = bounds(layout[actionZones[i]]);
        const b = bounds(layout[actionZones[j]]);
        const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        expect(overlaps, `${actionZones[i]} vs ${actionZones[j]}`).toBe(false);
      }
    }
  });
});
