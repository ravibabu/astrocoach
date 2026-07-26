import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  throw new Error("FIREBASE_PROJECT_ID is required");
}

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({ projectId });

export const firebaseAuth = getAuth(firebaseApp);
