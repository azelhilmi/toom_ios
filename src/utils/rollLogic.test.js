import { describe, it, expect } from "vitest";
import { canReuseRoll } from "./rollLogic";

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
