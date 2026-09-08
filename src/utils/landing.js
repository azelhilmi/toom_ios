const STORAGE_KEY = "toom_has_visited_v1";

export function hasVisitedBefore() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // stockage indisponible : ne pas insister
  }
}

export function markVisited() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // silencieux
  }
}
