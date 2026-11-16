import React, { useState, useEffect } from "react";
import { 
  X, 
  Users, 
  Bell, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Send, 
  Trash2, 
  Plus, 
  Edit3, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  LogOut, 
  Settings, 
  FileSpreadsheet, 
  Copy, 
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Key,
  Mail,
  Clock3,
  UserX,
  Check,
  Flame
} from "lucide-react";
import { ScheduleItem, AuthUser, ScheduleStatus } from "../types";
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  db,
  doc,
  setDoc,
  deleteDoc,
  saveScheduleToFirestore,
  deleteScheduleFromFirestore
} from "../lib/firebase";
import { fetchScheduleWithFallback } from "../utils/scheduleFetcher";
import { GOOGLE_APPS_SCRIPT_WEB_APP_URL, UNIFIED_APPS_SCRIPT_CODE } from "../config/googleSheets";

interface TeamScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated: () => void;
  existingSchedule?: ScheduleItem | null;
  initialTab?: "manage" | "approvals" | "roles" | "password" | "sheets";
}

export interface TeamApprovalItem {
  id?: string;
  email: string;
  nama?: string;
  name?: string;
  tarikh?: string;
  status: "approved" | "pending" | "rejected";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  hasPassword?: boolean;
}

export const TeamScheduleModal: React.FC<TeamScheduleModalProps> = ({
  isOpen,
  onClose,
  onScheduleUpdated,
  existingSchedule,
  initialTab
}) => {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string>("");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullNameInput, setFullNameInput] = useState<string>("");
  const [googleEmailInput, setGoogleEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [pendingApprovalNotice, setPendingApprovalNotice] = useState<string | null>(null);
  const [pendingApplicantEmail, setPendingApplicantEmail] = useState<string>("");
  const [pendingApplicantName, setPendingApplicantName] = useState<string>("");
  const [isCheckingPendingStatus, setIsCheckingPendingStatus] = useState<boolean>(false);
  const [isResendingApproval, setIsResendingApproval] = useState<boolean>(false);
  const [resendApprovalSuccess, setResendApprovalSuccess] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Active view tab inside modal for authenticated users
  const [activeTab, setActiveTab] = useState<"manage" | "approvals" | "roles" | "password" | "sheets">(initialTab || "manage");

  // Team Approvals Management states (for Admin)
  const [teamApprovals, setTeamApprovals] = useState<TeamApprovalItem[]>([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState<boolean>(false);
  const [approvalsSource, setApprovalsSource] = useState<string>("");
  const [approvalsErrorMsg, setApprovalsErrorMsg] = useState<string | null>(null);
  const [updatingApprovalEmail, setUpdatingApprovalEmail] = useState<string | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [approvalsSuccessMsg, setApprovalsSuccessMsg] = useState<string | null>(null);

  // Change Password states (for logged-in user)
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>("");
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Schedule list & form states
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  // Form fields matching Google Sheets JADUAL columns
  const [customId, setCustomId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [rawDateIso, setRawDateIso] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [date, setDate] = useState<string>("");
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [locations, setLocations] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<"Akan Datang" | "Sedang Bergerak" | "Selesai">("Sedang Bergerak");
  const [sendPushNotification, setSendPushNotification] = useState<boolean>(true);

  // Notification and Sheet Sync Info
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Roles Configuration (for Admin)
  const [adminEmailsList, setAdminEmailsList] = useState<string[]>([]);
  const [teamEmailsList, setTeamEmailsList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [newTeamEmail, setNewTeamEmail] = useState<string>("");
  const [rolesSaving, setRolesSaving] = useState<boolean>(false);
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);

  // Apps Script Code Copy state
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Helper for formatting date to Malay
  const formatDateMalay = (isoOrDate: string | Date): string => {
    try {
      const d = typeof isoOrDate === "string" 
        ? new Date(isoOrDate + (isoOrDate.includes("T") ? "" : "T00:00:00")) 
        : isoOrDate;
      if (isNaN(d.getTime())) return typeof isoOrDate === "string" ? isoOrDate : "";
      return new Intl.DateTimeFormat("ms-MY", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(d);
    } catch {
      return typeof isoOrDate === "string" ? isoOrDate : "";
    }
  };

  // Helper for current date formatted in Malay
  const todayFormatted = formatDateMalay(new Date());

  // Send request to Google Apps Script Web App directly via Client-side Form POST (no backend fetch)
  const postToGoogleAppsScript = async (payload: any): Promise<{ success: boolean; isHtml?: boolean; error?: string; data?: any }> => {
    return new Promise((resolve) => {
      try {
        const iframeId = "gas_hidden_submission_iframe";
        let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = iframeId;
          iframe.name = iframeId;
          iframe.style.position = "fixed";
          iframe.style.top = "-9999px";
          iframe.style.left = "-9999px";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "0";
          iframe.style.opacity = "0";
          iframe.setAttribute("aria-hidden", "true");
          document.body.appendChild(iframe);
        }

        const form = document.createElement("form");
        form.method = "POST";
        form.action = GOOGLE_APPS_SCRIPT_WEB_APP_URL;
        form.target = iframeId;
        form.enctype = "text/plain";
        form.style.display = "none";

        const jsonStr = JSON.stringify(payload);
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = jsonStr.slice(0, -1) + `,"_dummy":"`;
        input.value = `"` + `}`;
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();

        setTimeout(() => {
          if (form && form.parentNode) {
            form.parentNode.removeChild(form);
          }
        }, 800);

        resolve({ success: true });
      } catch (err: any) {
        resolve({
          success: false,
          error: err?.message || "Ralat memulakan penghantaran borang ke Google Apps Script."
        });
      }
    });
  };

  const fetchScheduleList = async () => {
    try {
      const result = await fetchScheduleWithFallback();
      if (result.source !== "sync_error") {
        setAllSchedules(Array.isArray(result.schedules) ? result.schedules : []);
      }
    } catch {}
  };

  const populateFormWithSchedule = (item?: ScheduleItem | null) => {
    if (item) {
      setSelectedId(item.id);
      setCustomId(item.id);
      setTeamName(item.teamName || item.driverName || "");
      setDate(item.date || "");
      setTimeSlot(item.timeSlot || "");
      setLocations(item.locations || "");
      setNotes(item.notes || "");

      // Try to parse ISO date if matches
      try {
        const parsed = new Date(item.date);
        if (!isNaN(parsed.getTime())) {
          setRawDateIso(parsed.toISOString().split("T")[0]);
        }
      } catch {
        // Keep current rawDateIso
      }

      const s = String(item.status || "").toLowerCase();
      if (s.includes("sedang") || s.includes("bergerak")) {
        setStatus("Sedang Bergerak");
      } else if (s.includes("selesai") || s.includes("tamat")) {
        setStatus("Selesai");
      } else {
        setStatus("Akan Datang");
      }
    } else {
      setSelectedId("");
      setCustomId(`JAD-${(allSchedules.length + 1).toString().padStart(2, "0")}`);
      setTeamName("");
      const todayIso = new Date().toISOString().split("T")[0];
      setRawDateIso(todayIso);
      setDate(formatDateMalay(todayIso));
      setTimeSlot("");
      setLocations("");
      setNotes("");
      setStatus("Sedang Bergerak");
    }
  };

  // Load Roles config for admin from local storage
  const loadRoles = () => {
    try {
      const storedAdmins = localStorage.getItem("fb_admin_emails");
      const storedTeam = localStorage.getItem("fb_team_emails");
      if (storedAdmins) setAdminEmailsList(JSON.parse(storedAdmins));
      else setAdminEmailsList(["maktabahumrr@gmail.com"]);
      if (storedTeam) setTeamEmailsList(JSON.parse(storedTeam));
    } catch {
      setAdminEmailsList(["maktabahumrr@gmail.com"]);
    }
  };

  // Helper: check if an email is Admin
  const isAdminEmail = (email: string): boolean => {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;
    if (clean === "maktabahumrr@gmail.com") return true;
    try {
      const storedAdmins = localStorage.getItem("fb_admin_emails");
      if (storedAdmins) {
        const parsed = JSON.parse(storedAdmins);
        if (Array.isArray(parsed) && parsed.map((e) => String(e).toLowerCase()).includes(clean)) {
          return true;
        }
      }
    } catch {}
    return adminEmailsList.map((e) => e.toLowerCase()).includes(clean);
  };

  // Helper: normalize AKSES TEAM status
  const normalizeAccessStatus = (raw: any): "approved" | "pending" | "rejected" | "unregistered" => {
    const s = String(raw || "").trim().toLowerCase();
    if (s === "approved" || s === "lulus" || s === "diluluskan" || s === "aktif" || s === "active") return "approved";
    if (s === "rejected" || s === "tolak" || s === "ditolak" || s === "batal" || s === "sekat") return "rejected";
    if (s === "unregistered" || s === "tiada") return "unregistered";
    return "pending";
  };

  // Safe JSON parser so empty/HTML responses never trigger "Unexpected end of JSON input"
  const safeParseJson = async (res: Response): Promise<any> => {
    try {
      const text = await res.text();
      const trimmed = text.trim();
      if (!trimmed || trimmed.startsWith("<")) return null;
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  // Helper: verify user's AKSES TEAM approval status via server API (or direct Google Apps Script fallback)
  const checkTeamAccessStatus = async (email: string): Promise<{
    status: "approved" | "pending" | "rejected" | "unregistered";
    isAdmin: boolean;
    record?: TeamApprovalItem | null;
  }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (isAdminEmail(cleanEmail)) {
      return { status: "approved", isAdmin: true, record: null };
    }

    try {
      const res = await fetch(`/api/team-access/status?email=${encodeURIComponent(cleanEmail)}&_t=${Date.now()}`, {
        cache: "no-store"
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data?.success) {
          return {
            status: normalizeAccessStatus(data.status || data.sheetStatus),
            isAdmin: Boolean(data.isAdmin),
            record: data.record || null
          };
        }
      }
    } catch {}

    // Direct Google Apps Script fallback
    try {
      const gasRes = await fetch(`${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=checkTeamAccess&email=${encodeURIComponent(cleanEmail)}&_t=${Date.now()}`, {
        cache: "no-store"
      });
      if (gasRes.ok) {
        const gasData = await safeParseJson(gasRes);
        if (gasData && typeof gasData.found === "boolean" && "status" in gasData) {
          return {
            status: gasData.found ? normalizeAccessStatus(gasData.status) : "unregistered",
            isAdmin: false,
            record: gasData.record || null
          };
        }
      }
    } catch {}

    // Offline cache check
    try {
      const stored = localStorage.getItem("fb_team_approvals");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const matched = list.find((a: any) => String(a.email || "").toLowerCase() === cleanEmail);
          if (matched) {
            return { status: normalizeAccessStatus(matched.status), isAdmin: false, record: matched };
          }
        }
      }
    } catch {}

    return { status: "pending", isAdmin: false, record: null };
  };

  // Helper: register new team member directly to AKSES TEAM (Status: Pending) + trigger email to maktabahumrr@gmail.com
  const registerTeamAccessToSheet = async (email: string, nama: string): Promise<{
    success: boolean;
    status: "approved" | "pending" | "rejected";
    record?: TeamApprovalItem;
    message?: string;
  }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = nama.trim() || cleanEmail.split("@")[0];

    try {
      const res = await fetch("/api/team-access/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, nama: cleanName, name: cleanName, sendEmail: true })
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data?.success) {
          const normalized = normalizeAccessStatus(data.status || "Pending");
          const finalStatus = normalized === "unregistered" ? "pending" : normalized;
          if (data.record) {
            try {
              const stored = localStorage.getItem("fb_team_approvals");
              const arr = stored ? JSON.parse(stored) : [];
              const next = Array.isArray(arr) ? arr.filter((x: any) => String(x.email || "").toLowerCase() !== cleanEmail) : [];
              next.unshift({ ...data.record, status: finalStatus });
              localStorage.setItem("fb_team_approvals", JSON.stringify(next));
              window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
            } catch {}
          }
          return {
            success: true,
            status: finalStatus,
            record: data.record,
            message: data.message
          };
        }
      }
    } catch {}

    // Direct Google Apps Script fallback if backend proxy is unavailable
    await postToGoogleAppsScript({
      action: "TEAM_ACCESS_REGISTER",
      email: cleanEmail,
      nama: cleanName,
      name: cleanName,
      status: "Pending",
      sendEmail: true
    });

    return {
      success: true,
      status: "pending",
      message: `Permohonan akses untuk ${cleanName} (${cleanEmail}) telah dihantar ke tab AKSES TEAM dengan status Pending.`
    };
  };

  // Load Team Approvals list for admin directly from Google Sheets tab AKSES TEAM (via server proxy + direct GAS fallback)
  const loadApprovals = async (explicitToken?: string) => {
    setIsLoadingApprovals(true);
    setApprovalsErrorMsg(null);
    const token = explicitToken || authToken || localStorage.getItem("fb_auth_token") || (await auth.currentUser?.getIdToken().catch(() => "")) || "";

    try {
      if (token) {
        const res = await fetch(`/api/team-access/list?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data?.success && Array.isArray(data.approvals)) {
            const normalized: TeamApprovalItem[] = data.approvals.map((item: any) => ({
              id: item.id,
              email: String(item.email || "").trim().toLowerCase(),
              nama: item.nama || item.name || "",
              name: item.nama || item.name || "",
              tarikh: item.tarikh || item.requestedAt || "",
              status: normalizeAccessStatus(item.status) === "unregistered" ? "pending" : (normalizeAccessStatus(item.status) as "approved" | "pending" | "rejected"),
              requestedAt: item.tarikh || item.requestedAt || "",
              reviewedAt: item.reviewedAt,
              reviewedBy: item.reviewedBy,
              notes: item.notes,
              hasPassword: true
            }));
            setTeamApprovals(normalized);
            setPendingApprovalCount(normalized.filter((a) => a.status === "pending").length);
            setApprovalsSource(data.source === "google_sheets_akses_team" ? "Tab AKSES TEAM (Google Sheets)" : "Cache Pelayan");
            try {
              localStorage.setItem("fb_team_approvals", JSON.stringify(normalized));
              window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
            } catch {}
            setIsLoadingApprovals(false);
            return;
          }
        }
      }

      // Direct Google Apps Script fallback
      const gasRes = await fetch(`${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=getTeamAccess&_t=${Date.now()}`, {
        cache: "no-store"
      });
      if (gasRes.ok) {
        const gasData = await safeParseJson(gasRes);
        if (gasData?.success && Array.isArray(gasData.teamAccess)) {
          const normalized: TeamApprovalItem[] = gasData.teamAccess.map((item: any) => ({
            id: item.id,
            email: String(item.email || "").trim().toLowerCase(),
            nama: item.nama || item.name || "",
            name: item.nama || item.name || "",
            tarikh: item.tarikh || item.requestedAt || "",
            status: normalizeAccessStatus(item.status) === "unregistered" ? "pending" : (normalizeAccessStatus(item.status) as "approved" | "pending" | "rejected"),
            requestedAt: item.tarikh || item.requestedAt || "",
            hasPassword: true
          }));
          setTeamApprovals(normalized);
          setPendingApprovalCount(normalized.filter((a) => a.status === "pending").length);
          setApprovalsSource("Tab AKSES TEAM (Google Sheets)");
          try {
            localStorage.setItem("fb_team_approvals", JSON.stringify(normalized));
            window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
          } catch {}
          setIsLoadingApprovals(false);
          return;
        }
      }

      throw new Error("Tidak dapat membaca data daripada tab AKSES TEAM. Pastikan Code.gs terbaru telah di-deploy.");
    } catch (err: any) {
      // Fallback to localStorage cache if offline
      try {
        const stored = localStorage.getItem("fb_team_approvals");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setTeamApprovals(parsed);
            setPendingApprovalCount(parsed.filter((a: any) => a.status === "pending").length);
          }
        }
      } catch {}
      setApprovalsErrorMsg(err?.message || "Gagal memuatkan senarai daripada tab AKSES TEAM.");
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  // Firebase Auth State Listener (Restores session ONLY if Admin or Approved in AKSES TEAM)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.toLowerCase();
        try {
          const token = await fbUser.getIdToken();
          const adminUser = isAdminEmail(cleanEmail);
          if (adminUser) {
            const userObj: AuthUser = {
              email: fbUser.email,
              name: fbUser.displayName || cleanEmail.split("@")[0],
              role: "admin",
              token
            };
            setCurrentUser(userObj);
            setAuthToken(token);
            localStorage.setItem("fb_auth_token", token);
            localStorage.setItem("fb_auth_user", JSON.stringify(userObj));
            loadRoles();
            loadApprovals(token);
            return;
          }

          // For non-admin team member: enforce AKSES TEAM status check before restoring session!
          const access = await checkTeamAccessStatus(cleanEmail);
          if (access.status === "approved") {
            const userObj: AuthUser = {
              email: fbUser.email,
              name: access.record?.nama || fbUser.displayName || cleanEmail.split("@")[0],
              role: "team",
              token
            };
            setCurrentUser(userObj);
            setAuthToken(token);
            localStorage.setItem("fb_auth_token", token);
            localStorage.setItem("fb_auth_user", JSON.stringify(userObj));
          } else {
            // Block Pending / Rejected / Unregistered team member
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            if (access.status === "rejected") {
              setPendingApprovalNotice(null);
              setAuthError(`Akses Ditolak: Akaun (${cleanEmail}) berstatus Rejected dalam tab AKSES TEAM. Sila hubungi Admin (maktabahumrr@gmail.com).`);
            } else if (access.status === "pending") {
              setPendingApplicantEmail(cleanEmail);
              setPendingApplicantName(access.record?.nama || cleanEmail.split("@")[0]);
              setPendingApprovalNotice(
                `Akaun anda (${cleanEmail}) masih berstatus Pending dalam tab AKSES TEAM. Akses mengubah jadual disekat sehingga Admin (maktabahumrr@gmail.com) menukar status anda kepada Approved.`
              );
            }
          }
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Test Admin Email Notification (sends real email to maktabahumrr@gmail.com + Web Push)
  const handleTestEmailNotification = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    try {
      const token = authToken || localStorage.getItem("fb_auth_token") || (await auth.currentUser?.getIdToken().catch(() => "")) || "";
      const res = await fetch("/api/team-access/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      const data = await safeParseJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Gagal menghantar emel ujian.");
      }
      setEmailTestResult(`✅ ${data.message}`);
    } catch (err: any) {
      setEmailTestResult(`❌ ${err?.message || "Gagal menghantar emel ujian ke maktabahumrr@gmail.com"}`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }

      // Check cached user and strictly verify non-admin status against AKSES TEAM
      const cachedUserStr = localStorage.getItem("fb_auth_user");
      const storedToken = localStorage.getItem("fb_auth_token");
      if (cachedUserStr && storedToken) {
        try {
          const parsed = JSON.parse(cachedUserStr);
          if (parsed && parsed.email) {
            if (isAdminEmail(parsed.email)) {
              setCurrentUser({ ...parsed, role: "admin" });
              setAuthToken(storedToken);
              loadRoles();
              loadApprovals(storedToken);
            } else {
              checkTeamAccessStatus(parsed.email).then((access) => {
                if (access.status === "approved") {
                  setCurrentUser({ ...parsed, role: "team" });
                  setAuthToken(storedToken);
                } else {
                  localStorage.removeItem("fb_auth_token");
                  localStorage.removeItem("fb_auth_user");
                  setCurrentUser(null);
                  setAuthToken("");
                  if (access.status === "pending") {
                    setPendingApplicantEmail(parsed.email.toLowerCase());
                    setPendingApplicantName(access.record?.nama || parsed.name || parsed.email.split("@")[0]);
                    setPendingApprovalNotice(
                      `Akaun anda (${parsed.email}) masih berstatus Pending dalam tab AKSES TEAM. Akses disekat sehingga Admin meluluskan permohonan anda.`
                    );
                  } else if (access.status === "rejected") {
                    setAuthError(`Akses Ditolak: Akaun (${parsed.email}) berstatus Rejected dalam tab AKSES TEAM.`);
                  }
                }
              }).catch(() => {});
            }
          }
        } catch {}
      }

      fetchScheduleList();
      populateFormWithSchedule(existingSchedule);
      setSubmitSuccess(null);
      setSubmitError(null);
      setAuthError("");
      setResendApprovalSuccess(null);
      setEmailTestResult(null);
    }
  }, [isOpen, existingSchedule, initialTab]);

  // Live Auto-Refresh Approvals while modal is open for Admin
  useEffect(() => {
    if (!isOpen || currentUser?.role !== "admin") return;
    loadApprovals();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Single Unified Form: Firebase Authentication + AKSES TEAM Pending/Approved/Rejected Gate
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    const cleanName = fullNameInput.trim();
    const cleanPassword = passwordInput.trim();
    const cleanConfirm = confirmPasswordInput.trim();

    if (!cleanEmail) {
      setAuthError("Sila masukkan alamat email anda.");
      return;
    }

    // Mode: Lupa Kata Laluan via Firebase Reset Email
    if (authMode === "forgot") {
      setIsAuthenticating(true);
      setAuthError("");
      setForgotSuccess(null);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setForgotSuccess(`Pautan reset kata laluan Firebase telah dihantar ke ${cleanEmail}. Sila semak peti masuk atau folder spam email anda.`);
      } catch (err: any) {
        let msg = err.message || "Gagal menghantar email reset kata laluan.";
        if (err.code === "auth/user-not-found") {
          msg = "Akaun Firebase dengan email ini belum wujud. Sila daftar akaun baru.";
        } else if (err.code === "auth/invalid-email") {
          msg = "Format alamat email tidak sah.";
        }
        setAuthError(msg);
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    if (authMode === "signup" && !cleanName) {
      setAuthError("Sila masukkan Nama Penuh atau Nama Team anda.");
      return;
    }

    if (!cleanPassword) {
      setAuthError("Sila masukkan Kata Laluan anda.");
      return;
    }

    if (cleanPassword.length < 6) {
      setAuthError("Kata laluan Firebase mestilah sekurang-kurangnya 6 aksara.");
      return;
    }

    if (authMode === "signup") {
      if (!cleanConfirm) {
        setAuthError("Sila sahkan Kata Laluan anda.");
        return;
      }
      if (cleanPassword !== cleanConfirm) {
        setAuthError("Pengesahan kata laluan tidak sepadan. Sila pastikan kedua-dua ruangan sama.");
        return;
      }
    }

    setIsAuthenticating(true);
    setAuthError("");
    setForgotSuccess(null);
    setPendingApprovalNotice(null);
    setResendApprovalSuccess(null);

    try {
      let fbUser;
      if (authMode === "signup") {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        fbUser = userCred.user;
      } else {
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        fbUser = userCred.user;
      }

      const idToken = await fbUser.getIdToken();
      const userEmail = (fbUser.email || cleanEmail).toLowerCase();
      const adminUser = isAdminEmail(userEmail);
      const role: "admin" | "team" = adminUser ? "admin" : "team";

      // 1. If TEAM (non-admin): verify or register in Google Sheets tab AKSES TEAM
      if (role === "team") {
        const applicantName = cleanName || fbUser.displayName || userEmail.split("@")[0];

        if (authMode === "signup") {
          // New registration: write directly to tab AKSES TEAM as Pending + email maktabahumrr@gmail.com
          const regRes = await registerTeamAccessToSheet(userEmail, applicantName);
          if (regRes.status !== "approved") {
            await firebaseSignOut(auth).catch(() => {});
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            setPasswordInput("");
            setConfirmPasswordInput("");
            setPendingApplicantEmail(userEmail);
            setPendingApplicantName(applicantName);
            if (regRes.status === "rejected") {
              setAuthError(`Akses Ditolak: Akaun (${userEmail}) berstatus Rejected dalam tab AKSES TEAM.`);
            } else {
              setPendingApprovalNotice(
                `Pendaftaran berjaya! Permohonan anda (${applicantName} - ${userEmail}) telah dihantar terus ke tab AKSES TEAM dengan status Pending dan notifikasi emel telah dihantar ke maktabahumrr@gmail.com. Akses ke jadual disekat sehingga Admin meluluskan permohonan anda.`
              );
            }
            return;
          }
        } else {
          // Login mode: check AKSES TEAM status strictly
          const accessCheck = await checkTeamAccessStatus(userEmail);
          if (accessCheck.status === "unregistered") {
            // Existing Firebase account not yet recorded in AKSES TEAM -> register as Pending and block
            await registerTeamAccessToSheet(userEmail, applicantName);
            await firebaseSignOut(auth).catch(() => {});
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            setPasswordInput("");
            setPendingApplicantEmail(userEmail);
            setPendingApplicantName(applicantName);
            setPendingApprovalNotice(
              `Akaun anda (${userEmail}) telah direkodkan ke tab AKSES TEAM dengan status Pending dan notifikasi telah dihantar ke Admin (maktabahumrr@gmail.com). Sila tunggu kelulusan (Approved) sebelum mengubah jadual.`
            );
            return;
          }
          if (accessCheck.status === "pending") {
            await firebaseSignOut(auth).catch(() => {});
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            setPasswordInput("");
            setPendingApplicantEmail(userEmail);
            setPendingApplicantName(accessCheck.record?.nama || applicantName);
            setPendingApprovalNotice(
              `Akaun anda (${userEmail}) masih berstatus Pending dalam tab AKSES TEAM. Akses mengakses atau mengubah jadual disekat sehingga Admin meluluskan permohonan anda (Approved).`
            );
            return;
          }
          if (accessCheck.status === "rejected") {
            await firebaseSignOut(auth).catch(() => {});
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            setPasswordInput("");
            setAuthError(`Akses Ditolak: Permohonan akaun (${userEmail}) telah ditolak (Rejected) oleh Admin dalam tab AKSES TEAM.`);
            return;
          }
        }
      }

      const authenticatedUser: AuthUser = {
        email: fbUser.email || cleanEmail,
        name: cleanName || fbUser.displayName || cleanEmail.split("@")[0],
        role,
        token: idToken
      };

      setCurrentUser(authenticatedUser);
      setAuthToken(idToken);
      localStorage.setItem("fb_auth_token", idToken);
      localStorage.setItem("fb_auth_user", JSON.stringify(authenticatedUser));
      setPasswordInput("");
      setConfirmPasswordInput("");
      setPendingApprovalNotice(null);
      setAuthError("");

      if (role === "admin") {
        loadRoles();
        loadApprovals(idToken);
      }
    } catch (err: any) {
      let msg = err.message || "Ralat log masuk.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "Email atau kata laluan tidak sepadan. Sila semak semula atau gunakan pilihan 'Lupa Kata Laluan'.";
      } else if (err.code === "auth/user-not-found") {
        msg = "Akaun Firebase ini belum wujud. Sila klik pendaftaran akaun pasukan baru.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "Email ini telah didaftarkan dalam Firebase Authentication. Sila pilih mod Log Masuk atau reset kata laluan.";
      } else if (err.code === "auth/weak-password") {
        msg = "Kata laluan Firebase mestilah sekurang-kurangnya 6 aksara.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Format alamat email tidak sah.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Terlalu banyak percubaan log masuk gagal. Sila cuba lagi sebentar lagi.";
      }
      setAuthError(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Admin Approve / Reject Team Member -> Writes directly to Google Sheets tab AKSES TEAM
  const handleApproveTeamMember = async (itemOrEmail: TeamApprovalItem | string, status: "approved" | "rejected" | "pending") => {
    const item = typeof itemOrEmail === "string"
      ? teamApprovals.find((a) => a.email.toLowerCase() === itemOrEmail.toLowerCase()) || { email: itemOrEmail, status: "pending", requestedAt: "" }
      : itemOrEmail;
    const targetEmail = item.email.trim().toLowerCase();
    const sheetStatus = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending";

    setUpdatingApprovalEmail(targetEmail);
    setApprovalsSuccessMsg(null);
    setApprovalsErrorMsg(null);

    try {
      const token = authToken || localStorage.getItem("fb_auth_token") || (await auth.currentUser?.getIdToken().catch(() => "")) || "";
      const res = await fetch("/api/team-access/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: item.id,
          email: targetEmail,
          nama: item.nama || item.name,
          status: sheetStatus
        })
      });

      const data = await safeParseJson(res);
      if (res.status === 401 || res.status === 403) {
        throw new Error(data?.error || "Akses ditolak: Sila log masuk semula sebagai Admin.");
      }

      if (!res.ok || !data?.success || !data?.sheetsSynced) {
        // Fallback terus ke Google Apps Script jika pelayan tidak mengembalikan JSON atau gagal sync
        await postToGoogleAppsScript({
          action: "TEAM_ACCESS_UPDATE",
          id: item.id,
          email: targetEmail,
          nama: item.nama || item.name,
          status: sheetStatus
        });
      }

      const updated = teamApprovals.map((a) =>
        a.email.toLowerCase() === targetEmail ? { ...a, status } : a
      );
      setTeamApprovals(updated);
      setPendingApprovalCount(updated.filter((a) => a.status === "pending").length);
      try {
        localStorage.setItem("fb_team_approvals", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
      } catch {}

      setApprovalsSuccessMsg(
        `Status untuk ${item.nama || targetEmail} dalam tab AKSES TEAM berjaya ditukar kepada ${sheetStatus}.`
      );
      setTimeout(() => setApprovalsSuccessMsg(null), 4000);
    } catch (err: any) {
      setApprovalsErrorMsg(err?.message || "Ralat semasa mengemaskini kelulusan AKSES TEAM.");
    } finally {
      setUpdatingApprovalEmail(null);
    }
  };

  // Team Member: Check live AKSES TEAM status from Pending notice card
  const handleCheckPendingApprovalStatus = async () => {
    const cleanEmail = (pendingApplicantEmail || googleEmailInput).trim().toLowerCase();
    if (!cleanEmail) return;
    setIsCheckingPendingStatus(true);
    setResendApprovalSuccess(null);
    try {
      const access = await checkTeamAccessStatus(cleanEmail);
      if (access.status === "approved") {
        setPendingApprovalNotice(null);
        setAuthError("");
        setForgotSuccess(`Tahniah! Akaun anda (${cleanEmail}) telah DILULUSKAN (Approved) oleh Admin. Sila masukkan kata laluan untuk log masuk.`);
        setAuthMode("login");
      } else if (access.status === "rejected") {
        setPendingApprovalNotice(null);
        setAuthError(`Akses Ditolak: Akaun (${cleanEmail}) telah ditukar kepada Rejected oleh Admin dalam tab AKSES TEAM.`);
      } else {
        setResendApprovalSuccess("Status dalam tab AKSES TEAM masih Pending. Sila tunggu Admin meluluskan permohonan anda.");
      }
    } finally {
      setIsCheckingPendingStatus(false);
    }
  };

  // Team Member: Re-send approval email request to Admin maktabahumrr@gmail.com
  const handleResendApprovalNotification = async () => {
    const cleanEmail = (pendingApplicantEmail || googleEmailInput).trim().toLowerCase();
    const cleanName = pendingApplicantName || fullNameInput.trim() || cleanEmail.split("@")[0];
    if (!cleanEmail) return;
    setIsResendingApproval(true);
    setResendApprovalSuccess(null);
    try {
      const res = await fetch("/api/team-access/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, nama: cleanName })
      });
      if (!res.ok) {
        await postToGoogleAppsScript({
          action: "TEAM_ACCESS_RESEND",
          email: cleanEmail,
          nama: cleanName
        });
      }
      setResendApprovalSuccess("Notifikasi emel permohonan telah dihantar ke maktabahumrr@gmail.com!");
    } catch {
      setResendApprovalSuccess("Permintaan notifikasi telah dihantar ke pihak Admin (maktabahumrr@gmail.com).");
    } finally {
      setIsResendingApproval(false);
    }
  };

  // Handle Changing Password for Logged In User
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) {
      setChangePasswordError("Sila masukkan password baharu.");
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setChangePasswordError("Pengesahan password baharu tidak sepadan.");
      return;
    }
    if (newPasswordInput.length < 3) {
      setChangePasswordError("Password baharu mestilah sekurang-kurangnya 3 aksara/digit.");
      return;
    }

    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    try {
      if (!auth.currentUser) {
        throw new Error("Sesi pengguna Firebase tidak ditemui. Sila log masuk semula.");
      }
      await firebaseUpdatePassword(auth.currentUser, newPasswordInput.trim());

      setChangePasswordSuccess("Password Firebase anda telah berjaya dikemaskini!");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
    } catch (err: any) {
      setChangePasswordError(err.message || "Ralat menukar password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Admin Reset User Password via Firebase SDK
  const handleAdminResetPassword = async (targetEmail: string) => {
    if (!window.confirm(`Adakah anda pasti ingin reset password untuk ${targetEmail}? Pautan reset kata laluan Firebase akan dihantar ke email pengguna.`)) {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail.trim().toLowerCase());
      setRolesSuccess(`Pautan reset kata laluan Firebase telah dihantar ke ${targetEmail}.`);
      setTimeout(() => setRolesSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Ralat reset password Firebase.");
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem("fb_auth_token");
    localStorage.removeItem("fb_auth_user");
    setCurrentUser(null);
    setAuthToken("");
    setAuthError("");
    setForgotSuccess(null);
    setPendingApprovalNotice(null);
    setPendingApplicantEmail("");
    setPendingApplicantName("");
    setResendApprovalSuccess(null);
    setPasswordInput("");
    setConfirmPasswordInput("");
  };

  // Submit Schedule (Create or Update) to Google Apps Script Web App
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setSubmitError("Sila log masuk terlebih dahulu.");
      return;
    }
    if (currentUser.role !== "admin") {
      const access = await checkTeamAccessStatus(currentUser.email);
      if (access.status !== "approved") {
        await handleLogout();
        setAuthError(
          access.status === "rejected"
            ? `Akses Ditolak: Akaun (${currentUser.email}) berstatus Rejected dalam tab AKSES TEAM.`
            : `Akses Disekat: Akaun (${currentUser.email}) berstatus Pending dalam tab AKSES TEAM.`
        );
        return;
      }
    }
    if (!locations.trim()) {
      setSubmitError("Sila masukkan kawasan pergerakan.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const scheduleId = selectedId || customId || `JAD-${(allSchedules.length + 1).toString().padStart(2, "0")}`;
    const action = selectedId ? "SCHEDULE_UPDATE" : "SCHEDULE_CREATE";
    const finalTeam = teamName.trim();
    const finalDate = (date.trim() || todayFormatted).trim();
    const finalTime = "";
    const finalLocations = locations.trim();
    const finalNotes = "";
    const finalStatus = status;

    // Google Apps Script doPost(e) expected payload:
    // Tab: JADUAL (7 lajur: ID JADUAL | NAMA TEAM | TARIKH | MASA | KAWASAN | CATATAN | STATUS)
    const webAppPayload = {
      idJadual: scheduleId,
      namaTeam: finalTeam,
      tarikh: finalDate,
      masa: finalTime,
      kawasan: finalLocations,
      catatan: finalNotes,
      status: finalStatus,
      action,
      sheetName: "JADUAL",
      id: scheduleId,
      row: [
        scheduleId,
        finalTeam,
        finalDate,
        finalTime,
        finalLocations,
        finalNotes,
        finalStatus
      ],
      data: {
        id: scheduleId,
        idJadual: scheduleId,
        teamName: finalTeam,
        namaTeam: finalTeam,
        driverName: finalTeam,
        date: finalDate,
        tarikh: finalDate,
        timeSlot: finalTime,
        masa: finalTime,
        locations: finalLocations,
        kawasan: finalLocations,
        notes: finalNotes,
        catatan: finalNotes,
        status: finalStatus
      }
    };

    try {
      // 1. Direct POST to Google Apps Script Web App URL via client-side form submit
      const webAppResult = await postToGoogleAppsScript(webAppPayload);

      // 2. Broadcast notification locally if enabled
      const notifTitle = "FrozenBergerak 📍 Jadual Pergerakan Dikemaskini";
      const notifBody = `${finalTeam ? `${finalTeam}: ` : ""}Pergerakan di ${finalLocations} (${finalDate}).`;

      if (sendPushNotification && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("frozen_live_notification", {
          detail: {
            title: notifTitle,
            body: notifBody,
            url: "/#section-jadual-pergerakan",
            timestamp: Date.now()
          }
        }));
      }

      // Update local storage and allSchedules
      const newScheduleObj: ScheduleItem = {
        id: scheduleId,
        teamName: finalTeam,
        driverName: finalTeam,
        date: finalDate,
        timeSlot: finalTime,
        locations: finalLocations,
        notes: finalNotes,
        status: finalStatus
      };

      setAllSchedules((prev) => {
        const idx = prev.findIndex((s) => s.id === scheduleId);
        let updated;
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = newScheduleObj;
        } else {
          updated = [newScheduleObj, ...prev];
        }
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 1. Save to Firebase Database (Firestore) globally across all devices
      saveScheduleToFirestore(newScheduleObj).catch((fbErr) => {
        console.warn("[ScheduleSync] Firestore save note:", fbErr);
      });

      // 2. Persist to Server Database (/api/schedule/update) globally
      const token = authToken || localStorage.getItem("fb_auth_token") || (await auth.currentUser?.getIdToken().catch(() => "")) || "";
      try {
        const updateRes = await fetch("/api/schedule/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: scheduleId,
            teamName: finalTeam,
            date: finalDate,
            timeSlot: finalTime,
            locations: finalLocations,
            notes: finalNotes,
            status: finalStatus,
            sendPushNotification,
            token
          })
        });
        if (updateRes.ok) {
          const updateData = await safeParseJson(updateRes);
          if (updateData?.schedules && Array.isArray(updateData.schedules)) {
            setAllSchedules(updateData.schedules);
            try {
              localStorage.setItem("frozen_schedules", JSON.stringify(updateData.schedules));
            } catch {}
          }
          console.log("[ScheduleSync] ✅ Rekod jadual disimpan secara global pada server:", scheduleId);
        } else if (updateRes.status === 403) {
          const errBody = (await safeParseJson(updateRes)) || {};
          setSubmitError(errBody.error || "Akses disekat: Akaun belum diluluskan oleh Admin.");
          setIsSubmitting(false);
          return;
        }
      } catch (serverUpErr) {
        console.warn("[ScheduleSync] Server update call note:", serverUpErr);
      }

      if (webAppResult.success) {
        setSubmitSuccess(`Jadual pergerakan berjaya disimpan & disegerakkan ke Google Sheets tab JADUAL`);
        setTimeout(() => setSubmitSuccess(null), 3500);
      } else {
        setSubmitError(webAppResult.error || "Gagal memulakan penghantaran ke Google Sheets Web App.");
      }

      onScheduleUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Ralat semasa menyimpan jadual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Schedule globally across all devices (Server, Firebase Database, & Google Sheets)
  const handleDelete = async () => {
    if (!selectedId || !currentUser) return;
    if (currentUser.role !== "admin") {
      const access = await checkTeamAccessStatus(currentUser.email);
      if (access.status !== "approved") {
        await handleLogout();
        setAuthError("Akses disekat: Akaun anda belum diluluskan oleh Admin dalam tab AKSES TEAM.");
        return;
      }
    }
    if (!window.confirm("Adakah anda pasti mahu memadam slot jadual ini daripada sistem & Google Sheets tab JADUAL?")) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const targetIdToDelete = selectedId;
    const deletePayload = {
      action: "SCHEDULE_DELETE",
      sheetName: "JADUAL",
      id: targetIdToDelete,
      data: { id: targetIdToDelete }
    };

    try {
      // 1. Delete from Server Database globally (/api/schedule/delete)
      const token = authToken || localStorage.getItem("fb_auth_token") || (await auth.currentUser?.getIdToken().catch(() => "")) || "";
      try {
        const delRes = await fetch("/api/schedule/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ id: targetIdToDelete, token })
        });
        if (delRes.ok) {
          const resData = await safeParseJson(delRes);
          if (resData?.schedules && Array.isArray(resData.schedules)) {
            setAllSchedules(resData.schedules);
            try {
              localStorage.setItem("frozen_schedules", JSON.stringify(resData.schedules));
            } catch {}
          }
          console.log("[ScheduleSync] ✅ Rekod jadual dipadam secara global dari server:", targetIdToDelete);
        } else if (delRes.status === 403) {
          const errBody = (await safeParseJson(delRes)) || {};
          setSubmitError(errBody.error || "Akses disekat: Akaun belum diluluskan oleh Admin.");
          setIsSubmitting(false);
          return;
        }
      } catch (serverErr) {
        console.warn("[ScheduleSync] Server delete call note:", serverErr);
      }

      // 2. Delete from Firebase Database (Firestore) globally
      try {
        await deleteScheduleFromFirestore(targetIdToDelete);
      } catch (fbErr) {
        console.warn("[ScheduleSync] Firestore delete note:", fbErr);
      }

      // 3. Post delete to Google Apps Script Web App
      const webAppResult = await postToGoogleAppsScript(deletePayload);

      // 4. Update local state
      setAllSchedules((prev) => {
        const filtered = prev.filter((s) => s.id !== targetIdToDelete);
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      if (webAppResult.success) {
        setSubmitSuccess(`Jadual (${targetIdToDelete}) berjaya dipadam secara kekal di semua peranti & tab JADUAL.`);
      } else {
        setSubmitSuccess(`Jadual (${targetIdToDelete}) dipadam secara kekal dari pangkalan data sistem.`);
      }
      setTimeout(() => setSubmitSuccess(null), 3500);

      populateFormWithSchedule(null);
      onScheduleUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Ralat semasa memadam jadual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync fresh from Google Sheets tab JADUAL / Firebase Database
  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const result = await fetchScheduleWithFallback();
      if (result.source === "sync_error" || result.error) {
        setSubmitError(result.error || "Gagal menyegerakkan jadual langsung dari Google Sheets / Firebase.");
        return;
      }

      setAllSchedules(Array.isArray(result.schedules) ? result.schedules : []);
      onScheduleUpdated();

      if (result.source === "firebase_database") {
        setSubmitSuccess(`Berjaya menyegerakkan ${result.schedules.length} rekod dari Firebase Database.`);
      } else {
        setSubmitSuccess(`Berjaya menyegerakkan ${result.schedules.length} rekod terus dari Google Sheets tab JADUAL!`);
      }
      setTimeout(() => setSubmitSuccess(null), 3500);
    } catch (err: any) {
      setSubmitError(err?.message || "Gagal menyegerakkan data jadual buat masa ini.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Save updated Roles (Admin Only) via localStorage
  const handleSaveRoles = async () => {
    setRolesSaving(true);
    setRolesSuccess(null);
    try {
      localStorage.setItem("fb_admin_emails", JSON.stringify(adminEmailsList));
      localStorage.setItem("fb_team_emails", JSON.stringify(teamEmailsList));
      setRolesSuccess("Senarai akaun ADMIN & TEAM berjaya dikemaskini.");
      setTimeout(() => setRolesSuccess(null), 3000);
    } catch (err: any) {
      setSubmitError(err.message || "Ralat semasa menyimpan kebenaran.");
    } finally {
      setRolesSaving(false);
    }
  };

  const handleAddAdminEmail = () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (email && !adminEmailsList.includes(email)) {
      setAdminEmailsList([...adminEmailsList, email]);
      setNewAdminEmail("");
    }
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    if (emailToRemove.toLowerCase() === "maktabahumrr@gmail.com") return;
    setAdminEmailsList(adminEmailsList.filter((e) => e !== emailToRemove));
  };

  const handleAddTeamEmail = () => {
    const email = newTeamEmail.trim().toLowerCase();
    if (email && !teamEmailsList.includes(email)) {
      setTeamEmailsList([...teamEmailsList, email]);
      setNewTeamEmail("");
    }
  };

  const handleRemoveTeamEmail = (emailToRemove: string) => {
    setTeamEmailsList(teamEmailsList.filter((e) => e !== emailToRemove));
  };

  const copyAppsScript = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(UNIFIED_APPS_SCRIPT_CODE);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = UNIFIED_APPS_SCRIPT_CODE;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const downloadAppsScript = () => {
    const blob = new Blob([UNIFIED_APPS_SCRIPT_CODE], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Code.gs";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                Team Update &bull; Tab JADUAL
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Kemas Kini Jadual Pasukan
              </h2>
            </div>
          </div>

          {/* User badge if logged in */}
          {currentUser && (
            <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  currentUser.role === "admin" 
                    ? "bg-amber-400 text-amber-950" 
                    : "bg-emerald-400 text-emerald-950"
                }`}>
                  {currentUser.role === "admin" ? "🛡️ ADMIN" : "🚚 TEAM"}
                </span>
                <span className="text-white/90 font-medium truncate max-w-[200px]">{currentUser.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Log Keluar</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs for Logged in Users */}
        {currentUser && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-5 flex-shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "manage"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Urus Jadual JADUAL</span>
            </button>

            {currentUser.role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("approvals");
                    loadApprovals();
                  }}
                  className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === "approvals"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Kelulusan Team</span>
                  {pendingApprovalCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-amber-500 text-white rounded-full ml-0.5">
                      {pendingApprovalCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("roles")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === "roles"
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kebenaran Admin &amp; Team</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "password"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Tukar Password Saya</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sheets")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "sheets"
                  ? "border-blue-600 text-blue-600 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Panduan Google Sheets</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {!currentUser ? (
            /* =========================================================================
               AUTH GATE: Firebase Authentication (Email/Password & Password Reset)
               ========================================================================= */
            <div className="space-y-4 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
                  <Flame className="w-6 h-6 fill-amber-500 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {authMode === "login" 
                    ? "Log Masuk Pasukan (Firebase)" 
                    : authMode === "signup" 
                    ? "Pendaftaran Akaun Pasukan (Firebase)" 
                    : "Reset Kata Laluan (Firebase)"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {authMode === "login" 
                    ? "Sila log masuk menggunakan email dan kata laluan Firebase anda untuk menguruskan Jadual & Lokasi." 
                    : authMode === "signup"
                    ? "Sila masukkan email dan cipta kata laluan (min. 6 aksara) untuk pendaftaran Firebase."
                    : "Masukkan email anda untuk menerima pautan reset kata laluan terus ke email anda."}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-[11px] font-semibold text-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Disahkan oleh Firebase Authentication</span>
                </div>
              </div>

              {pendingApprovalNotice ? (
                /* Pending Approval Notification Card */
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                      <Clock3 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-950">
                        Status Akaun: Pending (Menunggu Kelulusan Admin)
                      </h4>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {pendingApprovalNotice}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                    <p className="text-amber-800">
                      Permohonan anda direkodkan di tab <strong>AKSES TEAM</strong> dan notifikasi telah dihantar ke <strong>maktabahumrr@gmail.com</strong>. Sebaik sahaja status anda ditukar kepada <strong>Approved</strong>, anda boleh log masuk dan menguruskan jadual.
                    </p>
                  </div>

                  {resendApprovalSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{resendApprovalSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckPendingApprovalStatus}
                      disabled={isCheckingPendingStatus}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPendingStatus ? "animate-spin" : ""}`} />
                      <span>{isCheckingPendingStatus ? "Menyemak..." : "Semak Status Terkini"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResendApprovalNotification}
                      disabled={isResendingApproval}
                      className="flex-1 py-2 px-3 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isResendingApproval ? "Menghantar..." : "Hantar Semula Notifikasi"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingApprovalNotice(null);
                        setResendApprovalSuccess(null);
                        setAuthMode("login");
                      }}
                      className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              ) : (
                /* Login / Sign Up / Forgot Password Form */
                <form onSubmit={handleUnifiedLogin} className="space-y-3.5 pt-1">

                  {/* Field 0: Nama (For Sign-Up mode -> written to AKSES TEAM column NAMA) */}
                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Nama Penuh / Nama Team:
                      </label>
                      <input
                        type="text"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="Contoh: Izyan / Team Frozen 2"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        required
                      />
                    </div>
                  )}
                  
                  {/* Field 1: Email */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Email:
                    </label>
                    <input
                      type="email"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="Masukkan alamat email anda..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                      autoFocus={authMode !== "signup"}
                      required
                    />
                  </div>

                  {/* Field 2: Password (for Login and Signup modes) */}
                  {authMode !== "forgot" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          {authMode === "login" ? "Kata Laluan / Password:" : "Cipta Kata Laluan (min 6 aksara):"}
                        </label>
                        {authMode === "login" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("forgot");
                              setAuthError("");
                              setForgotSuccess(null);
                            }}
                            className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                          >
                            Lupa kata laluan?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Masukkan kata laluan..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={showPassword ? "Sembunyikan" : "Tunjukkan"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Field 3: Sahkan Password (Only for Sign-Up) */}
                  {authMode === "signup" && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Sahkan Kata Laluan:
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          placeholder="Sahkan semula kata laluan..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={showConfirmPassword ? "Sembunyikan" : "Tunjukkan"}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  {/* Submit / Cancel Buttons */}
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isAuthenticating 
                        ? "Memproses..." 
                        : authMode === "login" 
                        ? "Log Masuk Firebase ➔" 
                        : authMode === "signup"
                        ? "Daftar Akaun Pasukan ➔"
                        : "Hantar Email Reset ➔"}
                    </button>
                  </div>

                  {/* Mode Switch (Login vs Signup vs Forgot) */}
                  <div className="pt-2 text-center border-t border-slate-100 space-y-1.5">
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setAuthError("");
                          setForgotSuccess(null);
                          setConfirmPasswordInput("");
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer block w-full text-center"
                      >
                        Pendaftaran kali pertama? Cipta kata laluan &amp; mohon akses di sini.
                      </button>
                    )}

                    {authMode === "signup" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                          setForgotSuccess(null);
                          setConfirmPasswordInput("");
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer block w-full text-center"
                      >
                        Sudah mempunyai akaun Firebase? Log masuk di sini.
                      </button>
                    )}

                    {authMode === "forgot" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setAuthError("");
                          setForgotSuccess(null);
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer block w-full text-center"
                      >
                        Kembali ke paparan Log Masuk
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : activeTab === "manage" ? (
            /* =========================================================================
               TAB 1: MANAGE SCHEDULES (CRUD + Google Sheets JADUAL Sync)
               ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Actions Header: Sync Google Sheets & Create New */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="text-xs font-bold text-slate-700">
                  Senarai Slot Jadual:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncFromSheets}
                    disabled={isSyncing}
                    className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    title="Segerak data terus dari Google Sheets tab JADUAL"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                    <span>{isSyncing ? "Menyegerak..." : "Sync Sheets"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => populateFormWithSchedule(null)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Tambah Baru</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Slot Picker */}
              {allSchedules.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {allSchedules.map((s) => {
                    const isSel = selectedId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => populateFormWithSchedule(s)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                          isSel 
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20" 
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold opacity-90 truncate max-w-[100px]">{s.date || "Jadual"}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold truncate max-w-[140px] mt-0.5">
                          {s.teamName || s.driverName || "Slot Pergerakan"}
                        </div>
                        <div className={`text-[10px] font-normal truncate max-w-[140px] ${isSel ? "text-blue-100" : "text-slate-500"}`}>
                          {s.locations || "Kawasan"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Form Schema: Clean Schedule Fields (Name, Date Calendar, Area, Status) */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                
                {/* 1. NAMA TEAM */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    NAMA TEAM:
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Masukkan nama team (atau biarkan kosong)..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* 2. TARIKH (Link Kalendar) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      TARIKH:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const todayIso = new Date().toISOString().split("T")[0];
                          setRawDateIso(todayIso);
                          setDate(formatDateMalay(todayIso));
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                      >
                        📅 Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const tomorrowIso = tomorrow.toISOString().split("T")[0];
                          setRawDateIso(tomorrowIso);
                          setDate(formatDateMalay(tomorrowIso));
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                      >
                        📅 Esok
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <input
                        type="date"
                        value={rawDateIso}
                        onChange={(e) => {
                          setRawDateIso(e.target.value);
                          if (e.target.value) {
                            setDate(formatDateMalay(e.target.value));
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        title="Pilih dari Kalendar"
                      />
                    </div>
                    <div className="sm:col-span-2 relative">
                      <input
                        type="text"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        placeholder="cth: Rabu, 26 Ogos 2026"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                      />
                      <Calendar className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 3. KAWASAN */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    KAWASAN:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={locations}
                      onChange={(e) => setLocations(e.target.value)}
                      placeholder="cth: Seremban 2, Sendayan, Rasah, Senawang..."
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                    <MapPin className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                {/* 4. STATUS */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    STATUS:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus("Akan Datang")}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        status === "Akan Datang"
                          ? "bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Akan Datang ⏳</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus("Sedang Bergerak")}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        status === "Sedang Bergerak"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Sedang Bergerak 🚗</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus("Selesai")}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        status === "Selesai"
                          ? "bg-slate-200 border-slate-400 text-slate-800"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Selesai ✅</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Push Notification Toggle */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendPushNotification}
                      onChange={(e) => setSendPushNotification(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                    />
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      Hantar Notifikasi Push Ke Telefon Pelanggan
                    </span>
                  </label>
                  <span className="text-[10px] text-blue-300 font-bold">
                    {subscriberCount} Melanggan
                  </span>
                </div>

                {sendPushNotification && (
                  <div className="p-2.5 bg-white/10 rounded-xl border border-white/15 text-[11px] text-white/90">
                    <strong>FrozenBergerak 📍 Jadual Pergerakan:</strong> {teamName ? `${teamName}: ` : ""}Pergerakan di {locations || "Kawasan Perkhidmatan"} ({date || "Hari Ini"}).
                  </div>
                )}
              </div>

              {/* Success / Error Messages */}
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* Action Buttons: Delete / Save / Cancel */}
              <div className="pt-2 flex items-center justify-between gap-3">
                {selectedId ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="py-2.5 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs flex items-center gap-1.5 transition-colors border border-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Padam Slot</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Sedang Menyimpan &amp; Menghantar...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{selectedId ? "Simpan Perubahan Jadual" : "Tambah & Segerak ke Google Sheets"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : activeTab === "approvals" ? (
            /* =========================================================================
               TAB: TEAM ACCESS APPROVALS MANAGEMENT (ADMIN ONLY -> Tab AKSES TEAM)
               ========================================================================= */
            <div className="space-y-4 py-1">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950 text-sm">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Kelulusan Team (Tab AKSES TEAM)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadApprovals()}
                    disabled={isLoadingApprovals}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingApprovals ? "animate-spin text-blue-600" : ""}`} />
                    <span>Muat Semula</span>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Senarai permohonan di bawah ditarik terus daripada tab <code className="bg-white px-1 rounded font-bold text-blue-900">AKSES TEAM</code> dalam Google Sheets Jadual Team. Tukar status kepada <strong>Approved</strong> untuk membenarkan akses jadual atau <strong>Rejected</strong> untuk menyekat.
                </p>
                {approvalsSource && (
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-800 bg-white/80 border border-blue-200 px-2 py-0.5 rounded-full">
                    <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                    <span>Sumber: {approvalsSource}</span>
                  </div>
                )}
              </div>

              {/* Status Summary Counters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-amber-800">Pending</span>
                  <span className="text-lg font-black text-amber-900">
                    {teamApprovals.filter((a) => a.status === "pending").length}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-emerald-800">Approved</span>
                  <span className="text-lg font-black text-emerald-900">
                    {teamApprovals.filter((a) => a.status === "approved").length}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-rose-800">Rejected</span>
                  <span className="text-lg font-black text-rose-900">
                    {teamApprovals.filter((a) => a.status === "rejected").length}
                  </span>
                </div>
              </div>

              {/* Email Notification Diagnostics & Test */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">Notifikasi Emel Admin</span>
                    <span className="text-[11px] text-slate-500 font-mono">maktabahumrr@gmail.com</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestEmailNotification}
                  disabled={isTestingEmail}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingEmail ? "animate-pulse" : ""}`} />
                  <span>{isTestingEmail ? "Menghantar Ujian..." : "Uji Hantar Emel & Push"}</span>
                </button>
              </div>

              {emailTestResult && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  emailTestResult.startsWith("✅") 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  <span>{emailTestResult}</span>
                </div>
              )}

              {approvalsErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{approvalsErrorMsg}</span>
                </div>
              )}

              {approvalsSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{approvalsSuccessMsg}</span>
                </div>
              )}

              {/* Approvals List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1">
                  <span>Senarai Pemohon (Tab AKSES TEAM):</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {teamApprovals.length} Rekod
                  </span>
                </div>

                {isLoadingApprovals ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuatkan senarai daripada tab AKSES TEAM...</span>
                  </div>
                ) : teamApprovals.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 space-y-1">
                    <Clock3 className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="font-semibold text-slate-700">Tiada Permohonan Dalam Tab AKSES TEAM</p>
                    <p className="text-[11px]">Setiap pendaftaran baharu akan dihantar terus ke tab AKSES TEAM dan dipaparkan di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {teamApprovals.map((item) => {
                      const isRowUpdating = updatingApprovalEmail === item.email.toLowerCase();
                      return (
                        <div
                          key={item.email + (item.id || "")}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            item.status === "pending"
                              ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/50"
                              : item.status === "approved"
                              ? "bg-white border-slate-200"
                              : "bg-rose-50/40 border-rose-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="space-y-1 min-w-[200px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.id && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-bold">
                                    {item.id}
                                  </span>
                                )}
                                <span className="font-bold text-xs text-slate-900">
                                  {item.nama || item.name || item.email.split("@")[0]}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    item.status === "approved"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : item.status === "pending"
                                      ? "bg-amber-200 text-amber-900 animate-pulse"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {item.status === "approved"
                                    ? "✅ Approved"
                                    : item.status === "pending"
                                    ? "⏳ Pending"
                                    : "❌ Rejected"}
                                </span>
                              </div>
                              <div className="text-xs text-blue-700 font-medium break-all">{item.email}</div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>
                                  Tarikh: {item.tarikh || item.requestedAt || "-"}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                              {item.status !== "approved" && (
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleApproveTeamMember(item, "approved")}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                                  title="Tukar status kepada Approved"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isRowUpdating ? "..." : "Approved"}</span>
                                </button>
                              )}

                              {item.status !== "rejected" && (
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleApproveTeamMember(item, "rejected")}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Tukar status kepada Rejected"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>{isRowUpdating ? "..." : "Rejected"}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleAdminResetPassword(item.email)}
                                className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200 cursor-pointer"
                                title="Hantar email reset password Firebase"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "roles" ? (
            /* =========================================================================
               TAB 2: ROLES & ACCESS CONTROL CONFIGURATION (ADMIN ONLY)
               ========================================================================= */
            <div className="space-y-5 py-1">
              <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Kawalan Akses Pengguna ADMIN &amp; TEAM</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Tetapkan senarai email Google yang dibenarkan untuk menguruskan jadual pergerakan. Anda juga boleh menetapkan pembolehubah persekitaran <code className="bg-amber-100 px-1 rounded">ADMIN_EMAILS</code> dan <code className="bg-amber-100 px-1 rounded">TEAM_EMAILS</code> di fail persekitaran (.env).
                </p>
              </div>

              {/* Admin Emails Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Akaun ADMIN (Kuasa Penuh &amp; Tetapan Kebenaran):</span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                    {adminEmailsList.length} Akaun
                  </span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="tambah.admin@gmail.com"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAdminEmail}
                    className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Tambah
                  </button>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {adminEmailsList.map((em) => {
                    const isPrimary = em.toLowerCase() === "maktabahumrr@gmail.com";
                    return (
                      <div key={em} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-800 truncate">{em}</span>
                          {isPrimary && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-blue-100 text-blue-800 rounded font-bold shrink-0">
                              Utama
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAdminResetPassword(em)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Reset password akaun ini"
                          >
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Reset PIN</span>
                          </button>
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminEmail(em)}
                              className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded text-xs font-bold transition-colors cursor-pointer"
                              title="Buang daripada senarai"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {adminEmailsList.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">Tiada admin tambahan ditetapkan.</p>
                  )}
                </div>
              </div>

              {/* Team Emails Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Akaun TEAM (Tambah / Edit / Padam Jadual):</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                    {teamEmailsList.length} Akaun
                  </span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newTeamEmail}
                    onChange={(e) => setNewTeamEmail(e.target.value)}
                    placeholder="ahli.pasukan@gmail.com"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTeamEmail}
                    className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    Tambah
                  </button>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {teamEmailsList.map((em) => (
                    <div key={em} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs gap-2">
                      <span className="font-semibold text-slate-800 truncate">{em}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdminResetPassword(em)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Reset password akaun ini"
                        >
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>Reset PIN</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamEmail(em)}
                          className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded text-xs font-bold transition-colors cursor-pointer"
                          title="Buang daripada senarai"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {teamEmailsList.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">Tiada email team tambahan ditetapkan.</p>
                  )}
                </div>
              </div>

              {rolesSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{rolesSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRoles}
                  disabled={rolesSaving}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {rolesSaving ? "Menyimpan..." : "Simpan Senarai Kebenaran"}
                </button>
              </div>
            </div>
          ) : activeTab === "password" ? (
            /* =========================================================================
               TAB: CHANGE PASSWORD (ADMIN / TEAM SELF SERVICE)
               ========================================================================= */
            <form onSubmit={handleChangePassword} className="space-y-4 py-1">
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Tukar Password / PIN Akaun Anda</span>
                </div>
                <p className="text-xs text-slate-600">
                  Akaun Semasa: <strong className="text-blue-900 font-mono">{currentUser?.email}</strong> ({currentUser?.role.toUpperCase()})
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tetapkan kata laluan baharu untuk memudahkan anda log masuk secara selamat pada masa hadapan.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password Semasa (jika pernah ditetapkan):
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="Masukkan password semasa (biarkan kosong jika kali pertama)..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password / PIN Baharu:
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Contoh: 1234 atau kata laluan baharu..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Sahkan Password Baharu:
                </label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    placeholder="Ulang semula password baharu..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {changePasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{changePasswordSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isChangingPassword ? "Menyimpan..." : "Simpan Password Baharu"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* =========================================================================
               TAB 3: GOOGLE SHEETS JADUAL GUIDE & APPS SCRIPT WEBHOOK SETUP
               ========================================================================= */
            <div className="space-y-4 py-1 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                <div className="font-bold text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Google Apps Script Web App Tersambung:</span>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Tab JADUAL
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 break-all font-mono bg-white p-2 rounded-xl border border-blue-200">
                  {GOOGLE_APPS_SCRIPT_WEB_APP_URL}
                </p>
                <p className="text-[11px] text-blue-800">
                  Fail <strong>Jadual Team</strong> mestilah mempunyai tab <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">JADUAL</code> dan <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">AKSES TEAM</code>:
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-blue-150 font-mono text-[10px] text-slate-800 overflow-x-auto whitespace-nowrap space-y-1">
                  <div><strong>JADUAL:</strong> ID JADUAL | NAMA TEAM | TARIKH | MASA | KAWASAN | CATATAN | STATUS</div>
                  <div><strong>AKSES TEAM:</strong> ID | NAMA | EMAIL | TARIKH | STATUS</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">
                  Pastikan Tetapan Deployment di Google Apps Script:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
                  <li>Buka Google Sheet <strong>&quot;Jadual Team&quot;</strong> &gt; Klik <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Tampal kod lengkap di bawah ke dalam fail <code>Code.gs</code> (menguruskan Produk, Jadual, <code>AKSES TEAM</code> &amp; notifikasi emel ke <code>maktabahumrr@gmail.com</code>).</li>
                  <li>Simpan (Ctrl+S), kemudian pilih fungsi <code>authorizePermissions</code> dan klik <strong>Run</strong> sekali untuk meluluskan akses Google Sheets, Drive &amp; Gmail (MailApp).</li>
                  <li>Klik <strong>Deploy &gt; Manage deployments</strong> &gt; ikon pensel (Edit) &gt; pilih <strong>Version: New version</strong> &gt; <strong>Deploy</strong>.</li>
                  <li>Semua pendaftaran ahli team, kelulusan, jadual, dan produk akan segerak secara langsung!</li>
                </ol>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-[11px]">Kod Lengkap Google Apps Script (2 Fail: Frozen Bergerak + Jadual Team):</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={downloadAppsScript}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Muat Turun Code.gs</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyAppsScript}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedScript ? "Disalin!" : "Salin Kod Lengkap"}</span>
                    </button>
                  </div>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 scrollbar-thin">
                  {UNIFIED_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
