/**
 * Priority Matrix Engine for TransConnekt Intelligence
 * Maps events to priority levels objectively without arbitrary overrides.
 */

import { IntelligencePriority } from "./types";

export function calculateNumericPriority(priority: IntelligencePriority): number {
  switch (priority) {
    case "CRITIQUE": return 1;
    case "URGENT": return 2;
    case "IMPORTANT": return 3;
    case "INFORMATION": return 4;
    case "POSITIF": return 5;
    default: return 4;
  }
}

/**
 * Determines GPS staleness priority based on real elapsed minutes.
 */
export function getGpsStalenessPriority(elapsedMinutes: number): IntelligencePriority {
  if (elapsedMinutes >= 45) return "CRITIQUE";
  if (elapsedMinutes >= 30) return "URGENT";
  if (elapsedMinutes >= 15) return "IMPORTANT";
  return "INFORMATION";
}

/**
 * Determines Document Expiry priority based on remaining days.
 */
export function getDocumentExpiryPriority(remainingDays: number): IntelligencePriority {
  if (remainingDays <= 0) return "CRITIQUE";
  if (remainingDays <= 14) return "URGENT";
  if (remainingDays <= 45) return "IMPORTANT";
  return "INFORMATION";
}
