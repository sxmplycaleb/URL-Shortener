import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { getEnv } from "../config/env.js";

export function getFirebaseAuth() {
  if (!getApps().length) {
    const { firebaseClientEmail, firebasePrivateKey, firebaseProjectId } = getEnv();

    initializeApp({
      credential: cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
      projectId: firebaseProjectId,
    });
  }

  return getAuth();
}

export async function verifyGoogleIdToken(idToken) {
  return getFirebaseAuth().verifyIdToken(idToken, true);
}
