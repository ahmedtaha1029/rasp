// src/hooks/useOnboarding.js
//
// Returns true if the user still needs to see the onboarding.
// Uses localStorage — no backend change needed.

export function useOnboarding() {
  const hasCompleted = localStorage.getItem("has_completed_onboarding") === "true"
  return { needsOnboarding: !hasCompleted }
}