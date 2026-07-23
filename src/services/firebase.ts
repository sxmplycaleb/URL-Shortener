import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from "firebase/auth";

interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const requiredFirebaseEnv = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"],
  appId: import.meta.env["VITE_FIREBASE_APP_ID"],
} satisfies Record<keyof FirebaseClientConfig, string | undefined>;

function getFirebaseConfig(): FirebaseClientConfig {
  const missing = Object.entries(requiredFirebaseEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Firebase configuration: ${missing.join(", ")}.`);
  }

  return requiredFirebaseEnv as FirebaseClientConfig;
}

let firebaseAuth: Auth | null = null;

export function getFirebaseClientAuth() {
  if (!firebaseAuth) {
    const app = initializeApp(getFirebaseConfig());
    firebaseAuth = getAuth(app);
  }

  return firebaseAuth;
}

export async function getGoogleIdToken() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(getFirebaseClientAuth(), provider);
  return credential.user.getIdToken();
}

export function signOutOfFirebase() {
  return signOut(getFirebaseClientAuth());
}
