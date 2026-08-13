import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function checkTransporterHasActiveMission(transporterId: string): Promise<{ hasActive: boolean; activeMissionTitle?: string }> {
  if (!transporterId) return { hasActive: false };

  const activeStatuses = ['En cours', 'en_route', 'En chargement', 'Arrivé', 'in_progress', 'escrow_held'];

  try {
    // 1. Check requests collection where assignedTo == transporterId AND status in activeStatuses
    const qReq = query(
      collection(db, 'requests'),
      where('assignedTo', '==', transporterId),
      where('status', 'in', activeStatuses)
    );
    const snapReq = await getDocs(qReq);
    if (!snapReq.empty) {
      const activeDoc = snapReq.docs[0].data();
      return { hasActive: true, activeMissionTitle: activeDoc.nature || 'Mission active en cours' };
    }

    // 2. Check shipments collection where transporterId == transporterId AND status is active
    const qShip = query(
      collection(db, 'shipments'),
      where('transporterId', '==', transporterId),
      where('status', 'in', ['en_attente', 'en_chargement', 'en_route', 'arrive'])
    );
    const snapShip = await getDocs(qShip);
    if (!snapShip.empty) {
      const activeDoc = snapShip.docs[0].data();
      return { hasActive: true, activeMissionTitle: activeDoc.nature || 'Mission active en cours' };
    }
  } catch (e) {
    console.error("Error checking transporter active mission:", e);
  }

  return { hasActive: false };
}
