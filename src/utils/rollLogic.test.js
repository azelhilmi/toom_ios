import { describe, it, expect } from "vitest";
import { canReuseRoll, computeRevealAtMs } from "./rollLogic";

function timestamp(ms) {
  return { toMillis: () => ms };
}

describe("canReuseRoll", () => {
  it("réutilise une pellicule qui n'a pas encore de date de révélation (aucune photo prise)", () => {
    expect(canReuseRoll({ revealAt: null }, Date.now())).toBe(true);
  });

  it("réutilise une pellicule dont la révélation est dans le futur", () => {
    const now = Date.now();
    const rollData = { revealAt: timestamp(now + 60_000) };
    expect(canReuseRoll(rollData, now)).toBe(true);
  });

  it("REGRESSION : ne réutilise jamais une pellicule déjà développée, même si elle n'est pas pleine", () => {
    const now = Date.now();
    // Bug réel : une pellicule avec seulement 2/24 poses utilisées mais
    // dont la révélation date d'il y a longtemps restait "active" et
    // faisait apparaître toute nouvelle photo immédiatement révélée.
    const rollData = { revealAt: timestamp(now - 60_000), shotsUsed: 2, shotsAllowed: 24 };
    expect(canReuseRoll(rollData, now)).toBe(false);
  });

  it("ne réutilise pas une pellicule dont la révélation est exactement maintenant", () => {
    const now = Date.now();
    expect(canReuseRoll({ revealAt: timestamp(now) }, now)).toBe(false);
  });

  it("ne réutilise jamais une pellicule inexistante", () => {
    expect(canReuseRoll(null, Date.now())).toBe(false);
    expect(canReuseRoll(undefined, Date.now())).toBe(false);
  });
});

describe("computeRevealAtMs", () => {
  it("révèle le lendemain à 10h00 heure locale, quelle que soit l'heure de la première photo", () => {
    const firstPhoto = new Date(2026, 5, 14, 23, 45, 0); // 14 juin 2026, 23h45
    const revealAt = new Date(computeRevealAtMs(firstPhoto));
    expect(revealAt.getFullYear()).toBe(2026);
    expect(revealAt.getMonth()).toBe(5);
    expect(revealAt.getDate()).toBe(15);
    expect(revealAt.getHours()).toBe(10);
    expect(revealAt.getMinutes()).toBe(0);
  });

  it("passe au mois/à l'année suivante si la première photo est en fin de mois/d'année", () => {
    const firstPhoto = new Date(2026, 11, 31, 8, 0, 0); // 31 décembre 2026
    const revealAt = new Date(computeRevealAtMs(firstPhoto));
    expect(revealAt.getFullYear()).toBe(2027);
    expect(revealAt.getMonth()).toBe(0);
    expect(revealAt.getDate()).toBe(1);
    expect(revealAt.getHours()).toBe(10);
  });
});
