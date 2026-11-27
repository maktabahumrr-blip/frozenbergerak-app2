import admin from "firebase-admin";

const INVALID_FCM_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/mismatched-credential",
  "messaging/invalid-argument"
]);

function getAllowedCorsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin || "";
  const configuredOrigin = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.APP_URL || "";
  const headers = {
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };

  if (origin && (!configuredOrigin || origin === configuredOrigin || origin.endsWith(".netlify.app"))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount || !rawServiceAccount.trim()) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON belum ditetapkan dalam environment variables.");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch {
    throw new Error("Format JSON dalam FIREBASE_SERVICE_ACCOUNT_JSON tidak sah.");
  }

  if (serviceAccount && typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON tidak lengkap (project_id, client_email, atau private_key tiada).");
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

function sanitizeText(value, maxLen = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Netlify Function: Menghantar Web Push Notification (FCM) kepada pelanggan berdaftar
 * apabila admin/pasukan menambah atau mengemaskini jadual di Panel Pasukan.
 * @param {any} event
 */
export const handler = async (event) => {
  const headers = getAllowedCorsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: "Method Not Allowed. Gunakan GET atau POST." })
    };
  }

  try {
    const app = getFirebaseAdminApp();
    const authHeader = event?.headers?.authorization || event?.headers?.Authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!bearerToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: "Pengesahan diperlukan (Bearer token tiada)." })
      };
    }

    const decodedToken = await admin.auth(app).verifyIdToken(bearerToken);
    const callerEmail = String(decodedToken?.email || "").trim().toLowerCase();

    const envAdmins = String(process.env.ADMIN_EMAILS || "maktabahumrr@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const envTeams = String(process.env.TEAM_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (process.env.TEAM_EMAILS && callerEmail && !envAdmins.includes(callerEmail) && !envTeams.includes(callerEmail)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: "Akses ditolak: Akaun tidak dibenarkan mengakses notifikasi." })
      };
    }

    const db = admin.firestore(app);
    // Langganan notifikasi bersifat umum: ambil SEMUA token yang active == true tanpa menapis kawasan
    const snapshot = await db.collection("fcm_tokens").where("active", "==", true).get();

    /** @type {Array<{ docId: string, token: string }>} */
    const tokenRecords = [];
    const seenTokens = new Set();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const tok = typeof data.token === "string" ? data.token.trim() : "";
      if (tok && data.active === true && !seenTokens.has(tok)) {
        seenTokens.add(tok);
        tokenRecords.push({ docId: docSnap.id, token: tok });
      }
    });

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          activeFcmTokens: tokenRecords.length,
          totalSubscribers: tokenRecords.length
        })
      };
    }

    let body = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Body JSON tidak sah." })
      };
    }

    const scheduleId = sanitizeText(body.scheduleId || body.id, 60);
    const teamName = sanitizeText(body.teamName || body.driverName, 120);
    const date = sanitizeText(body.date, 100);
    const status = sanitizeText(body.status, 60);
    const locations = sanitizeText(body.locations, 260);
    const isUpdate = Boolean(body.isUpdate);

    const notifTitle =
      sanitizeText(body.title, 120) ||
      `FrozenBergerak 📍 Jadual Pergerakan ${isUpdate ? "Dikemaskini" : "Baharu"}`;

    const summaryParts = [];
    if (teamName || status) {
      const teamStatus = [teamName, status ? `(${status})` : ""].filter(Boolean).join(" ");
      if (teamStatus) summaryParts.push(teamStatus);
    }
    if (locations) {
      summaryParts.push(`Kawasan: ${locations}`);
    }
    if (date) {
      summaryParts.push(`Tarikh: ${date}`);
    }

    const notifBody =
      sanitizeText(body.body, 280) ||
      (summaryParts.length > 0
        ? summaryParts.join(" • ")
        : "Semak lokasi terkini & laluan penghantaran pasukan kami hari ini.");

    if (tokenRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          totalTokens: 0,
          removedInvalidTokens: 0,
          message: "Tiada token FCM pelanggan yang aktif buat masa ini."
        })
      };
    }

    const messaging = admin.messaging(app);
    const BATCH_SIZE = 500;
    let totalSent = 0;
    let totalFailed = 0;
    /** @type {string[]} */
    const invalidDocIds = [];
    const notifTag = `frozenbergerak-schedule-${scheduleId || "update"}-${Date.now()}`;

    for (let i = 0; i < tokenRecords.length; i += BATCH_SIZE) {
      const batch = tokenRecords.slice(i, i + BATCH_SIZE);
      const multicastResponse = await messaging.sendEachForMulticast({
        tokens: batch.map((r) => r.token),
        notification: {
          title: notifTitle,
          body: notifBody
        },
        data: {
          title: notifTitle,
          body: notifBody,
          url: "/#section-jadual-pergerakan",
          scheduleId,
          teamName,
          date,
          status,
          locations,
          tag: notifTag,
          silent: "false"
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          notification: {
            title: notifTitle,
            body: notifBody,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: notifTag,
            renotify: true,
            silent: false,
            vibrate: [200, 100, 200]
          },
          fcmOptions: {
            link: "/#section-jadual-pergerakan"
          }
        }
      });

      totalSent += multicastResponse.successCount;
      totalFailed += multicastResponse.failureCount;

      multicastResponse.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error && INVALID_FCM_ERROR_CODES.has(resp.error.code)) {
          invalidDocIds.push(batch[idx].docId);
        }
      });
    }

    if (invalidDocIds.length > 0) {
      await Promise.all(
        invalidDocIds.map((docId) =>
          db.collection("fcm_tokens").doc(docId).delete().catch(() => {})
        )
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        totalTokens: tokenRecords.length,
        removedInvalidTokens: invalidDocIds.length,
        message: `Notifikasi push berjaya dihantar ke ${totalSent} peranti.`
      })
    };
  } catch (err) {
    console.error("[Netlify FCM] Ralat send-schedule-notif:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err?.message || "Gagal memproses penghantaran notifikasi FCM."
      })
    };
  }
};
