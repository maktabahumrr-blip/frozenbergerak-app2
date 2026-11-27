import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Users,
  Bell,
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
  Eye,
  EyeOff,
  KeyRound,
  Key,
  Mail,
  Clock3,
  UserX,
  Check,
  Flame,
  ChevronRight,
  ChevronLeft,
  Search
} from "lucide-react";
import { ScheduleItem, AuthUser } from "../types";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  onAuthStateChanged,
  saveScheduleToFirestore,
  deleteScheduleFromFirestore
} from "../lib/firebase";
import { fetchScheduleWithFallback } from "../utils/scheduleFetcher";
import { GOOGLE_APPS_SCRIPT_WEB_APP_URL } from "../config/googleSheets";
import {
  getTodayAndUpcomingSchedules,
  getLocalTodayIso,
  parseScheduleDate
} from "../utils/scheduleDateHelper";

export const TEAM_NAME_OPTIONS = ["Izyan", "Ahda", "Husna", "Alia"] as const;

export const COVERAGE_AREA_OPTIONS = [
  "Nilai",
  "Seremban",
  "Senawang",
  "Seri Putra",
  "Bukit Mahkota",
  "Salak",
  "BBST",
  "Sepang",
  "Kota Warisan",
  "Dengkil",
  "Jenderam",
  "Langat Murni",
  "Olak Lempit",
  "Banting",
  "Teluk Panglima Garang",
  "Putrajaya",
  "Cyberjaya",
  "Puchong",
  "PUJ",
  "Lestari",
  "Bangi",
  "Kajang",
  "Serdang",
  "Sri Kembangan",
  "Cheras",
  "BTHO",
  "Alam Damai",
  "Kuala Lumpur",
  "Bdr Saujana Putra",
  "Putra Heights",
  "USJ",
  "Klang",
  "Shah Alam",
  "Bukit Jelutong",
  "Denai Alam",
  "Alam Idaman"
] as const;

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

type ModalTab = "manage" | "approvals" | "roles" | "password";

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
  const resolveInitialTab = (tab?: TeamScheduleModalProps["initialTab"]): ModalTab => {
    if (tab === "approvals" || tab === "roles" || tab === "password" || tab === "manage") {
      return tab;
    }
    return "manage";
  };
  const [activeTab, setActiveTab] = useState<ModalTab>(() => resolveInitialTab(initialTab));

  // Step-by-step wizard state for Manage Schedule (keeps form compact on mobile)
  const [manageStep, setManageStep] = useState<1 | 2>(1);

  // Team Approvals Management states (for Admin)
  const [teamApprovals, setTeamApprovals] = useState<TeamApprovalItem[]>([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState<boolean>(false);
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

  // Form fields (tick/chip backed)
  const [customId, setCustomId] = useState<string>("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [rawDateIso, setRawDateIso] = useState<string>(() => getLocalTodayIso());
  const [date, setDate] = useState<string>("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [areaFilterQuery, setAreaFilterQuery] = useState<string>("");
  const [status, setStatus] = useState<"Akan Datang" | "Sedang Bergerak" | "Selesai">("Sedang Bergerak");
  const [sendPushNotification, setSendPushNotification] = useState<boolean>(true);

  // Notification & Status Info
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Roles Configuration (for Admin)
  const [adminEmailsList, setAdminEmailsList] = useState<string[]>(["maktabahumrr@gmail.com"]);
  const [teamEmailsList, setTeamEmailsList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [newTeamEmail, setNewTeamEmail] = useState<string>("");
  const [rolesSaving, setRolesSaving] = useState<boolean>(false);
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);

  // Derived combined strings
  const teamName = useMemo(() => selectedTeams.join(", "), [selectedTeams]);
  const locations = useMemo(() => selectedAreas.join(", "), [selectedAreas]);

  // Strictly show only TODAY and FUTURE schedules in the slot picker (auto-hide past)
  const upcomingSchedules = useMemo(
    () => getTodayAndUpcomingSchedules(allSchedules),
    [allSchedules]
  );

  // Filtered area options for tick grid
  const filteredCoverageAreas = useMemo(() => {
    const q = areaFilterQuery.trim().toLowerCase();
    // Include any non-standard area from currently edited schedule so it isn't lost
    const extraCustom = selectedAreas.filter(
      (a) => !(COVERAGE_AREA_OPTIONS as readonly string[]).includes(a)
    );
    const combined = [...COVERAGE_AREA_OPTIONS, ...extraCustom];
    if (!q) return combined;
    return combined.filter((area) => area.toLowerCase().includes(q));
  }, [areaFilterQuery, selectedAreas]);

  const todayIso = getLocalTodayIso();

  // Helper for formatting date to Malay
  const formatDateMalay = (isoOrDate: string | Date): string => {
    try {
      const d =
        typeof isoOrDate === "string"
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

  const todayFormatted = formatDateMalay(new Date());

  // Sync Approved Team Members automatically into Akaun TEAM (teamEmailsList + localStorage)
  const syncApprovedIntoTeamEmails = (
    approvals: TeamApprovalItem[],
    serverTeamEmails?: string[]
  ) => {
    const approvedSet = new Set(
      approvals
        .filter((a) => a.status === "approved" && a.email)
        .map((a) => a.email.trim().toLowerCase())
    );
    const blockedSet = new Set(
      approvals
        .filter((a) => (a.status === "rejected" || a.status === "pending") && a.email)
        .map((a) => a.email.trim().toLowerCase())
    );

    let baseList: string[] = [];
    if (Array.isArray(serverTeamEmails)) {
      baseList = serverTeamEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
    } else {
      try {
        const stored = localStorage.getItem("fb_team_emails");
        const parsed = stored ? JSON.parse(stored) : [];
        baseList = Array.isArray(parsed)
          ? parsed.map((e: any) => String(e).trim().toLowerCase()).filter(Boolean)
          : teamEmailsList;
      } catch {
        baseList = teamEmailsList;
      }
    }

    const merged = Array.from(
      new Set([
        ...baseList.filter((em) => !blockedSet.has(em.toLowerCase())),
        ...Array.from(approvedSet)
      ])
    ).sort();

    setTeamEmailsList(merged);
    try {
      localStorage.setItem("fb_team_emails", JSON.stringify(merged));
    } catch {}
  };

  // Fetch push subscriber count for preview badge
  const fetchSubscriberCount = async () => {
    try {
      const res = await fetch(`/api/push/status?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data && typeof data.totalSubscribers === "number") {
          setSubscriberCount(data.totalSubscribers);
        }
      }
    } catch {}
  };

  // Safe JSON parser so empty/HTML responses never trigger syntax errors
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

  // Background silent sync to Apps Script endpoint
  const postToGoogleAppsScript = async (
    payload: any
  ): Promise<{ success: boolean; error?: string }> => {
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
          error: err?.message || "Ralat memulakan penghantaran rekod latar belakang."
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

  const parseTeamsFromString = (raw: string): string[] => {
    const clean = String(raw || "").trim();
    if (!clean) return [];
    const tokens = clean
      .split(/[,&/+]+|\bdan\b/i)
      .map((s) => s.trim())
      .filter(Boolean);
    const matched: string[] = [];
    tokens.forEach((tok) => {
      const canonical = TEAM_NAME_OPTIONS.find(
        (opt) => opt.toLowerCase() === tok.toLowerCase()
      );
      matched.push(canonical || tok);
    });
    return Array.from(new Set(matched));
  };

  const parseAreasFromString = (raw: string): string[] => {
    const clean = String(raw || "").trim();
    if (!clean) return [];
    const tokens = clean
      .split(/[,;\n•|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const matched: string[] = [];
    tokens.forEach((tok) => {
      const canonical = COVERAGE_AREA_OPTIONS.find(
        (opt) => opt.toLowerCase() === tok.toLowerCase()
      );
      matched.push(canonical || tok);
    });
    return Array.from(new Set(matched));
  };

  const populateFormWithSchedule = (item?: ScheduleItem | null) => {
    setManageStep(1);
    setAreaFilterQuery("");
    if (item) {
      setSelectedId(item.id);
      setCustomId(item.id);
      setSelectedTeams(parseTeamsFromString(item.teamName || item.driverName || ""));
      setDate(item.date || "");
      setSelectedAreas(parseAreasFromString(item.locations || ""));

      const parsedDate = parseScheduleDate(item.date, item.lastUpdated);
      if (parsedDate) {
        setRawDateIso(getLocalTodayIso(parsedDate));
      } else {
        setRawDateIso(getLocalTodayIso());
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
      setSelectedTeams([]);
      const today = getLocalTodayIso();
      setRawDateIso(today);
      setDate(formatDateMalay(today));
      setSelectedAreas([]);
      setStatus("Sedang Bergerak");
    }
  };

  // Load Roles config from localStorage AND backend /api/auth/roles (which auto-merges Approved team accounts)
  const loadRoles = async (explicitToken?: string) => {
    try {
      const storedAdmins = localStorage.getItem("fb_admin_emails");
      const storedTeam = localStorage.getItem("fb_team_emails");
      if (storedAdmins) setAdminEmailsList(JSON.parse(storedAdmins));
      else setAdminEmailsList(["maktabahumrr@gmail.com"]);
      if (storedTeam) setTeamEmailsList(JSON.parse(storedTeam));
    } catch {
      setAdminEmailsList(["maktabahumrr@gmail.com"]);
    }

    const token =
      explicitToken ||
      authToken ||
      localStorage.getItem("fb_auth_token") ||
      (await auth.currentUser?.getIdToken().catch(() => "")) ||
      "";
    if (!token) return;

    try {
      const res = await fetch(`/api/auth/roles?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data) {
          if (Array.isArray(data.adminEmails) && data.adminEmails.length > 0) {
            setAdminEmailsList(data.adminEmails);
            try {
              localStorage.setItem("fb_admin_emails", JSON.stringify(data.adminEmails));
            } catch {}
          }
          if (Array.isArray(data.teamEmails)) {
            syncApprovedIntoTeamEmails(teamApprovals, data.teamEmails);
          }
        }
      }
    } catch {}
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

  // Helper: normalize team access status
  const normalizeAccessStatus = (raw: any): "approved" | "pending" | "rejected" | "unregistered" => {
    const s = String(raw || "").trim().toLowerCase();
    if (s === "approved" || s === "lulus" || s === "diluluskan" || s === "aktif" || s === "active")
      return "approved";
    if (s === "rejected" || s === "tolak" || s === "ditolak" || s === "batal" || s === "sekat")
      return "rejected";
    if (s === "unregistered" || s === "tiada") return "unregistered";
    return "pending";
  };

  // Verify user's team approval status via server API (with silent background fallback)
  const checkTeamAccessStatus = async (
    email: string
  ): Promise<{
    status: "approved" | "pending" | "rejected" | "unregistered";
    isAdmin: boolean;
    record?: TeamApprovalItem | null;
  }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (isAdminEmail(cleanEmail)) {
      return { status: "approved", isAdmin: true, record: null };
    }

    try {
      const res = await fetch(
        `/api/team-access/status?email=${encodeURIComponent(cleanEmail)}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
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

    // Silent remote fallback
    try {
      const gasRes = await fetch(
        `${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=checkTeamAccess&email=${encodeURIComponent(cleanEmail)}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
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

  // Register new team member (Status: Pending) + email notification to admin
  const registerTeamAccess = async (
    email: string,
    nama: string
  ): Promise<{
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
              const next = Array.isArray(arr)
                ? arr.filter((x: any) => String(x.email || "").toLowerCase() !== cleanEmail)
                : [];
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
      message: `Permohonan akses untuk ${cleanName} (${cleanEmail}) telah dihantar dengan status Pending.`
    };
  };

  // Load Team Approvals list & automatically sync Approved emails into Akaun TEAM
  const loadApprovals = async (explicitToken?: string) => {
    setIsLoadingApprovals(true);
    setApprovalsErrorMsg(null);
    const token =
      explicitToken ||
      authToken ||
      localStorage.getItem("fb_auth_token") ||
      (await auth.currentUser?.getIdToken().catch(() => "")) ||
      "";

    try {
      if (token) {
        const res = await fetch(`/api/team-access/list?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` }
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
              status:
                normalizeAccessStatus(item.status) === "unregistered"
                  ? "pending"
                  : (normalizeAccessStatus(item.status) as "approved" | "pending" | "rejected"),
              requestedAt: item.tarikh || item.requestedAt || "",
              reviewedAt: item.reviewedAt,
              reviewedBy: item.reviewedBy,
              notes: item.notes,
              hasPassword: true
            }));
            setTeamApprovals(normalized);
            setPendingApprovalCount(normalized.filter((a) => a.status === "pending").length);
            syncApprovedIntoTeamEmails(normalized);
            try {
              localStorage.setItem("fb_team_approvals", JSON.stringify(normalized));
              window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
            } catch {}
            setIsLoadingApprovals(false);
            return;
          }
        }
      }

      // Silent direct fallback
      const gasRes = await fetch(
        `${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=getTeamAccess&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (gasRes.ok) {
        const gasData = await safeParseJson(gasRes);
        if (gasData?.success && Array.isArray(gasData.teamAccess)) {
          const normalized: TeamApprovalItem[] = gasData.teamAccess.map((item: any) => ({
            id: item.id,
            email: String(item.email || "").trim().toLowerCase(),
            nama: item.nama || item.name || "",
            name: item.nama || item.name || "",
            tarikh: item.tarikh || item.requestedAt || "",
            status:
              normalizeAccessStatus(item.status) === "unregistered"
                ? "pending"
                : (normalizeAccessStatus(item.status) as "approved" | "pending" | "rejected"),
            requestedAt: item.tarikh || item.requestedAt || "",
            hasPassword: true
          }));
          setTeamApprovals(normalized);
          setPendingApprovalCount(normalized.filter((a) => a.status === "pending").length);
          syncApprovedIntoTeamEmails(normalized);
          try {
            localStorage.setItem("fb_team_approvals", JSON.stringify(normalized));
            window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
          } catch {}
          setIsLoadingApprovals(false);
          return;
        }
      }

      throw new Error("Tidak dapat memuatkan senarai permohonan team buat masa ini.");
    } catch (err: any) {
      try {
        const stored = localStorage.getItem("fb_team_approvals");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setTeamApprovals(parsed);
            setPendingApprovalCount(parsed.filter((a: any) => a.status === "pending").length);
            syncApprovedIntoTeamEmails(parsed);
          }
        }
      } catch {}
      setApprovalsErrorMsg(err?.message || "Gagal memuatkan senarai kelulusan team.");
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  // Firebase Auth State Listener (Restores session ONLY if Admin or Approved)
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
            await loadApprovals(token);
            await loadRoles(token);
            return;
          }

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
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            if (access.status === "rejected") {
              setPendingApprovalNotice(null);
              setAuthError(
                `Akses Ditolak: Akaun (${cleanEmail}) berstatus Rejected. Sila hubungi Admin (maktabahumrr@gmail.com).`
              );
            } else if (access.status === "pending") {
              setPendingApplicantEmail(cleanEmail);
              setPendingApplicantName(access.record?.nama || cleanEmail.split("@")[0]);
              setPendingApprovalNotice(
                `Akaun anda (${cleanEmail}) masih berstatus Pending. Akses mengubah jadual disekat sehingga Admin (maktabahumrr@gmail.com) menukar status anda kepada Approved.`
              );
            }
          }
        } catch {}
      }
    });
    return () => unsubscribe();
  }, []);

  // Test Admin Email Notification
  const handleTestEmailNotification = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    try {
      const token =
        authToken ||
        localStorage.getItem("fb_auth_token") ||
        (await auth.currentUser?.getIdToken().catch(() => "")) ||
        "";
      const res = await fetch("/api/team-access/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await safeParseJson(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Gagal menghantar emel ujian.");
      }
      setEmailTestResult(`✅ ${data.message}`);
    } catch (err: any) {
      setEmailTestResult(
        `❌ ${err?.message || "Gagal menghantar emel ujian ke maktabahumrr@gmail.com"}`
      );
    } finally {
      setIsTestingEmail(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveInitialTab(initialTab));
      fetchSubscriberCount();

      const cachedUserStr = localStorage.getItem("fb_auth_user");
      const storedToken = localStorage.getItem("fb_auth_token");
      if (cachedUserStr && storedToken) {
        try {
          const parsed = JSON.parse(cachedUserStr);
          if (parsed && parsed.email) {
            if (isAdminEmail(parsed.email)) {
              setCurrentUser({ ...parsed, role: "admin" });
              setAuthToken(storedToken);
              loadApprovals(storedToken);
              loadRoles(storedToken);
            } else {
              checkTeamAccessStatus(parsed.email)
                .then((access) => {
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
                      setPendingApplicantName(
                        access.record?.nama || parsed.name || parsed.email.split("@")[0]
                      );
                      setPendingApprovalNotice(
                        `Akaun anda (${parsed.email}) masih berstatus Pending. Akses disekat sehingga Admin meluluskan permohonan anda.`
                      );
                    } else if (access.status === "rejected") {
                      setAuthError(`Akses Ditolak: Akaun (${parsed.email}) berstatus Rejected.`);
                    }
                  }
                })
                .catch(() => {});
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
    loadRoles();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Toggle Team Name selection
  const toggleTeamOption = (name: string) => {
    setSelectedTeams((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  // Toggle Area selection
  const toggleAreaOption = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area]
    );
  };

  // Single Unified Form: Firebase Authentication + Approval Gate
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

    if (authMode === "forgot") {
      setIsAuthenticating(true);
      setAuthError("");
      setForgotSuccess(null);
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        setForgotSuccess(
          `Pautan reset kata laluan telah dihantar ke ${cleanEmail}. Sila semak peti masuk atau folder spam email anda.`
        );
      } catch (err: any) {
        let msg = err.message || "Gagal menghantar email reset kata laluan.";
        if (err.code === "auth/user-not-found") {
          msg = "Akaun dengan email ini belum wujud. Sila daftar akaun baru.";
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
      setAuthError("Kata laluan mestilah sekurang-kurangnya 6 aksara.");
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

      if (role === "team") {
        const applicantName = cleanName || fbUser.displayName || userEmail.split("@")[0];

        if (authMode === "signup") {
          const regRes = await registerTeamAccess(userEmail, applicantName);
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
              setAuthError(`Akses Ditolak: Akaun (${userEmail}) berstatus Rejected.`);
            } else {
              setPendingApprovalNotice(
                `Pendaftaran berjaya! Permohonan anda (${applicantName} - ${userEmail}) berstatus Pending dan notifikasi emel telah dihantar ke Admin. Akses ke jadual disekat sehingga Admin meluluskan permohonan anda.`
              );
            }
            return;
          }
        } else {
          const accessCheck = await checkTeamAccessStatus(userEmail);
          if (accessCheck.status === "unregistered") {
            await registerTeamAccess(userEmail, applicantName);
            await firebaseSignOut(auth).catch(() => {});
            localStorage.removeItem("fb_auth_token");
            localStorage.removeItem("fb_auth_user");
            setCurrentUser(null);
            setAuthToken("");
            setPasswordInput("");
            setPendingApplicantEmail(userEmail);
            setPendingApplicantName(applicantName);
            setPendingApprovalNotice(
              `Akaun anda (${userEmail}) telah direkodkan dengan status Pending dan notifikasi telah dihantar ke Admin (maktabahumrr@gmail.com). Sila tunggu kelulusan (Approved) sebelum mengubah jadual.`
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
              `Akaun anda (${userEmail}) masih berstatus Pending. Akses mengurus jadual disekat sehingga Admin meluluskan permohonan anda (Approved).`
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
            setAuthError(
              `Akses Ditolak: Permohonan akaun (${userEmail}) telah ditolak (Rejected) oleh Admin.`
            );
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
        await loadApprovals(idToken);
        await loadRoles(idToken);
      }
    } catch (err: any) {
      let msg = err.message || "Ralat log masuk.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg =
          "Email atau kata laluan tidak sepadan. Sila semak semula atau gunakan pilihan 'Lupa Kata Laluan'.";
      } else if (err.code === "auth/user-not-found") {
        msg = "Akaun ini belum wujud. Sila klik pendaftaran akaun pasukan baru.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "Email ini telah didaftarkan. Sila pilih mod Log Masuk atau reset kata laluan.";
      } else if (err.code === "auth/weak-password") {
        msg = "Kata laluan mestilah sekurang-kurangnya 6 aksara.";
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

  // Admin Approve / Reject Team Member -> Automatically updates Akaun TEAM & backend permissions
  const handleApproveTeamMember = async (
    itemOrEmail: TeamApprovalItem | string,
    nextStatus: "approved" | "rejected" | "pending"
  ) => {
    const item =
      typeof itemOrEmail === "string"
        ? teamApprovals.find((a) => a.email.toLowerCase() === itemOrEmail.toLowerCase()) || {
            email: itemOrEmail,
            status: "pending",
            requestedAt: ""
          }
        : itemOrEmail;
    const targetEmail = item.email.trim().toLowerCase();
    const formattedStatus =
      nextStatus === "approved" ? "Approved" : nextStatus === "rejected" ? "Rejected" : "Pending";

    setUpdatingApprovalEmail(targetEmail);
    setApprovalsSuccessMsg(null);
    setApprovalsErrorMsg(null);

    try {
      const token =
        authToken ||
        localStorage.getItem("fb_auth_token") ||
        (await auth.currentUser?.getIdToken().catch(() => "")) ||
        "";
      const res = await fetch("/api/team-access/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: item.id,
          email: targetEmail,
          nama: item.nama || item.name,
          status: formattedStatus,
          sendEmail: true
        })
      });

      const data = await safeParseJson(res);
      if (res.status === 401 || res.status === 403) {
        throw new Error(data?.error || "Akses ditolak: Sila log masuk semula sebagai Admin.");
      }

      if (!res.ok || !data?.success || !data?.sheetsSynced) {
        await postToGoogleAppsScript({
          action: "TEAM_ACCESS_UPDATE",
          id: item.id,
          email: targetEmail,
          nama: item.nama || item.name,
          status: formattedStatus,
          sendEmail: true
        });
      }

      const updated = teamApprovals.map((a) =>
        a.email.toLowerCase() === targetEmail ? { ...a, status: nextStatus } : a
      );
      setTeamApprovals(updated);
      setPendingApprovalCount(updated.filter((a) => a.status === "pending").length);
      syncApprovedIntoTeamEmails(
        updated,
        Array.isArray(data?.teamEmails) ? data.teamEmails : undefined
      );

      try {
        localStorage.setItem("fb_team_approvals", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("fb_approvals_updated"));
      } catch {}

      const emailNotice =
        formattedStatus === "Approved" || formattedStatus === "Rejected"
          ? ` Emel makluman telah dihantar ke ${targetEmail}.`
          : "";
      setApprovalsSuccessMsg(
        nextStatus === "approved"
          ? `Status ${item.nama || targetEmail} ditukar kepada Approved & terus dimasukkan ke Akaun TEAM.${emailNotice}`
          : `Status untuk ${item.nama || targetEmail} berjaya ditukar kepada ${formattedStatus}.${emailNotice}`
      );
      setTimeout(() => setApprovalsSuccessMsg(null), 4500);
    } catch (err: any) {
      setApprovalsErrorMsg(err?.message || "Ralat semasa mengemaskini kelulusan team.");
    } finally {
      setUpdatingApprovalEmail(null);
    }
  };

  // Team Member: Check live approval status from Pending notice card
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
        setForgotSuccess(
          `Tahniah! Akaun anda (${cleanEmail}) telah DILULUSKAN (Approved) oleh Admin. Sila masukkan kata laluan untuk log masuk.`
        );
        setAuthMode("login");
      } else if (access.status === "rejected") {
        setPendingApprovalNotice(null);
        setAuthError(
          `Akses Ditolak: Akaun (${cleanEmail}) telah ditukar kepada Rejected oleh Admin.`
        );
      } else {
        setResendApprovalSuccess(
          "Status permohonan masih Pending. Sila tunggu Admin meluluskan permohonan anda."
        );
      }
    } finally {
      setIsCheckingPendingStatus(false);
    }
  };

  // Team Member: Re-send approval email request to Admin
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
      setResendApprovalSuccess(
        "Notifikasi emel permohonan telah dihantar ke maktabahumrr@gmail.com!"
      );
    } catch {
      setResendApprovalSuccess(
        "Permintaan notifikasi telah dihantar ke pihak Admin (maktabahumrr@gmail.com)."
      );
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
    if (newPasswordInput.length < 6) {
      setChangePasswordError("Password baharu mestilah sekurang-kurangnya 6 aksara/digit.");
      return;
    }

    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    try {
      if (!auth.currentUser) {
        throw new Error("Sesi pengguna tidak ditemui. Sila log masuk semula.");
      }
      await firebaseUpdatePassword(auth.currentUser, newPasswordInput.trim());

      setChangePasswordSuccess("Kata laluan anda telah berjaya dikemaskini!");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
    } catch (err: any) {
      setChangePasswordError(err.message || "Ralat menukar kata laluan.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Admin Reset User Password
  const handleAdminResetPassword = async (targetEmail: string) => {
    if (
      !window.confirm(
        `Adakah anda pasti ingin reset kata laluan untuk ${targetEmail}? Pautan reset akan dihantar ke email pengguna.`
      )
    ) {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail.trim().toLowerCase());
      setRolesSuccess(`Pautan reset kata laluan telah dihantar ke ${targetEmail}.`);
      setTimeout(() => setRolesSuccess(null), 4000);
    } catch (err: any) {
      setApprovalsErrorMsg(err.message || "Ralat reset kata laluan.");
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
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

  // Submit Schedule (Create or Update)
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
            ? `Akses Ditolak: Akaun (${currentUser.email}) berstatus Rejected.`
            : `Akses Disekat: Akaun (${currentUser.email}) berstatus Pending.`
        );
        return;
      }
    }
    if (selectedAreas.length === 0) {
      setSubmitError("Sila pilih sekurang-kurangnya satu kawasan liputan.");
      setManageStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const scheduleId =
      selectedId || customId || `JAD-${(allSchedules.length + 1).toString().padStart(2, "0")}`;
    const action = selectedId ? "SCHEDULE_UPDATE" : "SCHEDULE_CREATE";
    const finalTeam = teamName.trim();
    const finalDate = (date.trim() || todayFormatted).trim();
    const finalTime = "";
    const finalLocations = locations.trim();
    const finalNotes = "";
    const finalStatus = status;

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
      const webAppResult = await postToGoogleAppsScript(webAppPayload);

      const notifTitle = "FrozenBergerak 📍 Jadual Pergerakan Dikemaskini";
      const notifBody = `${finalTeam ? `${finalTeam}: ` : ""}Pergerakan di ${finalLocations} (${finalDate}).`;

      if (sendPushNotification && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("frozen_live_notification", {
            detail: {
              title: notifTitle,
              body: notifBody,
              url: "/#section-jadual-pergerakan",
              timestamp: Date.now()
            }
          })
        );
      }

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
        const updated =
          idx >= 0
            ? prev.map((item, i) => (i === idx ? newScheduleObj : item))
            : [newScheduleObj, ...prev];
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      saveScheduleToFirestore(newScheduleObj).catch((fbErr) => {
        console.warn("[ScheduleSync] Firestore save note:", fbErr);
      });

      const token =
        authToken ||
        localStorage.getItem("fb_auth_token") ||
        (await auth.currentUser?.getIdToken().catch(() => "")) ||
        "";
      let scheduleSavedOk = webAppResult.success;
      try {
        const updateRes = await fetch("/api/schedule/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: scheduleId,
            teamName: finalTeam,
            date: finalDate,
            timeSlot: finalTime,
            locations: finalLocations,
            notes: finalNotes,
            status: finalStatus,
            sendPushNotification: false,
            token
          })
        });
        if (updateRes.ok) {
          scheduleSavedOk = true;
          const updateData = await safeParseJson(updateRes);
          if (updateData?.schedules && Array.isArray(updateData.schedules)) {
            setAllSchedules(updateData.schedules);
            try {
              localStorage.setItem("frozen_schedules", JSON.stringify(updateData.schedules));
            } catch {}
          }
        } else if (updateRes.status === 403) {
          const errBody = (await safeParseJson(updateRes)) || {};
          setSubmitError(errBody.error || "Akses disekat: Akaun belum diluluskan oleh Admin.");
          setIsSubmitting(false);
          return;
        }
      } catch (serverUpErr) {
        console.warn("[ScheduleSync] Server update call note:", serverUpErr);
      }

      // 3. Call Netlify Function (and Express mirror route) to send FCM Push Notifications
      let pushNotifSummary = "";
      if (sendPushNotification) {
        try {
          const notifRes = await fetch("/.netlify/functions/send-schedule-notif", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              scheduleId,
              teamName: finalTeam,
              date: finalDate,
              status: finalStatus,
              locations: finalLocations,
              isUpdate: Boolean(selectedId)
            })
          });
          if (notifRes.ok) {
            const notifData = await safeParseJson(notifRes);
            if (notifData?.sent > 0) {
              pushNotifSummary = ` Notifikasi dihantar ke ${notifData.sent} peranti.`;
            }
          }
        } catch (pushErr) {
          console.warn("[FCM] Schedule push trigger note (non-fatal):", pushErr);
        }
      }

      if (scheduleSavedOk) {
        setSubmitSuccess(
          `Jadual pergerakan berjaya disimpan dan dikemaskini untuk pelanggan!${pushNotifSummary}`
        );
        setTimeout(() => setSubmitSuccess(null), 4000);
      } else {
        setSubmitError(webAppResult.error || "Gagal menyimpan rekod jadual.");
      }

      onScheduleUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Ralat semasa menyimpan jadual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Schedule globally
  const handleDelete = async () => {
    if (!selectedId || !currentUser) return;
    if (currentUser.role !== "admin") {
      const access = await checkTeamAccessStatus(currentUser.email);
      if (access.status !== "approved") {
        await handleLogout();
        setAuthError("Akses disekat: Akaun anda belum diluluskan oleh Admin.");
        return;
      }
    }
    if (!window.confirm("Adakah anda pasti mahu memadam slot jadual ini?")) return;

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
      const token =
        authToken ||
        localStorage.getItem("fb_auth_token") ||
        (await auth.currentUser?.getIdToken().catch(() => "")) ||
        "";
      try {
        const delRes = await fetch("/api/schedule/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
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
        } else if (delRes.status === 403) {
          const errBody = (await safeParseJson(delRes)) || {};
          setSubmitError(errBody.error || "Akses disekat: Akaun belum diluluskan oleh Admin.");
          setIsSubmitting(false);
          return;
        }
      } catch (serverErr) {
        console.warn("[ScheduleSync] Server delete call note:", serverErr);
      }

      try {
        await deleteScheduleFromFirestore(targetIdToDelete);
      } catch (fbErr) {
        console.warn("[ScheduleSync] Firestore delete note:", fbErr);
      }

      await postToGoogleAppsScript(deletePayload);

      setAllSchedules((prev) => {
        const filtered = prev.filter((s) => s.id !== targetIdToDelete);
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      setSubmitSuccess(`Jadual (${targetIdToDelete}) berjaya dipadam secara kekal.`);
      setTimeout(() => setSubmitSuccess(null), 3500);

      populateFormWithSchedule(null);
      onScheduleUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Ralat semasa memadam jadual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh schedules silently in background
  const handleRefreshSchedules = async () => {
    setIsSyncing(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const result = await fetchScheduleWithFallback();
      if (result.source === "sync_error" || result.error) {
        setSubmitError(result.error || "Gagal memuatkan jadual terkini. Sila cuba sebentar lagi.");
        return;
      }

      const rawList = Array.isArray(result.schedules) ? result.schedules : [];
      setAllSchedules(rawList);
      const activeCount = getTodayAndUpcomingSchedules(rawList).length;
      onScheduleUpdated();

      setSubmitSuccess(`Senarai jadual dikemaskini (${activeCount} slot aktif hari ini & akan datang).`);
      setTimeout(() => setSubmitSuccess(null), 3500);
    } catch (err: any) {
      setSubmitError(err?.message || "Gagal memuat semula data jadual buat masa ini.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Save updated Roles (Admin Only) -> persists to server AND localStorage
  const handleSaveRoles = async () => {
    setRolesSaving(true);
    setRolesSuccess(null);
    try {
      const token =
        authToken ||
        localStorage.getItem("fb_auth_token") ||
        (await auth.currentUser?.getIdToken().catch(() => "")) ||
        "";

      if (token) {
        const res = await fetch("/api/auth/roles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            adminEmails: adminEmailsList,
            teamEmails: teamEmailsList
          })
        });
        if (res.ok) {
          const data = await safeParseJson(res);
          if (Array.isArray(data?.adminEmails)) setAdminEmailsList(data.adminEmails);
          if (Array.isArray(data?.teamEmails)) setTeamEmailsList(data.teamEmails);
        }
      }

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 sm:p-6 relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup tetingkap"
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-400/30 tracking-wide mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Panel Pasukan FrozenBergerak</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Kemas Kini Jadual Pasukan
              </h2>
            </div>
          </div>

          {/* User badge if logged in */}
          {currentUser && (
            <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between flex-wrap gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider shrink-0 ${
                    currentUser.role === "admin"
                      ? "bg-amber-400 text-amber-950"
                      : "bg-emerald-400 text-emerald-950"
                  }`}
                >
                  {currentUser.role === "admin" ? "🛡️ ADMIN" : "🚚 TEAM"}
                </span>
                <span className="text-white/95 font-medium truncate">{currentUser.email}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Keluar</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs for Logged in Users */}
        {currentUser && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 flex-shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`py-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "manage"
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Urus Jadual</span>
            </button>

            {currentUser.role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("approvals");
                    loadApprovals();
                  }}
                  className={`py-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === "approvals"
                      ? "border-blue-600 text-blue-700 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Kelulusan Team</span>
                  {pendingApprovalCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-extrabold bg-amber-500 text-white rounded-full">
                      {pendingApprovalCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("roles");
                    loadRoles();
                  }}
                  className={`py-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === "roles"
                      ? "border-blue-600 text-blue-700 bg-white"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Akaun TEAM &amp; Admin</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`py-3.5 px-4 text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "password"
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Tukar Password</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {!currentUser ? (
            /* =========================================================================
               AUTH GATE
               ========================================================================= */
            <div className="space-y-5 py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
                  <Flame className="w-6 h-6 fill-amber-500 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {authMode === "login"
                    ? "Log Masuk Pasukan"
                    : authMode === "signup"
                    ? "Pendaftaran Akaun Pasukan"
                    : "Reset Kata Laluan"}
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  {authMode === "login"
                    ? "Sila log masuk menggunakan email dan kata laluan anda untuk menguruskan Jadual & Lokasi."
                    : authMode === "signup"
                    ? "Masukkan email dan cipta kata laluan (minimum 6 aksara) untuk permohonan akses pasukan."
                    : "Masukkan email anda untuk menerima pautan reset kata laluan terus ke peti masuk."}
                </p>
              </div>

              {pendingApprovalNotice ? (
                <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                      <Clock3 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-950">
                        Status Akaun: Pending (Menunggu Kelulusan Admin)
                      </h4>
                      <p className="text-sm text-amber-900 leading-relaxed">
                        {pendingApprovalNotice}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/85 rounded-xl border border-amber-200/80 text-[13px] text-amber-950">
                    Permohonan anda telah direkodkan dan notifikasi telah dihantar ke{" "}
                    <strong>maktabahumrr@gmail.com</strong>. Sebaik sahaja status ditukar kepada{" "}
                    <strong>Approved</strong>, akaun anda automatik aktif untuk menguruskan jadual.
                  </div>

                  {resendApprovalSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{resendApprovalSuccess}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckPendingApprovalStatus}
                      disabled={isCheckingPendingStatus}
                      className="flex-1 py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${isCheckingPendingStatus ? "animate-spin" : ""}`}
                      />
                      <span>{isCheckingPendingStatus ? "Menyemak..." : "Semak Status"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResendApprovalNotification}
                      disabled={isResendingApproval}
                      className="flex-1 py-2.5 px-3.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{isResendingApproval ? "Menghantar..." : "Hantar Notifikasi"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingApprovalNotice(null);
                        setResendApprovalSuccess(null);
                        setAuthMode("login");
                      }}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                    >
                      Kembali
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUnifiedLogin} className="space-y-4 pt-1">
                  {authMode === "signup" && (
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-bold text-slate-700">
                        Nama Penuh / Nama Team:
                      </label>
                      <input
                        type="text"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="Contoh: Izyan / Team Frozen 2"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700">Email:</label>
                    <input
                      type="email"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="Masukkan alamat email anda..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                      autoFocus={authMode !== "signup"}
                      required
                    />
                  </div>

                  {authMode !== "forgot" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[13px] font-bold text-slate-700">
                          {authMode === "login"
                            ? "Kata Laluan / Password:"
                            : "Cipta Kata Laluan (min 6 aksara):"}
                        </label>
                        {authMode === "login" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("forgot");
                              setAuthError("");
                              setForgotSuccess(null);
                            }}
                            className="text-[13px] font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
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
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none pr-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={showPassword ? "Sembunyikan" : "Tunjukkan"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {authMode === "signup" && (
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-bold text-slate-700">
                        Sahkan Kata Laluan:
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          placeholder="Sahkan semula kata laluan..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none pr-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title={showConfirmPassword ? "Sembunyikan" : "Tunjukkan"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isAuthenticating
                        ? "Memproses..."
                        : authMode === "login"
                        ? "Log Masuk Pasukan ➔"
                        : authMode === "signup"
                        ? "Daftar Akaun Pasukan ➔"
                        : "Hantar Email Reset ➔"}
                    </button>
                  </div>

                  <div className="pt-2.5 text-center border-t border-slate-100 space-y-2">
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setAuthError("");
                          setForgotSuccess(null);
                          setConfirmPasswordInput("");
                        }}
                        className="text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer block w-full text-center"
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
                        className="text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer block w-full text-center"
                      >
                        Sudah mempunyai akaun? Log masuk di sini.
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
                        className="text-sm font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer block w-full text-center"
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
               TAB 1: MANAGE SCHEDULES (COMPACT 2-STEP WIZARD + TICK CHIPS)
               ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Top Actions Header: Refresh & Create New */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Slot Jadual Aktif ({upcomingSchedules.length})
                  </span>
                  <span className="text-[13px] text-slate-500">
                    Slot tarikh lepas disembunyikan secara automatik.
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRefreshSchedules}
                    disabled={isSyncing}
                    className="text-sm font-bold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    title="Muat semula senarai jadual terkini"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                    <span>{isSyncing ? "Memuat..." : "Muat Semula"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => populateFormWithSchedule(null)}
                    className="text-sm font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Baru</span>
                  </button>
                </div>
              </div>

              {/* Compact Horizontal Slot Picker (Upcoming Only, Larger Readable Font) */}
              {upcomingSchedules.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {upcomingSchedules.map((s) => {
                    const isSel = selectedId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => populateFormWithSchedule(s)}
                        className={`flex-shrink-0 w-56 px-3.5 py-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                          isSel
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/25"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold opacity-95 whitespace-normal break-words">
                            {s.date || "Jadual"}
                          </span>
                          <span
                            className={`text-[12px] px-2 py-0.5 rounded-lg font-bold ${
                              isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <div className="text-sm font-bold whitespace-normal break-words">
                          {s.teamName || s.driverName || "Slot Pergerakan"}
                        </div>
                        <div
                          className={`text-[13px] font-normal line-clamp-2 whitespace-normal break-words ${
                            isSel ? "text-blue-100" : "text-slate-600"
                          }`}
                        >
                          {s.locations || "Kawasan Liputan"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Stepper Tabs (Prevents tall one-page scrolling) */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setManageStep(1)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    manageStep === 1
                      ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      manageStep === 1
                        ? "bg-blue-600 text-white"
                        : selectedTeams.length > 0 && date
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    1
                  </span>
                  <span className="whitespace-normal text-center">Team, Tarikh &amp; Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManageStep(2)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    manageStep === 2
                      ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      manageStep === 2
                        ? "bg-blue-600 text-white"
                        : selectedAreas.length > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    2
                  </span>
                  <span className="whitespace-normal text-center">
                    Kawasan ({selectedAreas.length}) &amp; Simpan
                  </span>
                </button>
              </div>

              {manageStep === 1 ? (
                /* ================= STEP 1: NAMA TEAM (TICK), TARIKH & STATUS ================= */
                <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-5">
                  {/* 1. NAMA TEAM (Tick/Select Chips - Tanpa Perlu Menaip) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="block text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                        1. Pilih / Tick Nama Team:
                      </label>
                      <span className="text-[13px] font-semibold text-blue-700">
                        {selectedTeams.length > 0
                          ? `Dipilih: ${selectedTeams.join(", ")}`
                          : "Ketik untuk pilih nama team"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {TEAM_NAME_OPTIONS.map((name) => {
                        const isTicked = selectedTeams.includes(name);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleTeamOption(name)}
                            className={`py-3 px-3.5 rounded-xl text-[15px] font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isTicked
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20"
                                : "bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                                isTicked
                                  ? "bg-white text-blue-600 border-white"
                                  : "bg-slate-50 border-slate-300 text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                            <span>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. TARIKH (Kalendar + Butang Hari Ini / Esok Jelas) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="block text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                        2. Tarikh Pergerakan:
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const todayStr = getLocalTodayIso();
                            setRawDateIso(todayStr);
                            setDate(formatDateMalay(todayStr));
                          }}
                          className="px-3.5 py-2 text-sm font-bold bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 rounded-xl text-slate-800 transition-colors cursor-pointer"
                        >
                          📅 Hari Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const tomorrowStr = getLocalTodayIso(tomorrow);
                            setRawDateIso(tomorrowStr);
                            setDate(formatDateMalay(tomorrowStr));
                          }}
                          className="px-3.5 py-2 text-sm font-bold bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 rounded-xl text-slate-800 transition-colors cursor-pointer"
                        >
                          📅 Esok
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <input
                          type="date"
                          min={todayIso}
                          value={rawDateIso}
                          onChange={(e) => {
                            setRawDateIso(e.target.value);
                            if (e.target.value) {
                              setDate(formatDateMalay(e.target.value));
                            }
                          }}
                          className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          title="Pilih tarikh dari kalendar"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          placeholder="cth: Khamis, 19 November 2026"
                          className="w-full pl-10 pr-3.5 py-3 bg-white border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                        <Calendar className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* 3. STATUS */}
                  <div className="space-y-2">
                    <label className="block text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                      3. Status Pergerakan:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setStatus("Akan Datang")}
                        className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          status === "Akan Datang"
                            ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Akan Datang ⏳</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatus("Sedang Bergerak")}
                        className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          status === "Sedang Bergerak"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                        <span>Sedang Bergerak 🚗</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatus("Selesai")}
                        className={`py-3 px-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          status === "Selesai"
                            ? "bg-slate-200 border-slate-500 text-slate-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                        <span>Selesai ✅</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 1 Navigation Footer */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    {selectedId ? (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="py-3 px-4 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-sm flex items-center gap-1.5 transition-colors border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Padam Slot</span>
                      </button>
                    ) : (
                      <span className="text-[13px] text-slate-500 font-medium">
                        Langkah 1 daripada 2
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setManageStep(2)}
                      className="py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Seterusnya: Pilih Kawasan</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* ================= STEP 2: KAWASAN LIPUTAN (TICK CHIPS) & SIMPAN ================= */
                <div className="space-y-4">
                  <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                          4. Pilih / Tick Kawasan Liputan:
                        </label>
                        <span className="text-[13px] text-slate-600">
                          {selectedAreas.length > 0
                            ? `${selectedAreas.length} kawasan dipilih`
                            : "Pilih kawasan penghantaran daripada senarai di bawah"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAreas([...COVERAGE_AREA_OPTIONS])}
                          className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 rounded-xl text-[13px] font-bold transition-colors cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        {selectedAreas.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedAreas([])}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-700 rounded-xl text-[13px] font-bold transition-colors cursor-pointer"
                          >
                            Padam Pilihan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional quick filter over tick list */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={areaFilterQuery}
                        onChange={(e) => setAreaFilterQuery(e.target.value)}
                        placeholder="Tapis kawasan dengan pantas (pilihan)..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-[13px] focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Scrollable Area Tick Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 py-0.5">
                      {filteredCoverageAreas.map((area) => {
                        const isTicked = selectedAreas.includes(area);
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleAreaOption(area)}
                            className={`px-3 py-2.5 rounded-xl text-sm font-semibold border text-left transition-all flex items-center gap-2 cursor-pointer ${
                              isTicked
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                isTicked
                                  ? "bg-white text-emerald-600 border-white"
                                  : "bg-slate-50 border-slate-300 text-transparent"
                              }`}
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                            <span className="whitespace-normal break-words leading-snug">
                              {area}
                            </span>
                          </button>
                        );
                      })}
                      {filteredCoverageAreas.length === 0 && (
                        <div className="col-span-full py-4 text-center text-sm text-slate-500">
                          Tiada kawasan sepadan dengan tapisan anda.
                        </div>
                      )}
                    </div>

                    {/* Selected Summary Box */}
                    {selectedAreas.length > 0 && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed">
                        <span className="font-bold text-slate-900">Kawasan Dipilih: </span>
                        <span>{locations}</span>
                      </div>
                    )}
                  </div>

                  {/* Push Notification Toggle */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2.5 shadow-inner">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sendPushNotification}
                          onChange={(e) => setSendPushNotification(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Hantar Notifikasi Push Ke Telefon Pelanggan</span>
                        </span>
                      </label>
                      <span className="text-[13px] text-blue-300 font-bold">
                        {subscriberCount} Melanggan
                      </span>
                    </div>

                    {sendPushNotification && (
                      <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-[13px] text-white/95 leading-relaxed">
                        <strong>FrozenBergerak 📍 Jadual Pergerakan:</strong>{" "}
                        {teamName ? `${teamName}: ` : ""}Pergerakan di{" "}
                        {locations || "Kawasan Perkhidmatan"} ({date || "Hari Ini"}).
                      </div>
                    )}
                  </div>

                  {/* Success / Error Messages */}
                  {submitError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{submitSuccess}</span>
                    </div>
                  )}

                  {/* Step 2 Action Buttons */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setManageStep(1)}
                        className="py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-800 font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Langkah 1</span>
                      </button>

                      {selectedId && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isSubmitting}
                          className="py-3 px-4 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-sm flex items-center gap-1.5 transition-colors border border-rose-200 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Padam</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 min-w-[200px] py-3.5 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span>Sedang Menyimpan &amp; Menghantar...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            {selectedId ? "Simpan Perubahan Jadual" : "Simpan & Hantar Jadual"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : activeTab === "approvals" ? (
            /* =========================================================================
               TAB 2: TEAM ACCESS APPROVALS MANAGEMENT (ADMIN ONLY)
               ========================================================================= */
            <div className="space-y-4 py-1">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold flex items-center gap-2 text-blue-950 text-base">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <span>Kelulusan Team</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadApprovals()}
                    disabled={isLoadingApprovals}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingApprovals ? "animate-spin text-blue-600" : ""}`}
                    />
                    <span>Muat Semula</span>
                  </button>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-700">
                  Tukar status pemohon kepada <strong>Approved</strong> untuk mengaktifkan akses
                  jadual secara automatik dan memasukkan emel ke dalam senarai{" "}
                  <strong>Akaun TEAM</strong>, atau <strong>Rejected</strong> untuk menyekat.
                </p>
              </div>

              {/* Status Summary Counters */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="block text-[13px] font-bold text-amber-800">Pending</span>
                  <span className="text-xl font-black text-amber-900">
                    {teamApprovals.filter((a) => a.status === "pending").length}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="block text-[13px] font-bold text-emerald-800">Approved</span>
                  <span className="text-xl font-black text-emerald-900">
                    {teamApprovals.filter((a) => a.status === "approved").length}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="block text-[13px] font-bold text-rose-800">Rejected</span>
                  <span className="text-xl font-black text-rose-900">
                    {teamApprovals.filter((a) => a.status === "rejected").length}
                  </span>
                </div>
              </div>

              {/* Email Notification Test */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">Notifikasi Emel Admin</span>
                    <span className="text-[13px] text-slate-500 font-mono">
                      maktabahumrr@gmail.com
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestEmailNotification}
                  disabled={isTestingEmail}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[13px] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingEmail ? "animate-pulse" : ""}`} />
                  <span>{isTestingEmail ? "Menghantar Ujian..." : "Uji Emel & Push"}</span>
                </button>
              </div>

              {emailTestResult && (
                <div
                  className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                    emailTestResult.startsWith("✅")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  <span>{emailTestResult}</span>
                </div>
              )}

              {approvalsErrorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{approvalsErrorMsg}</span>
                </div>
              )}

              {approvalsSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{approvalsSuccessMsg}</span>
                </div>
              )}

              {/* Approvals List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm font-bold text-slate-800 pb-1">
                  <span>Senarai Pemohon Akses Pasukan:</span>
                  <span className="text-[13px] text-slate-500 font-normal">
                    {teamApprovals.length} Rekod
                  </span>
                </div>

                {isLoadingApprovals ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuatkan senarai permohonan team...</span>
                  </div>
                ) : teamApprovals.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-sm text-slate-500 space-y-1">
                    <Clock3 className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="font-semibold text-slate-700">
                      Tiada Permohonan Akses Team Buat Masa Ini
                    </p>
                    <p className="text-[13px]">
                      Setiap pendaftaran baharu ahli pasukan akan dipaparkan secara automatik di
                      sini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {teamApprovals.map((item) => {
                      const isRowUpdating = updatingApprovalEmail === item.email.toLowerCase();
                      return (
                        <div
                          key={item.email + (item.id || "")}
                          className={`p-4 rounded-2xl border transition-all ${
                            item.status === "pending"
                              ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/50"
                              : item.status === "approved"
                              ? "bg-white border-slate-200"
                              : "bg-rose-50/40 border-rose-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-1 min-w-[200px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.id && (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-xs font-bold">
                                    {item.id}
                                  </span>
                                )}
                                <span className="font-bold text-[15px] text-slate-900">
                                  {item.nama || item.name || item.email.split("@")[0]}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
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
                              <div className="text-sm text-blue-700 font-medium break-all">
                                {item.email}
                              </div>
                              <div className="text-[13px] text-slate-500">
                                Tarikh: {item.tarikh || item.requestedAt || "-"}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                              {item.status !== "approved" && (
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleApproveTeamMember(item, "approved")}
                                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                                  title="Tukar status kepada Approved"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>{isRowUpdating ? "..." : "Approved"}</span>
                                </button>
                              )}

                              {item.status !== "rejected" && (
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleApproveTeamMember(item, "rejected")}
                                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-[13px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Tukar status kepada Rejected"
                                >
                                  <UserX className="w-4 h-4" />
                                  <span>{isRowUpdating ? "..." : "Rejected"}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleAdminResetPassword(item.email)}
                                className="p-2 text-amber-700 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200 cursor-pointer"
                                title="Hantar email reset password"
                              >
                                <KeyRound className="w-4 h-4" />
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
               TAB 3: ROLES & ACCESS CONTROL CONFIGURATION (ADMIN ONLY)
               ========================================================================= */
            <div className="space-y-5 py-1">
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl text-sm text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-2 text-amber-950 text-base">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>Kawalan Akses Pengguna ADMIN &amp; TEAM</span>
                </div>
                <p className="text-[13px] leading-relaxed text-amber-900">
                  Setiap ahli pasukan yang diluluskan (<strong>Approved</strong>) di tab{" "}
                  <strong>Kelulusan Team</strong> akan dimasukkan secara automatik ke dalam senarai{" "}
                  <strong>Akaun TEAM</strong> di bawah supaya mereka terus boleh mengemas kini
                  jadual.
                </p>
              </div>

              {/* Admin Emails Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                  <span>Akaun ADMIN (Kuasa Penuh):</span>
                  <span className="text-[13px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-bold">
                    {adminEmailsList.length} Akaun
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="tambah.admin@gmail.com"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAdminEmail}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {adminEmailsList.map((em) => {
                    const isPrimary = em.toLowerCase() === "maktabahumrr@gmail.com";
                    return (
                      <div
                        key={em}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-slate-800 truncate">{em}</span>
                          {isPrimary && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded font-bold shrink-0">
                              Utama
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAdminResetPassword(em)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[13px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Reset password akaun ini"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset</span>
                          </button>
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminEmail(em)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors cursor-pointer"
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
                    <p className="text-[13px] text-slate-400 italic">
                      Tiada admin tambahan ditetapkan.
                    </p>
                  )}
                </div>
              </div>

              {/* Team Emails Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                  <span>Akaun TEAM (Tambah / Edit / Padam Jadual):</span>
                  <span className="text-[13px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                    {teamEmailsList.length} Akaun
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newTeamEmail}
                    onChange={(e) => setNewTeamEmail(e.target.value)}
                    placeholder="ahli.pasukan@gmail.com"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTeamEmail}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {teamEmailsList.map((em) => (
                    <div
                      key={em}
                      className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm gap-2"
                    >
                      <span className="font-semibold text-slate-800 truncate">{em}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdminResetPassword(em)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[13px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Reset password akaun ini"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamEmail(em)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                          title="Buang daripada senarai"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {teamEmailsList.length === 0 && (
                    <p className="text-[13px] text-slate-400 italic">
                      Tiada email team tambahan ditetapkan.
                    </p>
                  )}
                </div>
              </div>

              {rolesSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{rolesSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRoles}
                  disabled={rolesSaving}
                  className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {rolesSaving ? "Menyimpan..." : "Simpan Senarai Kebenaran"}
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================================
               TAB 4: CHANGE PASSWORD
               ========================================================================= */
            <form onSubmit={handleChangePassword} className="space-y-4 py-1">
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Tukar Kata Laluan Akaun Anda</span>
                </div>
                <p className="text-sm text-slate-700">
                  Akaun Semasa:{" "}
                  <strong className="text-blue-900 font-mono">{currentUser?.email}</strong> (
                  {currentUser?.role.toUpperCase()})
                </p>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  Tetapkan kata laluan baharu untuk memudahkan anda log masuk secara selamat pada
                  masa hadapan.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-slate-700">
                  Kata Laluan Semasa (jika perlu):
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="Masukkan kata laluan semasa..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-slate-700">
                  Kata Laluan Baharu (minimum 6 aksara):
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Masukkan kata laluan baharu..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-slate-700">
                  Sahkan Kata Laluan Baharu:
                </label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    placeholder="Ulang semula kata laluan baharu..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-semibold text-slate-800 placeholder:text-[13px] placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {changePasswordError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{changePasswordError}</span>
                </div>
              )}

              {changePasswordSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{changePasswordSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>{isChangingPassword ? "Menyimpan..." : "Simpan Kata Laluan Baharu"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
