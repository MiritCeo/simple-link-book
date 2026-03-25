import type { MulticastMessage } from "firebase-admin/messaging";
import { getFirebaseAdmin } from "./firebaseAdmin.js";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendFcmToTokens(tokens: string[], payload: PushPayload) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    return { ok: false as const, error: "firebase_not_configured" as const };
  }

  if (!tokens.length) {
    return { ok: true as const, successCount: 0, failureCount: 0, invalidTokens: [] as string[] };
  }

  const message: MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
  };

  const res = await admin.messaging().sendEachForMulticast(message);

  const invalidTokens: string[] = [];
  res.responses.forEach((r, idx) => {
    if (r.success) return;
    const code = r.error?.code;
    // Common token invalidations:
    // - messaging/invalid-registration-token
    // - messaging/registration-token-not-registered
    if (code === "messaging/invalid-registration-token" || code === "messaging/registration-token-not-registered") {
      invalidTokens.push(tokens[idx]);
    }
  });

  return {
    ok: true as const,
    successCount: res.successCount,
    failureCount: res.failureCount,
    invalidTokens,
  };
}

