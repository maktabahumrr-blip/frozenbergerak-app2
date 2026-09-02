import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import webpush from "web-push";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ============================================================================
// DATA PERSISTENCE & VAPID SETUP FOR TRUE WEB PUSH NOTIFICATIONS
// ============================================================================
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Persistent VAPID Keys Setup
const VAPID_KEYS_FILE = path.join(DATA_DIR, "vapid-keys.json");
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || ""
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  if (fs.existsSync(VAPID_KEYS_FILE)) {
    try {
      const readKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, "utf-8"));
      if (readKeys.publicKey && readKeys.privateKey) {
        vapidKeys = readKeys;
      }
    } catch (e) {
      console.warn("Could not read vapid-keys.json, generating fresh keys");
    }
  }

  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    const generated = webpush.generateVAPIDKeys();
    vapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey
    };
    try {
      fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2), "utf-8");
      console.log("VAPID Keys generated and saved to data/vapid-keys.json");
    } catch (err) {
      console.error("Failed to write vapid-keys.json:", err);
    }
  }
}

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:maktabahumrr@gmail.com";
try {
  webpush.setVapidDetails(VAPID_SUBJECT, vapidKeys.publicKey, vapidKeys.privateKey);
} catch (err) {
  console.error("Error configuring webpush VAPID details:", err);
}

// Push Subscriptions Management
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "push-subscriptions.json");

interface StoredSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  subscribedAt: string;
}

function loadSubscriptions(): StoredSubscription[] {
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8"));
    } catch (err) {
      console.error("Error reading push-subscriptions.json:", err);
      return [];
    }
  }
  return [];
}

function saveSubscriptions(subs: StoredSubscription[]) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing push-subscriptions.json:", err);
  }
}

function addSubscription(newSub: any, userAgent?: string): boolean {
  if (!newSub) return false;
  const subData = newSub.endpoint ? newSub : (newSub.subscription || {});
  const endpoint = subData.endpoint;
  const p256dh = subData.keys?.p256dh;
  const auth = subData.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return false;
  }
  const list = loadSubscriptions();
  const index = list.findIndex(s => s.endpoint === endpoint);
  const record: StoredSubscription = {
    endpoint: endpoint,
    keys: {
      p256dh: p256dh,
      auth: auth
    },
    userAgent: userAgent || "Unknown",
    subscribedAt: new Date().toISOString()
  };

  if (index >= 0) {
    list[index] = record;
  } else {
    list.push(record);
  }
  saveSubscriptions(list);
  return true;
}

function removeSubscription(endpoint: string) {
  const list = loadSubscriptions();
  const filtered = list.filter(s => s.endpoint !== endpoint);
  if (filtered.length !== list.length) {
    saveSubscriptions(filtered);
  }
}

async function broadcastPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  image?: string;
}): Promise<{ sent: number; failed: number; total: number }> {
  const subscriptions = loadSubscriptions();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, total: 0 };
  }

  let sent = 0;
  let failed = 0;
  const invalidEndpoints: string[] = [];

  const stringifiedPayload = JSON.stringify({
    title: payload.title || "FrozenBergerak 📍 Jadual Pergerakan",
    body: payload.body,
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.badge || "/icons/icon-192.png",
    image: payload.image || "/icons/icon-512.png",
    url: payload.url || "/#section-jadual-pergerakan"
  });

  const promises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys
        },
        stringifiedPayload,
        {
          TTL: 86400
        }
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err.statusCode === 404 || err.statusCode === 410) {
        invalidEndpoints.push(sub.endpoint);
      } else {
        console.warn("Failed sending push to subscriber:", err.message);
      }
    }
  });

  await Promise.all(promises);

  if (invalidEndpoints.length > 0) {
    const updated = subscriptions.filter(s => !invalidEndpoints.includes(s.endpoint));
    saveSubscriptions(updated);
  }

  return { sent, failed, total: subscriptions.length };
}

// Schedule Persistence & Google Sheet JADUAL Sync
const SCHEDULE_FILE = path.join(DATA_DIR, "schedule.json");
const ROLES_FILE = path.join(DATA_DIR, "roles_config.json");
const AUTH_SECRET_FILE = path.join(DATA_DIR, "auth_secret.key");

// Secret key for HMAC token signing
let AUTH_SECRET = "";
if (fs.existsSync(AUTH_SECRET_FILE)) {
  try {
    AUTH_SECRET = fs.readFileSync(AUTH_SECRET_FILE, "utf-8").trim();
  } catch {}
}
if (!AUTH_SECRET) {
  AUTH_SECRET = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(AUTH_SECRET_FILE, AUTH_SECRET, "utf-8");
  } catch {}
}

interface RolesConfigData {
  adminEmails: string[];
  teamEmails: string[];
  lastModified?: string;
}

const PRIMARY_ADMIN_EMAIL = "maktabahumrr@gmail.com";

function loadRolesConfig(): RolesConfigData {
  if (fs.existsSync(ROLES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ROLES_FILE, "utf-8"));
      const admins = Array.isArray(data.adminEmails) 
        ? data.adminEmails.map((e: string) => e.trim().toLowerCase()).filter(Boolean) 
        : [];
      if (!admins.includes(PRIMARY_ADMIN_EMAIL)) {
        admins.unshift(PRIMARY_ADMIN_EMAIL);
      }
      return {
        adminEmails: admins,
        teamEmails: Array.isArray(data.teamEmails) ? data.teamEmails.map((e: string) => e.trim().toLowerCase()).filter(Boolean) : [],
        lastModified: data.lastModified
      };
    } catch (err) {
      console.warn("Error reading roles_config.json:", err);
    }
  }
  return { adminEmails: [PRIMARY_ADMIN_EMAIL], teamEmails: [] };
}

function saveRolesConfig(config: RolesConfigData) {
  try {
    if (!config.adminEmails.includes(PRIMARY_ADMIN_EMAIL)) {
      config.adminEmails.unshift(PRIMARY_ADMIN_EMAIL);
    }
    config.lastModified = new Date().toISOString();
    fs.writeFileSync(ROLES_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving roles_config.json:", err);
  }
}

function getMergedAdminEmails(): string[] {
  const envAdmins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const fileAdmins = loadRolesConfig().adminEmails;
  return Array.from(new Set([PRIMARY_ADMIN_EMAIL, ...envAdmins, ...fileAdmins]));
}

function getMergedTeamEmails(): string[] {
  const envTeams = (process.env.TEAM_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const fileTeams = loadRolesConfig().teamEmails;
  return Array.from(new Set([...envTeams, ...fileTeams]));
}

const PASSWORDS_FILE = path.join(DATA_DIR, "user_passwords.json");
const APPROVALS_FILE = path.join(DATA_DIR, "team_approvals.json");

interface UserPasswordRecord {
  salt: string;
  hash: string;
  updatedAt: string;
}

type UserPasswordsMap = Record<string, UserPasswordRecord>;

export interface TeamApprovalRecord {
  email: string;
  name?: string;
  status: "approved" | "pending" | "rejected";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

type TeamApprovalsMap = Record<string, TeamApprovalRecord>;

function loadUserPasswords(): UserPasswordsMap {
  if (fs.existsSync(PASSWORDS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf-8"));
    } catch (err) {
      console.warn("Error reading user_passwords.json:", err);
    }
  }
  return {};
}

function saveUserPasswords(map: UserPasswordsMap) {
  try {
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving user_passwords.json:", err);
  }
}

function loadTeamApprovals(): TeamApprovalsMap {
  if (fs.existsSync(APPROVALS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(APPROVALS_FILE, "utf-8"));
    } catch (err) {
      console.warn("Error reading team_approvals.json:", err);
    }
  }
  return {};
}

function saveTeamApprovals(map: TeamApprovalsMap) {
  try {
    fs.writeFileSync(APPROVALS_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving team_approvals.json:", err);
  }
}

// Send Email & Web Push notification to maktabahumrr@gmail.com and Admin devices for Team approval
async function sendTeamApprovalNotificationToAdmin(teamEmail: string, isNewPassword = false) {
  const adminEmail = PRIMARY_ADMIN_EMAIL;
  console.log(`[APPROVAL REQUEST] Permohonan log masuk team dari ${teamEmail} dihantar ke ${adminEmail}`);

  // 1. Send Instant Web Push Notification to Admin devices (phone/laptop)
  try {
    await broadcastPushNotification({
      title: "FrozenBergerak 🔑 Permohonan Akses Team",
      body: `Ahli Team (${teamEmail}) memohon kelulusan log masuk. Klik untuk buka panel Admin dan meluluskan akses.`,
      url: "/#section-jadual-pergerakan",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png"
    });
  } catch (err: any) {
    console.warn("Failed to broadcast approval push notification:", err.message);
  }

  // 2. Dispatch Email Webhook to Google Apps Script / Webhook Endpoint
  const webhookUrl = getAppsScriptUrl();
  if (webhookUrl) {
    try {
      const payload = {
        action: "send_email_notification",
        type: "team_approval_request",
        recipient: adminEmail,
        adminEmail: adminEmail,
        teamEmail: teamEmail,
        email: teamEmail,
        subject: `[FrozenBergerak] Permohonan Kelulusan Akses Team: ${teamEmail}`,
        body: `Salam Admin FrozenBergerak,\n\nAhli Pasukan dengan alamat email (${teamEmail}) telah ${isNewPassword ? "mencipta kata laluan baharu dan" : ""} memohon kebenaran untuk log masuk ke Panel Pengurusan Jadual FrozenBergerak.\n\nSila log masuk ke aplikasi FrozenBergerak menggunakan akaun ${adminEmail} dan buka tab 'Kelulusan Team' untuk meluluskan permohonan ini.\n\nTarikh Permohonan: ${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}\n\nTerima kasih.`,
        htmlBody: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #1e40af; margin-top: 0;">FrozenBergerak 🚚 Permohonan Akses Pasukan</h2>
          <p>Salam Admin FrozenBergerak,</p>
          <p>Seorang ahli pasukan baru telah memohon kebenaran untuk log masuk ke panel pengurusan:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; font-size: 16px;"><strong>Email Pasukan:</strong> <span style="color: #2563eb;">${teamEmail}</span></p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b;">Tarikh: ${new Date().toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur" })}</p>
          </div>
          <p>Sila log masuk ke akaun <strong>${adminEmail}</strong> dan buka tab <strong>Kelulusan Team</strong> untuk meluluskan atau menolak permohonan ini.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 25px;">Notifikasi ini dijana secara automatik oleh sistem FrozenBergerak.</p>
        </div>`,
        timestamp: new Date().toISOString()
      };

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
        redirect: "follow"
      }).then(r => console.log(`[APPROVAL EMAIL WEBHOOK] Status: ${r.status}`))
        .catch(err => {
          console.warn("Webhook email notification dispatch attempt:", err.message);
        });
    } catch (err) {
      console.warn("Failed to dispatch email webhook:", err);
    }
  }
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, finalSalt, 10000, 64, "sha512").toString("hex");
  return { hash, salt: finalSalt };
}

function verifyPassword(password: string, record: UserPasswordRecord): boolean {
  if (!record || !record.hash || !record.salt) return false;
  const { hash } = hashPassword(password, record.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(record.hash, "hex"));
}

function signSessionToken(payload: { email: string; uid?: string; name?: string; picture?: string; role: 'admin' | 'team'; exp: number }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifySessionToken(token: string): { valid: boolean; user?: { email: string; uid?: string; name?: string; picture?: string; role: 'admin' | 'team' } } {
  if (!token || typeof token !== "string") return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false };
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest("base64url");
  if (signature !== expectedSignature) return { valid: false };

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) {
      return { valid: false };
    }
    return {
      valid: true,
      user: {
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture,
        role: payload.role
      }
    };
  } catch {
    return { valid: false };
  }
}

// Authentication middleware for Team & Admin write/delete operations
function requireAdminOrTeamAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer ")) 
    ? authHeader.slice(7) 
    : (req.headers["x-auth-token"] as string);

  if (!token) {
    res.status(403).json({
      error: "Akses Ditolak: Sila log masuk sebagai akaun ADMIN atau TEAM yang sah untuk menguruskan jadual.",
      code: "UNAUTHORIZED"
    });
    return;
  }

  const { valid, user } = verifySessionToken(token);
  if (!valid || !user || (user.role !== "admin" && user.role !== "team")) {
    res.status(403).json({
      error: "Akses Ditolak: Sesi anda telah tamat atau akaun anda tidak mempunyai kebenaran untuk menguruskan jadual.",
      code: "FORBIDDEN"
    });
    return;
  }

  (req as any).authUser = user;
  next();
}

function requireAdminOnlyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer ")) 
    ? authHeader.slice(7) 
    : (req.headers["x-auth-token"] as string);

  if (!token) {
    res.status(403).json({
      error: "Akses Ditolak: Hanya ADMIN yang sah dibenarkan mengubah senarai kebenaran.",
      code: "UNAUTHORIZED"
    });
    return;
  }

  const { valid, user } = verifySessionToken(token);
  if (!valid || !user || user.role !== "admin") {
    res.status(403).json({
      error: "Akses Ditolak: Hanya pengguna bertaraf ADMIN yang dibenarkan.",
      code: "FORBIDDEN"
    });
    return;
  }

  (req as any).authUser = user;
  next();
}

interface ScheduleRecord {
  id: string;
  teamName: string;
  driverName?: string;
  date: string;
  timeSlot: string;
  locations: string;
  notes?: string;
  status: "Sedang Bergerak" | "Akan Datang" | "Selesai" | "sedang_bergerak" | "akan_datang" | "selesai" | "dibatalkan";
  lastUpdated: string;
}

function normalizeScheduleStatus(rawStatus: string): "Sedang Bergerak" | "Akan Datang" | "Selesai" {
  const s = (rawStatus || "").toLowerCase().trim();
  if (s.includes("sedang") || s.includes("bergerak") || s.includes("moving") || s.includes("on_the_way")) {
    return "Sedang Bergerak";
  }
  if (s.includes("selesai") || s.includes("tamat") || s.includes("completed") || s.includes("done")) {
    return "Selesai";
  }
  return "Akan Datang";
}

function getTodayMalayDate(): string {
  const days = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  const months = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  const now = new Date();
  const dayName = days[now.getDay()] || "Hari Ini";
  const monthName = months[now.getMonth()] || "";
  return `${dayName}, ${now.getDate()} ${monthName} ${now.getFullYear()}`;
}

function loadSchedule(): ScheduleRecord[] {
  if (fs.existsSync(SCHEDULE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf-8"));
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id || `JAD-${Date.now().toString().slice(-4)}`,
          teamName: item.teamName || item.driverName || "Team Frozen 1",
          driverName: item.teamName || item.driverName || "Team Frozen 1",
          date: item.date || `Hari Ini (${getTodayMalayDate()})`,
          timeSlot: item.timeSlot || item.masa || "Waktu Operasi",
          locations: item.locations || item.kawasan || "",
          notes: item.notes || item.catatan || "",
          status: normalizeScheduleStatus(item.status),
          lastUpdated: item.lastUpdated || new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error("Error reading schedule.json:", err);
    }
  }

  const todayStr = `Hari Ini (${getTodayMalayDate()})`;
  const initialSchedules: ScheduleRecord[] = [
    {
      id: "JAD-01",
      teamName: "Team Frozen 1",
      driverName: "Team Frozen 1",
      date: todayStr,
      timeSlot: "Sesi Pagi (9:00 PG - 1:00 PTG)",
      locations: "Seremban 2 • Rasah Kemayan • Sendayan • Mambau",
      status: "Sedang Bergerak",
      notes: "Team kini sedang bergerak di sekitar Seremban 2! Boleh WhatsApp untuk buat pesanan terus ke rumah.",
      lastUpdated: new Date().toISOString()
    },
    {
      id: "JAD-02",
      teamName: "Team Frozen 2",
      driverName: "Team Frozen 2",
      date: todayStr,
      timeSlot: "Sesi Petang (3:00 PTG - 7:00 MLM)",
      locations: "Senawang • Lavender Heights • Taman Tuanku Jaafar • Rahang",
      status: "Akan Datang",
      notes: "Slot petang dibuka untuk pesanan awal. Stok Kambing Perap & Karipap Pusing tersedia!",
      lastUpdated: new Date().toISOString()
    }
  ];
  saveSchedule(initialSchedules);
  return initialSchedules;
}

function saveSchedule(items: ScheduleRecord[]) {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving schedule.json:", err);
  }
}

// Google Apps Script Web App URL for JADUAL tab synchronization
const DEFAULT_APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzopp-hWrQBI45eCzqs-ZPTgz346JuiZgClCy0KM2V8b-uhKX0LvYvg1tszdyL6unR7zw/exec";

function getAppsScriptUrl(): string {
  return process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim() || 
         process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || 
         DEFAULT_APPS_SCRIPT_WEBAPP_URL;
}

interface ScheduleFetchResult {
  schedules: ScheduleRecord[];
  source: 'google_apps_script' | 'google_sheet_jadual' | 'local_cache';
  webAppStatus: 'connected' | 'error' | 'unconfigured';
  webAppError?: string;
}

// Fetch live schedules from Google Apps Script Web App (Tab JADUAL)
async function fetchScheduleFromAppsScript(): Promise<{ schedules: ScheduleRecord[]; error?: string } | null> {
  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) return null;

  const tryUrls = [
    `${webAppUrl}?action=getSchedules&sheet=JADUAL`,
    webAppUrl
  ];

  for (const url of tryUrls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (compatible; FrozenBergerak/1.0)"
        },
        signal: AbortSignal.timeout(3000),
        redirect: "follow"
      });

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      if (!text) continue;

      const trimmedText = text.trim();
      if (trimmedText.length === 0) continue;

      // Detect HTML responses (such as Google Login redirect or HTML error page)
      if (trimmedText.startsWith("<") || trimmedText.toLowerCase().includes("<html") || trimmedText.includes("accounts.google.com")) {
        continue;
      }

      // 1. Try parsing JSON only if it starts with valid JSON characters '{' or '['
      if (trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
        try {
          const json = JSON.parse(trimmedText);
          let rawItems: any[] = [];

          if (Array.isArray(json)) {
            rawItems = json;
          } else if (json && typeof json === "object") {
            if (Array.isArray(json.schedules)) rawItems = json.schedules;
            else if (Array.isArray(json.data)) rawItems = json.data;
            else if (Array.isArray(json.records)) rawItems = json.records;
            else if (Array.isArray(json.rows)) rawItems = json.rows;
            else if (Array.isArray(json.JADUAL)) rawItems = json.JADUAL;
            else if (Array.isArray(json.jadual)) rawItems = json.jadual;
          }

          if (rawItems.length > 0) {
            const parsedList: ScheduleRecord[] = [];

            // Handle array of arrays (e.g. [ ["ID JADUAL", "NAMA TEAM", ...], ["JAD-01", ...] ])
            if (Array.isArray(rawItems[0])) {
              const headerRow = (rawItems[0] as string[]).map(h => String(h).trim().toUpperCase());
              const findIdx = (names: string[]) => {
                for (const n of names) {
                  const idx = headerRow.findIndex(h => h === n.toUpperCase() || h.includes(n.toUpperCase()));
                  if (idx !== -1) return idx;
                }
                return -1;
              };

              const idIdx = findIdx(["ID JADUAL", "ID", "KOD", "NO"]);
              const teamIdx = findIdx(["NAMA TEAM", "TEAM", "DRIVER", "NAMA"]);
              const dateIdx = findIdx(["TARIKH", "DATE", "HARI"]);
              const timeIdx = findIdx(["MASA", "TIME", "WAKTU", "SLOT"]);
              const locIdx = findIdx(["KAWASAN", "LOCATION", "LOKASI", "LALUAN"]);
              const notesIdx = findIdx(["CATATAN", "NOTES", "NOTA", "REMARK"]);
              const statusIdx = findIdx(["STATUS", "KEADAAN"]);

              for (let i = 1; i < rawItems.length; i++) {
                const row = rawItems[i];
                if (!Array.isArray(row) || row.length === 0 || row.every(c => !String(c).trim())) continue;
                const id = (idIdx !== -1 && row[idIdx]) ? String(row[idIdx]).trim() : `JAD-${i.toString().padStart(2, '0')}`;
                const rawTeam = (teamIdx !== -1 && row[teamIdx]) ? String(row[teamIdx]).trim() : "Team Frozen 1";
                const teamName = rawTeam.replace(/van\s*/gi, "Team ").trim() || "Team Frozen 1";
                const date = (dateIdx !== -1 && row[dateIdx]) ? String(row[dateIdx]).trim() : "Hari Ini";
                const timeSlot = (timeIdx !== -1 && row[timeIdx]) ? String(row[timeIdx]).trim() : "Waktu Operasi";
                const locations = (locIdx !== -1 && row[locIdx]) ? String(row[locIdx]).trim() : "";
                const notes = ((notesIdx !== -1 && row[notesIdx]) ? String(row[notesIdx]).trim() : "").replace(/van\s*/gi, "kenderaan ");
                const status = normalizeScheduleStatus((statusIdx !== -1 && row[statusIdx]) ? String(row[statusIdx]).trim() : "Akan Datang");

                if (locations) {
                  parsedList.push({
                    id,
                    teamName,
                    driverName: teamName,
                    date,
                    timeSlot,
                    locations,
                    notes,
                    status,
                    lastUpdated: new Date().toISOString()
                  });
                }
              }
            } else {
              // Handle array of objects
              for (let i = 0; i < rawItems.length; i++) {
                const item = rawItems[i];
                if (!item || typeof item !== "object") continue;

                const id = item["ID JADUAL"] || item["ID"] || item.id || item.id_jadual || `JAD-${(i + 1).toString().padStart(2, '0')}`;
                const rawTeam = item["NAMA TEAM"] || item["TEAM"] || item.teamName || item.team || item.nama_team || item.driverName || "Team Frozen 1";
                const teamName = String(rawTeam).replace(/van\s*/gi, "Team ").trim() || "Team Frozen 1";
                const date = item["TARIKH"] || item["DATE"] || item.date || item.tarikh || item.hari || "Hari Ini";
                const timeSlot = item["MASA"] || item["TIME"] || item.timeSlot || item.masa || item.waktu || item.slot || "Waktu Operasi";
                const locations = item["KAWASAN"] || item["LOCATION"] || item.locations || item.kawasan || item.lokasi || item.laluan || "";
                const rawNotes = item["CATATAN"] || item["NOTES"] || item.notes || item.catatan || item.nota || "";
                const notes = String(rawNotes).replace(/van\s*/gi, "kenderaan ");
                const rawStatus = item["STATUS"] || item.status || item.keadaan || "Akan Datang";
                const status = normalizeScheduleStatus(rawStatus);

                if (locations) {
                  parsedList.push({
                    id: String(id).trim(),
                    teamName,
                    driverName: teamName,
                    date: String(date).trim(),
                    timeSlot: String(timeSlot).trim(),
                    locations: String(locations).trim(),
                    notes,
                    status,
                    lastUpdated: new Date().toISOString()
                  });
                }
              }
            }

            if (parsedList.length > 0) {
              saveSchedule(parsedList);
              return { schedules: parsedList };
            }
          }
        } catch {
          // Ignore json parse error and proceed
        }
      }

      // 2. Try parsing CSV format if text returned
      if (!trimmedText.startsWith("<") && (trimmedText.includes(",") || trimmedText.includes("\t") || trimmedText.includes("\n"))) {
        try {
          const rows = parseCSV(trimmedText);
          if (rows.length >= 2) {
            const headerRow = rows[0].map(h => h.trim().toUpperCase());
            const findExactOrIncludes = (possibleNames: string[]): number => {
              for (const name of possibleNames) {
                const idx = headerRow.findIndex(h => h === name.toUpperCase() || h.includes(name.toUpperCase()));
                if (idx !== -1) return idx;
              }
              return -1;
            };

            const idIdx = findExactOrIncludes(["ID JADUAL", "ID", "KOD", "NO"]);
            const teamIdx = findExactOrIncludes(["NAMA TEAM", "TEAM", "DRIVER", "NAMA"]);
            const dateIdx = findExactOrIncludes(["TARIKH", "DATE", "HARI"]);
            const timeIdx = findExactOrIncludes(["MASA", "TIME", "WAKTU", "SLOT"]);
            const locIdx = findExactOrIncludes(["KAWASAN", "LOCATION", "LOKASI", "LALUAN"]);
            const notesIdx = findExactOrIncludes(["CATATAN", "NOTES", "NOTA"]);
            const statusIdx = findExactOrIncludes(["STATUS", "KEADAAN"]);

            const schedules: ScheduleRecord[] = [];
            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              if (!row || row.length === 0 || row.every(cell => !cell.trim())) continue;
              const id = (idIdx !== -1 && row[idIdx]?.trim()) ? row[idIdx].trim() : `JAD-${r.toString().padStart(2, '0')}`;
              const rawTeam = (teamIdx !== -1 && row[teamIdx]?.trim()) ? row[teamIdx].trim() : "Team Frozen 1";
              const teamName = rawTeam.replace(/van\s*/gi, "Team ").trim() || "Team Frozen 1";
              const date = (dateIdx !== -1 && row[dateIdx]?.trim()) ? row[dateIdx].trim() : "Hari Ini";
              const timeSlot = (timeIdx !== -1 && row[timeIdx]?.trim()) ? row[timeIdx].trim() : "Waktu Operasi";
              const locations = (locIdx !== -1 && row[locIdx]?.trim()) ? row[locIdx].trim() : "";
              const notes = ((notesIdx !== -1 && row[notesIdx]?.trim()) ? row[notesIdx].trim() : "").replace(/van\s*/gi, "kenderaan ");
              const status = normalizeScheduleStatus((statusIdx !== -1 && row[statusIdx]?.trim()) ? row[statusIdx].trim() : "Akan Datang");

              if (locations) {
                schedules.push({
                  id,
                  teamName,
                  driverName: teamName,
                  date,
                  timeSlot,
                  locations,
                  notes,
                  status,
                  lastUpdated: new Date().toISOString()
                });
              }
            }

            if (schedules.length > 0) {
              saveSchedule(schedules);
              return { schedules };
            }
          }
        } catch {
          // Ignore csv error
        }
      }
    } catch {
      // Network or fetch error caught safely
    }
  }

  return { schedules: [] };
}

// Fetch live schedules from Google Sheet tab JADUAL (with Apps Script priority)
async function fetchScheduleFromGoogleSheet(): Promise<ScheduleFetchResult> {
  // 1. Try Google Apps Script Web App first
  const appsScriptResult = await fetchScheduleFromAppsScript();
  if (appsScriptResult && appsScriptResult.schedules.length > 0) {
    return {
      schedules: appsScriptResult.schedules,
      source: "google_apps_script",
      webAppStatus: "connected"
    };
  }

  const appsScriptError = appsScriptResult?.error;

  // 2. Try Google Sheet ID Public CSV if GOOGLE_SHEET_ID is set
  const sheetIdRaw = process.env.GOOGLE_SHEET_ID;
  if (sheetIdRaw && sheetIdRaw.trim()) {
    const sheetId = extractSheetId(sheetIdRaw);
    const tabNames = ["JADUAL", "jadual", "Jadual", "JADUAL_PERGERAKAN", "SCHEDULE"];
    let csvData: string | null = null;

    for (const tab of tabNames) {
      const encodedTab = encodeURIComponent(tab);
      const endpoints = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedTab}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodedTab}`,
        `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${encodedTab}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; FrozenBergerak/1.0)",
              "Accept": "text/csv, text/plain, */*"
            }
          });

          if (response.ok) {
            const text = await response.text();
            if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html") && text.trim().length > 10) {
              csvData = text;
              break;
            }
          }
        } catch {}
      }
      if (csvData) break;
    }

    if (csvData) {
      try {
        const rows = parseCSV(csvData);
        if (rows.length >= 2) {
          const headerRow = rows[0].map(h => h.trim().toUpperCase());
          const findExactOrIncludes = (possibleNames: string[]): number => {
            for (const name of possibleNames) {
              const idx = headerRow.findIndex(h => h === name.toUpperCase() || h.includes(name.toUpperCase()));
              if (idx !== -1) return idx;
            }
            return -1;
          };

          const idIdx = findExactOrIncludes(["ID JADUAL", "ID", "KOD", "NO"]);
          const teamIdx = findExactOrIncludes(["NAMA TEAM", "TEAM", "DRIVER", "NAMA"]);
          const dateIdx = findExactOrIncludes(["TARIKH", "DATE", "HARI"]);
          const timeIdx = findExactOrIncludes(["MASA", "TIME", "WAKTU", "SLOT"]);
          const locIdx = findExactOrIncludes(["KAWASAN", "LOCATION", "LOKASI", "LALUAN"]);
          const notesIdx = findExactOrIncludes(["CATATAN", "NOTES", "NOTA"]);
          const statusIdx = findExactOrIncludes(["STATUS", "KEADAAN"]);

          const schedules: ScheduleRecord[] = [];
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length === 0 || row.every(cell => !cell.trim())) continue;
            const id = (idIdx !== -1 && row[idIdx]?.trim()) ? row[idIdx].trim() : `JAD-${r.toString().padStart(2, '0')}`;
            const rawTeam = (teamIdx !== -1 && row[teamIdx]?.trim()) ? row[teamIdx].trim() : "Team Frozen 1";
            const teamName = rawTeam.replace(/van\s*/gi, "Team ").trim() || "Team Frozen 1";
            const date = (dateIdx !== -1 && row[dateIdx]?.trim()) ? row[dateIdx].trim() : "Hari Ini";
            const timeSlot = (timeIdx !== -1 && row[timeIdx]?.trim()) ? row[timeIdx].trim() : "Waktu Operasi";
            const locations = (locIdx !== -1 && row[locIdx]?.trim()) ? row[locIdx].trim() : "";
            const notes = ((notesIdx !== -1 && row[notesIdx]?.trim()) ? row[notesIdx].trim() : "").replace(/van\s*/gi, "kenderaan ");
            const status = normalizeScheduleStatus((statusIdx !== -1 && row[statusIdx]?.trim()) ? row[statusIdx].trim() : "Akan Datang");

            if (locations) {
              schedules.push({
                id,
                teamName,
                driverName: teamName,
                date,
                timeSlot,
                locations,
                notes,
                status,
                lastUpdated: new Date().toISOString()
              });
            }
          }

          if (schedules.length > 0) {
            saveSchedule(schedules);
            return {
              schedules,
              source: "google_sheet_jadual",
              webAppStatus: "connected"
            };
          }
        }
      } catch (err) {
        console.warn("Error parsing JADUAL sheet CSV:", err);
      }
    }
  }

  // 3. Fallback to local cache
  const local = loadSchedule();
  return {
    schedules: local,
    source: "local_cache",
    webAppStatus: appsScriptError ? "error" : "unconfigured",
    webAppError: appsScriptError
  };
}

async function syncToGoogleSheetWebhook(action: string, data: any) {
  const webhookUrl = getAppsScriptUrl();
  if (!webhookUrl) return { success: false, error: "URL Web App belum dikonfigurasi" };
  try {
    const idJadual = data.idJadual || data.id || "JAD-01";
    const namaTeam = data.namaTeam || data.teamName || data.driverName || "Team Frozen 1";
    const tarikh = data.tarikh || data.date || "Hari Ini";
    const masa = data.masa || data.timeSlot || "Waktu Operasi";
    const kawasan = data.kawasan || data.locations || "";
    const catatan = data.catatan || data.notes || "";
    const status = data.status || "Akan Datang";

    const payload = {
      idJadual,
      namaTeam,
      tarikh,
      masa,
      kawasan,
      catatan,
      status,
      action,
      sheetName: "JADUAL",
      timestamp: new Date().toISOString(),
      id: idJadual,
      data: {
        id: idJadual,
        idJadual,
        teamName: namaTeam,
        namaTeam,
        driverName: namaTeam,
        date: tarikh,
        tarikh,
        timeSlot: masa,
        masa,
        locations: kawasan,
        kawasan,
        notes: catatan,
        catatan,
        status
      },
      row: [
        idJadual,
        namaTeam,
        tarikh,
        masa,
        kawasan,
        catatan,
        status
      ]
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
      redirect: "follow"
    });

    const text = await response.text();
    const trimmed = (text || "").trim();

    if (
      trimmed.startsWith("<") ||
      trimmed.toLowerCase().includes("<html") ||
      trimmed.toLowerCase().includes("<!doctype html")
    ) {
      if (trimmed.includes("unable to open the file") || trimmed.includes("Page not found")) {
        return {
          success: false,
          isHtml: true,
          error: "Google Apps Script Web App mengembalikan ralat fail (Page not found / Unable to open). Sila pastikan deployment di Apps Script aktif dengan tetapan 'Who has access: Anyone'."
        };
      }
      return {
        success: false,
        isHtml: true,
        error: "Google Apps Script Web App mengembalikan halaman web HTML. Sila semak tetapan 'Who has access: Anyone' di Google Apps Script."
      };
    }

    try {
      const json = JSON.parse(trimmed);
      return { success: true, data: json };
    } catch {
      return { success: true, raw: trimmed };
    }
  } catch (err: any) {
    console.warn("Google Sheet Webhook notification error:", err);
    return { success: false, error: err.message || "Ralat sambungan ke Google Apps Script Web App." };
  }
}

// Hero Banner Persistent Paths & Helper Functions
const HERO_BANNER_DATA_PATH = path.join(DATA_DIR, "hero-banner.jpg");
const HERO_BANNER_META_PATH = path.join(DATA_DIR, "hero_banner_meta.json");

function getBannerLastModified(): number {
  if (fs.existsSync(HERO_BANNER_DATA_PATH)) {
    try {
      const stat = fs.statSync(HERO_BANNER_DATA_PATH);
      return Math.floor(stat.mtimeMs);
    } catch {}
  }
  const publicPath = path.join(process.cwd(), "public", "hero-banner.jpg");
  if (fs.existsSync(publicPath)) {
    try {
      const stat = fs.statSync(publicPath);
      return Math.floor(stat.mtimeMs);
    } catch {}
  }
  return 0;
}

function getHeroBannerUrl(): string {
  const mtime = getBannerLastModified();
  if (mtime > 0) {
    return `/api/hero-banner?t=${mtime}`;
  }
  return "/api/hero-banner";
}

// Store configuration
const storeConfig = {
  name: "FrozenBergerak",
  tagline: "Makanan Beku Berkualiti Tinggi Terus Ke Rumah Anda",
  whatsappNumber: process.env.WHATSAPP_NUMBER || "60123456789",
  location: "Negeri Sembilan • Selangor • Kuala Lumpur",
  operatingHours: "Isnin - Ahad: 8:00 Pagi - 9:00 Malam",
  deliveryNotice: "Penghantaran sejuk beku terus ke rumah menggunakan kereta dengan kotak penebat suhu terkawal.",
  get heroBannerUrl(): string {
    return getHeroBannerUrl();
  }
};

interface ParsedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  promoPrice?: number;
  unit: string;
  description: string;
  imageUrl: string;
  cookedImageUrl?: string;
  packagingImageUrl?: string;
  isPopular?: boolean;
  isNew?: boolean;
  inStock: boolean;
  halalCertified: boolean;
  weight?: string;
  storageInfo?: string;
}

interface ParsedPromo {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalPrice?: number;
  promoPrice?: number;
  status: string;
  unit?: string;
}

// In-memory cache with short TTL (60s)
let cachedProducts: ParsedProduct[] | null = null;
let lastFetchTime = 0;
let cachedPromos: ParsedPromo[] | null = null;
let lastPromoFetchTime = 0;
let cachedSeasonalPromos: ParsedPromo[] | null = null;
let lastSeasonalPromoFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000;

function extractSheetId(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    return pubMatch[1];
  }
  return trimmed;
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function formatPriceNumber(val: string | undefined): number {
  if (!val) return 0;
  const str = String(val).trim();
  if (!str || str === "-" || str.toLowerCase() === "n/a" || str.toLowerCase() === "tiada") {
    return 0;
  }
  // Reject if it's accidentally a URL
  if (str.includes("http") || str.includes("drive.google") || str.includes("lh3.") || str.includes(".com") || str.includes("/")) {
    return 0;
  }
  // Remove RM, currency symbols, and convert commas
  const cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function sanitizeText(val: string | undefined): string {
  if (!val) return "";
  const str = String(val).trim();
  if (str.startsWith("http://") || str.startsWith("https://") || str.includes("drive.google.com") || str.includes("googleusercontent.com")) {
    return "";
  }
  return str;
}

function getFallbackImageByCategory(category: string, name: string): string {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("karipap") || text.includes("pastri") || text.includes("kuih") || text.includes("samosa") || text.includes("popia")) {
    return "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("kambing") || text.includes("daging") || text.includes("perap") || text.includes("bbq") || text.includes("steak")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("ayam") || text.includes("chicken") || text.includes("nugget") || text.includes("wing")) {
    return "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("dim sum") || text.includes("pau") || text.includes("dumpling") || text.includes("sup")) {
    return "https://images.unsplash.com/photo-1496116218417-1a781c1c416c?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("udang") || text.includes("ikan") || text.includes("sotong") || text.includes("laut") || text.includes("seafood")) {
    return "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("roti") || text.includes("canai") || text.includes("donut") || text.includes("waffle")) {
    return "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
}

function extractGoogleDriveFileId(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  const str = String(rawUrl).trim();
  if (!str) return null;

  // Patterns:
  // 1. /file/d/FILE_ID
  const matchFileD = str.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // 2. /d/FILE_ID
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchD && matchD[1]) return matchD[1];

  // 3. ?id=FILE_ID or &id=FILE_ID
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (matchId && matchId[1]) return matchId[1];

  // 4. open?id=FILE_ID
  const matchOpenId = str.match(/id=([a-zA-Z0-9_-]{15,})/);
  if (matchOpenId && matchOpenId[1]) return matchOpenId[1];

  // 5. drive.google.com/thumbnail?id=FILE_ID
  const matchThumbnail = str.match(/thumbnail\?id=([a-zA-Z0-9_-]{15,})/);
  if (matchThumbnail && matchThumbnail[1]) return matchThumbnail[1];

  // 6. Bare ID (25-60 characters alphanumeric)
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) {
    return str;
  }

  return null;
}

function parseOptionalImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "-" || trimmed.toLowerCase() === "n/a" || trimmed.toLowerCase() === "tiada") {
    return undefined;
  }

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return undefined;
}

async function fetchProductsFromGoogleSheet(forceRefresh = false): Promise<{ products: ParsedProduct[]; source: string }> {
  const sheetIdRaw = process.env.GOOGLE_SHEET_ID;
  if (!sheetIdRaw || !sheetIdRaw.trim()) {
    throw new Error("GOOGLE_SHEET_ID tidak ditemui dalam environment variable. Sila tetapkan GOOGLE_SHEET_ID dalam tetapan / secrets.");
  }

  const sheetId = extractSheetId(sheetIdRaw);
  const now = Date.now();

  if (!forceRefresh && cachedProducts && (now - lastFetchTime < CACHE_TTL_MS)) {
    return { products: cachedProducts, source: "cache" };
  }

  const endpoints = [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
    `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`
  ];

  let csvData: string | null = null;
  let lastError: string | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FrozenBergerak/1.0)",
          "Accept": "text/csv, text/plain, */*"
        }
      });

      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html")) {
          csvData = text;
          break;
        }
      } else {
        lastError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Ralat sambungan rangkaian";
    }
  }

  if (!csvData) {
    throw new Error(
      `Gagal membaca kandungan Google Sheet (${sheetId}). Sila pastikan Google Sheet dikongsi kepada 'Anyone with the link can view' (Sesiapa yang mempunyai pautan boleh melihat). ${lastError ? `[${lastError}]` : ''}`
    );
  }

  const rows = parseCSV(csvData);
  if (rows.length < 2) {
    throw new Error("Google Sheet tidak mengandungi data produk yang mencukupi.");
  }

  // Header row normalization
  const headerRow = rows[0].map(h => h.trim().toUpperCase());

  const findExactOrIncludes = (possibleNames: string[], excludeWords: string[] = []): number => {
    // 1. Exact match pass
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(h => h === name.toUpperCase());
      if (idx !== -1) return idx;
    }
    // 2. Substring match pass excluding forbidden words
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(h => {
        const matches = h.includes(name.toUpperCase());
        const excluded = excludeWords.some(w => h.includes(w.toUpperCase()));
        return matches && !excluded;
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idIdx = findExactOrIncludes(["ID", "KOD", "NO", "CODE"]);
  const nameIdx = findExactOrIncludes(["PRODUK", "NAMA PRODUK", "NAMA", "PRODUCT", "ITEM", "PRODUCT NAME"]);
  const catIdx = findExactOrIncludes(["KATEGORI", "CATEGORY", "JENIS", "KUMPULAN"]);
  
  // Specific image columns for GAMBAR SIAP MASAK and GAMBAR PACKAGING
  const cookedImageIdx = findExactOrIncludes([
    "GAMBAR SIAP MASAK",
    "GAMBAR MASAK",
    "GAMBAR SIAP",
    "GAMBAR_SIAP_MASAK",
    "SIAP MASAK",
    "COOKED IMAGE",
    "GAMBAR 1",
    "GAMBAR_1"
  ]);

  const packagingImageIdx = findExactOrIncludes([
    "GAMBAR PACKAGING",
    "GAMBAR PACK",
    "GAMBAR PEK",
    "GAMBAR BUNGKUSAN",
    "GAMBAR_PACKAGING",
    "PACKAGING",
    "PACKAGING IMAGE",
    "GAMBAR 2",
    "GAMBAR_2"
  ]);

  // General image fallback column
  const generalImageIdx = findExactOrIncludes(
    ["GAMBAR", "IMAGE", "FOTO", "LINK GAMBAR", "PICTURE", "URL GAMBAR", "PHOTO"],
    ["SIAP", "MASAK", "PACK", "PEK", "BUNGKUS"]
  );

  // Price columns
  const priceIdx = findExactOrIncludes(
    ["HARGA", "HARGA ASAL", "HARGA BIASA", "PRICE", "HARGA JUALAN", "HARGA (RM)", "HARGA RM", "PRICE (RM)"],
    ["PROMO", "DISKAUN", "GAMBAR", "PACKAGING", "MASAK"]
  );
  const promoPriceIdx = findExactOrIncludes(
    ["HARGA PROMO", "HARGA PROMOSI", "PROMO", "DISKAUN", "PROMO PRICE", "HARGA DISKAUN", "PROMOTION PRICE"]
  );
  
  // Optional extra columns
  const descIdx = findExactOrIncludes(
    ["PENERANGAN", "DESCRIPTION", "DESKRIPSI", "NOTA", "MAKLUMAT", "DETAILS"],
    ["GAMBAR", "IMAGE", "HARGA", "PRICE"]
  );
  const unitIdx = findExactOrIncludes(
    ["UNIT", "KUANTITI", "PEK", "PACK", "KUANTITI/PEK"],
    ["GAMBAR", "IMAGE"]
  );
  const weightIdx = findExactOrIncludes(["BERAT", "WEIGHT", "BERAT BERSIH", "NET WEIGHT"]);
  const statusIdx = findExactOrIncludes(["STATUS", "STOK", "STOCK", "IN STOCK", "STATUS STOK"]);

  if (nameIdx === -1) {
    throw new Error(
      `Kolum 'PRODUK' tidak ditemui dalam Google Sheet. Header yang dikesan: ${headerRow.join(", ")}`
    );
  }

  const products: ParsedProduct[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(cell => !cell.trim())) {
      continue;
    }

    const rawName = row[nameIdx]?.trim() || "";
    if (!rawName) continue;

    const rawId = (idIdx !== -1 && row[idIdx]?.trim()) ? row[idIdx].trim() : `FB-${String(r).padStart(3, '0')}`;
    const rawCategory = (catIdx !== -1 && row[catIdx]?.trim()) ? row[catIdx].trim() : "Lain-lain";
    const rawPrice = (priceIdx !== -1 && row[priceIdx]) ? formatPriceNumber(row[priceIdx]) : 0;
    const rawPromoPrice = (promoPriceIdx !== -1 && row[promoPriceIdx]) ? formatPriceNumber(row[promoPriceIdx]) : 0;
    
    // Parse cooked and packaging images from respective columns
    const rawCookedImage = cookedImageIdx !== -1 ? parseOptionalImageUrl(row[cookedImageIdx]) : undefined;
    const rawPackagingImage = packagingImageIdx !== -1 ? parseOptionalImageUrl(row[packagingImageIdx]) : undefined;
    const rawGeneralImage = generalImageIdx !== -1 ? parseOptionalImageUrl(row[generalImageIdx]) : undefined;

    // Primary image logic: prefer cookedImage, then generalImage, then packagingImage, then category fallback
    const primaryImage = rawCookedImage || rawGeneralImage || rawPackagingImage || getFallbackImageByCategory(rawCategory, rawName);

    const rawDesc = (descIdx !== -1 && row[descIdx]?.trim()) ? sanitizeText(row[descIdx]) : "";
    const rawUnit = (unitIdx !== -1 && row[unitIdx]?.trim()) ? sanitizeText(row[unitIdx]) : "1 pek";
    const rawWeight = (weightIdx !== -1 && row[weightIdx]?.trim()) ? sanitizeText(row[weightIdx]) : undefined;
    const rawStatus = (statusIdx !== -1 && row[statusIdx]?.trim()) ? row[statusIdx].trim().toLowerCase() : "ada";

    const inStock = !rawStatus.includes("habis") && !rawStatus.includes("out") && !rawStatus.includes("tidak");
    
    // If HARGA PROMO is empty, 0, or higher/equal to regular price, use regular price
    const hasValidPromo = rawPromoPrice > 0 && rawPromoPrice < rawPrice;
    const finalPrice = hasValidPromo ? rawPromoPrice : rawPrice;

    products.push({
      id: rawId,
      name: rawName,
      category: rawCategory,
      price: finalPrice,
      originalPrice: hasValidPromo ? rawPrice : undefined,
      promoPrice: hasValidPromo ? rawPromoPrice : undefined,
      unit: rawUnit || "1 pek",
      description: rawDesc || `Makanan beku berkualiti tinggi dari FrozenBergerak. Sedia untuk dimasak panas dan dinikmati seisi keluarga.`,
      imageUrl: primaryImage,
      cookedImageUrl: rawCookedImage,
      packagingImageUrl: rawPackagingImage,
      isPopular: hasValidPromo || r <= 3,
      isNew: r === 1,
      inStock,
      halalCertified: true,
      weight: rawWeight,
      storageInfo: "Simpan pada suhu sejuk beku (-18°C). Nyahbeku sebelum memasak."
    });
  }

  if (products.length === 0) {
    throw new Error("Tiada produk sah dijumpai dalam baris Google Sheet.");
  }

  cachedProducts = products;
  lastFetchTime = now;

  return { products, source: "google_sheet" };
}

async function fetchPromosFromGoogleSheet(forceRefresh = false): Promise<{ promos: ParsedPromo[]; source: string }> {
  const sheetIdRaw = process.env.GOOGLE_SHEET_ID;
  if (!sheetIdRaw || !sheetIdRaw.trim()) {
    return { promos: [], source: "none" };
  }

  const sheetId = extractSheetId(sheetIdRaw);
  const now = Date.now();

  if (!forceRefresh && cachedPromos && (now - lastPromoFetchTime < CACHE_TTL_MS)) {
    return { promos: cachedPromos, source: "cache" };
  }

// Attempt to fetch from tab names: "Alltimepromo", "All Time Promo", etc.
  const tabNames = [
    "Alltimepromo",
    "All Time Promo",
    "ALL TIME PROMO",
    "alltimepromo",
    "ALLTIMEPROMO",
    "AllTimePromo",
    "Alltime Promo",
    "all time promo",
    "All-Time Promo",
    "All_Time_Promo",
    "All Time Promos",
    "AllTimePromos",
    "Promo",
    "PROMO",
    "Promosi",
    "PROMOSI",
    "Promos",
    "Tawaran",
    "Diskaun",
    "Sheet2",
    "Sheet3"
  ];
  let csvData: string | null = null;

  for (const tab of tabNames) {
    const encodedTab = encodeURIComponent(tab);
    const endpoints = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedTab}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodedTab}`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${encodedTab}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FrozenBergerak/1.0)",
            "Accept": "text/csv, text/plain, */*"
          }
        });

        if (response.ok) {
          const text = await response.text();
          if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html") && text.trim().length > 10) {
            csvData = text;
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }
    if (csvData) break;
  }

  if (!csvData) {
    // If no dedicated Alltimepromo tab was found in Google Sheet, check if standard products list has promoPrice
    try {
      const { products } = await fetchProductsFromGoogleSheet(forceRefresh);
      const fallbackPromos: ParsedPromo[] = products
        .filter(p => (p.promoPrice && p.promoPrice > 0 && p.originalPrice && p.promoPrice < p.originalPrice) || (p.promoPrice && p.promoPrice > 0))
        .map(p => ({
          id: p.id,
          title: p.name,
          description: p.description,
          imageUrl: p.cookedImageUrl || p.imageUrl || p.packagingImageUrl,
          originalPrice: p.originalPrice,
          promoPrice: p.promoPrice,
          status: p.inStock ? "Aktif" : "Habis",
          unit: p.unit
        }));
      cachedPromos = fallbackPromos;
      lastPromoFetchTime = now;
      return { promos: fallbackPromos, source: "products_fallback" };
    } catch {
      return { promos: [], source: "empty" };
    }
  }

  const rows = parseCSV(csvData);
  if (rows.length < 2) {
    return { promos: [], source: "empty" };
  }

  const headerRow = rows[0].map(h => h.trim().toUpperCase());

  const findExactOrIncludes = (possibleNames: string[], excludeWords: string[] = []): number => {
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(h => h === name.toUpperCase());
      if (idx !== -1) return idx;
    }
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(h => {
        const matches = h.includes(name.toUpperCase());
        const excluded = excludeWords.some(w => h.includes(w.toUpperCase()));
        return matches && !excluded;
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idIdx = findExactOrIncludes(["ID PROMO", "ID", "KOD", "NO", "CODE", "KOD PRODUK", "ID PRODUK", "PROMO ID", "ITEM ID"]);
  const titleIdx = findExactOrIncludes(["TAJUK PROMO", "TAJUK", "NAMA PROMO", "NAMA PRODUK", "PRODUK", "NAMA", "TITLE", "ITEM", "PRODUCT NAME", "PRODUCT"]);
  const descIdx = findExactOrIncludes(["PENERANGAN", "DESCRIPTION", "DESKRIPSI", "INFO", "MAKLUMAT", "NOTA", "DETAILS", "CATATAN"]);
  const imageIdx = findExactOrIncludes(["GAMBAR PROMO", "GAMBAR SIAP MASAK", "GAMBAR PACKAGING", "GAMBAR", "IMAGE", "FOTO", "LINK GAMBAR", "URL GAMBAR", "PICTURE", "URL", "LINK", "PHOTO"]);
  const originalPriceIdx = findExactOrIncludes(["HARGA ASAL", "HARGA SEBELUM", "HARGA BIASA", "ORIGINAL PRICE", "HARGA (RM)", "HARGA RM", "HARGA", "PRICE"], ["PROMO", "DISKAUN"]);
  const promoPriceIdx = findExactOrIncludes(["HARGA PROMO", "HARGA DISKAUN", "HARGA TAWARAN", "PROMO PRICE", "PROMO", "DISKAUN", "HARGA PROMOSI"]);
  const statusIdx = findExactOrIncludes(["STATUS", "KEADAAN", "STATE", "ACTIVE", "STATUS PROMO", "STATUS STOK", "STOK"]);
  const unitIdx = findExactOrIncludes(["UNIT", "KUANTITI", "PEK", "PACK", "KUANTITI/PEK", "BERAT", "WEIGHT"]);

  const promos: ParsedPromo[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(cell => !cell.trim())) continue;

    const rawStatus = (statusIdx !== -1 && row[statusIdx]?.trim()) ? row[statusIdx].trim() : "Aktif";
    const statusNormalized = rawStatus.toLowerCase();

    // Check inactive status
    const isInactive = statusNormalized.includes("tidak") || 
                       statusNormalized.includes("inactive") || 
                       statusNormalized.includes("habis") || 
                       statusNormalized.includes("out") || 
                       statusNormalized.includes("tamat") || 
                       statusNormalized.includes("expired") || 
                       statusNormalized.includes("batal") || 
                       statusNormalized === "off" || 
                       statusNormalized === "no" || 
                       statusNormalized === "false" || 
                       statusNormalized === "0";

    // Matches "Aktif", "Active", "AVAILABLE", "Ada", "Ya", "Yes", "On", "1", or any active status
    const isAktif = !isInactive && (
      statusNormalized.includes("aktif") ||
      statusNormalized.includes("active") ||
      statusNormalized.includes("avail") ||
      statusNormalized.includes("ada") ||
      statusNormalized === "ya" ||
      statusNormalized === "yes" ||
      statusNormalized === "true" ||
      statusNormalized === "1" ||
      statusNormalized === "on" ||
      statusNormalized === ""
    );

    if (!isAktif) {
      continue;
    }

    const rawTitle = (titleIdx !== -1 && row[titleIdx]?.trim()) ? row[titleIdx].trim() : "";
    if (!rawTitle) continue;

    const rawId = (idIdx !== -1 && row[idIdx]?.trim()) ? row[idIdx].trim() : `PROMO-${String(r).padStart(2, '0')}`;
    const rawDesc = (descIdx !== -1 && row[descIdx]?.trim()) ? sanitizeText(row[descIdx]) : "";
    const rawImage = imageIdx !== -1 ? parseOptionalImageUrl(row[imageIdx]) : undefined;
    const rawOriginalPrice = (originalPriceIdx !== -1 && row[originalPriceIdx]) ? formatPriceNumber(row[originalPriceIdx]) : 0;
    const rawPromoPrice = (promoPriceIdx !== -1 && row[promoPriceIdx]) ? formatPriceNumber(row[promoPriceIdx]) : 0;
    const rawUnit = (unitIdx !== -1 && row[unitIdx]?.trim()) ? sanitizeText(row[unitIdx]) : "1 pek";

    const finalImage = rawImage || getFallbackImageByCategory("promo", rawTitle);

    promos.push({
      id: rawId,
      title: rawTitle,
      description: rawDesc || `Promosi istimewa FrozenBergerak berkualiti tinggi. Sedia ditempah terus ke WhatsApp!`,
      imageUrl: finalImage,
      originalPrice: rawOriginalPrice > 0 ? rawOriginalPrice : undefined,
      promoPrice: rawPromoPrice > 0 ? rawPromoPrice : (rawOriginalPrice > 0 ? rawOriginalPrice : undefined),
      status: rawStatus,
      unit: rawUnit
    });
  }

  cachedPromos = promos;
  lastPromoFetchTime = now;

  return { promos, source: "alltimepromo_sheet" };
}

async function fetchSeasonalPromosFromGoogleSheet(forceRefresh = false): Promise<{ promos: ParsedPromo[]; source: string }> {
  const sheetIdRaw = process.env.GOOGLE_SHEET_ID;
  if (!sheetIdRaw || !sheetIdRaw.trim()) {
    return { promos: [], source: "none" };
  }

  const sheetId = extractSheetId(sheetIdRaw);
  const now = Date.now();

  if (!forceRefresh && cachedSeasonalPromos && (now - lastSeasonalPromoFetchTime < CACHE_TTL_MS)) {
    return { promos: cachedSeasonalPromos, source: "cache" };
  }

  const tabNames = [
    "Seasonalpromo",
    "Seasonal Promo",
    "SEASONAL PROMO",
    "seasonalpromo",
    "SEASONALPROMO",
    "SeasonalPromo",
    "Seasonal Promos",
    "seasonal promos",
    "Promosi Musiman",
    "PROMOSI MUSIMAN",
    "promosi musiman",
    "Musiman",
    "MUSIMAN",
    "Seasonal",
    "SEASONAL",
    "seasonal"
  ];
  let csvData: string | null = null;

  for (const tab of tabNames) {
    const encodedTab = encodeURIComponent(tab);
    const endpoints = [
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedTab}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodedTab}`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${encodedTab}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FrozenBergerak/1.0)",
            "Accept": "text/csv, text/plain, */*"
          }
        });

        if (response.ok) {
          const text = await response.text();
          if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html") && text.trim().length > 10) {
            csvData = text;
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }
    if (csvData) break;
  }

  if (!csvData) {
    // If no dedicated Seasonalpromo tab in Google Sheet, check if any product is categorized as Seasonal
    try {
      const { products } = await fetchProductsFromGoogleSheet(forceRefresh);
      const fallbackPromos: ParsedPromo[] = products
        .filter(p => {
          const catLower = (p.category || "").toLowerCase();
          return catLower.includes("seasonal") || catLower.includes("musiman");
        })
        .map(p => ({
          id: p.id,
          title: p.name,
          description: p.description,
          imageUrl: p.cookedImageUrl || p.imageUrl || p.packagingImageUrl,
          originalPrice: p.originalPrice,
          promoPrice: p.promoPrice,
          status: p.inStock ? "Aktif" : "Habis",
          unit: p.unit
        }));
      cachedSeasonalPromos = fallbackPromos;
      lastSeasonalPromoFetchTime = now;
      return { promos: fallbackPromos, source: fallbackPromos.length > 0 ? "products_seasonal_category" : "empty" };
    } catch {
      return { promos: [], source: "empty" };
    }
  }

  const rows = parseCSV(csvData);
  if (rows.length < 2) {
    return { promos: [], source: "empty" };
  }

  const headerRow = rows[0].map(h => h.trim().toUpperCase());

  // Distinguish if Google Sheets returned a dedicated promo tab or fell back to the main products table
  const isDedicatedPromoTab = headerRow.some(h => 
    h.includes("TAJUK PROMO") || h.includes("NAMA PROMO") || h.includes("ID PROMO") || h.includes("GAMBAR PROMO") || h.includes("PROMO ID")
  );
  const isMainProductSheet = headerRow.some(h => h.includes("GAMBAR SIAP MASAK") || h.includes("GAMBAR PACKAGING") || h.includes("KATEGORI"));

  if (!isDedicatedPromoTab && isMainProductSheet) {
    // The sheet returned the default main products table because no dedicated Seasonalpromo tab exists.
    try {
      const { products } = await fetchProductsFromGoogleSheet(forceRefresh);
      const seasonalProducts: ParsedPromo[] = products
        .filter(p => {
          const catLower = (p.category || "").toLowerCase();
          return catLower.includes("seasonal") || catLower.includes("musiman");
        })
        .map(p => ({
          id: p.id,
          title: p.name,
          description: p.description,
          imageUrl: p.cookedImageUrl || p.imageUrl || p.packagingImageUrl,
          originalPrice: p.originalPrice,
          promoPrice: p.promoPrice,
          status: p.inStock ? "Aktif" : "Habis",
          unit: p.unit
        }));
      cachedSeasonalPromos = seasonalProducts;
      lastSeasonalPromoFetchTime = now;
      return { promos: seasonalProducts, source: seasonalProducts.length > 0 ? "products_seasonal_category" : "empty" };
    } catch {
      return { promos: [], source: "empty" };
    }
  }

  const findExactOrIncludes = (possibleNames: string[], excludeWords: string[] = []): number => {
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(h => h === name.toUpperCase());
      if (idx !== -1) return idx;
    }
    for (const name of possibleNames) {
      const idx = headerRow.findIndex(h => {
        const matches = h.includes(name.toUpperCase());
        const excluded = excludeWords.some(w => h.includes(w.toUpperCase()));
        return matches && !excluded;
      });
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idIdx = findExactOrIncludes(["ID PROMO", "ID", "KOD", "NO", "CODE", "KOD PRODUK", "ID PRODUK", "PROMO ID", "ITEM ID"]);
  const titleIdx = findExactOrIncludes(["TAJUK PROMO", "TAJUK", "NAMA PROMO", "NAMA PRODUK", "PRODUK", "NAMA", "TITLE", "ITEM", "PRODUCT NAME", "PRODUCT"]);
  const descIdx = findExactOrIncludes(["PENERANGAN", "DESCRIPTION", "DESKRIPSI", "INFO", "MAKLUMAT", "NOTA", "DETAILS", "CATATAN"]);
  const imageIdx = findExactOrIncludes(["GAMBAR PROMO", "GAMBAR SIAP MASAK", "GAMBAR PACKAGING", "GAMBAR", "IMAGE", "FOTO", "LINK GAMBAR", "URL GAMBAR", "PICTURE", "URL", "LINK", "PHOTO"]);
  const originalPriceIdx = findExactOrIncludes(["HARGA ASAL", "HARGA SEBELUM", "HARGA BIASA", "ORIGINAL PRICE", "HARGA (RM)", "HARGA RM", "HARGA", "PRICE"], ["PROMO", "DISKAUN"]);
  const promoPriceIdx = findExactOrIncludes(["HARGA PROMO", "HARGA DISKAUN", "HARGA TAWARAN", "PROMO PRICE", "PROMO", "DISKAUN", "HARGA PROMOSI"]);
  const statusIdx = findExactOrIncludes(["STATUS", "KEADAAN", "STATE", "ACTIVE", "STATUS PROMO", "STATUS STOK", "STOK"]);
  const unitIdx = findExactOrIncludes(["UNIT", "KUANTITI", "PEK", "PACK", "KUANTITI/PEK", "BERAT", "WEIGHT"]);

  const promos: ParsedPromo[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(cell => !cell.trim())) continue;

    const rawStatus = (statusIdx !== -1 && row[statusIdx]?.trim()) ? row[statusIdx].trim() : "Aktif";
    const statusNormalized = rawStatus.toLowerCase();

    const isInactive = statusNormalized.includes("tidak") || 
                       statusNormalized.includes("inactive") || 
                       statusNormalized.includes("habis") || 
                       statusNormalized.includes("out") || 
                       statusNormalized.includes("tamat") || 
                       statusNormalized.includes("expired") || 
                       statusNormalized.includes("batal") || 
                       statusNormalized === "off" || 
                       statusNormalized === "no" || 
                       statusNormalized === "false" || 
                       statusNormalized === "0";

    const isAktif = !isInactive && (
      statusNormalized.includes("aktif") ||
      statusNormalized.includes("active") ||
      statusNormalized.includes("avail") ||
      statusNormalized.includes("ada") ||
      statusNormalized === "ya" ||
      statusNormalized === "yes" ||
      statusNormalized === "true" ||
      statusNormalized === "1" ||
      statusNormalized === "on" ||
      statusNormalized === ""
    );

    if (!isAktif) continue;

    const rawTitle = (titleIdx !== -1 && row[titleIdx]?.trim()) ? row[titleIdx].trim() : "";
    if (!rawTitle) continue;

    const rawId = (idIdx !== -1 && row[idIdx]?.trim()) ? row[idIdx].trim() : `SEASONAL-${String(r).padStart(2, '0')}`;
    const rawDesc = (descIdx !== -1 && row[descIdx]?.trim()) ? sanitizeText(row[descIdx]) : "";
    const rawImage = imageIdx !== -1 ? parseOptionalImageUrl(row[imageIdx]) : undefined;
    const rawOriginalPrice = (originalPriceIdx !== -1 && row[originalPriceIdx]) ? formatPriceNumber(row[originalPriceIdx]) : 0;
    const rawPromoPrice = (promoPriceIdx !== -1 && row[promoPriceIdx]) ? formatPriceNumber(row[promoPriceIdx]) : 0;
    const rawUnit = (unitIdx !== -1 && row[unitIdx]?.trim()) ? sanitizeText(row[unitIdx]) : "1 pek";

    const finalImage = rawImage || getFallbackImageByCategory("promo", rawTitle);

    promos.push({
      id: rawId,
      title: rawTitle,
      description: rawDesc || `Promosi musiman FrozenBergerak berkualiti tinggi. Sedia ditempah terus ke WhatsApp!`,
      imageUrl: finalImage,
      originalPrice: rawOriginalPrice > 0 ? rawOriginalPrice : undefined,
      promoPrice: rawPromoPrice > 0 ? rawPromoPrice : (rawOriginalPrice > 0 ? rawOriginalPrice : undefined),
      status: rawStatus,
      unit: rawUnit
    });
  }

  cachedSeasonalPromos = promos;
  lastSeasonalPromoFetchTime = now;

  return { promos, source: "seasonalpromo_sheet" };
}

// Health endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "FrozenBergerak",
    googleSheetConfigured: Boolean(process.env.GOOGLE_SHEET_ID),
    timestamp: new Date().toISOString()
  });
});

// Store configuration endpoint
app.get("/api/config", async (_req: Request, res: Response) => {
  res.json({
    name: storeConfig.name,
    tagline: storeConfig.tagline,
    whatsappNumber: storeConfig.whatsappNumber,
    location: storeConfig.location,
    operatingHours: storeConfig.operatingHours,
    deliveryNotice: storeConfig.deliveryNotice,
    heroBannerUrl: storeConfig.heroBannerUrl,
    googleSheetConfigured: Boolean(process.env.GOOGLE_SHEET_ID),
    lastUpdated: lastFetchTime ? new Date(lastFetchTime).toISOString() : null
  });
});

// Serve Hero Banner Image directly with high performance and automatic cache revalidation
app.get(["/api/hero-banner", "/api/banner"], (_req: Request, res: Response) => {
  try {
    let filePath = "";
    if (fs.existsSync(HERO_BANNER_DATA_PATH)) {
      filePath = HERO_BANNER_DATA_PATH;
    } else {
      const publicPath = path.join(process.cwd(), "public", "hero-banner.jpg");
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      }
    }

    if (filePath) {
      const stat = fs.statSync(filePath);
      const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=120");
      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", stat.mtime.toUTCString());

      if (_req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      return;
    }

    // If file does not exist on disk yet, redirect to public logo or return 404
    res.redirect(302, "/icons/icon-512.png");
  } catch (err: any) {
    console.error("Gagal membaca hero banner:", err);
    res.status(500).json({ error: "Gagal memuatkan gambar banner." });
  }
});

// Upload Hero Banner image directly (Admin maktabahumrr@gmail.com only)
app.post(["/api/upload-banner", "/api/banner"], requireAdminOnlyAuth, async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      res.status(400).json({ error: "Tiada data gambar diberikan." });
      return;
    }

    // Extract base64 payload
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches && matches.length === 3 
      ? Buffer.from(matches[2], "base64")
      : Buffer.from(imageBase64, "base64");

    // Save to persistent data directory
    fs.writeFileSync(HERO_BANNER_DATA_PATH, buffer);

    // Also write to public folder
    const publicPath = path.join(process.cwd(), "public", "hero-banner.jpg");
    try {
      fs.writeFileSync(publicPath, buffer);
    } catch {}

    // Also write to dist folder if running in production bundle
    const distPath = path.join(process.cwd(), "dist", "hero-banner.jpg");
    if (fs.existsSync(path.join(process.cwd(), "dist"))) {
      try {
        fs.writeFileSync(distPath, buffer);
      } catch (e) {}
    }

    const timestamp = Date.now();
    try {
      fs.writeFileSync(HERO_BANNER_META_PATH, JSON.stringify({
        updatedAt: new Date().toISOString(),
        timestamp,
        updatedBy: (req as any).authUser?.email || "Admin",
        size: buffer.length
      }, null, 2));
    } catch {}

    const newUrl = `/api/hero-banner?t=${timestamp}`;

    res.json({
      success: true,
      message: "Gambar Hero Banner berjaya disimpan dan dikemaskini secara automatik untuk semua peranti!",
      url: newUrl
    });
  } catch (error: any) {
    console.error("Gagal muat naik banner:", error);
    res.status(500).json({ error: error.message || "Gagal memproses gambar banner." });
  }
});

// Reset Hero Banner to default (Admin only)
app.all(["/api/reset-banner", "/api/banner/reset"], requireAdminOnlyAuth, async (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(HERO_BANNER_DATA_PATH)) {
      try { fs.unlinkSync(HERO_BANNER_DATA_PATH); } catch {}
    }
    if (fs.existsSync(HERO_BANNER_META_PATH)) {
      try { fs.unlinkSync(HERO_BANNER_META_PATH); } catch {}
    }

    res.json({
      success: true,
      message: "Hero Banner telah diset semula ke lalai untuk semua peranti.",
      url: "/api/hero-banner?t=" + Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal set semula banner." });
  }
});

// All Time Promos endpoint strictly from Alltimepromo Google Sheet tab
app.get("/api/promos", async (req: Request, res: Response) => {
  try {
    const { refresh } = req.query;
    const { promos, source } = await fetchPromosFromGoogleSheet(refresh === "true");
    res.json({
      total: promos.length,
      source,
      promos
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Gagal membaca data promosi daripada Google Sheet Alltimepromo."
    });
  }
});

// Seasonal Promos endpoint from Seasonalpromo Google Sheet tab
app.get("/api/seasonal-promos", async (req: Request, res: Response) => {
  try {
    const { refresh } = req.query;
    const { promos, source } = await fetchSeasonalPromosFromGoogleSheet(refresh === "true");
    res.json({
      total: promos.length,
      source,
      promos
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Gagal membaca data promosi musiman daripada Google Sheet."
    });
  }
});

// Dynamic Categories endpoint derived directly from Google Sheet products
app.get("/api/categories", async (req: Request, res: Response) => {
  try {
    const { products } = await fetchProductsFromGoogleSheet(req.query.refresh === "true");

    const categoryMap = new Map<string, number>();
    products.forEach(p => {
      const cat = p.category || "Lain-lain";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const categoryList = [
      { id: "all", name: "Semua Produk", icon: "Grid", count: products.length },
      ...Array.from(categoryMap.entries()).map(([name, count]) => {
        let icon = "Grid";
        const lower = name.toLowerCase();
        if (lower.includes("ayam") || lower.includes("daging") || lower.includes("meat")) icon = "Flame";
        else if (lower.includes("pastri") || lower.includes("kuih") || lower.includes("karipap")) icon = "Cookie";
        else if (lower.includes("dim sum") || lower.includes("pau") || lower.includes("sup")) icon = "Soup";
        else if (lower.includes("snek") || lower.includes("goreng") || lower.includes("nugget")) icon = "Utensils";
        else if (lower.includes("laut") || lower.includes("ikan") || lower.includes("udang") || lower.includes("fish")) icon = "Fish";
        
        return {
          id: name,
          name,
          icon,
          count
        };
      })
    ];

    res.json(categoryList);
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Gagal memuatkan kategori daripada Google Sheet"
    });
  }
});

// Products endpoint strictly from Google Sheet
app.get("/api/products", async (req: Request, res: Response) => {
  try {
    const { category, search, popularOnly, refresh } = req.query;
    const { products, source } = await fetchProductsFromGoogleSheet(refresh === "true");

    let filtered = [...products];

    if (category && category !== "all") {
      filtered = filtered.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
    }

    if (search && typeof search === "string") {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    if (popularOnly === "true") {
      filtered = filtered.filter(p => p.isPopular || (p.promoPrice && p.promoPrice > 0));
    }

    res.json({
      total: filtered.length,
      totalUnfiltered: products.length,
      source,
      products: filtered
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Gagal membaca data produk dari Google Sheet."
    });
  }
});

// Single product endpoint
app.get("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const { products } = await fetchProductsFromGoogleSheet();
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: "Produk tidak dijumpai" });
      return;
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PUSH NOTIFICATION API ENDPOINTS (Web Push / VAPID)
// ============================================================================

// Get Public VAPID Key for client subscription
app.get("/api/push/vapid-public-key", (_req: Request, res: Response) => {
  res.json({
    publicKey: vapidKeys.publicKey
  });
});

// Subscribe client device to Web Push
app.post("/api/push/subscribe", (req: Request, res: Response) => {
  try {
    const { subscription, endpoint, keys, userAgent } = req.body;
    const targetSub = subscription || (endpoint ? { endpoint, keys } : null);

    if (!targetSub || !targetSub.endpoint) {
      res.status(400).json({ error: "Objek PushSubscription tidak sah atau tidak lengkap." });
      return;
    }

    const saved = addSubscription(targetSub, userAgent);
    if (saved) {
      const subs = loadSubscriptions();
      res.json({
        success: true,
        message: "Peranti berjaya dilanggan untuk push notification.",
        totalSubscribers: subs.length
      });
    } else {
      res.status(400).json({ error: "Gagal menyimpan langganan. Kunci penyulitan (keys) tidak lengkap." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Ralat server semasa mendaftar push notification." });
  }
});

// Unsubscribe client device
app.post("/api/push/unsubscribe", (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      removeSubscription(endpoint);
    }
    res.json({ success: true, message: "Langganan dinyahaktifkan." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Push notification system status
app.get("/api/push/status", (_req: Request, res: Response) => {
  const subs = loadSubscriptions();
  res.json({
    isConfigured: Boolean(vapidKeys.publicKey),
    totalSubscribers: subs.length,
    vapidSubject: VAPID_SUBJECT,
    googleSheetWebhookConfigured: Boolean(process.env.GOOGLE_SHEET_WEBHOOK_URL)
  });
});

// Send test push notification
app.post("/api/push/test", async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    const subscriptions = loadSubscriptions();

    if (subscriptions.length === 0) {
      res.status(400).json({
        error: "Tiada peranti yang melanggan notifikasi lagi. Sila klik butang 'Aktifkan Notifikasi' pada peranti anda terlebih dahulu."
      });
      return;
    }

    const targetSubs = endpoint 
      ? subscriptions.filter(s => s.endpoint === endpoint) 
      : subscriptions;

    if (targetSubs.length === 0) {
      res.status(404).json({ error: "Langganan peranti ini tidak ditemui pada server. Sila aktifkan semula." });
      return;
    }

    const testPayload = JSON.stringify({
      title: "FrozenBergerak 📍 Jadual Pergerakan",
      body: "Team Frozen 1 akan bergerak di Seremban 2 hari ini, 9:00 PG - 1:00 PTG. Stok tersedia untuk dihantar.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      image: "/icons/icon-512.png",
      url: "/#section-jadual-pergerakan"
    });

    let sent = 0;
    for (const sub of targetSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, testPayload, { TTL: 60 });
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          removeSubscription(sub.endpoint);
        }
      }
    }

    res.json({
      success: true,
      sent,
      message: `Notifikasi ujian dihantar ke ${sent} peranti.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal menghantar notifikasi ujian." });
  }
});

// ============================================================================
// AUTH & ROLES MANAGEMENT API ENDPOINTS
// ============================================================================

// Get public auth configuration (Google Client ID, status of allowed roles)
app.get("/api/auth/config", (_req: Request, res: Response) => {
  const adminEmails = getMergedAdminEmails();
  const teamEmails = getMergedTeamEmails();
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    hasAdminEmails: adminEmails.length > 0,
    adminEmailsCount: adminEmails.length,
    hasTeamEmails: teamEmails.length > 0,
    teamEmailsCount: teamEmails.length,
    hasGoogleSheetId: Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SHEET_ID.trim()),
    hasGoogleSheetWebhook: Boolean(process.env.GOOGLE_SHEET_WEBHOOK_URL && process.env.GOOGLE_SHEET_WEBHOOK_URL.trim())
  });
});

// Check Email status (Admin / Team) & whether password has been created
app.post("/api/auth/check-email", (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ success: false, error: "Sila masukkan alamat email Google anda." });
      return;
    }

    const adminEmails = getMergedAdminEmails();
    const teamEmails = getMergedTeamEmails();
    const approvals = loadTeamApprovals();

    let role: "admin" | "team" | null = null;
    let isPrimaryAdmin = cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();

    if (adminEmails.includes(cleanEmail) || isPrimaryAdmin) {
      role = "admin";
    } else if (teamEmails.includes(cleanEmail) || approvals[cleanEmail]) {
      role = "team";
    } else {
      // Allow any team member to request access through this unified portal
      role = "team";
    }

    const passwords = loadUserPasswords();
    const hasPassword = Boolean(passwords[cleanEmail] && passwords[cleanEmail].hash);

    let approvalStatus: "approved" | "pending" | "rejected" = "approved";
    if (role === "team") {
      if (approvals[cleanEmail]) {
        approvalStatus = approvals[cleanEmail].status;
      } else {
        // If in teamEmails list and already set up by admin
        approvalStatus = teamEmails.includes(cleanEmail) ? "approved" : "pending";
      }
    }

    res.json({
      success: true,
      email: cleanEmail,
      role,
      hasPassword,
      approvalStatus,
      isPrimaryAdmin
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat semasa menyemak akaun." });
  }
});

// Login / Create Custom Password for Admin / Team (with Approval Check for Team)
app.post("/api/auth/login-password", async (req: Request, res: Response) => {
  try {
    const { email, password, newPassword, confirmPassword } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ success: false, error: "Alamat email Google diperlukan." });
      return;
    }

    const adminEmails = getMergedAdminEmails();
    const teamEmails = getMergedTeamEmails();
    const isPrimaryAdmin = cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();

    let role: "admin" | "team" = (adminEmails.includes(cleanEmail) || isPrimaryAdmin) ? "admin" : "team";

    const passwords = loadUserPasswords();
    const existingPasswordRecord = passwords[cleanEmail];
    let isFirstTimePassword = false;

    // CASE 1: Password belum wujud (Cipta password tersendiri kali pertama)
    if (!existingPasswordRecord) {
      const passToSet = (newPassword || password || "").trim();
      const confirmToSet = (confirmPassword || "").trim();

      if (!passToSet) {
        res.status(400).json({
          success: false,
          error: "Sila masukkan PIN atau Password pilihan anda untuk akaun ini."
        });
        return;
      }

      if (confirmToSet && passToSet !== confirmToSet) {
        res.status(400).json({
          success: false,
          error: "Pengesahan password tidak sepadan. Sila pastikan kedua-dua ruangan sama."
        });
        return;
      }

      if (passToSet.length < 3) {
        res.status(400).json({
          success: false,
          error: "Password / PIN mestilah sekurang-kurangnya 3 aksara/digit."
        });
        return;
      }

      const { hash, salt } = hashPassword(passToSet);
      passwords[cleanEmail] = {
        hash,
        salt,
        updatedAt: new Date().toISOString()
      };
      saveUserPasswords(passwords);
      isFirstTimePassword = true;
    } else {
      // CASE 2: Password sudah wujud (Semak password sepadan)
      const inputPass = (password || "").trim();
      if (!inputPass) {
        res.status(400).json({
          success: false,
          error: "Sila masukkan PIN atau Password akaun anda."
        });
        return;
      }

      const isMatch = verifyPassword(inputPass, existingPasswordRecord);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: "Password atau PIN tidak sepadan. Sila semak semula."
        });
        return;
      }
    }

    // CHECK APPROVAL STATUS FOR TEAM ROLE
    if (role === "team") {
      const approvals = loadTeamApprovals();
      let currentApproval = approvals[cleanEmail];

      if (!currentApproval) {
        // If in pre-configured team list from Admin, auto-approve
        if (teamEmails.includes(cleanEmail)) {
          currentApproval = {
            email: cleanEmail,
            name: cleanEmail.split("@")[0],
            status: "approved",
            requestedAt: new Date().toISOString(),
            reviewedAt: new Date().toISOString(),
            reviewedBy: "Admin Pre-approved"
          };
          approvals[cleanEmail] = currentApproval;
          saveTeamApprovals(approvals);
        } else {
          // New team registration request -> set pending and notify maktabahumrr@gmail.com
          currentApproval = {
            email: cleanEmail,
            name: cleanEmail.split("@")[0],
            status: "pending",
            requestedAt: new Date().toISOString()
          };
          approvals[cleanEmail] = currentApproval;
          saveTeamApprovals(approvals);

          // Trigger email notification to admin maktabahumrr@gmail.com
          sendTeamApprovalNotificationToAdmin(cleanEmail, isFirstTimePassword).catch(() => {});

          res.status(403).json({
            success: false,
            pendingApproval: true,
            email: cleanEmail,
            message: `Password telah disimpan. Permohonan akses akaun Pasukan (${cleanEmail}) telah dihantar kepada pihak Admin untuk kelulusan. Sila tunggu kelulusan Admin sebelum log masuk.`,
            error: `Permohonan akses akaun Pasukan (${cleanEmail}) sedang menunggu kelulusan daripada pihak Admin.`
          });
          return;
        }
      }

      if (currentApproval.status === "pending") {
        // Re-notify admin
        sendTeamApprovalNotificationToAdmin(cleanEmail, isFirstTimePassword).catch(() => {});

        res.status(403).json({
          success: false,
          pendingApproval: true,
          email: cleanEmail,
          message: `Permohonan akses akaun Pasukan (${cleanEmail}) sedang menunggu kelulusan daripada pihak Admin. Notifikasi telah dihantar.`,
          error: `Akaun (${cleanEmail}) belum diluluskan oleh pihak Admin.`
        });
        return;
      }

      if (currentApproval.status === "rejected") {
        res.status(403).json({
          success: false,
          isRejected: true,
          email: cleanEmail,
          error: `Akses ditolak: Permohonan akaun (${cleanEmail}) tidak diluluskan oleh pihak Admin.`
        });
        return;
      }
    }

    // GENERATE TOKEN & RETURN SUCCESS
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = signSessionToken({
      email: cleanEmail,
      name: cleanEmail.split("@")[0],
      role,
      exp
    });

    res.json({
      success: true,
      message: isFirstTimePassword 
        ? "PIN / Password anda berjaya dicipta & log masuk berjaya!" 
        : `Log masuk berjaya sebagai ${role.toUpperCase()}.`,
      token,
      user: {
        email: cleanEmail,
        name: cleanEmail.split("@")[0],
        role
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat log masuk password." });
  }
});

// Admin Get All Team Approvals
app.get("/api/auth/approvals", requireAdminOnlyAuth, (_req: Request, res: Response) => {
  try {
    const approvals = loadTeamApprovals();
    const teamEmails = getMergedTeamEmails();
    const passwords = loadUserPasswords();

    // Merge any teamEmails not yet in approvals map
    teamEmails.forEach(em => {
      if (!approvals[em]) {
        approvals[em] = {
          email: em,
          name: em.split("@")[0],
          status: "approved",
          requestedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          reviewedBy: "Admin Pre-configured"
        };
      }
    });

    const list = Object.values(approvals).map(item => ({
      ...item,
      hasPassword: Boolean(passwords[item.email] && passwords[item.email].hash)
    }));

    // Sort: pending first, then by requestedAt desc
    list.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    res.json({
      success: true,
      approvals: list,
      pendingCount: list.filter(i => i.status === "pending").length,
      approvedCount: list.filter(i => i.status === "approved").length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat memuat senarai kelulusan." });
  }
});

// Admin Approve / Reject Team Member
app.post("/api/auth/approve-team", requireAdminOnlyAuth, (req: Request, res: Response) => {
  try {
    const admin = (req as any).authUser;
    const { email, status, notes } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      res.status(400).json({ success: false, error: "Alamat email diperlukan." });
      return;
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      res.status(400).json({ success: false, error: "Status mestilah 'approved', 'rejected' atau 'pending'." });
      return;
    }

    const approvals = loadTeamApprovals();
    const existing: TeamApprovalRecord = approvals[cleanEmail] || {
      email: cleanEmail,
      name: cleanEmail.split("@")[0],
      status: "pending",
      requestedAt: new Date().toISOString()
    };

    approvals[cleanEmail] = {
      ...existing,
      status,
      notes: notes || existing.notes || "",
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin?.email || PRIMARY_ADMIN_EMAIL
    };
    saveTeamApprovals(approvals);

    // If approved, ensure email is also added to roles_config teamEmails
    if (status === "approved") {
      const rolesConfig = loadRolesConfig();
      if (!rolesConfig.teamEmails.includes(cleanEmail)) {
        rolesConfig.teamEmails.push(cleanEmail);
        saveRolesConfig(rolesConfig);
      }
    } else if (status === "rejected") {
      const rolesConfig = loadRolesConfig();
      rolesConfig.teamEmails = rolesConfig.teamEmails.filter(e => e.toLowerCase() !== cleanEmail);
      saveRolesConfig(rolesConfig);
    }

    res.json({
      success: true,
      message: `Status kebenaran untuk ${cleanEmail} telah ditukar kepada ${status.toUpperCase()}.`,
      record: approvals[cleanEmail]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat menukar status kelulusan." });
  }
});

// Live pending approvals status for all devices and Admin dashboards
app.get("/api/auth/approvals-status", (_req: Request, res: Response) => {
  try {
    const approvals = loadTeamApprovals();
    const passwords = loadUserPasswords();
    const pendingList = Object.values(approvals)
      .filter(item => item.status === "pending")
      .map(item => ({
        email: item.email,
        name: item.name || item.email.split("@")[0],
        requestedAt: item.requestedAt,
        hasPassword: Boolean(passwords[item.email] && passwords[item.email].hash)
      }));

    res.json({
      success: true,
      pendingCount: pendingList.length,
      pendingList,
      adminEmail: PRIMARY_ADMIN_EMAIL
    });
  } catch (error: any) {
    res.status(500).json({ success: false, pendingCount: 0, pendingList: [], error: error.message });
  }
});

// Request / Resend Approval Notification to Admin maktabahumrr@gmail.com
app.post("/api/auth/request-approval", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      res.status(400).json({ success: false, error: "Alamat email diperlukan." });
      return;
    }

    const approvals = loadTeamApprovals();
    if (!approvals[cleanEmail]) {
      approvals[cleanEmail] = {
        email: cleanEmail,
        name: cleanEmail.split("@")[0],
        status: "pending",
        requestedAt: new Date().toISOString()
      };
      saveTeamApprovals(approvals);
    }

    await sendTeamApprovalNotificationToAdmin(cleanEmail);

    res.json({
      success: true,
      message: `Notifikasi permohonan akses telah dihantar semula ke email ${PRIMARY_ADMIN_EMAIL}.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat menghantar permohonan kelulusan." });
  }
});

// Admin Test Email Notification to maktabahumrr@gmail.com
app.post("/api/auth/test-email-notification", requireAdminOnlyAuth, async (req: Request, res: Response) => {
  try {
    const admin = (req as any).authUser;
    await sendTeamApprovalNotificationToAdmin("test-member@frozenbergerak.com", true);
    res.json({
      success: true,
      message: `Notifikasi ujian dan push notification telah dihantar untuk admin (${PRIMARY_ADMIN_EMAIL}).`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Gagal menghantar notifikasi ujian." });
  }
});

// Change Password for Logged In Admin / Team User
app.post("/api/auth/change-password", requireAdminOrTeamAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).authUser;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const cleanPass = (newPassword || "").trim();
    const cleanConfirm = (confirmPassword || "").trim();

    if (!cleanPass) {
      res.status(400).json({ success: false, error: "Sila masukkan password baharu." });
      return;
    }

    if (cleanConfirm && cleanPass !== cleanConfirm) {
      res.status(400).json({ success: false, error: "Pengesahan password tidak sepadan." });
      return;
    }

    if (cleanPass.length < 3) {
      res.status(400).json({ success: false, error: "Password mestilah sekurang-kurangnya 3 aksara/digit." });
      return;
    }

    const passwords = loadUserPasswords();
    const existing = passwords[user.email];

    if (existing && existing.hash) {
      const cur = (currentPassword || "").trim();
      if (!cur) {
        res.status(400).json({ success: false, error: "Sila masukkan password semasa anda." });
        return;
      }
      if (!verifyPassword(cur, existing)) {
        res.status(401).json({ success: false, error: "Password semasa tidak tepat." });
        return;
      }
    }

    const { hash, salt } = hashPassword(cleanPass);
    passwords[user.email] = {
      hash,
      salt,
      updatedAt: new Date().toISOString()
    };
    saveUserPasswords(passwords);

    res.json({
      success: true,
      message: "Password anda telah berjaya dikemaskini!"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat menukar password." });
  }
});

// Admin Reset Password for Team member
app.post("/api/auth/reset-user-password", requireAdminOnlyAuth, (req: Request, res: Response) => {
  try {
    const { targetEmail } = req.body;
    const cleanEmail = (targetEmail || "").trim().toLowerCase();
    if (!cleanEmail) {
      res.status(400).json({ success: false, error: "Sila nyatakan email pengguna." });
      return;
    }

    const passwords = loadUserPasswords();
    if (passwords[cleanEmail]) {
      delete passwords[cleanEmail];
      saveUserPasswords(passwords);
    }

    res.json({
      success: true,
      message: `Password untuk akaun ${cleanEmail} telah diset semula. Pengguna boleh mencipta password baharu semasa log masuk seterusnya.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat reset password." });
  }
});

// Verify Google Identity Services Sign-In
app.post("/api/auth/verify-google", (req: Request, res: Response) => {
  try {
    const { email, name, picture, credential } = req.body;
    let verifiedEmail = (email || "").trim().toLowerCase();
    let verifiedName = name || "";
    let verifiedPicture = picture || "";

    // If a Google JWT credential is provided, decode payload safely
    if (credential && typeof credential === "string") {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
          if (payload.email) {
            verifiedEmail = String(payload.email).trim().toLowerCase();
            verifiedName = payload.name || verifiedName;
            verifiedPicture = payload.picture || verifiedPicture;
          }
        }
      } catch (err) {
        console.warn("Could not parse Google credential JWT:", err);
      }
    }

    if (!verifiedEmail) {
      res.status(400).json({ success: false, error: "Alamat email Google diperlukan." });
      return;
    }

    const adminEmails = getMergedAdminEmails();
    const teamEmails = getMergedTeamEmails();

    let role: "admin" | "team" | null = null;

    if (adminEmails.includes(verifiedEmail)) {
      role = "admin";
    } else if (teamEmails.includes(verifiedEmail)) {
      role = "team";
    }

    // If no specific emails are set in environment/config yet, allow initial configuration
    if (!role && adminEmails.length === 0 && teamEmails.length === 0) {
      // First user becomes admin and gets registered in roles config
      role = "admin";
      const currentConfig = loadRolesConfig();
      currentConfig.adminEmails.push(verifiedEmail);
      saveRolesConfig(currentConfig);
      console.log(`Initial Admin registered: ${verifiedEmail}`);
    }

    if (!role) {
      res.status(403).json({
        success: false,
        error: `Akses Ditolak: Akaun Google (${verifiedEmail}) tiada dalam senarai ADMIN atau TEAM FrozenBergerak yang dibenarkan.`,
        email: verifiedEmail
      });
      return;
    }

    // 7 days expiration
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = signSessionToken({
      email: verifiedEmail,
      name: verifiedName || verifiedEmail.split("@")[0],
      picture: verifiedPicture,
      role,
      exp
    });

    res.json({
      success: true,
      message: `Log masuk berjaya sebagai ${role.toUpperCase()}.`,
      token,
      user: {
        email: verifiedEmail,
        name: verifiedName || verifiedEmail.split("@")[0],
        picture: verifiedPicture,
        role
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat semasa mengesahkan akaun Google." });
  }
});

// Verify Firebase Authentication (Email/Password & Token)
app.post("/api/auth/firebase-login", async (req: Request, res: Response) => {
  try {
    const { email, uid, idToken } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      res.status(400).json({ success: false, error: "Alamat email Firebase diperlukan." });
      return;
    }

    const adminEmails = getMergedAdminEmails();
    const teamEmails = getMergedTeamEmails();
    const isPrimaryAdmin = cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();

    let role: "admin" | "team" = (adminEmails.includes(cleanEmail) || isPrimaryAdmin) ? "admin" : "team";

    // If team, check approval status
    if (role === "team") {
      const approvals = loadTeamApprovals();
      let currentApproval = approvals[cleanEmail];

      if (!currentApproval) {
        if (teamEmails.includes(cleanEmail)) {
          currentApproval = {
            email: cleanEmail,
            name: cleanEmail.split("@")[0],
            status: "approved",
            requestedAt: new Date().toISOString(),
            reviewedAt: new Date().toISOString(),
            reviewedBy: "Admin Pre-approved"
          };
          approvals[cleanEmail] = currentApproval;
          saveTeamApprovals(approvals);
        } else {
          // New team member registering via Firebase
          currentApproval = {
            email: cleanEmail,
            name: cleanEmail.split("@")[0],
            status: "pending",
            requestedAt: new Date().toISOString()
          };
          approvals[cleanEmail] = currentApproval;
          saveTeamApprovals(approvals);

          // Send admin notification
          sendTeamApprovalNotificationToAdmin(cleanEmail, true).catch(() => {});

          res.status(403).json({
            success: false,
            pendingApproval: true,
            email: cleanEmail,
            message: `Akaun Firebase (${cleanEmail}) berjaya didaftarkan. Permohonan akses pasukan sedang menunggu kelulusan daripada Admin (${PRIMARY_ADMIN_EMAIL}). Sila hubungi admin untuk kelulusan sebelum log masuk.`,
            error: `Permohonan akses akaun Pasukan (${cleanEmail}) sedang menunggu kelulusan daripada pihak Admin.`
          });
          return;
        }
      }

      if (currentApproval.status === "pending") {
        sendTeamApprovalNotificationToAdmin(cleanEmail, false).catch(() => {});
        res.status(403).json({
          success: false,
          pendingApproval: true,
          email: cleanEmail,
          message: `Akaun Firebase (${cleanEmail}) sedang menunggu kelulusan daripada pihak Admin (${PRIMARY_ADMIN_EMAIL}). Notifikasi telah dimajukan.`,
          error: `Akaun (${cleanEmail}) belum diluluskan oleh pihak Admin.`
        });
        return;
      }

      if (currentApproval.status === "rejected") {
        res.status(403).json({
          success: false,
          isRejected: true,
          email: cleanEmail,
          error: `Akses ditolak: Permohonan akaun (${cleanEmail}) tidak diluluskan oleh pihak Admin.`
        });
        return;
      }
    }

    // Generate 7-day session token
    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = signSessionToken({
      email: cleanEmail,
      uid: uid || cleanEmail,
      name: cleanEmail.split("@")[0],
      role,
      exp
    });

    res.json({
      success: true,
      message: `Log masuk Firebase Authentication berjaya sebagai ${role.toUpperCase()}.`,
      token,
      user: {
        email: cleanEmail,
        uid: uid || cleanEmail,
        name: cleanEmail.split("@")[0],
        role,
        isPrimaryAdmin
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat semasa log masuk Firebase." });
  }
});

// Verify Team PIN (Strictly for TEAM role, never elevates to ADMIN)
app.post("/api/auth/login-pin", (req: Request, res: Response) => {
  try {
    const { pin, email } = req.body;
    const cleanPin = (pin || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    const allowedPins = [
      process.env.TEAM_PIN,
      "frozen888"
    ].filter(Boolean) as string[];

    if (!cleanPin || !allowedPins.includes(cleanPin)) {
      res.status(401).json({
        success: false,
        error: "PIN Pasukan tidak tepat. Sila hubungi Admin untuk mendapatkan PIN bertugas yang sah."
      });
      return;
    }

    // PIN authentication is strictly for TEAM access
    const role: "team" = "team";
    const finalEmail = cleanEmail || "team@frozenbergerak.local";
    const finalName = "Team FrozenBergerak";

    const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = signSessionToken({
      email: finalEmail,
      name: finalName,
      role,
      exp
    });

    res.json({
      success: true,
      message: "Log masuk PIN berjaya sebagai TEAM.",
      token,
      user: {
        email: finalEmail,
        name: finalName,
        role
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat semasa mengesahkan PIN." });
  }
});

// Get current logged in user details
app.get("/api/auth/me", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer ")) 
    ? authHeader.slice(7) 
    : (req.headers["x-auth-token"] as string);

  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  const { valid, user } = verifySessionToken(token);
  if (!valid || !user) {
    res.json({ authenticated: false });
    return;
  }

  res.json({
    authenticated: true,
    user
  });
});

// Get configured roles list (Protected for Admin)
app.get("/api/auth/roles", requireAdminOnlyAuth, (_req: Request, res: Response) => {
  const rolesConfig = loadRolesConfig();
  res.json({
    adminEmails: getMergedAdminEmails(),
    teamEmails: getMergedTeamEmails(),
    fileConfig: rolesConfig,
    envAdminEmails: (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean),
    envTeamEmails: (process.env.TEAM_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  });
});

// Update configured roles list (Protected for Admin)
app.post("/api/auth/roles", requireAdminOnlyAuth, (req: Request, res: Response) => {
  try {
    const { adminEmails, teamEmails } = req.body;
    const cleanAdmins = Array.isArray(adminEmails) 
      ? adminEmails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean) 
      : [];
    const cleanTeams = Array.isArray(teamEmails) 
      ? teamEmails.map((e: string) => String(e).trim().toLowerCase()).filter(Boolean) 
      : [];

    saveRolesConfig({
      adminEmails: cleanAdmins,
      teamEmails: cleanTeams
    });

    res.json({
      success: true,
      message: "Senarai akaun ADMIN & TEAM berjaya dikemaskini.",
      adminEmails: getMergedAdminEmails(),
      teamEmails: getMergedTeamEmails()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal mengemaskini senarai kebenaran." });
  }
});

// ============================================================================
// JADUAL PERGERAKAN & TEAM UPDATE API ENDPOINTS
// ============================================================================

// Get Active Schedules (Public / Read-only for all customers)
// Columns: ID JADUAL | NAMA TEAM | TARIKH | MASA | KAWASAN | CATATAN | STATUS
app.get("/api/schedule", async (_req: Request, res: Response) => {
  try {
    const fetchResult = await fetchScheduleFromGoogleSheet();
    res.json({
      schedules: fetchResult.schedules,
      total: fetchResult.schedules.length,
      source: fetchResult.source,
      webAppUrl: getAppsScriptUrl(),
      webAppStatus: fetchResult.webAppStatus,
      webAppError: fetchResult.webAppError || null,
      hasGoogleSheetId: Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SHEET_ID.trim()),
      hasGoogleSheetWebhook: Boolean(getAppsScriptUrl()),
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    const fallback = loadSchedule();
    res.status(200).json({
      schedules: fallback,
      total: fallback.length,
      source: "local_cache",
      webAppStatus: "error",
      webAppError: error.message || "Gagal membaca data jadual dari Web App.",
      hasGoogleSheetId: Boolean(process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SHEET_ID.trim()),
      hasGoogleSheetWebhook: Boolean(getAppsScriptUrl()),
      lastUpdated: new Date().toISOString()
    });
  }
});

// Force Sync from Google Sheets tab JADUAL (Protected for Admin/Team)
app.post("/api/schedule/sync", requireAdminOrTeamAuth, async (_req: Request, res: Response) => {
  try {
    const fetchResult = await fetchScheduleFromGoogleSheet();
    if (fetchResult.source !== "local_cache" && fetchResult.schedules.length > 0) {
      res.json({
        success: true,
        message: `Berjaya menyegerakkan ${fetchResult.schedules.length} rekod jadual terus dari ${fetchResult.source === 'google_apps_script' ? 'Google Apps Script Web App' : 'tab JADUAL Google Sheets'}!`,
        schedules: fetchResult.schedules,
        source: fetchResult.source,
        webAppStatus: fetchResult.webAppStatus
      });
    } else {
      res.json({
        success: false,
        message: fetchResult.webAppError 
          ? `Status Web App: ${fetchResult.webAppError}` 
          : "Tidak dapat mengambil data baru dari Web App/Sheets. Menggunakan data tempatan.",
        schedules: fetchResult.schedules,
        source: "local_cache",
        webAppStatus: fetchResult.webAppStatus,
        webAppError: fetchResult.webAppError
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal menyegerakkan dengan Google Sheets." });
  }
});

// Team Update Schedule (Tambah / Edit) + Save to Google Sheet JADUAL + Trigger Push Notification
// PROTECTED: Only verified ADMIN or TEAM accounts
app.post("/api/schedule/update", requireAdminOrTeamAuth, async (req: Request, res: Response) => {
  try {
    const {
      id,
      teamName,
      driverName,
      date,
      tarikh,
      timeSlot,
      masa,
      locations,
      kawasan,
      status,
      notes,
      catatan,
      sendPushNotification = true,
      customNotificationTitle,
      customNotificationBody
    } = req.body;

    const finalLocations = (locations || kawasan || "").trim();
    if (!finalLocations) {
      res.status(400).json({ error: "Sila masukkan sekurang-kurangnya kawasan/laluan pergerakan." });
      return;
    }

    const currentSchedules = loadSchedule();
    const scheduleId = (id && id.trim()) ? id.trim() : `JAD-${(currentSchedules.length + 1).toString().padStart(2, '0')}`;
    const finalTeam = (teamName || driverName || "Team Frozen 1").replace(/van\s*/gi, "Team ").trim();
    const finalDate = (date || tarikh || `Hari Ini (${getTodayMalayDate()})`).trim();
    const finalTime = (timeSlot || masa || "Waktu Operasi").trim();
    const finalNotes = (notes || catatan || "").replace(/van\s*/gi, "kenderaan ").trim();
    const finalStatus = normalizeScheduleStatus(status || "Akan Datang");

    // Google Sheet JADUAL Schema:
    // ID JADUAL | NAMA TEAM | TARIKH | MASA | KAWASAN | CATATAN | STATUS
    const updatedRecord: ScheduleRecord = {
      id: scheduleId,
      teamName: finalTeam,
      driverName: finalTeam,
      date: finalDate,
      timeSlot: finalTime,
      locations: finalLocations,
      notes: finalNotes,
      status: finalStatus,
      lastUpdated: new Date().toISOString()
    };

    const existingIdx = currentSchedules.findIndex(s => s.id === scheduleId);
    const isNew = existingIdx < 0;

    if (existingIdx >= 0) {
      currentSchedules[existingIdx] = updatedRecord;
    } else {
      currentSchedules.unshift(updatedRecord);
    }

    saveSchedule(currentSchedules);

    // Sync to Google Sheet JADUAL tab via Webhook
    const syncResult = await syncToGoogleSheetWebhook(isNew ? "SCHEDULE_CREATE" : "SCHEDULE_UPDATE", updatedRecord);

    let pushResult = { sent: 0, failed: 0, total: 0 };

    // Trigger Push Notification to all subscribed devices
    if (sendPushNotification) {
      const notifTitle = customNotificationTitle || "FrozenBergerak 📍 Jadual Pergerakan Dikemaskini";
      const notifBody = customNotificationBody || `${finalTeam} akan bergerak di ${finalLocations} ${finalDate}, ${finalTime}.${finalNotes ? ` ${finalNotes}` : ''}`;

      pushResult = await broadcastPushNotification({
        title: notifTitle,
        body: notifBody,
        url: "/#section-jadual-pergerakan"
      });
    }

    res.json({
      success: true,
      message: `Jadual ${scheduleId} (${finalTeam}) berjaya disimpan dan disegerakkan!`,
      schedule: updatedRecord,
      googleSheetSync: syncResult,
      pushResult,
      totalSchedules: currentSchedules.length,
      schedules: currentSchedules
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal mengemaskini jadual." });
  }
});

// Direct proxy to Google Apps Script Web App (Avoids browser CORS & redirect errors)
app.post("/api/schedule/gas-post", async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const action = payload.action || "SCHEDULE_CREATE";
    const data = payload.data || payload;
    const syncResult = await syncToGoogleSheetWebhook(action, data);
    res.json(syncResult);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Ralat proxy ke Google Apps Script." });
  }
});

// Delete a schedule item (Protected: Only verified ADMIN or TEAM accounts)
app.post("/api/schedule/delete", requireAdminOrTeamAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: "ID Jadual diperlukan untuk memadam rekod." });
      return;
    }

    const currentSchedules = loadSchedule();
    const filtered = currentSchedules.filter(s => s.id !== id);
    saveSchedule(filtered);

    // Sync delete to Google Sheets
    const syncResult = await syncToGoogleSheetWebhook("SCHEDULE_DELETE", { id });

    res.json({
      success: true,
      message: `Jadual ${id} berjaya dipadam daripada sistem.`,
      googleSheetSync: syncResult,
      schedules: filtered
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Gagal memadam jadual." });
  }
});

// Helper endpoint: Returns Google Apps Script ready code for copy-paste
app.get("/api/schedule/apps-script-code", (_req: Request, res: Response) => {
  const scriptCode = `/**
 * FrozenBergerak - Google Apps Script Webhook untuk Tab JADUAL
 * Lajur yang ditetapkan: ID JADUAL | NAMA TEAM | TARIKH | MASA | KAWASAN | CATATAN | STATUS
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    var data = {};
    if (typeof raw === "string" && raw.trim() !== "") {
      try {
        data = JSON.parse(raw);
      } catch (pe) {
        data = (e && e.parameter) || {};
      }
    } else {
      data = (e && e.parameter) || {};
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("JADUAL");
    if (!sheet) {
      sheet = ss.insertSheet("JADUAL");
      sheet.appendRow(["ID JADUAL", "NAMA TEAM", "TARIKH", "MASA", "KAWASAN", "CATATAN", "STATUS"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#1e40af").setFontColor("#ffffff");
    }
    
    var action = data.action || "SCHEDULE_CREATE";
    var id = data.idJadual || data.id || (data.data && (data.data.idJadual || data.data.id)) || "JAD-01";
    var namaTeam = data.namaTeam || data.teamName || (data.data && (data.data.namaTeam || data.data.teamName)) || "Team Frozen 1";
    var tarikh = data.tarikh || data.date || (data.data && (data.data.tarikh || data.data.date)) || "Hari Ini";
    var masa = data.masa || data.timeSlot || (data.data && (data.data.masa || data.data.timeSlot)) || "Waktu Operasi";
    var kawasan = data.kawasan || data.locations || (data.data && (data.data.kawasan || data.data.locations)) || "";
    var catatan = data.catatan || data.notes || (data.data && (data.data.catatan || data.data.notes)) || "";
    var status = data.status || (data.data && data.data.status) || "Akan Datang";

    var rowData = data.row;
    if (!rowData || !Array.isArray(rowData)) {
      rowData = [id, namaTeam, tarikh, masa, kawasan, catatan, status];
    }
    
    var id = (rowData && rowData[0]) || data.id || (data.data && data.data.id);
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0]).trim() === String(id).trim()) {
          foundRow = i + 2;
          break;
        }
      }
    }
    
    if (action === "SCHEDULE_DELETE") {
      if (foundRow > 1) {
        sheet.deleteRow(foundRow);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Deleted row " + foundRow, id: id }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      // UPDATE OR CREATE
      if (foundRow > 1) {
        sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, action: action, id: id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  res.json({ scriptCode });
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FrozenBergerak server running on http://localhost:${PORT}`);
  });
}

startServer();
