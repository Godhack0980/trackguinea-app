/**
 * Transporter & Transporter-Company Business Rules for TransConnekt Intelligence Engine
 * Evaluates available cargo, high-demand corridors, fleet compliance, and document expiration.
 */

import { IntelligenceInsight } from "../types";
import { buildIntelligenceInsight } from "../notification-builder";
import { analyzeDocumentExpiry } from "../temporal-analysis";

export function evaluateTransporterRules(
  availableRequestsSnap: any,
  transporterUserData: any,
  transporterUserId: string
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];
  const isCompany = transporterUserData.role === "transporter-company";

  // 1. Available Cargo Matches & High-Demand Corridors
  if (availableRequestsSnap && availableRequestsSnap.size > 0) {
    const totalAvailable = availableRequestsSnap.size;
    const routesCount: Record<string, number> = {};

    availableRequestsSnap.docs.forEach((docSnap: any) => {
      const req = docSnap.data();
      if (req.from && req.to) {
        const key = `${req.from} - ${req.to}`;
        routesCount[key] = (routesCount[key] || 0) + 1;
      }
    });

    insights.push(
      buildIntelligenceInsight({
        id: "transporter-available-market",
        type: "opportunity",
        priorityLevel: "IMPORTANT",
        message: `💡 ${totalAvailable} demande(s) de fret disponible(s) correspondent à vos axes de transport.`,
        actionText: "Voir les opportunités",
        actionPath: isCompany ? "/dashboard/transporter-company/offers" : "/dashboard/transporter/offers",
        proof: {
          collection: "requests",
          documentId: availableRequestsSnap.docs[0].id,
          fields: ["status"],
          reason: `${totalAvailable} demande(s) au statut 'En attente' disponibles.`
        },
        userId: transporterUserId
      })
    );

    // High demand corridor indicator
    const sortedRoutes = Object.entries(routesCount).sort((a, b) => b[1] - a[1]);
    if (sortedRoutes.length > 0 && sortedRoutes[0][1] >= 2) {
      const [topRoute, count] = sortedRoutes[0];
      insights.push(
        buildIntelligenceInsight({
          id: "transporter-high-demand",
          type: "saving",
          priorityLevel: "IMPORTANT",
          message: `📈 Forte demande de fret enregistrée sur l'axe ${topRoute} (${count} cargaison(s) en attente).`,
          actionText: "Consulter l'axe",
          actionPath: isCompany ? "/dashboard/transporter-company/offers" : "/dashboard/transporter/offers",
          proof: {
            collection: "requests",
            documentId: availableRequestsSnap.docs[0].id,
            fields: ["from", "to", "status"],
            reason: `Axe ${topRoute} avec ${count} cargaisons en attente de transporteurs.`
          },
          userId: transporterUserId
        })
      );
    }
  }

  // 2. Real Document Expiry & Fleet Compliance
  let foundExpiring = false;
  const docs = transporterUserData.documents || transporterUserData.companyDocuments || {};

  for (const [key, dInfo] of Object.entries(docs)) {
    const info = dInfo as any;
    if (info?.expiryDate) {
      const expiryResult = analyzeDocumentExpiry(info.expiryDate);
      if (expiryResult && expiryResult.status !== "valid") {
        foundExpiring = true;
        const docName = key === "license" ? "Permis de conduire" : key === "fleetInsurance" ? "Assurance Flotte" : "Attestation transport";
        const docNum = info.docNumber || "Doc";

        if (expiryResult.status === "expired") {
          insights.push(
            buildIntelligenceInsight({
              id: `transporter-doc-expired-${key}`,
              type: "compliance",
              priorityLevel: "CRITIQUE",
              message: `🔴 Le document '${docName}' (${docNum}) est expiré depuis ${Math.abs(expiryResult.remainingDays)} jour(s).`,
              actionText: "Renouveler la pièce",
              actionPath: isCompany ? "/dashboard/transporter-company/fleet" : "/dashboard/transporter/fleet",
              proof: {
                collection: "users",
                documentId: transporterUserId,
                fields: [`documents.${key}.expiryDate`],
                reason: `Document expiré le ${info.expiryDate}.`
              },
              userId: transporterUserId
            })
          );
        } else {
          insights.push(
            buildIntelligenceInsight({
              id: `transporter-doc-expiring-${key}`,
              type: "compliance",
              priorityLevel: "URGENT",
              message: `📄 Le document '${docName}' (${docNum}) expire dans ${expiryResult.remainingDays} jour(s).`,
              actionText: "Mettre à jour",
              actionPath: isCompany ? "/dashboard/transporter-company/fleet" : "/dashboard/transporter/fleet",
              proof: {
                collection: "users",
                documentId: transporterUserId,
                fields: [`documents.${key}.expiryDate`],
                reason: `Document expire dans ${expiryResult.remainingDays} jours.`
              },
              userId: transporterUserId
            })
          );
        }
        break; // Show top document alert
      }
    }
  }

  if (!foundExpiring) {
    insights.push(
      buildIntelligenceInsight({
        id: "transporter-compliance-ok",
        type: "compliance",
        priorityLevel: "POSITIF",
        message: "✅ Vos documents administratifs et de conformité sont 100% à jour.",
        actionText: "Gérer la flotte",
        actionPath: isCompany ? "/dashboard/transporter-company/fleet" : "/dashboard/transporter/fleet",
        proof: {
          collection: "users",
          documentId: transporterUserId,
          fields: ["documents"],
          reason: "Toutes les dates d'expiration des documents sont valides et supérieures à 45 jours."
        },
        userId: transporterUserId
      })
    );
  }

  return insights;
}
