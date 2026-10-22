import React, { useState, useEffect } from "react";
import {
  Boxes,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Mail,
  Smartphone,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AuthUser, StoreSettings } from "../types";
import { authService } from "../services/auth";
import { storage } from "../services/storage";

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
  storeSettings?: StoreSettings;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  storeSettings: initialSettings,
}) => {
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(
    () => initialSettings || storage.getStoreSettings(),
  );

  useEffect(() => {
    if (initialSettings) {
      setStoreSettings(initialSettings);
    }
  }, [initialSettings]);

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setStoreSettings(storage.getStoreSettings());
    });
    return () => unsub();
  }, []);

  // View state
  const [viewMode, setViewMode] = useState<
    "login" | "forgot_2fa" | "reset_password"
  >("login");

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password / 2FA recovery state
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [, setRecoveryUserFullName] = useState("");
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorMobile, setTwoFactorMobile] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [, setHas2FA] = useState(true);
  const [recoveryToken, setRecoveryToken] = useState<string>("");
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Reset Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Load 2FA hints when switching to Forgot Password
  const handleOpenForgotPassword = async () => {
    setRecoveryError(null);
    setTwoFactorEmail("");
    setTwoFactorMobile("");
    setNewPassword("");
    setConfirmPassword("");
    setRecoveryToken("");
    const initialUser = username.trim() || "";
    setRecoveryUsername(initialUser);
    setViewMode("forgot_2fa");

    try {
      const hints = await authService.get2FAHints(initialUser || undefined);
      setHas2FA(hints.has2FA);
      setMaskedEmail(hints.maskedEmail);
      setMaskedMobile(hints.maskedMobile);
      if (hints.name) setRecoveryUserFullName(hints.name);
      if (hints.username && !initialUser) setRecoveryUsername(hints.username);
    } catch (e) {
      console.warn("Could not load 2FA hints:", e);
    }
  };

  const handleLookupUsernameHints = async (uname: string) => {
    try {
      const clean = uname.trim();
      const hints = await authService.get2FAHints(clean || undefined);
      setHas2FA(hints.has2FA);
      setMaskedEmail(hints.maskedEmail);
      setMaskedMobile(hints.maskedMobile);
      if (hints.name) setRecoveryUserFullName(hints.name);
    } catch (e) {
      console.warn("Could not load 2FA hints:", e);
    }
  };

  const handleBackToLogin = () => {
    setViewMode("login");
    setRecoveryError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await authService.login(
        username.trim(),
        password,
        stayLoggedIn,
      );
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(
          result.error || "Invalid credentials. Please try again.",
        );
      }
    } catch {
      setErrorMessage(
        "A connection error occurred. Please verify the server is running.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verify 2FA data handler
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrimmed = twoFactorEmail.trim();
    const mobileTrimmed = twoFactorMobile.trim();

    if (!emailTrimmed || !mobileTrimmed) {
      setRecoveryError("Provided Data is invalid.");
      return;
    }

    setIsRecoveryLoading(true);
    setRecoveryError(null);

    try {
      const result = await authService.verify2FARecovery(
        emailTrimmed,
        mobileTrimmed,
        recoveryUsername.trim() || undefined,
      );
      if (result.success) {
        setRecoveryToken(result.recoveryToken || "");
        if (result.username) setRecoveryUsername(result.username);
        setRecoveryError(null);
        setViewMode("reset_password");
      } else {
        setRecoveryError(result.error || "Provided Data is invalid.");
      }
    } catch {
      setRecoveryError("Provided Data is invalid.");
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  // Update password handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNew = newPassword.trim();

    if (!trimmedNew) {
      setRecoveryError("Please enter a new password.");
      return;
    }

    if (trimmedNew.length < 6) {
      setRecoveryError("Password must be at least 6 characters long.");
      return;
    }

    if (trimmedNew !== confirmPassword) {
      setRecoveryError("New password and confirm password do not match.");
      return;
    }

    setIsRecoveryLoading(true);
    setRecoveryError(null);

    try {
      const result = await authService.resetPassword({
        recoveryToken,
        username: recoveryUsername.trim() || undefined,
        email: twoFactorEmail.trim(),
        mobileNumber: twoFactorMobile.trim(),
        newPassword: trimmedNew,
      });

      if (result.success) {
        setSuccessMessage(
          result.message ||
            "Password successfully updated. You can now sign in with your new password.",
        );
        setPassword("");
        setViewMode("login");
      } else {
        setRecoveryError(result.error || "Failed to update password.");
      }
    } catch {
      setRecoveryError("An error occurred while updating the password.");
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 flex flex-col justify-center items-center px-3.5 py-6 sm:px-6 sm:py-10 selection:bg-slate-900 selection:text-white antialiased">
      <div className="w-full max-w-[420px] mx-auto flex flex-col justify-center">
        {/* Brand Logo & Header */}
        <div className="text-center mb-4 sm:mb-5">
          {storeSettings?.logoUrl ? (
            <div className="w-48 sm:w-60 max-w-[80vw] max-h-20 inline-flex items-center justify-center">
              <img
                src={storeSettings.logoUrl}
                alt={storeSettings.brandName || "Brand Logo"}
                className="w-full h-full max-h-20 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 text-white shadow-md mb-2.5 sm:mb-3 border border-slate-800">
              <Boxes className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
            </div>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-5 sm:p-7 md:p-8 transition-all">
          {viewMode === "login" && (
            <>
              <div className="mb-4 sm:mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Sign In
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter your credentials to access the counter
                </p>
              </div>

              {/* Success Message Alert */}
              {successMessage && (
                <div
                  id="login-success-alert"
                  className="mb-4 p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-emerald-800"
                >
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Password Updated</span>
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMessage && (
                <div
                  id="login-error-alert"
                  className="mb-4 p-3 sm:p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm text-red-700"
                >
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      Authentication Error
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Username Field */}
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs sm:text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 sm:pl-11 pr-11 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      id="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-900 transition-colors cursor-pointer touch-manipulation min-w-[44px]"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Stay Logged In for 48 Hours Checkbox */}
                <div className="flex items-center justify-between pt-0.5 pb-0.5">
                  <label
                    htmlFor="login-stay-logged-in"
                    className="inline-flex items-center gap-2.5 cursor-pointer group select-none py-1 touch-manipulation"
                  >
                    <input
                      id="login-stay-logged-in"
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={(e) => setStayLoggedIn(e.target.checked)}
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900 shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-slate-600 group-hover:text-slate-900 font-medium transition-colors">
                      Stay logged in for 48 hours
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={isLoading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 sm:py-3.5 px-5 rounded-xl bg-[#ff8a05] hover:bg-[#fe691e] active:bg-[#e05814] disabled:bg-[#fe691e] text-white font-semibold text-base transition-all shadow-sm active:scale-[0.99] touch-manipulation cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </>
                  )}
                </button>

                {/* Forgot Password Link */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    id="btn-forgot-password"
                    onClick={handleOpenForgotPassword}
                    className="text-xs sm:text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors hover:underline cursor-pointer py-1.5 touch-manipulation"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Forgot Password (2FA Verification) View */}
          {viewMode === "forgot_2fa" && (
            <div>
              <div className="mb-4 sm:mb-5">
                <button
                  type="button"
                  id="btn-back-to-login"
                  onClick={handleBackToLogin}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:text-slate-900 transition-colors font-semibold mb-2 sm:mb-3 py-1.5 px-2 -ml-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 cursor-pointer touch-manipulation"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Go Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Forgot Password
                    </h2>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  Enter the 2FA email and mobile number saved in{" "}
                  <span className="font-semibold text-slate-800">
                    Settings &rarr; Security &amp; Password
                  </span>{" "}
                  to verify your identity.
                </p>
              </div>

              {/* Error Alert */}
              {recoveryError && (
                <div
                  id="recovery-error-alert"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs sm:text-sm text-red-700 font-medium"
                >
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-3.5 sm:space-y-4">
                {/* Account Username */}
                <div>
                  <label
                    htmlFor="recovery-username"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="recovery-username"
                      type="text"
                      value={recoveryUsername}
                      onChange={(e) => {
                        const val = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "");
                        setRecoveryUsername(val);
                        handleLookupUsernameHints(val);
                      }}
                      placeholder="e.g. obaid"
                      className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white font-mono placeholder:font-sans placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                    Enter your account username to retrieve security hints.
                  </p>
                </div>

                {/* 2FA Email Field */}
                <div>
                  <label
                    htmlFor="recovery-email"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    2FA Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      value={twoFactorEmail}
                      onChange={(e) => {
                        setTwoFactorEmail(e.target.value);
                        if (recoveryError) setRecoveryError(null);
                      }}
                      placeholder="Enter registered email"
                      className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white placeholder:text-slate-400 transition-all"
                    />
                  </div>
                  {maskedEmail && (
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>Hint:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {maskedEmail}
                      </span>
                    </p>
                  )}
                </div>

                {/* 2FA Mobile Number Field */}
                <div>
                  <label
                    htmlFor="recovery-mobile"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    2FA Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="recovery-mobile"
                      type="text"
                      required
                      value={twoFactorMobile}
                      onChange={(e) => {
                        setTwoFactorMobile(e.target.value);
                        if (recoveryError) setRecoveryError(null);
                      }}
                      placeholder="03XXXXXXXXX"
                      className="w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white placeholder:text-slate-400 transition-all font-mono"
                    />
                  </div>
                  {maskedMobile && (
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>Hint:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {maskedMobile}
                      </span>
                    </p>
                  )}
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  id="btn-verify-2fa"
                  disabled={isRecoveryLoading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 sm:py-3.5 px-5 rounded-xl bg-[#fe691e] hover:bg-[#ff8a05] active:bg-[#e05814] disabled:bg-[#ff8a05] text-white font-semibold text-base transition-all shadow-sm active:scale-[0.99] touch-manipulation cursor-pointer"
                >
                  {isRecoveryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                      <span>Verifying 2FA Data...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify 2FA Information</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Set New Password View */}
          {viewMode === "reset_password" && (
            <div>
              <div className="mb-4 sm:mb-5">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Set New Password
                    </h2>
                  </div>
                </div>
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-2.5 text-xs sm:text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <span>
                    2FA credentials verified. Enter your new password below.
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {recoveryError && (
                <div
                  id="reset-pass-error-alert"
                  className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs sm:text-sm text-red-700 font-medium"
                >
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                  <span>{recoveryError}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3.5 sm:space-y-4">
                {/* New Password Field */}
                <div>
                  <label
                    htmlFor="input-new-password"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    New Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="input-new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (recoveryError) setRecoveryError(null);
                      }}
                      placeholder="Enter new password"
                      className="w-full pl-10 sm:pl-11 pr-11 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white placeholder:text-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      id="btn-toggle-new-password"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-900 transition-colors cursor-pointer touch-manipulation min-w-[44px]"
                      title={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Field */}
                <div>
                  <label
                    htmlFor="input-confirm-password"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <input
                      id="input-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (recoveryError) setRecoveryError(null);
                      }}
                      placeholder="Confirm new password"
                      className="w-full pl-10 sm:pl-11 pr-11 py-3 sm:py-3.5 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 text-slate-900 bg-white placeholder:text-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      id="btn-toggle-confirm-password"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 px-3.5 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-900 transition-colors cursor-pointer touch-manipulation min-w-[44px]"
                      title={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Reset Password Button */}
                <button
                  type="submit"
                  id="btn-update-password"
                  disabled={isRecoveryLoading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 sm:py-3.5 px-5 rounded-xl bg-[#fe691e] hover:bg-[#ff8a05] active:bg-[#e05814] disabled:bg-[#ff8a05] text-white font-semibold text-base transition-all shadow-sm active:scale-[0.99] touch-manipulation cursor-pointer"
                >
                  {isRecoveryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </>
                  )}
                </button>

                {/* Cancel link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-xs sm:text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium cursor-pointer py-1.5 touch-manipulation"
                  >
                    Cancel and Return to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Security & System Badge */}
        <div className="mt-4 sm:mt-5 text-center flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-slate-500 font-medium select-none">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
          <span>Encrypted Authentication &bull; POS System</span>
        </div>
      </div>
    </div>
  );
};
