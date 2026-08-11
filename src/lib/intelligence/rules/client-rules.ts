/**
 * Client & Client-Company Business Rules for TransConnekt Intelligence Engine
 * Evaluates client specific cargo events, active tracking, incidents, and offers.
 */

import { IntelligenceInsight } from "../types";
import { buildIntelligenceInsight } from "../notification-builder";

export function evaluateClientRules(
  clientRequestsSnap: any,
  clientUserId: string
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  if (!clientRequestsSnap || clientRequestsSnap.empty) {
    insights.push(
      buildIntelligenceInsight({
        id: "client-empty-requests",
        type: "opportunity",
        priorityLevel: "INFORMATION",
        message: "💡 Publiez votre première demande de transport pour recevoir des offres de nos transporteurs vérifiés.",
        actionText: "Créer une demande",
        actionPath: "/dashboard/client/requests",
        proof: {
          collection: "requests",
          documentId: "none",
          fields: ["clientId"],
          reason: "Aucune demande de transport trouvée dans Firestore pour cet utilisateur."
        },
        userId: clientUserId
      })
    );
    return insights;
  }

  clientRequestsSnap.docs.forEach((docSnap: any) => {
    const req = docSnap.data();
    const reqId = docSnap.id;

    // 1. Cargo currently in transit
    if (req.status === "En cours" || req.status === "en_route") {
      const nature = req.nature || "Marchandises";
      const from = req.from || "Départ";
      const to = req.to || "Arrivée";

      insights.push(
        buildIntelligenceInsight({
          id: `client-transit-${reqId}`,
          type: "tracking",
          priorityLevel: "IMPORTANT",
          message: `🚚 Votre cargaison '${nature}' (${from} → ${to}) est actuellement en transit.`,
          actionText: "Suivre en direct",
          actionPath: `/tracking/${reqId}`,
          proof: {
            collection: "requests",
            documentId: reqId,
            fields: ["status", "nature", "from", "to"],
            reason: `Course au statut '${req.status}' pour le client ${clientUserId}.`
          },
          userId: clientUserId
        })
      );
    }

    // 2. Incident report detected
    if (req.status === "incident" || req.incidentReport) {
      const nature = req.nature || "Marchandises";
      insights.push(
        buildIntelligenceInsight({
          id: `client-incident-${reqId}`,
          type: "attention",
          priorityLevel: "CRITIQUE",
          message: `🔴 Signalement d'incident enregistré sur votre course '${nature}'.`,
          actionText: "Voir le rapport",
          actionPath: `/tracking/${reqId}`,
          proof: {
            collection: "requests",
            documentId: reqId,
            fields: ["status", "incidentReport"],
            reason: `Presence d'un rapport d'incident sur la course ${reqId}.`
          },
          userId: clientUserId
        })
      );
    }
  });

  return insights;
}
