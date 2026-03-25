import admin from "firebase-admin";
import fs from "fs";

type ServiceAccount =
  | {
      project_id?: string;
      client_email?: string;
      private_key?: string;
      [k: string]: unknown;
    }
  | Record<string, unknown>;

let initialized = false;

function getServiceAccount(): ServiceAccount | null {
  const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_SDK_JSON;
  if (jsonStr && jsonStr.trim()) {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path && path.trim()) {
    try {
      const raw = fs.readFileSync(path.trim(), "utf8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  return null;
}

export function getFirebaseAdmin(): typeof admin | null {
  if (initialized) return admin;
  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      projectId: process.env.FIREBASE_PROJECT_ID?.trim() || (serviceAccount as any).project_id,
    });
  }
  initialized = true;
  return admin;
}

