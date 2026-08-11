/**
 * Admin Business Rules for TransConnekt Intelligence Engine
 * Evaluates real admin oversight events backed by proof metadata.
 */

import { IntelligenceInsight } from "../types";
import { buildIntelligenceInsight } from "../notification-builder";
import { analyzeTemporalFreshness } from "../temporal-analysis";

export function evaluateAdminRules(
  unverifiedUsersSnap: any,
  pendingRequestsSnap: any,
  activeRequestsSnap: any,
  adminUserId: string
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  // 1. Unverified Companies/Users
  if (unverifiedUsersSnap && unverifiedUsersSnap.size > 0) {
    insights.push(
      buildIntelligenceInsight({
        id: "admin-unverified",
        type: "attention",
        priorityLevel: "URGENT",
        message: `🔴 ${unverifiedUsersSnap.size} inscription(s) d'entreprise(s) nécessite(nt) votre validation administrative.`,
        actionText: "Vérifier",
        actionPath: "/dashboard/admin/verification",
        proof: {
          collection: "users",
          documentId: unverifiedUsersSnap.docs[0].id,
          fields: ["isVerified"],
          reason: `${unverifiedUsersSnap.size} compte(s) en attente de vérification KYC/KYB.`
        },
        userId: adminUserId
      })
    );
  }

  // 2. Pending Unassigned Requests
  if (pendingRequestsSnap && pendingRequestsSnap.size > 0) {
    insights.push(
      buildIntelligenceInsight({
        id: "admin-pending-requests",
        type: "alert",
        priorityLevel: "IMPORTANT",
        message: `⚠️ ${pendingRequestsSnap.size} demande(s) de transport en attente d'attribution par les transporteurs.`,
        actionText: "Voir les demandes",
        actionPath: "/dashboard/admin/requests",
        proof: {
          collection: "requests",
          documentId: pendingRequestsSnap.docs[0].id,
          fields: ["status"],
          reason: `${pendingRequestsSnap.size} demande(s) au statut 'En attente'.`
        },
        userId: adminUserId
      })
    );
  }

  // 3. Stalled Active Missions (GPS signal > 45 minutes)
  if (activeRequestsSnap && activeRequestsSnap.size > 0) {
    activeRequestsSnap.docs.forEach((docSnap: any) => {
      const req = docSnap.data();
      const lastTs = req.currentLocation?.timestamp || (req.updatedAt?.seconds ? req.updatedAt.seconds * 1000 : null) || req.lastUpdated;
      
      const temporal = analyzeTemporalFreshness(lastTs);
      if (temporal && temporal.elapsedMinutes >= 45) {
        const truck = req.vehicleRegistration || req.vehicleType || req.nature || "Camion";
        const driver = req.driverName || req.transporterName || "Chauffeur";

        insights.push(
          buildIntelligenceInsight({
            id: `admin-stalled-${docSnap.id}`,
            type: "tracking",
            priorityLevel: "CRITIQUE",
            message: `📍 Le camion ${truck} (${driver}) n'a émis aucun signal GPS depuis ${temporal.elapsedMinutes} minutes.`,
            actionText: "Suivre sur la carte",
            actionPath: `/dashboard/admin/tracking?id=${docSnap.id}`,
            proof: {
              collection: "requests",
              documentId: docSnap.id,
              fields: ["currentLocation.timestamp", "updatedAt", "lastUpdated"],
              reason: `Absence de transmission GPS depuis ${temporal.elapsedMinutes} min sur cargaison en transit.`
            },
            userId: adminUserId
          })
        );
      }
    });
  }

  return insights;
}
