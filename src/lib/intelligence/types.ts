/**
 * TransConnekt Business Intelligence Engine Types & Models
 * Fact-based, zero-hallucination model for TransConnekt Logistics.
 */

export type IntelligencePriority = "CRITIQUE" | "URGENT" | "IMPORTANT" | "INFORMATION" | "POSITIF";

export type IntelligenceCategory = "attention" | "alert" | "saving" | "tracking" | "compliance" | "opportunity";

export interface IntelligenceProof {
  collection: "users" | "requests" | "shipments" | "bids" | "vehicles" | "transactions" | "documents";
  documentId: string;
  fields: string[];
  reason: string;
}

export interface IntelligenceInsight {
  id: string;
  type: IntelligenceCategory;
  priorityLevel: IntelligencePriority;
  numericPriority: number; // 1 = CRITIQUE, 2 = URGENT, 3 = IMPORTANT, 4 = INFORMATION, 5 = POSITIF
  title?: string;
  message: string;
  actionText: string;
  actionPath: string;
  proof: IntelligenceProof;
  timestamp: number;
  userId: string;
  metadata?: Record<string, any>;
}

export interface UserContext {
  uid: string;
  role: "admin" | "client" | "client-company" | "transporter" | "transporter-company" | "driver";
  companyId?: string;
  companyRole?: string;
  documents?: Record<string, any>;
  currentPrefecture?: string;
}
