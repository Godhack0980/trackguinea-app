import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { applyRateLimit } from '@/lib/rate-limit';
import { stripHtml, sanitizePhoneNumber } from '@/lib/sanitizer';

const firebaseConfig = {
  "projectId": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "transconnekt",
  "appId": process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:870790440395:web:552a79ce5837ca73ed424e",
  "storageBucket": process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "transconnekt.firebasestorage.app",
  "apiKey": process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  "authDomain": process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "transconnekt.firebaseapp.com",
  "messagingSenderId": process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "870790440395"
};

export async function POST(req: NextRequest) {
  // 1. Apply Rate Limiting (max 10 driver creations per minute per IP)
  const rateLimitResponse = applyRateLimit(req, 'create-driver', { limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    let { firstName, lastName, email, phone, password, companyId, companyName } = body;

    // 2. Input Sanitization
    firstName = stripHtml(firstName || '').trim();
    lastName = stripHtml(lastName || '').trim();
    email = stripHtml(email || '').trim().toLowerCase();
    phone = sanitizePhoneNumber(phone || '');
    companyName = stripHtml(companyName || '').trim();

    if (!firstName || !lastName || !email || !password || !companyId) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }

    // 3. Initialize a secondary client app to avoid signing out the current user session
    const tempApp = getApps().find(app => app.name === 'temp-driver-create') || initializeApp(firebaseConfig, 'temp-driver-create');
    const tempAuth = getAuth(tempApp);

    // 4. Create user with email and password using the secondary Auth instance
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
    const uid = userCredential.user.uid;

    // 5. Create Firestore profile for this driver
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      uid,
      email,
      firstName,
      lastName,
      phone,
      role: 'transporter',
      companyId,
      companyName,
      isPlaceholder: false,
      createdAt: new Date().toISOString(),
      status: 'disponible',
    });

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    if (error.code === 'auth/email-already-exists' || error.code === 'auth/email-already-in-use') {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Erreur interne.' }, { status: 500 });
  }
}
