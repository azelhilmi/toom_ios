const STORAGE_KEY = "toom_onboarding_seen_v1";

export function hasSeenOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // stockage indisponible (navigation privée…) : ne pas insister
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // silencieux
  }
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silencieux
  }
}
