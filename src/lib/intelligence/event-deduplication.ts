/**
 * Deterministic Event Deduplication & Lifecycle Engine for TransConnekt Intelligence
 * Tracks event states: NEW, EVOLUTION, RESOLVED, POSITIVE.
 */

import { IntelligenceInsight } from "./types";

// In-memory lifecycle store scoped per session
const previousEventsMap = new Map<string, { timestamp: number; status: string }>();

/**
 * Builds a deterministic key for an event.
 */
export function buildDeterministicEventKey(eventType: string, docId: string, statusOrTimestamp: string | number): string {
  return `${eventType}:${docId}:${statusOrTimestamp}`;
}

/**
 * Filters and deduplicates insights array deterministically.
 */
export function deduplicateAndCorrelateInsights(insights: IntelligenceInsight[]): IntelligenceInsight[] {
  const uniqueMap = new Map<string, IntelligenceInsight>();

  insights.forEach((insight) => {
    const existing = uniqueMap.get(insight.id);
    if (!existing || insight.numericPriority < existing.numericPriority) {
      uniqueMap.set(insight.id, insight);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Records an event state in the lifecycle store.
 */
export function recordEventState(key: string, status: string): void {
  previousEventsMap.set(key, { timestamp: Date.now(), status });
}

/**
 * Checks if an event was previously recorded.
 */
export function getPreviousEventState(key: string): { timestamp: number; status: string } | undefined {
  return previousEventsMap.get(key);
}
