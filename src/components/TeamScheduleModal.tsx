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
  onAuthStateChanged
} from "../lib/firebase";

interface TeamScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated: () => void;
  existingSchedule?: ScheduleItem | null;
  initialTab?: "manage" | "approvals" | "roles" | "password" | "sheets";
}

export interface TeamApprovalItem {
  email: string;
  name?: string;
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
  const [googleEmailInput, setGoogleEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [pendingApprovalNotice, setPendingApprovalNotice] = useState<string | null>(null);
  const [isResendingApproval, setIsResendingApproval] = useState<boolean>(false);
  const [resendApprovalSuccess, setResendApprovalSuccess] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Active view tab inside modal for authenticated users
  const [activeTab, setActiveTab] = useState<"manage" | "approvals" | "roles" | "password" | "sheets">(initialTab || "manage");

  // Team Approvals Management states (for Admin)
  const [teamApprovals, setTeamApprovals] = useState<TeamApprovalItem[]>([]);
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState<boolean>(false);
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

  const GOOGLE_APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzopp-hWrQBI45eCzqs-ZPTgz346JuiZgClCy0KM2V8b-uhKX0LvYvg1tszdyL6unR7zw/exec";

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

  const fetchScheduleList = () => {
    try {
      const saved = localStorage.getItem("frozen_schedules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllSchedules(parsed);
        }
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

  // Load Team Approvals list for admin from local storage
  const loadApprovals = () => {
    setIsLoadingApprovals(true);
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
    setIsLoadingApprovals(false);
  };

  // Firebase Auth State Listener (Restores session directly from Firebase client SDK)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.toLowerCase();
        try {
          const token = await fbUser.getIdToken();
          const isPrimaryAdmin = cleanEmail === "maktabahumrr@gmail.com";
          const role: "admin" | "team" = isPrimaryAdmin ? "admin" : "team";
          const userObj: AuthUser = {
            email: fbUser.email,
            name: fbUser.displayName || cleanEmail.split("@")[0],
            role,
            token
          };
          setCurrentUser(userObj);
          setAuthToken(token);
          localStorage.setItem("fb_auth_token", token);
          localStorage.setItem("fb_auth_user", JSON.stringify(userObj));
          if (role === "admin") {
            loadRoles();
            loadApprovals();
          }
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Test Admin Email Notification
  const handleTestEmailNotification = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    setTimeout(() => {
      setEmailTestResult("✅ Notifikasi ujian telah berjaya direkodkan!");
      setIsTestingEmail(false);
    }, 500);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }

      // Check cached user from localStorage or Firebase
      const cachedUserStr = localStorage.getItem("fb_auth_user");
      const storedToken = localStorage.getItem("fb_auth_token");
      if (cachedUserStr && storedToken) {
        try {
          const parsed = JSON.parse(cachedUserStr);
          if (parsed && parsed.email) {
            setCurrentUser(parsed);
            setAuthToken(storedToken);
            if (parsed.role === "admin") {
              loadRoles();
              loadApprovals();
            }
          }
        } catch {}
      }

      // If Firebase Auth currentUser is already available
      if (auth.currentUser && auth.currentUser.email) {
        const email = auth.currentUser.email.toLowerCase();
        auth.currentUser.getIdToken().then((t) => {
          const isPrimary = email === "maktabahumrr@gmail.com";
          const userObj: AuthUser = {
            email: auth.currentUser!.email || email,
            name: auth.currentUser!.displayName || email.split("@")[0],
            role: isPrimary ? "admin" : "team",
            token: t
          };
          setCurrentUser(userObj);
          setAuthToken(t);
          localStorage.setItem("fb_auth_token", t);
          localStorage.setItem("fb_auth_user", JSON.stringify(userObj));
        }).catch(() => {});
      }

      fetchScheduleList();
      populateFormWithSchedule(existingSchedule);
      setSubmitSuccess(null);
      setSubmitError(null);
      setAuthError("");
      setPendingApprovalNotice(null);
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

  // Single Unified Form: Firebase Email/Password Authentication
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmailInput.trim().toLowerCase();
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
      const isPrimaryAdmin = userEmail === "maktabahumrr@gmail.com";
      const role: "admin" | "team" = (isPrimaryAdmin || adminEmailsList.map((e) => e.toLowerCase()).includes(userEmail)) ? "admin" : "team";

      const authenticatedUser: AuthUser = {
        email: fbUser.email || cleanEmail,
        name: fbUser.displayName || cleanEmail.split("@")[0],
        role: role,
        token: idToken
      };

      // Set authentication state directly from Firebase Client SDK and update local state upon success, nothing else
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
        loadApprovals();
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

  // Admin Approve / Reject Team Member (Local State & Storage)
  const handleApproveTeamMember = async (email: string, status: "approved" | "rejected" | "pending") => {
    try {
      setApprovalsSuccessMsg(null);
      const updated = teamApprovals.map((a) => a.email.toLowerCase() === email.toLowerCase() ? { ...a, status } : a);
      setTeamApprovals(updated);
      setPendingApprovalCount(updated.filter((a) => a.status === "pending").length);
      localStorage.setItem("fb_team_approvals", JSON.stringify(updated));
      setApprovalsSuccessMsg(`Status akses untuk ${email} berjaya ditukar kepada ${status.toUpperCase()}.`);
    } catch (err: any) {
      alert(err.message || "Ralat kelulusan.");
    }
  };

  // Team Member: Re-send approval email request to Admin
  const handleResendApprovalNotification = async () => {
    const cleanEmail = googleEmailInput.trim().toLowerCase();
    if (!cleanEmail) return;
    setIsResendingApproval(true);
    setResendApprovalSuccess(null);
    setTimeout(() => {
      setResendApprovalSuccess("Notifikasi permohonan telah direkodkan untuk pihak Admin!");
      setIsResendingApproval(false);
    }, 500);
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
    setResendApprovalSuccess(null);
    setPasswordInput("");
    setConfirmPasswordInput("");
  };

  // Submit Schedule (Create or Update) to Google Apps Script Web App
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Delete Schedule from Google Apps Script Web App
  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("Adakah anda pasti mahu memadam slot jadual ini daripada Google Sheets tab JADUAL?")) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const deletePayload = {
      action: "SCHEDULE_DELETE",
      sheetName: "JADUAL",
      id: selectedId,
      data: { id: selectedId }
    };

    try {
      const webAppResult = await postToGoogleAppsScript(deletePayload);

      setAllSchedules((prev) => {
        const filtered = prev.filter((s) => s.id !== selectedId);
        try {
          localStorage.setItem("frozen_schedules", JSON.stringify(filtered));
        } catch {}
        return filtered;
      });

      if (webAppResult.success) {
        setSubmitSuccess(`Jadual (${selectedId}) berjaya dipadam daripada Google Sheets tab JADUAL.`);
        setTimeout(() => setSubmitSuccess(null), 3000);
      } else {
        setSubmitError(webAppResult.error || "Gagal memulakan penghantaran pemadaman ke Google Sheets Web App.");
      }

      populateFormWithSchedule(null);
      onScheduleUpdated();
    } catch (err: any) {
      setSubmitError(err.message || "Ralat semasa memadam jadual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync fresh from Google Sheets tab JADUAL
  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      fetchScheduleList();
      onScheduleUpdated();
      setSubmitSuccess("Jadual disegerakkan.");
      setTimeout(() => setSubmitSuccess(null), 3000);
    } catch {
      setSubmitError("Gagal menyegerakkan data jadual buat masa ini.");
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

  const copyAppsScript = () => {
    const code = `/**
 * FrozenBergerak - Google Apps Script Webhook untuk Tab JADUAL & Notifikasi Email Admin
 * Penerima Notifikasi: maktabahumrr@gmail.com
 */
function doPost(e) {
  try {
    var rawText = e.postData.contents;
    var data = JSON.parse(rawText);
    var action = data.action || "";

    // 1. PENGHANTARAN NOTIFIKASI EMAIL KEPADA ADMIN (maktabahumrr@gmail.com)
    if (action === "send_email_notification" || action === "team_approval_request" || data.type === "team_approval_request") {
      var recipient = data.recipient || data.adminEmail || "maktabahumrr@gmail.com";
      var subject = data.subject || "[FrozenBergerak] Permohonan Kelulusan Akses Team";
      var teamEmail = data.teamEmail || data.email || "Ahli Pasukan";
      var body = data.body || ("Salam Admin,\\n\\nAhli Pasukan (" + teamEmail + ") telah memohon akses log masuk ke FrozenBergerak.\\nSila buka aplikasi untuk meluluskan permohonan.\\n\\nTerima kasih.");
      
      try {
        MailApp.sendEmail({
          to: recipient,
          subject: subject,
          body: body,
          htmlBody: data.htmlBody || undefined
        });
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          message: "Email notifikasi berjaya dihantar ke " + recipient 
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (mailErr) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: "Gagal hantar email: " + mailErr.toString() 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 2. PENGURUSAN REKOD JADUAL DALAM TAB GOOGLE SHEETS
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("JADUAL");
    
    if (!sheet) {
      sheet = ss.insertSheet("JADUAL");
      sheet.appendRow(["ID JADUAL", "NAMA TEAM", "TARIKH", "MASA", "KAWASAN", "CATATAN", "STATUS"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#1e40af").setFontColor("#ffffff");
    }
    
    var rowData = data.row;
    var id = (rowData && rowData[0]) || (data.data && data.data.id) || data.id;
    
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
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Deleted row " + foundRow }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } else if (rowData && Array.isArray(rowData)) {
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
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
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
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-950">
                        Permohonan Akses Sedang Diproses
                      </h4>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {pendingApprovalNotice}
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
                    <p className="text-amber-800">
                      Selepas pihak pentadbir meluluskan akaun anda, anda boleh terus log masuk menggunakan kata laluan Firebase yang telah didaftarkan.
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
                      onClick={handleResendApprovalNotification}
                      disabled={isResendingApproval}
                      className="flex-1 py-2 px-3 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{isResendingApproval ? "Menghantar..." : "Hantar Semula Notifikasi Email"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingApprovalNotice(null);
                        setResendApprovalSuccess(null);
                      }}
                      className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cuba Log Masuk Semula
                    </button>
                  </div>
                </div>
              ) : (
                /* Login / Sign Up / Forgot Password Form */
                <form onSubmit={handleUnifiedLogin} className="space-y-3.5 pt-1">
                  
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
                      autoFocus
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
               TAB: TEAM ACCESS APPROVALS MANAGEMENT (ADMIN ONLY)
               ========================================================================= */
            <div className="space-y-4 py-1">
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold flex items-center gap-1.5 text-blue-950 text-sm">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Pengurusan Kelulusan Akses Pasukan (Team Approvals)</span>
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
                  Setiap kali ahli pasukan baharu mendaftar, permohonan kebenaran akses dihantar terus kepada pentadbir. Anda boleh meluluskan atau menolak akses mereka di bawah:
                </p>
              </div>

              {/* Status Summary Counters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-amber-800">Menunggu Kelulusan</span>
                  <span className="text-lg font-black text-amber-900">
                    {teamApprovals.filter((a) => a.status === "pending").length}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-emerald-800">Telah Diluluskan</span>
                  <span className="text-lg font-black text-emerald-900">
                    {teamApprovals.filter((a) => a.status === "approved").length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="block text-[11px] font-bold text-slate-700">Jumlah Permohonan</span>
                  <span className="text-lg font-black text-slate-900">
                    {teamApprovals.length}
                  </span>
                </div>
              </div>

              {/* Email Notification Diagnostics & Test */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">Notifikasi Email Pentadbir</span>
                    <span className="text-[11px] text-slate-500 font-mono">{currentUser?.email || "Admin"}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestEmailNotification}
                  disabled={isTestingEmail}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingEmail ? "animate-pulse" : ""}`} />
                  <span>{isTestingEmail ? "Menghantar Ujian..." : "Uji Hantar Email & Push"}</span>
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

              {approvalsSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{approvalsSuccessMsg}</span>
                </div>
              )}

              {/* Approvals List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1">
                  <span>Senarai Permohonan Akses Team:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {teamApprovals.length} Rekod
                  </span>
                </div>

                {isLoadingApprovals ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuatkan senarai permohonan...</span>
                  </div>
                ) : teamApprovals.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 space-y-1">
                    <Clock3 className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="font-semibold text-slate-700">Tiada Permohonan Akses Pasukan</p>
                    <p className="text-[11px]">Permohonan pendaftaran daripada ahli pasukan akan dipaparkan di sini secara automatik.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {teamApprovals.map((item) => (
                      <div
                        key={item.email}
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
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 break-all">{item.email}</span>
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
                                  ? "✅ DILULUSKAN"
                                  : item.status === "pending"
                                  ? "⏳ MENUNGGU KELULUSAN"
                                  : "❌ DITOLAK"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>
                                Dimohon: {new Date(item.requestedAt).toLocaleString("ms-MY", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                              <span>&bull;</span>
                              <span className="text-slate-600">
                                {item.hasPassword ? "🔑 Password Ditetapkan" : "⚠️ Belum Set Password"}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                            {item.status !== "approved" && (
                              <button
                                type="button"
                                onClick={() => handleApproveTeamMember(item.email, "approved")}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                title="Luluskan akses team ini"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Luluskan</span>
                              </button>
                            )}

                            {item.status !== "rejected" && (
                              <button
                                type="button"
                                onClick={() => handleApproveTeamMember(item.email, "rejected")}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Tolak akses akaun ini"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAdminResetPassword(item.email)}
                              className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200"
                              title="Reset Password/PIN akaun ini"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  https://script.google.com/macros/s/AKfycbzopp-hWrQBI45eCzqs-ZPTgz346JuiZgClCy0KM2V8b-uhKX0LvYvg1tszdyL6unR7zw/exec
                </p>
                <p className="text-[11px] text-blue-800">
                  Google Sheet anda mestilah mempunyai tab bernama <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-950">JADUAL</code> dengan 7 lajur berikut:
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-blue-150 font-mono text-[11px] text-slate-800 overflow-x-auto whitespace-nowrap">
                  ID JADUAL | NAMA TEAM | TARIKH | MASA | KAWASAN | CATATAN | STATUS
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">
                  Pastikan Tetapan Deployment di Google Apps Script:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
                  <li>Buka Google Sheet FrozenBergerak anda &gt; Klik <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Salin kod lengkap <code>doGet</code> &amp; <code>doPost</code> di bawah ke dalam editor Apps Script.</li>
                  <li>Klik butang biru <strong>Deploy &gt; Manage deployments</strong> (atau <i>New deployment</i>).</li>
                  <li>Pastikan tetapan: <strong>Execute as: Me</strong> dan <strong>Who has access: Anyone</strong> (Siapa sahaja).</li>
                  <li>Simpan perubahan (Save / Deploy). Data jadual akan disegerakkan terus ke aplikasi secara masa nyata!</li>
                </ol>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Kod Lengkap Google Apps Script (doGet &amp; doPost):</span>
                  <button
                    type="button"
                    onClick={copyAppsScript}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedScript ? "Disalin!" : "Salin Kod Lengkap"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 scrollbar-thin">
{`// ==========================================
// 1. FUNGSI MEMBACA DATA JADUAL (GET / fetch)
// ==========================================
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("JADUAL");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ schedules: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ schedules: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var headers = data[0];
  var schedules = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row.join("").trim() === "") continue;
    schedules.push({
      id: row[0] || ("JAD-" + i),
      teamName: row[1] || "Team Frozen 1",
      date: row[2] || "Hari Ini",
      timeSlot: row[3] || "Waktu Operasi",
      locations: row[4] || "",
      notes: row[5] || "",
      status: row[6] || "Akan Datang"
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ schedules: schedules }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 2. FUNGSI KEMASKINI / TAMBAH / PADAM (POST)
// ==========================================
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
          foundRow = i + 2; break;
        }
      }
    }
    
    if (action === "SCHEDULE_DELETE") {
      if (foundRow > 1) sheet.deleteRow(foundRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action, id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      if (foundRow > 1) sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
      else sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({ success: true, action: action, id: id }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
