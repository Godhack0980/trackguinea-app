/**
 * Temporal Analysis Engine for TransConnekt Intelligence
 * Analyzes real Firestore timestamps, signal freshness, and time intervals.
 */

export interface TemporalResult {
  elapsedMinutes: number;
  elapsedHours: number;
  elapsedDays: number;
  isStale: boolean;
  stalenessLevel: "fresh" | "minor_delay" | "significant_stale" | "critical_stale";
}

/**
 * Evaluates the freshness of a timestamp compared to current time.
 */
export function analyzeTemporalFreshness(timestampMs: number | undefined | null): TemporalResult | null {
  if (!timestampMs || isNaN(timestampMs) || timestampMs <= 0) {
    return null; // Donnee absente = Aucune conclusion
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - timestampMs);
  const elapsedMinutes = Math.floor(diffMs / 60000);
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsedHours / 24);

  let stalenessLevel: "fresh" | "minor_delay" | "significant_stale" | "critical_stale" = "fresh";

  if (elapsedMinutes >= 45) {
    stalenessLevel = "critical_stale";
  } else if (elapsedMinutes >= 30) {
    stalenessLevel = "significant_stale";
  } else if (elapsedMinutes >= 15) {
    stalenessLevel = "minor_delay";
  }

  return {
    elapsedMinutes,
    elapsedHours,
    elapsedDays,
    isStale: elapsedMinutes >= 30,
    stalenessLevel
  };
}

/**
 * Calculates remaining days until document expiration date.
 */
export function analyzeDocumentExpiry(expiryDateInput: any): { remainingDays: number; status: "valid" | "expiring_soon" | "expired" } | null {
  if (!expiryDateInput) return null;

  let expMs: number | null = null;
  if (typeof expiryDateInput === "object" && typeof expiryDateInput.toDate === "function") {
    expMs = expiryDateInput.toDate().getTime();
  } else if (typeof expiryDateInput === "object" && typeof expiryDateInput.seconds === "number") {
    expMs = expiryDateInput.seconds * 1000;
  } else if (typeof expiryDateInput === "string" || typeof expiryDateInput === "number") {
    expMs = new Date(expiryDateInput).getTime();
  }

  if (!expMs || isNaN(expMs)) return null;

  const now = Date.now();
  const diffMs = expMs - now;
  const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (remainingDays <= 0) {
    return { remainingDays, status: "expired" };
  } else if (remainingDays <= 45) {
    return { remainingDays, status: "expiring_soon" };
  } else {
    return { remainingDays, status: "valid" };
  }
}
