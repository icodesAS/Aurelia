import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore,
} from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
};

const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);

function initDb(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseAppletConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);
  }
}

// Suppress noisy internal WebChannel timeout console errors in restricted preview networks
try {
  setLogLevel("silent");
} catch {
  // ignore
}

export const db = initDb();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  // Only throw structured permission diagnostics on actual permission errors
  if (
    errMsg.includes("Missing or insufficient permissions") ||
    errMsg.includes("PERMISSION_DENIED")
  ) {
    console.warn("Firestore Permission Diagnostic:", JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
}
