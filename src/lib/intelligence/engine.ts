/**
 * Central TransConnekt Event-Driven Business Intelligence Engine
 * Fact-based, zero-hallucination, real-time Firestore analytical engine.
 */

import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { IntelligenceInsight, UserContext } from "./types";
import { deduplicateAndCorrelateInsights } from "./event-deduplication";
import { evaluateAdminRules } from "./rules/admin-rules";
import { evaluateClientRules } from "./rules/client-rules";
import { evaluateTransporterRules } from "./rules/transporter-rules";

export function initializeIntelligenceEngine(
  context: UserContext,
  onInsightsUpdated: (insights: IntelligenceInsight[]) => void
): () => void {
  const unsubscribes: Array<() => void> = [];
  let currentAdminInsights: IntelligenceInsight[] = [];
  let currentClientInsights: IntelligenceInsight[] = [];
  let currentTransporterInsights: IntelligenceInsight[] = [];

  const emitInsights = () => {
    const rawAll = [
      ...currentAdminInsights,
      ...currentClientInsights,
      ...currentTransporterInsights
    ];

    const deduplicated = deduplicateAndCorrelateInsights(rawAll)
      .sort((a, b) => a.numericPriority - b.numericPriority)
      .slice(0, 4);

    if (process.env.NODE_ENV === "development") {
      console.log("[TransConnekt Intelligence Engine Debug]", {
        role: context.role,
        userId: context.uid,
        totalEvaluated: rawAll.length,
        qualifiedInsights: deduplicated.map(i => ({
          id: i.id,
          priority: i.priorityLevel,
          reason: i.proof.reason,
          proofSource: `${i.proof.collection}/${i.proof.documentId}`
        }))
      });
    }

    onInsightsUpdated(deduplicated);
  };

  try {
    if (context.role === "admin") {
      // Admin Listeners
      const unverifiedQ = query(collection(db, "users"), where("isVerified", "==", false), limit(25));
      const pendingQ = query(collection(db, "requests"), where("status", "==", "En attente"), limit(25));
      const activeQ = query(collection(db, "requests"), where("status", "==", "En cours"), limit(10));

      let snapUnverified: any = null;
      let snapPending: any = null;
      let snapActive: any = null;

      const evalAdmin = () => {
        currentAdminInsights = evaluateAdminRules(snapUnverified, snapPending, snapActive, context.uid);
        emitInsights();
      };

      unsubscribes.push(onSnapshot(unverifiedQ, (s) => { snapUnverified = s; evalAdmin(); }, (e) => console.error("Admin unverified sub error", e)));
      unsubscribes.push(onSnapshot(pendingQ, (s) => { snapPending = s; evalAdmin(); }, (e) => console.error("Admin pending sub error", e)));
      unsubscribes.push(onSnapshot(activeQ, (s) => { snapActive = s; evalAdmin(); }, (e) => console.error("Admin active sub error", e)));

    } else if (context.role === "client" || context.role === "client-company") {
      // Client Listeners
      const clientReqQ = query(collection(db, "requests"), where("clientId", "==", context.uid), limit(25));

      unsubscribes.push(onSnapshot(clientReqQ, (snap) => {
        currentClientInsights = evaluateClientRules(snap, context.uid);
        emitInsights();
      }, (e) => console.error("Client req sub error", e)));

    } else if (context.role === "transporter" || context.role === "transporter-company") {
      // Transporter Listeners
      const availableQ = query(collection(db, "requests"), where("status", "==", "En attente"), limit(25));

      unsubscribes.push(onSnapshot(availableQ, (snap) => {
        currentTransporterInsights = evaluateTransporterRules(snap, context, context.uid);
        emitInsights();
      }, (e) => console.error("Transporter available sub error", e)));
    }
  } catch (err) {
    console.error("Error initializing TransConnekt Intelligence Engine:", err);
    onInsightsUpdated([]);
  }

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
