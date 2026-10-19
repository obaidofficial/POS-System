import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  Boxes,
  Shield,
  User,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Printer,
  Receipt,
  Phone,
  MapPin,
  FileText,
  HelpCircle,
  RotateCcw,
  Save,
  Lock,
  KeyRound,
  Check,
  Plus,
  ShieldCheck,
  Sparkles,
  Camera,
  Mail,
  Smartphone,
  Barcode,
  Users,
  UserPlus,
  Edit3,
  X,
  Loader2,
  ShoppingCart,
  Radio,
  AlertTriangle,
  Sliders,
  Layers,
  Hash,
  Clock,
} from "lucide-react";
import {
  StoreSettings,
  AuthUser,
  ManagedUser,
  PrinterSettings,
  PrinterModelPreset,
  InvoicePaperSize,
  Sale,
} from "../types";
import {
  storage,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_PRINTER_SETTINGS,
} from "../services/storage";
import { authService } from "../services/auth";
import { SaleReceiptModal } from "./SaleReceiptModal";
import { formatPKR } from "../utils/currency";

// Helper to compress and center-crop an image file to a crisp, compact circular avatar (256x256)
const compressImageToAvatar = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        // Center crop square to prevent image distortion
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        ctx.drawImage(
          img,
          startX,
          startY,
          size,
          size,
          0,
          0,
          targetSize,
          targetSize,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

interface SettingsProps {
  currentUser: AuthUser;
  onRefresh?: () => void;
  onUserUpdated?: (user: AuthUser) => void;
  onSettingsUpdated?: (settings: StoreSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  currentUser,
  onUserUpdated,
  onSettingsUpdated,
}) => {
  const isWorker = currentUser.role === "worker";
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "profile" | "printer" | "user" | "security" | "users"
  >(isWorker ? "user" : "profile");

  // User Profile & Account State
  const [userName, setUserName] = useState(currentUser.name || "Obaid");
  const [userUsername, setUserUsername] = useState(
    currentUser.username || "obaid",
  );
  const [userPhoto, setUserPhoto] = useState<string>(currentUser.photo || "");
  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [userSuccessMessage, setUserSuccessMessage] = useState<string | null>(
    null,
  );
  const [userErrorMessage, setUserErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setUserName(currentUser.name || "Obaid");
    setUserUsername(currentUser.username || "obaid");
    setUserPhoto(currentUser.photo || "");
    setTwoFactorEmail(currentUser.twoFactorEmail || "");
    setTwoFactorMobile(currentUser.twoFactorMobile || "");
    if (currentUser.role === "worker" && activeSettingsTab === "profile") {
      setActiveSettingsTab("user");
    }
  }, [currentUser]);

  // Store & Invoice Settings State
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const s = storage.getStoreSettings();
    const nums =
      s.phoneNumbers && s.phoneNumbers.length > 0
        ? s.phoneNumbers
        : [s.phoneNumber || ""];
    const pols =
      s.returnPolicies && s.returnPolicies.length > 0
        ? s.returnPolicies
        : s.returnPolicyText
          ? [s.returnPolicyText]
          : [
              "Items can be exchanged within 7 days in original condition with this receipt.",
            ];
    return {
      ...s,
      phoneNumbers: nums,
      returnPolicies: pols,
    };
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState<
    string | null
  >(null);
  const [settingsErrorMessage, setSettingsErrorMessage] = useState<
    string | null
  >(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Printer & Invoice Generation Configuration State
  const [printerConfig, setPrinterConfig] = useState<PrinterSettings>(() => {
    const s = storage.getStoreSettings();
    return {
      ...DEFAULT_PRINTER_SETTINGS,
      ...(s.printerSettings || {}),
    };
  });
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);
  const [printerSuccessMessage, setPrinterSuccessMessage] = useState<
    string | null
  >(null);
  const [printerErrorMessage, setPrinterErrorMessage] = useState<string | null>(
    null,
  );
  const [testReceiptSale, setTestReceiptSale] = useState<Sale | null>(null);
  const [previewPaperSize, setPreviewPaperSize] = useState<InvoicePaperSize>(
    () => {
      const s = storage.getStoreSettings();
      return s.printerSettings?.paperSize || "58mm";
    },
  );

  // Sync printer config when settings reload from storage
  useEffect(() => {
    if (settings.printerSettings) {
      setPrinterConfig(settings.printerSettings);
      setPreviewPaperSize(settings.printerSettings.paperSize || "58mm");
    }
  }, [settings]);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccessMessage, setPassSuccessMessage] = useState<string | null>(
    null,
  );
  const [passErrorMessage, setPassErrorMessage] = useState<string | null>(null);

  // Two-Factor Authentication (2FA) State
  const [twoFactorEmail, setTwoFactorEmail] = useState(
    currentUser.twoFactorEmail || "",
  );
  const [twoFactorMobile, setTwoFactorMobile] = useState(
    currentUser.twoFactorMobile || "",
  );
  const [isSaving2FA, setIsSaving2FA] = useState(false);
  const [twoFactorSuccessMessage, setTwoFactorSuccessMessage] = useState<
    string | null
  >(null);
  const [twoFactorErrorMessage, setTwoFactorErrorMessage] = useState<
    string | null
  >(null);

  // User Management State (Admin only)
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userMgmtFeedback, setUserMgmtFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Delete Worker In-App Confirmation Modal State (immune to iframe dialog blocking)
  const [deleteWorkerTarget, setDeleteWorkerTarget] =
    useState<ManagedUser | null>(null);
  const [isDeletingWorker, setIsDeletingWorker] = useState(false);

  // Reset Brand Defaults In-App Confirmation State
  const [isResetDefaultsModalOpen, setIsResetDefaultsModalOpen] =
    useState(false);

  // Worker Modal State (Create or Edit)
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null); // null = create, string = edit
  const [workerName, setWorkerName] = useState("");
  const [workerUsername, setWorkerUsername] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [workerConfirmPassword, setWorkerConfirmPassword] = useState("");
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [showWorkerConfirmPassword, setShowWorkerConfirmPassword] =
    useState(false);
  const [workerPhoto, setWorkerPhoto] = useState("");
  const [worker2FAEmail, setWorker2FAEmail] = useState("");
  const [worker2FAMobile, setWorker2FAMobile] = useState("");
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const [workerModalError, setWorkerModalError] = useState<string | null>(null);
  const [workerModalSuccess, setWorkerModalSuccess] = useState<string | null>(
    null,
  );
  const workerPhotoInputRef = useRef<HTMLInputElement>(null);

  const loadManagedUsers = async () => {
    if (isWorker) return;
    setIsLoadingUsers(true);
    try {
      const res = await authService.getUsers();
      if (res.success && res.users) {
        setManagedUsers(res.users);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!isWorker) {
      loadManagedUsers();
    }
  }, [isWorker]);

  const handleOpenCreateWorker = () => {
    setEditingWorkerId(null);
    setWorkerName("");
    setWorkerUsername("");
    setWorkerPassword("");
    setWorkerConfirmPassword("");
    setWorkerPhoto("");
    setWorker2FAEmail("");
    setWorker2FAMobile("");
    setShowWorkerPassword(false);
    setShowWorkerConfirmPassword(false);
    setWorkerModalError(null);
    setWorkerModalSuccess(null);
    setIsWorkerModalOpen(true);
  };

  const handleOpenEditWorker = (user: ManagedUser) => {
    setEditingWorkerId(user.id);
    setWorkerName(user.name);
    setWorkerUsername(user.username);
    setWorkerPassword("");
    setWorkerConfirmPassword("");
    setWorkerPhoto(user.photo || "");
    setWorker2FAEmail(user.twoFactorEmail || "");
    setWorker2FAMobile(user.twoFactorMobile || "");
    setShowWorkerPassword(false);
    setShowWorkerConfirmPassword(false);
    setWorkerModalError(null);
    setWorkerModalSuccess(null);
    setIsWorkerModalOpen(true);
  };

  const handleWorkerPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setWorkerModalError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    try {
      const compressed = await compressImageToAvatar(file);
      setWorkerPhoto(compressed);
      setWorkerModalError(null);
    } catch {
      setWorkerModalError("Failed to process image file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmitWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkerModalError(null);
    setWorkerModalSuccess(null);

    const nameTrimmed = workerName.trim();
    const unameTrimmed = workerUsername
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    if (!nameTrimmed) {
      setWorkerModalError("Worker Full Name is required.");
      return;
    }

    if (!unameTrimmed || unameTrimmed.length < 3) {
      setWorkerModalError("Username must be at least 3 characters long.");
      return;
    }

    if (!editingWorkerId) {
      // Create mode: password required
      if (!workerPassword || workerPassword.length < 6) {
        setWorkerModalError("Password must be at least 6 characters long.");
        return;
      }
      if (workerPassword !== workerConfirmPassword) {
        setWorkerModalError("Passwords do not match.");
        return;
      }
    } else {
      // Edit mode: password optional
      if (workerPassword) {
        if (workerPassword.length < 6) {
          setWorkerModalError(
            "New password must be at least 6 characters long.",
          );
          return;
        }
        if (workerPassword !== workerConfirmPassword) {
          setWorkerModalError("Passwords do not match.");
          return;
        }
      }
    }

    setIsSubmittingWorker(true);
    try {
      if (!editingWorkerId) {
        const res = await authService.createWorker({
          name: nameTrimmed,
          username: unameTrimmed,
          password: workerPassword,
          photo: workerPhoto,
          twoFactorEmail: worker2FAEmail.trim(),
          twoFactorMobile: worker2FAMobile.trim(),
        });

        if (res.success) {
          setWorkerModalSuccess(
            res.message || "Worker user created successfully!",
          );
          await loadManagedUsers();
          setTimeout(() => {
            setIsWorkerModalOpen(false);
          }, 1200);
        } else {
          setWorkerModalError(res.error || "Failed to create worker account.");
        }
      } else {
        const res = await authService.updateWorker(editingWorkerId, {
          name: nameTrimmed,
          username: unameTrimmed,
          password: workerPassword || undefined,
          photo: workerPhoto,
          twoFactorEmail: worker2FAEmail.trim(),
          twoFactorMobile: worker2FAMobile.trim(),
        });

        if (res.success) {
          setWorkerModalSuccess(
            res.message || "Worker user updated successfully!",
          );
          await loadManagedUsers();
          setTimeout(() => {
            setIsWorkerModalOpen(false);
          }, 1200);
        } else {
          setWorkerModalError(res.error || "Failed to update worker account.");
        }
      }
    } catch (err: any) {
      setWorkerModalError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  const handleOpenDeleteWorker = (user: ManagedUser) => {
    if (user.role === "admin") {
      setUserMgmtFeedback({
        type: "error",
        message: "Cannot delete primary administrator user.",
      });
      return;
    }
    setDeleteWorkerTarget(user);
  };

  const handleConfirmDeleteWorker = async () => {
    if (!deleteWorkerTarget) return;

    if (deleteWorkerTarget.role === "admin") {
      setUserMgmtFeedback({
        type: "error",
        message: "Cannot delete primary administrator user.",
      });
      setDeleteWorkerTarget(null);
      return;
    }

    setIsDeletingWorker(true);
    try {
      const res = await authService.deleteWorker(deleteWorkerTarget.id);
      if (res.success) {
        setUserMgmtFeedback({
          type: "success",
          message:
            res.message ||
            `Worker account "${deleteWorkerTarget.name}" (@${deleteWorkerTarget.username}) has been permanently deleted.`,
        });
        setDeleteWorkerTarget(null);
        if (isWorkerModalOpen && editingWorkerId === deleteWorkerTarget.id) {
          setIsWorkerModalOpen(false);
        }
        await loadManagedUsers();
        setTimeout(() => setUserMgmtFeedback(null), 4000);
      } else {
        setUserMgmtFeedback({
          type: "error",
          message: res.error || "Failed to delete worker user.",
        });
      }
    } catch (err: any) {
      setUserMgmtFeedback({
        type: "error",
        message: err.message || "Failed to delete worker user.",
      });
    } finally {
      setIsDeletingWorker(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logo file upload handler
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      setLogoError("Please upload an image file (PNG, JPG, SVG, or WebP).");
      return;
    }

    // Validate size (max 2.5MB)
    if (file.size > 2.5 * 1024 * 1024) {
      setLogoError("Logo image must be smaller than 2.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const updated = { ...settings, logoUrl: result };
      setSettings(updated);
      try {
        const saved = await storage.updateStoreSettings(updated);
        onSettingsUpdated?.(saved);
        setSettingsSuccessMessage(
          "Brand logo uploaded and updated across Navbar, Login page, and Invoice slips!",
        );
        setTimeout(() => {
          setSettingsSuccessMessage(null);
        }, 4000);
      } catch (err: any) {
        console.error("Failed to auto-save logo:", err);
      }
    };
    reader.onerror = () => {
      setLogoError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    const updated = { ...settings, logoUrl: "" };
    setSettings(updated);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    try {
      const saved = await storage.updateStoreSettings(updated);
      onSettingsUpdated?.(saved);
      setSettingsSuccessMessage(
        "Brand logo removed from Navbar, Login page, and Invoice slips.",
      );
      setTimeout(() => {
        setSettingsSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Failed to remove logo:", err);
    }
  };

  const handleSaveStoreSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMessage(null);

    try {
      const saved = await storage.updateStoreSettings(settings);
      onSettingsUpdated?.(saved);
      setSettingsSuccessMessage(
        "Store and Invoice Slip settings saved successfully to PC disk storage!",
      );
      setSettingsErrorMessage(null);
      setTimeout(() => {
        setSettingsSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setSettingsErrorMessage(
        "Failed to save settings: " + (err.message || "Unknown error"),
      );
      setTimeout(() => {
        setSettingsErrorMessage(null);
      }, 5000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleBarcode = async (enabled: boolean) => {
    const updated = { ...settings, barcodeEnabled: enabled };
    setSettings(updated);
    try {
      const saved = await storage.updateStoreSettings(updated);
      onSettingsUpdated?.(saved);
      setSettingsSuccessMessage(
        enabled
          ? "Barcode scanner option enabled across Sales and Inventory."
          : "Barcode scanner option disabled across Sales and Inventory.",
      );
      setTimeout(() => {
        setSettingsSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Failed to update barcode setting:", err);
    }
  };

  const handleToggleAutoPrintSlip = async (enabled: boolean) => {
    const updated = {
      ...settings,
      autoPrintSlip: enabled,
      printerSettings: {
        ...(settings.printerSettings || DEFAULT_PRINTER_SETTINGS),
        autoPrintOnSale: enabled,
      },
    };
    setSettings(updated);
    setPrinterConfig((prev) => ({
      ...prev,
      autoPrintOnSale: enabled,
    }));
    try {
      const saved = await storage.updateStoreSettings(updated);
      setSettings(saved);
      onSettingsUpdated?.(saved);
      setSettingsSuccessMessage(
        enabled
          ? "Automatic receipt slip printing enabled. Print dialogue will open automatically after completing each sale."
          : "Automatic receipt slip printing disabled. Slips will generate for manual printing.",
      );
      setTimeout(() => {
        setSettingsSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Failed to update auto-print setting:", err);
    }
  };

  const handleAddPhoneNumber = () => {
    const currentList =
      settings.phoneNumbers && settings.phoneNumbers.length > 0
        ? [...settings.phoneNumbers]
        : [settings.phoneNumber || ""];
    const updated = [...currentList, ""];
    setSettings((prev) => ({
      ...prev,
      phoneNumbers: updated,
      phoneNumber: updated.filter(Boolean).join(", "),
    }));
  };

  const handlePhoneNumberChange = (index: number, value: string) => {
    const currentList =
      settings.phoneNumbers && settings.phoneNumbers.length > 0
        ? [...settings.phoneNumbers]
        : [settings.phoneNumber || ""];
    const updated = [...currentList];
    updated[index] = value;
    setSettings((prev) => ({
      ...prev,
      phoneNumbers: updated,
      phoneNumber: updated.filter(Boolean).join(", "),
    }));
  };

  const handleRemovePhoneNumber = (index: number) => {
    const currentList =
      settings.phoneNumbers && settings.phoneNumbers.length > 0
        ? [...settings.phoneNumbers]
        : [settings.phoneNumber || ""];
    let updated = currentList.filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated = [""];
    }
    setSettings((prev) => ({
      ...prev,
      phoneNumbers: updated,
      phoneNumber: updated.filter(Boolean).join(", "),
    }));
  };

  const handleAddReturnPolicy = () => {
    const currentList =
      settings.returnPolicies && settings.returnPolicies.length > 0
        ? [...settings.returnPolicies]
        : settings.returnPolicyText
          ? [settings.returnPolicyText]
          : [""];
    const updated = [...currentList, ""];
    setSettings((prev) => ({
      ...prev,
      returnPolicies: updated,
      returnPolicyText: updated.filter(Boolean).join(" • "),
    }));
  };

  const handleReturnPolicyChange = (index: number, value: string) => {
    const currentList =
      settings.returnPolicies && settings.returnPolicies.length > 0
        ? [...settings.returnPolicies]
        : settings.returnPolicyText
          ? [settings.returnPolicyText]
          : [""];
    const updated = [...currentList];
    updated[index] = value;
    setSettings((prev) => ({
      ...prev,
      returnPolicies: updated,
      returnPolicyText: updated.filter(Boolean).join(" • "),
    }));
  };

  const handleRemoveReturnPolicy = (index: number) => {
    const currentList =
      settings.returnPolicies && settings.returnPolicies.length > 0
        ? [...settings.returnPolicies]
        : settings.returnPolicyText
          ? [settings.returnPolicyText]
          : [""];
    let updated = currentList.filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated = [""];
    }
    setSettings((prev) => ({
      ...prev,
      returnPolicies: updated,
      returnPolicyText: updated.filter(Boolean).join(" • "),
    }));
  };

  const handleResetDefaults = () => {
    setIsResetDefaultsModalOpen(true);
  };

  const handleConfirmResetDefaults = () => {
    const def = { ...DEFAULT_STORE_SETTINGS };
    const defPrinter = { ...DEFAULT_PRINTER_SETTINGS };
    setSettings({
      ...def,
      phoneNumbers: def.phoneNumbers
        ? [...def.phoneNumbers]
        : [def.phoneNumber],
      returnPolicies: def.returnPolicies
        ? [...def.returnPolicies]
        : [def.returnPolicyText],
      printerSettings: defPrinter,
    });
    setPrinterConfig(defPrinter);
    setPreviewPaperSize("58mm");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsResetDefaultsModalOpen(false);
    setSettingsSuccessMessage(
      "Store brand and invoice slip settings reset to default values.",
    );
    setTimeout(() => {
      setSettingsSuccessMessage(null);
    }, 4000);
  };

  // Switch printer preset and apply sensible hardware defaults
  const handlePrinterPresetChange = (preset: PrinterModelPreset) => {
    if (preset === "bc-96ac") {
      setPrinterConfig((prev) => ({
        ...prev,
        printerPreset: "bc-96ac",
        printerName: "BC-96AC Mini Printer",
        paperSize: "58mm",
        customWidthMm: 58,
        autoCutFeedLines: 3,
        darkPrintOptimization: true,
      }));
      setPreviewPaperSize("58mm");
    } else if (preset === "thermal-58mm") {
      setPrinterConfig((prev) => ({
        ...prev,
        printerPreset: "thermal-58mm",
        printerName: "Standard 58mm Thermal Printer",
        paperSize: "58mm",
        customWidthMm: 58,
        autoCutFeedLines: 3,
        darkPrintOptimization: true,
      }));
      setPreviewPaperSize("58mm");
    } else if (preset === "thermal-80mm") {
      setPrinterConfig((prev) => ({
        ...prev,
        printerPreset: "thermal-80mm",
        printerName: "80mm POS Thermal Printer",
        paperSize: "80mm",
        customWidthMm: 80,
        autoCutFeedLines: 2,
        darkPrintOptimization: true,
      }));
      setPreviewPaperSize("80mm");
    } else if (preset === "a4") {
      setPrinterConfig((prev) => ({
        ...prev,
        printerPreset: "a4",
        printerName: "A4 Desktop Standard Printer",
        paperSize: "a4",
        autoCutFeedLines: 0,
      }));
      setPreviewPaperSize("a4");
    } else if (preset === "a5") {
      setPrinterConfig((prev) => ({
        ...prev,
        printerPreset: "a5",
        printerName: "A5 Compact Invoice Printer",
        paperSize: "a5",
        autoCutFeedLines: 0,
      }));
      setPreviewPaperSize("a5");
    } else {
      setPrinterConfig((prev) => ({
        ...prev,
        printerPreset: "custom",
        paperSize: "custom",
      }));
    }
  };

  // Save printer configuration to disk storage
  const handleSavePrinterSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPrinter(true);
    setPrinterSuccessMessage(null);
    setPrinterErrorMessage(null);

    try {
      const updatedStoreSettings: StoreSettings = {
        ...settings,
        autoPrintSlip: printerConfig.autoPrintOnSale,
        printerSettings: printerConfig,
      };
      const saved = await storage.updateStoreSettings(updatedStoreSettings);
      setSettings(saved);
      onSettingsUpdated?.(saved);
      setPrinterSuccessMessage(
        `Printer settings saved successfully! Invoices will format for "${printerConfig.printerName}" (${printerConfig.paperSize.toUpperCase()}) (1 copy).`,
      );
      setTimeout(() => {
        setPrinterSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Failed to save printer settings:", err);
      setPrinterErrorMessage(
        "Failed to save printer settings: " + (err.message || "Unknown error"),
      );
      setTimeout(() => {
        setPrinterErrorMessage(null);
      }, 5000);
    } finally {
      setIsSavingPrinter(false);
    }
  };

  // Launch test print with sample sale
  const handleLaunchTestPrint = () => {
    const now = new Date();
    const testSale: Sale = {
      id: "test_print_" + Date.now(),
      invoiceNumber: `${printerConfig.invoicePrefix || "INV-"}TEST-96AC`,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: printerConfig.timeFormat !== "24h",
      }),
      cashierName: currentUser.name || "Obaid",
      customerName: "Sample Customer (Printer Test)",
      paymentMethod: "CASH",
      items: [
        {
          itemId: "test_item_1",
          name: "Wireless Mechanical Keyboard Pro",
          sku: "ELC-KB-01",
          barcode: "89010000001",
          unit: "pcs",
          availableStock: 25,
          quantity: 1,
          costPrice: 4500,
          originalPrice: 8999,
          soldPrice: 8999,
          total: 8999,
        },
        {
          itemId: "test_item_2",
          name: "USB-C Fast Charging Cable 2M",
          sku: "ACC-USB-02",
          barcode: "89010000002",
          unit: "pcs",
          availableStock: 50,
          quantity: 2,
          costPrice: 400,
          originalPrice: 750,
          soldPrice: 750,
          total: 1500,
        },
      ],
      subtotal: 10499,
      totalAmount: 10499,
      notes: `Test Print for ${printerConfig.printerName} • Size: ${printerConfig.paperSize.toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    setTestReceiptSale(testSale);
  };

  // User Photo upload handler
  const handleUserPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUserErrorMessage("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    try {
      const compressed = await compressImageToAvatar(file);
      setUserPhoto(compressed);
      setUserErrorMessage(null);
    } catch {
      setUserErrorMessage(
        "Failed to process image file. Please try another photo.",
      );
    } finally {
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  // User Profile update handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMessage(null);
    setUserErrorMessage(null);

    const trimmedName = userName.trim();
    const trimmedUsername = userUsername.trim();

    if (!trimmedName) {
      setUserErrorMessage("Please enter your Name.");
      return;
    }

    if (!trimmedUsername) {
      setUserErrorMessage("Please enter a Username.");
      return;
    }

    if (trimmedUsername.length < 3) {
      setUserErrorMessage("Username must be at least 3 characters long.");
      return;
    }

    setIsUpdatingUser(true);
    try {
      const res = await authService.updateUser(
        trimmedName,
        trimmedUsername,
        userPhoto,
      );
      if (res.success && res.user) {
        setUserSuccessMessage(
          res.message ||
            "Profile updated successfully! Name and photo are now updated in the navigation bar.",
        );
        onUserUpdated?.(res.user);
      } else {
        setUserErrorMessage(res.error || "Failed to update user profile.");
      }
    } catch (err: any) {
      setUserErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Password change handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccessMessage(null);
    setPassErrorMessage(null);

    if (!currentPassword.trim()) {
      setPassErrorMessage("Please enter your current password.");
      return;
    }

    if (!newPassword.trim()) {
      setPassErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setPassErrorMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrorMessage("New password and confirm password do not match.");
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await authService.changePassword(
        currentPassword,
        newPassword,
      );
      if (res.success) {
        setPassSuccessMessage(
          res.message ||
            "Password successfully changed and encrypted in backend storage.",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPassErrorMessage(res.error || "Failed to update password.");
      }
    } catch (err: any) {
      setPassErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsChangingPass(false);
    }
  };

  // Two-Factor Authentication (2FA) handler
  const handleSaveTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorSuccessMessage(null);
    setTwoFactorErrorMessage(null);

    const emailTrimmed = twoFactorEmail.trim();
    const mobileTrimmed = twoFactorMobile.trim();

    if (!emailTrimmed) {
      setTwoFactorErrorMessage(
        "Email is required for Two-Factor Authentication.",
      );
      return;
    }

    if (!mobileTrimmed) {
      setTwoFactorErrorMessage(
        "Mobile Number is required for Two-Factor Authentication.",
      );
      return;
    }

    setIsSaving2FA(true);
    try {
      const res = await authService.updateTwoFactor(
        emailTrimmed,
        mobileTrimmed,
      );
      if (res.success && res.user) {
        setTwoFactorSuccessMessage(
          res.message ||
            "Two-Factor Authentication configuration saved successfully.",
        );
        if (onUserUpdated) {
          onUserUpdated(res.user);
        }
        setTimeout(() => setTwoFactorSuccessMessage(null), 5000);
      } else {
        setTwoFactorErrorMessage(
          res.error || "Failed to save Two-Factor Authentication.",
        );
      }
    } catch (err: any) {
      setTwoFactorErrorMessage(
        err.message || "An error occurred while saving 2FA settings.",
      );
    } finally {
      setIsSaving2FA(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>System Settings</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure business branding, update your user profile, and manage
            account security.
          </p>
        </div>

        {/* Tab Navigation Pill */}
        <div className="inline-flex rounded-xl border border-slate-200 p-1.5 bg-slate-50 overflow-x-auto max-w-full gap-1">
          {!isWorker && (
            <button
              type="button"
              id="tab-btn-profile"
              onClick={() => setActiveSettingsTab("profile")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeSettingsTab === "profile"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Building2 className="w-4.5 h-4.5 text-emerald-600" />
              <span>Brand &amp; Invoice Slip</span>
            </button>
          )}

          {/* Dedicated Printer Settings Tab Button */}
          <button
            type="button"
            id="tab-btn-printer"
            onClick={() => setActiveSettingsTab("printer")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSettingsTab === "printer"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Printer className="w-4.5 h-4.5 text-blue-600" />
            <span>Printer Settings</span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
              BC-96AC
            </span>
          </button>

          <button
            type="button"
            id="tab-btn-user"
            onClick={() => setActiveSettingsTab("user")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSettingsTab === "user"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <User className="w-4.5 h-4.5 text-indigo-600" />
            <span>{isWorker ? "My Profile" : "User"}</span>
          </button>

          <button
            type="button"
            id="tab-btn-security"
            onClick={() => setActiveSettingsTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeSettingsTab === "security"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Shield className="w-4.5 h-4.5 text-blue-600" />
            <span>Security &amp; Password</span>
          </button>

          {!isWorker && (
            <button
              type="button"
              id="tab-btn-users"
              onClick={() => {
                setActiveSettingsTab("users");
                loadManagedUsers();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeSettingsTab === "users"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-4.5 h-4.5 text-purple-600" />
              <span>User Management</span>
              {managedUsers.filter((u) => u.role === "worker").length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                  {managedUsers.filter((u) => u.role === "worker").length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: BRAND & INVOICE PROFILE */}
      {activeSettingsTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Controls (Left Column) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSaveStoreSettings} className="space-y-6">
              {/* Success / Error Notification */}
              {settingsSuccessMessage && (
                <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSuccessMessage}</span>
                </div>
              )}
              {settingsErrorMessage && (
                <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{settingsErrorMessage}</span>
                </div>
              )}

              {/* SECTION 1: LOGO UPLOAD */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <span>1. Brand Logo</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload your store or business logo. It replaces the default
                    icon across the top Navigation Bar, the Login page, and all
                    printed and digital invoice slips.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Logo Preview Box */}
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Brand Logo Preview"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Building2 className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        <span className="text-[10px] block">No Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="input-logo-file"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        id="btn-upload-logo"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {settings.logoUrl ? "Change Logo" : "Upload Logo"}
                        </span>
                      </button>

                      {settings.logoUrl && (
                        <button
                          type="button"
                          id="btn-remove-logo"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Supports PNG, JPG, SVG or WebP (up to 2.5MB).
                      Automatically updates the Navbar, Login page, and invoice
                      receipts in real time.
                    </p>

                    {logoError && (
                      <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{logoError}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Real-time Display Integration Previews */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Navbar Display
                    </span>
                    <div className="flex items-center gap-2.5 bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                      {settings.logoUrl ? (
                        <div className="w-30 h-8 flex items-center justify-center p-0.5">
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                      )}
                      {/* <span className="font-bold text-slate-900 text-xs truncate">
                        {settings.brandName || "StockCore"}
                      </span> */}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                      Login Page Display
                    </span>
                    <div className="flex items-center gap-2.5 bg-white p-2 rounded-md border border-slate-200 shadow-2xs">
                      {settings.logoUrl ? (
                        <div className="w-30 h-8 flex items-center justify-center p-0.5">
                          <img
                            src={settings.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                          <Boxes className="w-4 h-4" />
                        </div>
                      )}
                      {/* <div>
                        <span className="font-bold text-slate-900 text-xs block leading-none">
                          {settings.brandName || "StockCore"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Workspace Sign-in
                        </span>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: BRAND NAME */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <span>2. Brand / Business Name</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    The official name of your firm printed as the main header of
                    the invoice.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="input-brand-name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Store / Enterprise Name{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-brand-name"
                    required
                    value={settings.brandName}
                    onChange={(e) =>
                      setSettings({ ...settings, brandName: e.target.value })
                    }
                    placeholder="e.g., Vertex Solutions Ltd."
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* SECTION 3: ABOVE INVOICE SLIP (HEADER DETAILS) */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 uppercase tracking-wide">
                      Slip Header
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Details to Add Above the Invoice Slip
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Contact and address details placed at the top of the invoice
                    above customer & item line items.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Numbers / Helplines with Plus Icon */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Phone Number / Helpline</span>
                      </label>
                      <button
                        type="button"
                        id="btn-add-phone-number"
                        onClick={handleAddPhoneNumber}
                        title="Add another phone number / helpline"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Add Number</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(settings.phoneNumbers &&
                      settings.phoneNumbers.length > 0
                        ? settings.phoneNumbers
                        : [settings.phoneNumber || ""]
                      ).map((num, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              id={`input-phone-number-${idx}`}
                              value={num}
                              onChange={(e) =>
                                handlePhoneNumberChange(idx, e.target.value)
                              }
                              placeholder={
                                idx === 0
                                  ? "Primary: e.g., +92 300 1234567"
                                  : `Secondary / Helpline ${idx + 1}: e.g., +92 321 9876543`
                              }
                              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-mono"
                            />
                          </div>

                          {/* Plus Icon button directly alongside the input for fast 1-click addition */}
                          <button
                            type="button"
                            id={`btn-inline-add-phone-${idx}`}
                            onClick={handleAddPhoneNumber}
                            title="Add another phone number"
                            className="p-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove button if more than 1 number exists */}
                          {(settings.phoneNumbers?.length ?? 1) > 1 && (
                            <button
                              type="button"
                              id={`btn-remove-phone-${idx}`}
                              onClick={() => handleRemovePhoneNumber(idx)}
                              title="Remove this phone number"
                              className="p-2 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Click the{" "}
                      <strong className="text-slate-600">+ Add Number</strong>{" "}
                      button or the <strong>+</strong> icon to add multiple
                      contact numbers or helplines to display on the invoice
                      receipt slip.
                    </p>
                  </div>

                  {/* Header Brief Text / Tagline / NTN */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="input-header-brief"
                      className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Brief Header Text / NTN / Tagline</span>
                    </label>
                    <input
                      type="text"
                      id="input-header-brief"
                      value={settings.headerBriefText}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          headerBriefText: e.target.value,
                        })
                      }
                      placeholder="e.g., Authorized Wholesale & Retailers • NTN: 8941029-4"
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="input-address"
                      className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Store Address</span>
                    </label>
                    <textarea
                      id="input-address"
                      rows={2}
                      value={settings.address}
                      onChange={(e) =>
                        setSettings({ ...settings, address: e.target.value })
                      }
                      placeholder="e.g., Shop # 14-15, Commercial Plaza, Main Boulevard, Lahore"
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: BELOW INVOICE SLIP (FOOTER DETAILS) */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200 uppercase tracking-wide">
                      Slip Footer
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      4. Details to Add Below the Invoice Slip
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Terms, exchange policies, gratitude notes, and support info
                    printed below the invoice totals.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Brief Thank You Text */}
                  <div>
                    <label
                      htmlFor="input-footer-brief"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Brief Thank You Text / Note
                    </label>
                    <input
                      type="text"
                      id="input-footer-brief"
                      value={settings.footerBriefText}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          footerBriefText: e.target.value,
                        })
                      }
                      placeholder="e.g., Thank you for your business! Please visit us again."
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                    />
                  </div>

                  {/* Return / Exchange Policy Repeater with Plus Icon */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Return / Exchange Policy</span>
                      </label>
                      <button
                        type="button"
                        id="btn-add-return-policy"
                        onClick={handleAddReturnPolicy}
                        title="Add another return / exchange policy"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Add Policy</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(settings.returnPolicies &&
                      settings.returnPolicies.length > 0
                        ? settings.returnPolicies
                        : [settings.returnPolicyText || ""]
                      ).map((pol, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              id={`input-return-policy-${idx}`}
                              value={pol}
                              onChange={(e) =>
                                handleReturnPolicyChange(idx, e.target.value)
                              }
                              placeholder={
                                idx === 0
                                  ? "Primary: e.g., Items can be exchanged within 7 days in original condition with this receipt."
                                  : `Policy rule ${idx + 1}: e.g., No cash refunds; exchange valid with original barcode tag.`
                              }
                              className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                            />
                          </div>

                          {/* Plus Icon button directly alongside the input for fast 1-click addition */}
                          <button
                            type="button"
                            id={`btn-inline-add-policy-${idx}`}
                            onClick={handleAddReturnPolicy}
                            title="Add another policy rule"
                            className="p-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {/* Remove button if more than 1 policy exists */}
                          {(settings.returnPolicies?.length ?? 1) > 1 && (
                            <button
                              type="button"
                              id={`btn-remove-policy-${idx}`}
                              onClick={() => handleRemoveReturnPolicy(idx)}
                              title="Remove this policy rule"
                              className="p-2 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Click the{" "}
                      <strong className="text-slate-600">+ Add Policy</strong>{" "}
                      button or the <strong>+</strong> icon to add multiple
                      return / exchange policy rules to display on the invoice
                      receipt slip.
                    </p>
                  </div>

                  {/* Support / Contact Line */}
                  <div>
                    <label
                      htmlFor="input-support-contact"
                      className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Customer Support / Inquiries Contact</span>
                    </label>
                    <input
                      type="text"
                      id="input-support-contact"
                      value={settings.supportContact}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          supportContact: e.target.value,
                        })
                      }
                      placeholder="e.g., Email: support@stockcore.pk • WhatsApp: +92 300 1234567"
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: BARCODE SCANNER OPTION */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200 uppercase tracking-wide">
                        Hardware & POS
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-indigo-600" />
                        <span>5. Barcode Scanner Option</span>
                      </h3>
                    </div>
                    <span
                      id="badge-barcode-status"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        settings.barcodeEnabled !== false
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {settings.barcodeEnabled !== false
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enable or disable the barcode scanning feature across Sales,
                    Stock Inventory, and Product registration.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="toggle-barcode-switch"
                      className="text-xs font-bold text-slate-900 cursor-pointer flex items-center gap-2"
                    >
                      <span>Enable / Disable Barcode Option</span>
                    </label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      When enabled, barcode lookup inputs and USB / Bluetooth
                      scanner widgets appear in Record Sale and Inventory. When
                      disabled, barcode scanning options and widgets are hidden.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="toggle-barcode-switch"
                    role="switch"
                    aria-checked={settings.barcodeEnabled !== false}
                    onClick={() =>
                      handleToggleBarcode(settings.barcodeEnabled === false)
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.barcodeEnabled !== false
                        ? "bg-emerald-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.barcodeEnabled !== false
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* SECTION 6: AUTOMATIC RECEIPT SLIP PRINTING */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 uppercase tracking-wide">
                        Receipt Slip & Printout
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-emerald-600" />
                        <span>6. Automatic Slip Generation & Printout</span>
                      </h3>
                    </div>
                    <span
                      id="badge-autoprint-status"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        settings.autoPrintSlip !== false
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {settings.autoPrintSlip !== false
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Automatically generate customer invoice slip and open
                    printout dialogue immediately upon completing a sale.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="toggle-autoprint-switch"
                      className="text-xs font-bold text-slate-900 cursor-pointer flex items-center gap-2"
                    >
                      <span>Auto-Print Slip on Sale Completion</span>
                    </label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Instant single-step sale completion: As soon as you record
                      a cash sale, the printable invoice slip generates on
                      screen and triggers the printer dialogue automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="toggle-autoprint-switch"
                    role="switch"
                    aria-checked={settings.autoPrintSlip !== false}
                    onClick={() =>
                      handleToggleAutoPrintSlip(
                        settings.autoPrintSlip === false,
                      )
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.autoPrintSlip !== false
                        ? "bg-emerald-600"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.autoPrintSlip !== false
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  id="btn-reset-defaults"
                  onClick={handleResetDefaults}
                  className="px-3.5 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>

                <button
                  type="submit"
                  id="btn-save-settings"
                  disabled={isSavingSettings}
                  className="px-5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isSavingSettings
                      ? "Saving to PC Disk..."
                      : "Save Settings"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Slip Preview (Right Column) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-slate-900">
                    Live Slip Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  80MM THERMAL • 1 COPY
                </span>
              </div>

              {/* Realistic Simulated Paper Slip Preview Card - Exactly styled like Printer Settings 80mm Option */}
              <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-4 shadow-sm mx-auto overflow-hidden transition-all max-w-[340px] text-xs">
                {/* Brand & Store Slip Header */}
                <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
                  {printerConfig.showLogoOnSlip && settings.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={settings.logoUrl}
                        alt={settings.brandName}
                        className="max-h-8 max-w-[120px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <h4 className="font-extrabold text-slate-950 uppercase tracking-tight text-xs">
                    {settings.brandName || "STOCKCORE RETAIL"}
                  </h4>
                  {settings.headerBriefText && (
                    <p className="text-[10px] text-slate-800 font-semibold leading-tight">
                      {settings.headerBriefText}
                    </p>
                  )}
                  {settings.address && (
                    <p className="text-[9px] text-slate-700 font-medium leading-tight">
                      {settings.address}
                    </p>
                  )}
                  <p className="text-[10px] font-mono font-bold text-slate-950">
                    Tel:{" "}
                    {settings.phoneNumbers?.[0] ||
                      settings.phoneNumber ||
                      "+92 300 1234567"}
                  </p>
                </div>

                {/* Meta */}
                <div className="flex items-start justify-between py-1.5 border-b border-slate-300 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-800 uppercase block">
                      Invoice #
                    </span>
                    <span className="font-mono font-bold text-slate-950">
                      {printerConfig.invoicePrefix || "INV-"}80MM-001
                    </span>
                    <div className="text-slate-700 text-[9px] mt-0.5">
                      Date: 2026-09-28
                      {printerConfig.showTimeOnSlip && (
                        <span className="ml-1 font-mono font-bold text-slate-900">
                          •{" "}
                          {printerConfig.timeFormat === "24h"
                            ? "14:45"
                            : "02:45 PM"}
                        </span>
                      )}
                    </div>
                    {printerConfig.showCashierName && (
                      <div className="text-slate-700 text-[9px] mt-0.5">
                        Cashier:{" "}
                        <span className="font-bold text-slate-900">
                          {currentUser.name || "Obaid"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 uppercase block">
                      Billed To
                    </span>
                    <span className="font-bold text-slate-950">
                      Walk-in Customer
                    </span>
                    <span className="inline-block mt-0.5 px-1 py-0.2 rounded bg-slate-100 font-bold text-[9px]">
                      Cash Paid
                    </span>
                  </div>
                </div>

                {/* Invoice Scannable Barcode in Preview */}
                {printerConfig.showInvoiceBarcode && (
                  <div className="py-1 text-center border-b border-dotted border-slate-300">
                    <div className="font-mono text-[9px] tracking-widest text-slate-800">
                      ||| | |||| | ||| |||| | |||
                    </div>
                    <div className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">
                      {printerConfig.invoicePrefix || "INV-"}80MM-001
                    </div>
                  </div>
                )}

                {/* Items List Table */}
                <div className="py-2 border-b border-dashed border-slate-400">
                  <table className="w-full text-[10px] text-left">
                    <thead className="border-b border-slate-300 font-bold uppercase text-slate-900 text-[9px]">
                      <tr>
                        <th className="py-1 text-left">Item</th>
                        <th className="py-1 text-center w-8">Qty</th>
                        <th className="py-1 text-right w-14">Unit Price</th>
                        <th className="py-1 text-right w-14">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1 pr-1">
                          <div className="font-bold text-slate-950">
                            Wireless Keyboard Pro
                          </div>
                          {printerConfig.showBarcodeOnSlip && (
                            <div className="text-[8px] text-slate-600 font-mono">
                              BC: 89010001
                            </div>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center font-mono font-bold">
                          1
                        </td>
                        <td className="py-1 px-1 text-right font-mono">
                          {formatPKR(8999)}
                        </td>
                        <td className="py-1 pl-1 text-right font-mono font-bold text-slate-950">
                          {formatPKR(8999)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-1">
                          <div className="font-bold text-slate-950">
                            Fast Charging Cable 2M
                          </div>
                          {printerConfig.showBarcodeOnSlip && (
                            <div className="text-[8px] text-slate-600 font-mono">
                              BC: 89010002
                            </div>
                          )}
                        </td>
                        <td className="py-1 px-1 text-center font-mono font-bold">
                          2
                        </td>
                        <td className="py-1 px-1 text-right font-mono">
                          {formatPKR(750)}
                        </td>
                        <td className="py-1 pl-1 text-right font-mono font-bold text-slate-950">
                          {formatPKR(1500)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="py-1.5 border-b border-slate-300 space-y-1">
                  <div className="flex justify-between text-slate-800 font-semibold text-[10px]">
                    <span>Total Qty:</span>
                    <span className="font-mono font-bold">3</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold text-[10px]">
                    <span>Subtotal (Gross):</span>
                    <span className="font-mono font-bold">
                      {formatPKR(10499)}
                    </span>
                  </div>
                  <div className="flex justify-between font-black text-slate-950 text-xs pt-1 border-t border-slate-300">
                    <span>Total Paid:</span>
                    <span className="font-mono text-sm">
                      {formatPKR(10499)}
                    </span>
                  </div>
                </div>

                {/* Footer Notes */}
                <div className="pt-2 text-left space-y-0.5 text-[9px] text-slate-800">
                  {settings.footerBriefText && (
                    <p className="font-bold text-slate-950 text-left">
                      {settings.footerBriefText}
                    </p>
                  )}
                  {(settings.returnPolicies &&
                  settings.returnPolicies.length > 0
                    ? settings.returnPolicies.filter(Boolean)
                    : [
                        settings.returnPolicyText ||
                          "Items can be exchanged within 7 days.",
                      ]
                  ).map((pol, idx) => (
                    <p key={idx} className="italic text-slate-700 text-left">
                      *{pol}
                    </p>
                  ))}
                  {settings.supportContact && (
                    <p className="font-mono font-bold text-slate-950 text-left">
                      {settings.supportContact}
                    </p>
                  )}
                  {printerConfig.showCashierName && (
                    <p className="text-[9px] text-slate-800 uppercase font-mono font-bold pt-1 border-t border-dotted border-slate-300 text-left">
                      Cashier: {currentUser.name || "Obaid"}
                      {printerConfig.showTimeOnSlip &&
                        ` • ${printerConfig.timeFormat === "24h" ? "14:45" : "02:45 PM"}`}
                    </p>
                  )}
                  {!printerConfig.showCashierName &&
                    printerConfig.showTimeOnSlip && (
                      <p className="text-[9px] text-slate-800 uppercase font-mono font-bold pt-1 border-t border-dotted border-slate-300 text-left">
                        Time:{" "}
                        {printerConfig.timeFormat === "24h"
                          ? "14:45"
                          : "02:45 PM"}
                      </p>
                    )}
                </div>
              </div>

              {/* Test Print Action */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleLaunchTestPrint}
                  className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Test Print Slip Preview</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Looking to configure invoice sizes (58mm BC-96AC, 80mm, A4)?
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("printer")}
                className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Open Printer Settings →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB: PRINTER & INVOICE SIZING SETTINGS               */}
      {/* ==================================================== */}
      {activeSettingsTab === "printer" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Printer &amp; Invoice Generation Settings</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      BC-96AC Ready
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your POS slip printer (BC-96AC Mini Printer, 80mm,
                    A4) and invoice paper layout (prints current page with 1
                    single copy).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-test-print-receipt"
                onClick={handleLaunchTestPrint}
                className="px-3.5 py-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs hover:bg-slate-50"
                title="Launch a test invoice printout with current settings"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>Print Test Invoice</span>
              </button>
              <button
                type="button"
                id="btn-save-printer-settings"
                onClick={() => handleSavePrinterSettings()}
                disabled={isSavingPrinter}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSavingPrinter ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save Printer Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback Notifications */}
          {printerSuccessMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{printerSuccessMessage}</span>
            </div>
          )}
          {printerErrorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{printerErrorMessage}</span>
            </div>
          )}

          {/* Main Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Fields Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Printer Hardware & Model Options */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-blue-600" />
                      <span>1. Select Printer Option / Device Preset</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose your connected POS thermal receipt printer or
                      desktop office printer.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Active: {printerConfig.printerName}
                  </span>
                </div>

                {/* Preset Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Preset: BC-96AC Mini Printer (User Primary Device) */}
                  <div
                    onClick={() => handlePrinterPresetChange("bc-96ac")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      printerConfig.printerPreset === "bc-96ac"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          58m
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>BC-96AC Mini Printer</span>
                          </div>
                          <div className="text-[11px] text-emerald-800 font-semibold">
                            Primary Device • 58mm Thermal
                          </div>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-200 text-emerald-900">
                        Popular
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Optimized for BC-96AC 58mm mini roll (384 dots, 48mm
                      printable area, 203 DPI, high speed, auto-tear feed).
                    </p>
                  </div>

                  {/* Preset: Generic 58mm / 57mm Thermal */}
                  <div
                    onClick={() => handlePrinterPresetChange("thermal-58mm")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      printerConfig.printerPreset === "thermal-58mm"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                          58m
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            Generic 58mm Thermal
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            POS-58, Milestone, Goojprt
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Standard 2-inch mini thermal slip printers connected via
                      USB, Bluetooth, or virtual serial port.
                    </p>
                  </div>

                  {/* Preset: 80mm / 3-Inch POS Thermal Receipt */}
                  <div
                    onClick={() => handlePrinterPresetChange("thermal-80mm")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      printerConfig.printerPreset === "thermal-80mm"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                          80m
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            80mm POS Slip Printer
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Epson, Xprinter, Star, Sunmi
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Commercial 3-inch counter receipt roll (72mm printable
                      width, 576 dots). Standard 3-column table.
                    </p>
                  </div>

                  {/* Preset: A4 Standard Desktop Sheet */}
                  <div
                    onClick={() => handlePrinterPresetChange("a4")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      printerConfig.printerPreset === "a4"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                          A4
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            A4 Desktop Invoicing
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Laser / Inkjet Full Page
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Full-page formal corporate invoice with company header
                      banner, detailed tabular grid, and summary.
                    </p>
                  </div>

                  {/* Preset: A5 Compact Half-Sheet */}
                  <div
                    onClick={() => handlePrinterPresetChange("a5")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      printerConfig.printerPreset === "a5"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
                          A5
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            A5 Compact Half-Sheet
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            148 × 210 mm Sheet
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Compact half-sheet voucher format. Ideal for dual invoices
                      or smaller desktop sheet trays.
                    </p>
                  </div>

                  {/* Preset: Custom Size */}
                  <div
                    onClick={() => handlePrinterPresetChange("custom")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      printerConfig.printerPreset === "custom"
                        ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                          ⚙️
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            Custom Roll Width
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            User-defined width (mm)
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                      Specify exact millimeter roll width for specialized
                      hardware or portable receipt devices.
                    </p>
                  </div>
                </div>

                {/* Custom Printer Device Name Input */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Printer Device Display Name:
                  </label>
                  <input
                    type="text"
                    value={printerConfig.printerName}
                    onChange={(e) =>
                      setPrinterConfig((prev) => ({
                        ...prev,
                        printerName: e.target.value,
                      }))
                    }
                    placeholder="e.g. BC-96AC Mini Printer"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden font-medium"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Identifies this printer on invoice headers and cash register
                    slips.
                  </p>
                </div>
              </div>

              {/* Card 2: Select Invoice Paper Size */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span>2. Select Sale Invoice Paper Size</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose which size of Sale Invoice should print on your
                    hardware.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 58mm Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrinterConfig((prev) => ({
                        ...prev,
                        paperSize: "58mm",
                      }));
                      setPreviewPaperSize("58mm");
                    }}
                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition-all ${
                      printerConfig.paperSize === "58mm"
                        ? "border-emerald-600 bg-emerald-50 text-slate-900 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>58mm Roll</span>
                      {printerConfig.paperSize === "58mm" && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                      BC-96AC Standard
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      2-inch thermal slip
                    </div>
                  </button>

                  {/* 80mm Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrinterConfig((prev) => ({
                        ...prev,
                        paperSize: "80mm",
                      }));
                      setPreviewPaperSize("80mm");
                    }}
                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition-all ${
                      printerConfig.paperSize === "80mm"
                        ? "border-emerald-600 bg-emerald-50 text-slate-900 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>80mm Roll</span>
                      {printerConfig.paperSize === "80mm" && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                      3-inch POS Slip
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Wide receipt roll
                    </div>
                  </button>

                  {/* A4 Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrinterConfig((prev) => ({
                        ...prev,
                        paperSize: "a4",
                      }));
                      setPreviewPaperSize("a4");
                    }}
                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition-all ${
                      printerConfig.paperSize === "a4"
                        ? "border-emerald-600 bg-emerald-50 text-slate-900 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>A4 Sheet</span>
                      {printerConfig.paperSize === "a4" && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                      Full Sheet
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Formal tax invoice
                    </div>
                  </button>

                  {/* A5 Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setPrinterConfig((prev) => ({
                        ...prev,
                        paperSize: "a5",
                      }));
                      setPreviewPaperSize("a5");
                    }}
                    className={`p-3 rounded-lg border-2 text-left cursor-pointer transition-all ${
                      printerConfig.paperSize === "a5"
                        ? "border-emerald-600 bg-emerald-50 text-slate-900 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>A5 Sheet</span>
                      {printerConfig.paperSize === "a5" && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                      Half Sheet
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Compact voucher
                    </div>
                  </button>
                </div>

                {printerConfig.paperSize === "custom" && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Custom Paper Roll Width (mm):
                    </label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        min="30"
                        max="220"
                        value={printerConfig.customWidthMm || 58}
                        onChange={(e) =>
                          setPrinterConfig((prev) => ({
                            ...prev,
                            customWidthMm: parseInt(e.target.value) || 58,
                          }))
                        }
                        className="w-24 px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                      />
                      <span className="text-xs text-slate-600 font-semibold">
                        millimeters
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Invoice Numbering & Barcode Configuration */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-indigo-600" />
                    <span>
                      3. Invoice Numbering &amp; Barcode Configuration
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure custom invoice numbering prefix and scannable
                    barcode options for invoice receipts (always prints 1 single
                    clean copy).
                  </p>
                </div>

                {/* Invoice Number & Barcode Options */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Invoice Number Prefix:
                      </label>
                      <input
                        type="text"
                        value={printerConfig.invoicePrefix || "INV-"}
                        onChange={(e) =>
                          setPrinterConfig((prev) => ({
                            ...prev,
                            invoicePrefix: e.target.value,
                          }))
                        }
                        placeholder="e.g. INV-"
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 pb-2">
                        <input
                          type="checkbox"
                          checked={printerConfig.showInvoiceBarcode}
                          onChange={(e) =>
                            setPrinterConfig((prev) => ({
                              ...prev,
                              showInvoiceBarcode: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-semibold">
                          Print Scannable Barcode for Invoice Number
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Prints a Code128 barcode of the invoice # so you can
                        scan old receipts to find transactions instantly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Thermal Slip & Print Optimization Settings */}
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>4. Thermal Mini-Printer Optimization (BC-96AC)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fine-tune automatic printing, dark contrast, and bottom
                    paper tear spacing.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Auto Print on Sale Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900">
                        Automatic Print Dialog on Sale Checkout
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Instantly launches the browser print dialog as soon as a
                        sale is recorded.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPrinterConfig((prev) => ({
                          ...prev,
                          autoPrintOnSale: !prev.autoPrintOnSale,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        printerConfig.autoPrintOnSale
                          ? "bg-emerald-600"
                          : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          printerConfig.autoPrintOnSale
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dark Font Thermal Optimization */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>100% Solid Dark Black Font Mode</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">
                          Dark Mode
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Forces pure dark black typography and crisp borders to
                        prevent faint or faded print on thermal heads.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPrinterConfig((prev) => ({
                          ...prev,
                          darkPrintOptimization: !prev.darkPrintOptimization,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        printerConfig.darkPrintOptimization
                          ? "bg-emerald-600"
                          : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          printerConfig.darkPrintOptimization
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Paper Feed Lines */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Paper Feed Blank Spacing before Tear / Auto-Cut:
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[0, 2, 3, 4, 6].map((lines) => (
                        <button
                          key={lines}
                          type="button"
                          onClick={() =>
                            setPrinterConfig((prev) => ({
                              ...prev,
                              autoCutFeedLines: lines,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                            printerConfig.autoCutFeedLines === lines
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {lines === 0
                            ? "0 lines (Tight)"
                            : `${lines} blank lines`}
                          {lines === 3 && " (BC-96AC Ideal)"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Feeds extra paper so the manual tear bar on the BC-96AC
                      does not cut through footer contact or policy text.
                    </p>
                  </div>

                  {/* Additional Content Toggles */}
                  <div className="pt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={printerConfig.showLogoOnSlip}
                          onChange={(e) =>
                            setPrinterConfig((prev) => ({
                              ...prev,
                              showLogoOnSlip: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-semibold text-xs text-slate-800">
                          Print Store Logo
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={printerConfig.showBarcodeOnSlip}
                          onChange={(e) =>
                            setPrinterConfig((prev) => ({
                              ...prev,
                              showBarcodeOnSlip: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-semibold text-xs text-slate-800">
                          Print Item Barcodes
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={printerConfig.showCashierName}
                          onChange={(e) =>
                            setPrinterConfig((prev) => ({
                              ...prev,
                              showCashierName: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-semibold text-xs text-slate-800">
                          Print Cashier Name
                        </span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={printerConfig.showTimeOnSlip}
                          onChange={(e) =>
                            setPrinterConfig((prev) => ({
                              ...prev,
                              showTimeOnSlip: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-semibold text-xs text-slate-800">
                          Print Sale Time
                        </span>
                      </label>
                    </div>

                    {/* Dedicated Cashier Name & Time Configuration Box */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Slip Time &amp; Profile Details</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {printerConfig.showCashierName
                            ? "Cashier: Active"
                            : "Cashier: Hidden"}{" "}
                          •{" "}
                          {printerConfig.showTimeOnSlip
                            ? "Time: Active"
                            : "Time: Hidden"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        {/* Time Format Selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Slip Time Display Format:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPrinterConfig((prev) => ({
                                  ...prev,
                                  timeFormat: "12h",
                                }))
                              }
                              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                (printerConfig.timeFormat || "12h") === "12h"
                                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>12-Hour (02:45 PM)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPrinterConfig((prev) => ({
                                  ...prev,
                                  timeFormat: "24h",
                                }))
                              }
                              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                printerConfig.timeFormat === "24h"
                                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>24-Hour (14:45)</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Printed next to the sale date on all receipts when
                            "Print Sale Time" is enabled.
                          </p>
                        </div>

                        {/* Cashier Name Info Badge */}
                        <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                          <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Cashier Name Source:</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                              User Profile Information
                            </span>
                          </div>
                          <div className="mt-1.5 text-xs text-slate-800 flex items-center gap-1.5">
                            <span className="text-slate-500">
                              Name on Slip:
                            </span>
                            <span className="font-bold text-slate-950">
                              {currentUser.name || "Obaid"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Automatically picked from User Profile Information
                            &rarr; Name. Editable in the User Profile tab.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Interactive Receipt Preview Column */}
            <div className="lg:col-span-5 space-y-4 sticky top-6">
              {/* Preview Header & Paper Switcher */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-900">
                      Live Slip Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {printerConfig.paperSize.toUpperCase()} • 1 Copy
                  </span>
                </div>

                {/* Preview Paper Size Switcher Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewPaperSize("58mm")}
                    className={`flex-1 py-1 rounded text-center text-xs font-semibold transition-colors cursor-pointer ${
                      previewPaperSize === "58mm"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    58mm (BC-96AC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperSize("80mm")}
                    className={`flex-1 py-1 rounded text-center text-xs font-semibold transition-colors cursor-pointer ${
                      previewPaperSize === "80mm"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    80mm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperSize("a4")}
                    className={`flex-1 py-1 rounded text-center text-xs font-semibold transition-colors cursor-pointer ${
                      previewPaperSize === "a4"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPaperSize("a5")}
                    className={`flex-1 py-1 rounded text-center text-xs font-semibold transition-colors cursor-pointer ${
                      previewPaperSize === "a5"
                        ? "bg-white text-slate-950 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    A5
                  </button>
                </div>

                {/* Realistic Simulated Paper Slip Preview Card */}
                <div
                  className={`bg-white rounded-lg border-2 border-dashed border-slate-300 p-4 shadow-sm mx-auto overflow-hidden transition-all ${
                    previewPaperSize === "58mm"
                      ? "max-w-[270px] text-[11px] leading-tight"
                      : previewPaperSize === "80mm"
                        ? "max-w-[340px] text-xs"
                        : "max-w-full text-xs"
                  }`}
                >
                  {/* Brand & Store Slip Header */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
                    {printerConfig.showLogoOnSlip && settings.logoUrl && (
                      <div className="flex justify-center mb-1">
                        <img
                          src={settings.logoUrl}
                          alt={settings.brandName}
                          className="max-h-8 max-w-[120px] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h4 className="font-extrabold text-slate-950 uppercase tracking-tight text-xs">
                      {settings.brandName || "STOCKCORE RETAIL"}
                    </h4>
                    {settings.headerBriefText && (
                      <p className="text-[10px] text-slate-800 font-semibold leading-tight">
                        {settings.headerBriefText}
                      </p>
                    )}
                    {settings.address && (
                      <p className="text-[9px] text-slate-700 font-medium leading-tight">
                        {settings.address}
                      </p>
                    )}
                    <p className="text-[10px] font-mono font-bold text-slate-950">
                      Tel:{" "}
                      {settings.phoneNumbers?.[0] ||
                        settings.phoneNumber ||
                        "+92 300 1234567"}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-start justify-between py-1.5 border-b border-slate-300 text-[10px]">
                    <div>
                      <span className="font-bold text-slate-800 uppercase block">
                        Invoice #
                      </span>
                      <span className="font-mono font-bold text-slate-950">
                        {printerConfig.invoicePrefix || "INV-"}96AC-001
                      </span>
                      <div className="text-slate-700 text-[9px] mt-0.5">
                        Date: 2026-09-28
                        {printerConfig.showTimeOnSlip && (
                          <span className="ml-1 font-mono font-bold text-slate-900">
                            •{" "}
                            {printerConfig.timeFormat === "24h"
                              ? "14:45"
                              : "02:45 PM"}
                          </span>
                        )}
                      </div>
                      {printerConfig.showCashierName && (
                        <div className="text-slate-700 text-[9px] mt-0.5">
                          Cashier:{" "}
                          <span className="font-bold text-slate-900">
                            {currentUser.name || "Obaid"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 uppercase block">
                        Billed To
                      </span>
                      <span className="font-bold text-slate-950">
                        Walk-in Customer
                      </span>
                      <span className="inline-block mt-0.5 px-1 py-0.2 rounded bg-slate-100 font-bold text-[9px]">
                        Cash Paid
                      </span>
                    </div>
                  </div>

                  {/* Invoice Scannable Barcode in Preview */}
                  {printerConfig.showInvoiceBarcode && (
                    <div className="py-1 text-center border-b border-dotted border-slate-300">
                      <div className="font-mono text-[9px] tracking-widest text-slate-800">
                        ||| | |||| | ||| |||| | |||
                      </div>
                      <div className="text-[8px] font-mono font-bold text-slate-900 mt-0.5">
                        {printerConfig.invoicePrefix || "INV-"}96AC-001
                      </div>
                    </div>
                  )}

                  {/* Items List Table */}
                  <div className="py-2 border-b border-dashed border-slate-400">
                    <table className="w-full text-[10px] text-left">
                      <thead className="border-b border-slate-300 font-bold uppercase text-slate-900 text-[9px]">
                        <tr>
                          <th className="py-1 text-left">Item</th>
                          <th className="py-1 text-center w-8">Qty</th>
                          <th className="py-1 text-right w-14">Unit Price</th>
                          <th className="py-1 text-right w-14">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1 pr-1">
                            <div className="font-bold text-slate-950">
                              Wireless Keyboard Pro
                            </div>
                            {printerConfig.showBarcodeOnSlip && (
                              <div className="text-[8px] text-slate-600 font-mono">
                                BC: 89010001
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-1 text-center font-mono font-bold">
                            1
                          </td>
                          <td className="py-1 px-1 text-right font-mono">
                            {formatPKR(8999)}
                          </td>
                          <td className="py-1 pl-1 text-right font-mono font-bold text-slate-950">
                            {formatPKR(8999)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-1">
                            <div className="font-bold text-slate-950">
                              Fast Charging Cable 2M
                            </div>
                            {printerConfig.showBarcodeOnSlip && (
                              <div className="text-[8px] text-slate-600 font-mono">
                                BC: 89010002
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-1 text-center font-mono font-bold">
                            2
                          </td>
                          <td className="py-1 px-1 text-right font-mono">
                            {formatPKR(750)}
                          </td>
                          <td className="py-1 pl-1 text-right font-mono font-bold text-slate-950">
                            {formatPKR(1500)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Total */}
                  <div className="py-1.5 border-b border-slate-300 space-y-1">
                    <div className="flex justify-between text-slate-800 font-semibold text-[10px]">
                      <span>Total Qty:</span>
                      <span className="font-mono font-bold">3</span>
                    </div>
                    <div className="flex justify-between text-slate-800 font-semibold text-[10px]">
                      <span>Subtotal (Gross):</span>
                      <span className="font-mono font-bold">
                        {formatPKR(10499)}
                      </span>
                    </div>
                    <div className="flex justify-between font-black text-slate-950 text-xs pt-1 border-t border-slate-300">
                      <span>Total Paid:</span>
                      <span className="font-mono text-sm">
                        {formatPKR(10499)}
                      </span>
                    </div>
                  </div>

                  {/* Footer Notes */}
                  <div className="pt-2 text-left space-y-0.5 text-[9px] text-slate-800">
                    {settings.footerBriefText && (
                      <p className="font-bold text-slate-950 text-left">
                        {settings.footerBriefText}
                      </p>
                    )}
                    {(settings.returnPolicies &&
                    settings.returnPolicies.length > 0
                      ? settings.returnPolicies.filter(Boolean)
                      : [
                          settings.returnPolicyText ||
                            "Items can be exchanged within 7 days.",
                        ]
                    ).map((pol, idx) => (
                      <p key={idx} className="italic text-slate-700 text-left">
                        *{pol}
                      </p>
                    ))}
                    {settings.supportContact && (
                      <p className="font-mono font-bold text-slate-950 text-left">
                        {settings.supportContact}
                      </p>
                    )}
                    {printerConfig.showCashierName && (
                      <p className="text-[9px] text-slate-800 uppercase font-mono font-bold pt-1 border-t border-dotted border-slate-300 text-left">
                        Cashier: {currentUser.name || "Obaid"}
                        {printerConfig.showTimeOnSlip &&
                          ` • ${printerConfig.timeFormat === "24h" ? "14:45" : "02:45 PM"}`}
                      </p>
                    )}
                    {!printerConfig.showCashierName &&
                      printerConfig.showTimeOnSlip && (
                        <p className="text-[9px] text-slate-800 uppercase font-mono font-bold pt-1 border-t border-dotted border-slate-300 text-left">
                          Time:{" "}
                          {printerConfig.timeFormat === "24h"
                            ? "14:45"
                            : "02:45 PM"}
                        </p>
                      )}
                  </div>
                </div>

                {/* Test Print Action */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleLaunchTestPrint}
                    className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Test Print on {printerConfig.printerName}</span>
                  </button>
                </div>
              </div>

              {/* Hardware Quick Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Hardware &amp; Configuration Summary</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">
                      Printer Device:
                    </span>
                    <span className="font-bold text-slate-900 font-mono truncate block">
                      {printerConfig.printerName}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Paper Roll:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {printerConfig.paperSize.toUpperCase()}{" "}
                      {printerConfig.paperSize === "58mm"
                        ? "(48mm printable)"
                        : ""}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Print Output:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      Current Page (1 Slip)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-slate-500 block">Auto-Cut Feed:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {printerConfig.autoCutFeedLines} Lines
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER PROFILE SETTINGS */}
      {activeSettingsTab === "user" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* User Identity Card */}
          <div className="p-5 rounded-lg bg-slate-900 text-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden shrink-0 border-2 border-slate-700">
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt={userName.trim() || currentUser.name || "User"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (userName.trim() ||
                      currentUser.name ||
                      currentUser.username ||
                      "O")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {userName.trim() || currentUser.name || "Obaid"}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-semibold border border-emerald-800">
                      Active User
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Username:{" "}
                    <span className="text-slate-200">
                      @{userUsername.trim() || currentUser.username || "obaid"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Store Operator / Owner
                </span>
              </div>
            </div>

            {/* Live Navbar Display Preview */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Navbar Display Preview:</span>
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-900 text-xs font-semibold shadow-xs">
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt={userName.trim() || currentUser.name || "User"}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    (userName.trim() ||
                      currentUser.name ||
                      "O")[0].toUpperCase()
                  )}
                </div>
                <span className="font-semibold text-slate-900 text-xs">
                  {userName.trim() || "Obaid"}
                </span>
              </div>
            </div>
          </div>

          {/* User Account Update Form */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>User Profile Information</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your customer/operator Name, Username, and optional
                Profile Photo. The Name and Photo entered below are shown on the
                top navigation bar.
              </p>
            </div>

            {/* Success Alert */}
            {userSuccessMessage && (
              <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{userSuccessMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {userErrorMessage && (
              <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{userErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="input-user-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-user-name"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Obaid Khan"
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-medium text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Shown in the top navigation bar instead of your technical
                  username.
                </p>
              </div>

              {/* Profile Photo Upload Option (Optional - Under Name Input) */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Profile Photo</span>
                  </span>
                  <span className="text-[10px] font-medium tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    Optional
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                  {/* Photo Avatar Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                          {(userName.trim() ||
                            currentUser.name ||
                            currentUser.username ||
                            "O")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Photo Controls and Helper */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={userPhotoInputRef}
                        onChange={handleUserPhotoUpload}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        id="user-photo-file-input"
                      />
                      <button
                        type="button"
                        id="btn-upload-user-photo"
                        onClick={() => userPhotoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>
                          {userPhoto ? "Change Photo" : "Upload Photo"}
                        </span>
                      </button>

                      {userPhoto && (
                        <button
                          type="button"
                          id="btn-remove-user-photo"
                          onClick={() => setUserPhoto("")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 text-xs font-medium cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Upload a photo (PNG, JPG, WebP). Once saved, it will
                      appear instead of the initial letter of your Name in the
                      navigation bar and in User Settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Username Field */}
              <div>
                <label
                  htmlFor="input-user-username"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    id="input-user-username"
                    required
                    value={userUsername}
                    onChange={(e) =>
                      setUserUsername(
                        e.target.value.toLowerCase().replace(/\s+/g, ""),
                      )
                    }
                    placeholder="e.g. obaid"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-mono text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used alongside your encrypted password to sign into the system
                  (min. 3 characters).
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  id="btn-submit-update-user"
                  disabled={isUpdatingUser}
                  className="px-5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isUpdatingUser
                      ? "Saving Profile..."
                      : "Save Profile & Photo"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & CHANGE PASSWORD */}
      {activeSettingsTab === "security" && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Security Info Card */}
          <div className="p-4 rounded-lg bg-slate-900 text-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  Encrypted Credential Protection
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-[10px] font-bold">
                scrypt 64-byte KDF
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your password is encrypted and validated server-side using a
              cryptographic salt and constant-time comparison. Plaintext
              passwords are never stored or logged.
            </p>
            <div className="pt-1 flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span>
                Account:{" "}
                <strong className="text-white">
                  {currentUser.name || "Obaid"}
                </strong>{" "}
                (@{currentUser.username})
              </span>
              <span>•</span>
              <span>
                Backend Auth:{" "}
                <strong className="text-emerald-400">Active</strong>
              </span>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-700" />
                <span>Change Account Password</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your login password for user{" "}
                <strong>
                  {currentUser.name || "Obaid"} (@{currentUser.username})
                </strong>
                . You will use the new password on your next login.
              </p>
            </div>

            {/* Success Alert */}
            {passSuccessMessage && (
              <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passSuccessMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {passErrorMessage && (
              <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label
                  htmlFor="input-current-pass"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    id="input-current-pass"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current active password"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showCurrentPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label
                  htmlFor="input-new-pass"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    id="input-new-pass"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter a secure new password (min. 6 chars)"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showNewPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Length:</span>
                    <span
                      className={`font-semibold font-mono ${
                        newPassword.length >= 6
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {newPassword.length} characters{" "}
                      {newPassword.length >= 6 ? "(OK)" : "(Too short)"}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label
                  htmlFor="input-confirm-pass"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    id="input-confirm-pass"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your new password"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showConfirmPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    {confirmPassword === newPassword ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Passwords do not
                        match
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  id="btn-submit-change-password"
                  disabled={isChangingPass}
                  className="px-5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isChangingPass
                      ? "Updating & Encrypting..."
                      : "Update Password"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* TWO-FACTOR AUTHENTICATION (2FA) SECTION */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Two-Factor Authentication (2FA)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure two-factor verification to secure account access and
                  critical operations. Both email and mobile number are
                  required.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${
                  currentUser.twoFactorEmail && currentUser.twoFactorMobile
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentUser.twoFactorEmail && currentUser.twoFactorMobile
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                ></span>
                {currentUser.twoFactorEmail && currentUser.twoFactorMobile
                  ? "2FA Configured"
                  : "Setup Required"}
              </span>
            </div>

            {/* Success Alert */}
            {twoFactorSuccessMessage && (
              <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{twoFactorSuccessMessage}</span>
              </div>
            )}

            {/* Error Alert */}
            {twoFactorErrorMessage && (
              <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{twoFactorErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveTwoFactor} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Email Field */}
                <div>
                  <label
                    htmlFor="input-2fa-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    1. 2FA Email Address{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="input-2fa-email"
                      required
                      value={twoFactorEmail}
                      onChange={(e) => setTwoFactorEmail(e.target.value)}
                      placeholder="e.g. yourname@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Required for one-time verification security codes.
                  </p>
                </div>

                {/* 2. Mobile Number Field */}
                <div>
                  <label
                    htmlFor="input-2fa-mobile"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    2. 2FA Mobile Number{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="input-2fa-mobile"
                      required
                      value={twoFactorMobile}
                      onChange={(e) => setTwoFactorMobile(e.target.value)}
                      placeholder="e.g. +92 300 1234567"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 transition-colors placeholder:text-slate-400"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Required for SMS/mobile push authorization.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  id="btn-save-2fa"
                  disabled={isSaving2FA}
                  className="px-5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isSaving2FA
                      ? "Saving 2FA Settings..."
                      : "Save 2FA Settings"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT (Admin Only) */}
      {!isWorker && activeSettingsTab === "users" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  User &amp; Worker Management
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-7xl">
                Create worker accounts with restricted system permissions.
                Workers can sell products, use EasyPaisa &amp; JazzCash, and
                manage Load services without accessing sensitive financial
                dashboards, inventory costs, or vendor ledgers.
              </p>
            </div>

            <button
              type="button"
              id="btn-create-worker"
              onClick={handleOpenCreateWorker}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Create Worker User</span>
            </button>
          </div>

          {/* Feedback Alert */}
          {userMgmtFeedback && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                userMgmtFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              {userMgmtFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{userMgmtFeedback.message}</span>
            </div>
          )}

          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Accounts
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {managedUsers.length || 1} User
                {managedUsers.length !== 1 ? "s" : ""}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                1 Admin •{" "}
                {managedUsers.filter((u) => u.role === "worker").length} Worker
                {managedUsers.filter((u) => u.role === "worker").length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Worker Permissions
              </span>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                3 Standard Modules
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sales • EP &amp; JC Services • Load Services
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Worker 2FA Protection
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Self-Recovery</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Workers can reset forgotten passwords via 2FA
              </p>
            </div>
          </div>

          {/* Users List Table / Cards */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                System Accounts ({managedUsers.length})
              </h3>
              <button
                type="button"
                onClick={loadManagedUsers}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingUsers ? (
              <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
                <span>Loading users...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {managedUsers.map((u) => {
                  const isAdmin = u.role === "admin";
                  const has2FA = Boolean(u.twoFactorEmail && u.twoFactorMobile);

                  return (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      {/* User Info */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs overflow-hidden border-2 ${
                            isAdmin
                              ? "bg-slate-900 text-white border-slate-700"
                              : "bg-indigo-600 text-white border-indigo-200"
                          }`}
                        >
                          {u.photo ? (
                            <img
                              src={u.photo}
                              alt={u.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            (u.name || u.username || "U")[0].toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {u.name}
                            </h4>
                            {isAdmin ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-900 text-white uppercase tracking-wider">
                                Administrator (Owner)
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                                Worker Account
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                            <span>
                              Username:{" "}
                              <strong className="text-slate-700">
                                @{u.username}
                              </strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ShieldCheck
                                className={`w-3.5 h-3.5 ${has2FA ? "text-emerald-600" : "text-slate-400"}`}
                              />
                              {has2FA ? (
                                <span className="text-emerald-700 font-sans font-medium">
                                  2FA Configured (
                                  {u.twoFactorMobile || u.twoFactorEmail})
                                </span>
                              ) : (
                                <span className="text-amber-600 font-sans">
                                  2FA Not Configured
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Display */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                            Permissions
                          </span>
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Full System Access (All Modules)
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <ShoppingCart className="w-3 h-3 text-emerald-600" />
                                1. Sale a product
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Smartphone className="w-3 h-3 text-emerald-600" />
                                2. EP &amp; JC Service
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Radio className="w-3 h-3 text-emerald-600" />
                                3. Load Services
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 sm:pt-0 sm:border-l sm:border-slate-200 sm:pl-3">
                          {isAdmin ? (
                            <span className="text-xs text-slate-400 italic px-2 py-1">
                              Primary Account
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditWorker(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                                title="Edit worker details, set new password, or update 2FA"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteWorker(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                                title="Delete worker account"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {managedUsers.filter((u) => u.role === "worker").length ===
                  0 && (
                  <div className="p-8 text-center bg-slate-50">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">
                      No Worker Accounts Created
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      You can add an assistant or worker who will have
                      restricted access only to record sales, manage EP &amp; JC
                      services, and Load services without access to your store
                      inventory costs or vendor Khatas.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreateWorker}
                      className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Create Worker User Now</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT WORKER MODAL */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingWorkerId
                      ? "Edit Worker Account"
                      : "Create New Worker User"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingWorkerId
                      ? "Update details, reset password, or update 2FA"
                      : "Set password, avatar image, and 2FA credentials"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkerModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitWorker} className="p-6 space-y-4">
              {/* Error Notification */}
              {workerModalError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{workerModalError}</span>
                </div>
              )}

              {/* Success Notification */}
              {workerModalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{workerModalSuccess}</span>
                </div>
              )}

              {/* 1. Worker Full Name & Profile Photo */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xl overflow-hidden border-2 border-slate-300">
                    {workerPhoto ? (
                      <img
                        src={workerPhoto}
                        alt="Worker Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (workerName.trim() || "W")[0].toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => workerPhotoInputRef.current?.click()}
                    title="Upload Worker Photo"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 cursor-pointer shadow-xs border border-white"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input
                    ref={workerPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleWorkerPhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Worker Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      placeholder="e.g. Ali Raza"
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-500 text-slate-900"
                    />
                  </div>
                  {workerPhoto && (
                    <button
                      type="button"
                      onClick={() => setWorkerPhoto("")}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove uploaded photo
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Worker Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Worker Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={workerUsername}
                    onChange={(e) =>
                      setWorkerUsername(
                        e.target.value.toLowerCase().replace(/\s+/g, ""),
                      )
                    }
                    placeholder="e.g. ali"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:border-slate-400 font-mono text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Used by the worker to log into the application (min. 3
                  characters).
                </p>
              </div>

              {/* 3. Password Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingWorkerId
                      ? "New Password (Optional)"
                      : "Worker Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showWorkerPassword ? "text" : "password"}
                      required={!editingWorkerId}
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      placeholder={
                        editingWorkerId
                          ? "Leave blank to keep current"
                          : "Min 6 characters"
                      }
                      className="w-full pl-3 pr-8 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showWorkerPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingWorkerId
                      ? "Confirm New Password"
                      : "Confirm Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showWorkerConfirmPassword ? "text" : "password"}
                      required={!editingWorkerId || Boolean(workerPassword)}
                      value={workerConfirmPassword}
                      onChange={(e) => setWorkerConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-3 pr-8 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowWorkerConfirmPassword(!showWorkerConfirmPassword)
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showWorkerConfirmPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Two-Factor Authentication (2FA) Section - "Just like in Settings" */}
              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Two-Factor Authentication (2FA Option)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Configure the worker's 2FA details so if he forgets his
                  password, he can reset it on the login page by verifying these
                  details.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      2FA Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={worker2FAEmail}
                        onChange={(e) => setWorker2FAEmail(e.target.value)}
                        placeholder="worker@example.com"
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-500 text-slate-900"
                      />
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      2FA Mobile Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={worker2FAMobile}
                        onChange={(e) => setWorker2FAMobile(e.target.value)}
                        placeholder="03XXXXXXXXX"
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-none focus:border-slate-500 text-slate-900"
                      />
                      <Smartphone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Assigned Worker Permissions Notice */}
              <div className="p-3 bg-slate-900 text-white rounded-lg space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
                  Configured Worker Permissions (Fixed Scope)
                </span>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong>1. Sale a product:</strong> Point of Sale &amp;
                      invoices
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong>2. Use EP &amp; JC Service:</strong> EasyPaisa
                      &amp; JazzCash daily registers
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong>3. Load Services:</strong> Mobile balance top-ups
                      &amp; packages
                    </span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                  Worker is automatically restricted from: Executive Dashboard,
                  Product Cost Prices, Inventory Management, and Vendor Khata
                  Ledgers.
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200">
                {editingWorkerId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = managedUsers.find(
                        (u) => u.id === editingWorkerId,
                      );
                      if (target) {
                        handleOpenDeleteWorker(target);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWorkerModalOpen(false)}
                    className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWorker}
                    className="px-5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingWorker ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Saving Account...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {editingWorkerId
                            ? "Update Worker Account"
                            : "Create Worker Account"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL: DELETE WORKER USER */}
      {deleteWorkerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Worker Account
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      !isDeletingWorker && setDeleteWorkerTarget(null)
                    }
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">
                  Permanent &amp; Irreversible Action
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the worker account for{" "}
              <strong className="text-slate-900 font-bold">
                {deleteWorkerTarget.name}
              </strong>{" "}
              (
              <span className="font-mono text-indigo-600 font-semibold">
                @{deleteWorkerTarget.username}
              </span>
              )?
            </p>

            <div className="mt-3.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1.5">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Security &amp; Data Safeguards:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                <li>
                  Worker will immediately lose access and active login sessions
                  will be invalidated.
                </li>
                <li>
                  All prior sale receipts and register entries recorded by this
                  worker remain safely intact in the database.
                </li>
              </ul>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingWorker}
                onClick={() => setDeleteWorkerTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel / Keep Account
              </button>
              <button
                type="button"
                id="btn-confirm-delete-worker"
                disabled={isDeletingWorker}
                onClick={handleConfirmDeleteWorker}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingWorker ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting Worker...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL: RESET BRAND DEFAULTS */}
      {isResetDefaultsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Reset Store Brand Defaults
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsResetDefaultsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restore original demo business info
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to reset all brand details, invoice slip
              header/footer text, and logo settings back to the default system
              values?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetDefaultsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>Yes, Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TEST PRINT RECEIPT MODAL */}
      {testReceiptSale && (
        <SaleReceiptModal
          sale={testReceiptSale}
          autoPrint={true}
          onClose={() => setTestReceiptSale(null)}
        />
      )}
    </div>
  );
};
