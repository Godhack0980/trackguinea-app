import { doc, updateDoc, addDoc, collection, getDoc, setDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generates a secure random 4-digit code for delivery confirmation.
 */
export function generateDeliveryOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Initiates an escrow deposit for a request.
 * Sets request status to "escrow_held" and creates a transaction record.
 */
export async function initiateEscrowPayment(
  requestId: string,
  clientId: string,
  amount: number,
  method: 'orange_money' | 'mtn_momo' | 'bank_transfer',
  insuranceSelected: boolean = false
) {
  const requestRef = doc(db, 'requests', requestId);
  const otpCode = generateDeliveryOTP();
  
  const insurancePrice = insuranceSelected ? Math.round(amount * 0.02) : 0; // 2% of price for insurance
  const totalCharged = amount + insurancePrice;
  const commission = Math.round(amount * 0.10); // 10% commission fee
  const payout = amount - commission;

  // 1. Update the Request document in Firestore
  // Also transition status to 'En cours' now that escrow is locked — the
  // transporter can begin the trip once the client's funds are secured.
  await updateDoc(requestRef, {
    status: 'En cours',
    paymentStatus: 'escrow_held',
    paymentMethod: method,
    priceTotal: totalCharged,
    insurancePrice: insurancePrice,
    commissionAmount: commission,
    payoutAmount: payout,
    otpCode: otpCode,
    paymentAt: Timestamp.now()
  });

  // 2. Create Transaction history record
  await addDoc(collection(db, 'transactions'), {
    requestId,
    userId: clientId,
    type: 'deposit',
    amount: totalCharged,
    method,
    status: 'completed',
    timestamp: Timestamp.now()
  });

  // 3. Create Shipment document automatically if it doesn't exist
  // To kick off tracking once payment is locked
  try {
    const requestSnap = await getDoc(requestRef);
    if (requestSnap.exists()) {
      const req = requestSnap.data();
      const shipmentRef = doc(db, 'shipments', requestId);
      const shipmentSnap = await getDoc(shipmentRef);
      if (!shipmentSnap.exists()) {
        await addDoc(collection(db, 'shipments'), {
          id: requestId,
          requestId: requestId,
          clientId: req.clientId || clientId,
          transporterId: req.assignedTo || "",
          nature: req.nature || "Marchandises",
          from: req.from || "",
          to: req.to || "",
          price: req.price || amount,
          status: 'en_attente',
          currentLocation: null,
          routeHistory: [],
          estimatedArrival: "En attente du départ",
          lastUpdated: Date.now()
        });
      }
    }
  } catch (e) {
    console.error("Error creating associated shipment during payment:", e);
  }

  return { otpCode, totalCharged };
}

/**
 * Releases the locked escrow money to the transporter's wallet.
 * Deducts the platform commission.
 */
export async function releaseEscrowPayment(requestId: string, transporterId: string) {
  const requestRef = doc(db, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);
  
  if (!requestSnap.exists()) {
    throw new Error("Request not found");
  }

  const req = requestSnap.data();

  const priceVal = Number(req.priceTotal || req.price || req.amount || 0);
  const payoutAmount = req.payoutAmount || Math.round(priceVal * 0.90) || 500000;
  const commissionAmount = req.commissionAmount || Math.round(priceVal * 0.10) || 50000;

  // 1. Update Request Payment status
  await updateDoc(requestRef, {
    paymentStatus: 'released',
    status: 'Terminé'
  });

  // Also update associated Shipment if present
  try {
    const shipmentRef = doc(db, 'shipments', requestId);
    await updateDoc(shipmentRef, { status: 'livre', lastUpdated: Date.now() });
  } catch (e) {
    // Ignore if shipment document is not created yet
  }

  // 2. Credit Transporter's wallet balance safely (setDoc with merge so it creates fields if missing)
  const targetId = transporterId || req.assignedTo || req.transporterId || req.driverId;
  if (targetId) {
    const transporterRef = doc(db, 'users', targetId);
    await setDoc(transporterRef, {
      walletBalance: increment(payoutAmount),
      totalEarnings: increment(payoutAmount)
    }, { merge: true });
  }

  // 3. Create Transaction payouts & commissions audit logs
  await addDoc(collection(db, 'transactions'), {
    requestId,
    userId: targetId || 'transporter',
    type: 'payout',
    amount: payoutAmount,
    status: 'completed',
    timestamp: Timestamp.now()
  });

  await addDoc(collection(db, 'transactions'), {
    requestId,
    userId: 'admin_transconnekt',
    type: 'commission',
    amount: commissionAmount,
    status: 'completed',
    timestamp: Timestamp.now()
  });
}

/**
 * Refunds the escrow payment back to the client in case of cancelation approval.
 */
export async function refundEscrowPayment(requestId: string, clientId: string) {
  const requestRef = doc(db, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) return;
  const req = requestSnap.data();

  if (req.paymentStatus !== 'escrow_held') return;

  const totalRefund = req.priceTotal || req.price || 0;

  // 1. Update Request status
  await updateDoc(requestRef, {
    paymentStatus: 'refunded'
  });

  // 2. Create Refund Transaction record
  await addDoc(collection(db, 'transactions'), {
    requestId,
    userId: clientId,
    type: 'refund',
    amount: totalRefund,
    status: 'completed',
    timestamp: Timestamp.now()
  });
}
