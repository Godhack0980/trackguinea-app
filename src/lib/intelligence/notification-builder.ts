/**
 * Fact-Based Notification Builder for TransConnekt Intelligence
 * Constructs contextual, factual French messages backed by proof metadata.
 */

import { IntelligenceCategory, IntelligenceInsight, IntelligencePriority, IntelligenceProof } from "./types";
import { calculateNumericPriority } from "./priorities";

export interface NotificationBuildParams {
  id: string;
  type: IntelligenceCategory;
  priorityLevel: IntelligencePriority;
  message: string;
  actionText: string;
  actionPath: string;
  proof: IntelligenceProof;
  userId: string;
  metadata?: Record<string, any>;
}

export function buildIntelligenceInsight(params: NotificationBuildParams): IntelligenceInsight {
  return {
    id: params.id,
    type: params.type,
    priorityLevel: params.priorityLevel,
    numericPriority: calculateNumericPriority(params.priorityLevel),
    message: params.message,
    actionText: params.actionText,
    actionPath: params.actionPath,
    proof: params.proof,
    timestamp: Date.now(),
    userId: params.userId,
    metadata: params.metadata
  };
}
