import { AuthUser, ManagedUser } from '../types';

const TOKEN_KEY = 'stockcore_auth_token';
const USER_KEY = 'stockcore_auth_user';
const EXPIRES_AT_KEY = 'stockcore_auth_expires_at';
const STAY_LOGGED_IN_KEY = 'stockcore_auth_stay_48h';
const CACHED_USERS_KEY = 'stockcore_managed_users';

export const authService = {
  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getStoredUser(): AuthUser | null {
    if (this.isSessionExpired()) {
      this.clearSession();
      return null;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getExpiresAt(): number | null {
    const raw = localStorage.getItem(EXPIRES_AT_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  },

  isSessionExpired(): boolean {
    const expiresAt = this.getExpiresAt();
    if (!expiresAt) return false;
    return Date.now() >= expiresAt;
  },

  isStayLoggedIn(): boolean {
    return localStorage.getItem(STAY_LOGGED_IN_KEY) === 'true';
  },

  async login(username: string, password: string, stayLoggedIn: boolean = false): Promise<{ success: boolean; user?: AuthUser; expiresAt?: number; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, stayLoggedIn }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Authentication failed. Please verify your credentials.',
        };
      }

      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
      }
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      const calculatedExpiresAt = data.expiresAt || (Date.now() + (stayLoggedIn ? 48 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000));
      localStorage.setItem(EXPIRES_AT_KEY, String(calculatedExpiresAt));
      localStorage.setItem(STAY_LOGGED_IN_KEY, String(Boolean(stayLoggedIn)));

      return { success: true, user: data.user, expiresAt: calculatedExpiresAt };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server.',
      };
    }
  },

  async verifySession(): Promise<{ authenticated: boolean; user?: AuthUser; expiresAt?: number }> {
    const token = this.getStoredToken();
    if (!token) {
      return { authenticated: false };
    }

    if (this.isSessionExpired()) {
      this.clearSession();
      return { authenticated: false };
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        this.clearSession();
        return { authenticated: false };
      }

      const data = await response.json();
      if (data.authenticated && data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        if (data.expiresAt) {
          localStorage.setItem(EXPIRES_AT_KEY, String(data.expiresAt));
        }
        if (typeof data.stayLoggedIn === 'boolean') {
          localStorage.setItem(STAY_LOGGED_IN_KEY, String(data.stayLoggedIn));
        }
        return { authenticated: true, user: data.user, expiresAt: data.expiresAt };
      } else {
        this.clearSession();
        return { authenticated: false };
      }
    } catch {
      // Offline fallback: if token exists and not expired, retain user session so offline access works
      if (this.isSessionExpired()) {
        this.clearSession();
        return { authenticated: false };
      }
      const cachedUser = localStorage.getItem(USER_KEY);
      if (cachedUser && token) {
        try {
          return { authenticated: true, user: JSON.parse(cachedUser) };
        } catch {
          return { authenticated: false };
        }
      }
      return { authenticated: false };
    }
  },

  async logout(): Promise<void> {
    const token = this.getStoredToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token }),
        });
      } catch {
        // Ignore network errors during logout
      }
    }
    this.clearSession();
  },

  async updateUser(name: string, username: string, photo?: string): Promise<{ success: boolean; user?: AuthUser; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'You must be logged in to update your profile.' };
    }

    try {
      const response = await fetch('/api/auth/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, username, photo: photo !== undefined ? photo : '' }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update user profile.',
        };
      }

      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return {
        success: true,
        user: data.user,
        message: data.message || 'Profile successfully updated.',
      };
    } catch (err: any) {
      // Offline fallback: if server cannot be reached, update client-side storage
      const cached = this.getStoredUser() || { username: username.trim(), name: name.trim() };
      const fallbackUser: AuthUser = { ...cached, name: name.trim(), username: username.trim(), photo };
      localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
      return {
        success: true,
        user: fallbackUser,
        message: 'Profile updated in offline storage.',
      };
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'You must be logged in to change your password.' };
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update password.',
        };
      }

      return {
        success: true,
        message: data.message || 'Password successfully changed and encrypted.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error while updating password.',
      };
    }
  },

  async updateTwoFactor(email: string, mobileNumber: string): Promise<{ success: boolean; user?: AuthUser; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'You must be logged in to update Two-Factor Authentication.' };
    }

    const trimmedEmail = (email || '').trim();
    const trimmedMobile = (mobileNumber || '').trim();

    if (!trimmedEmail) {
      return { success: false, error: 'Email is required for Two-Factor Authentication.' };
    }
    if (!trimmedMobile) {
      return { success: false, error: 'Mobile Number is required for Two-Factor Authentication.' };
    }

    try {
      const response = await fetch('/api/auth/update-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmedEmail, mobileNumber: trimmedMobile }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update Two-Factor Authentication.',
        };
      }

      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }

      return {
        success: true,
        user: data.user,
        message: data.message || 'Two-Factor Authentication saved successfully.',
      };
    } catch (err: any) {
      // Offline fallback
      const cached = this.getStoredUser() || { username: 'obaid', name: 'Obaid' };
      const updatedUser: AuthUser = {
        ...cached,
        twoFactorEmail: trimmedEmail,
        twoFactorMobile: trimmedMobile,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      return {
        success: true,
        user: updatedUser,
        message: 'Two-Factor Authentication saved in offline storage.',
      };
    }
  },

  async get2FAHints(username?: string): Promise<{ success: boolean; has2FA: boolean; username?: string; name?: string; maskedEmail: string; maskedMobile: string }> {
    try {
      const url = username ? `/api/auth/2fa-hints?username=${encodeURIComponent(username.trim())}` : '/api/auth/2fa-hints';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          has2FA: Boolean(data.has2FA),
          username: data.username,
          name: data.name,
          maskedEmail: data.maskedEmail || '',
          maskedMobile: data.maskedMobile || '',
        };
      }
    } catch (e) {
      console.warn('Failed to fetch 2FA hints from server:', e);
    }

    // Offline fallback
    const cachedUser = this.getStoredUser();
    if (cachedUser?.twoFactorEmail && cachedUser?.twoFactorMobile) {
      const email = cachedUser.twoFactorEmail;
      const mobile = cachedUser.twoFactorMobile;
      const atIdx = email.indexOf('@');
      const localPart = email.substring(0, atIdx);
      const domain = email.substring(atIdx + 1);
      const first3 = localPart.substring(0, 3);
      const dots = '.'.repeat(Math.max(localPart.length - first3.length, 7));
      const maskedEmail = `${first3}${dots}@${domain}`;
      const maskedMobile = `.......${mobile.trim().slice(-3)}`;
      return { success: true, has2FA: true, username: cachedUser.username, name: cachedUser.name, maskedEmail, maskedMobile };
    }

    return { success: true, has2FA: false, maskedEmail: '', maskedMobile: '' };
  },

  async verify2FARecovery(email: string, mobileNumber: string, username?: string): Promise<{ success: boolean; recoveryToken?: string; username?: string; error?: string }> {
    const trimmedEmail = (email || '').trim();
    const trimmedMobile = (mobileNumber || '').trim();

    if (!trimmedEmail || !trimmedMobile) {
      return { success: false, error: 'Provided Data is invalid.' };
    }

    try {
      const res = await fetch('/api/auth/verify-2fa-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, mobileNumber: trimmedMobile, username: username?.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Provided Data is invalid.' };
      }
      return { success: true, recoveryToken: data.recoveryToken, username: data.username };
    } catch (err: any) {
      // Offline fallback check
      const cached = this.getStoredUser();
      if (cached?.twoFactorEmail && cached?.twoFactorMobile) {
        const clean = (s: string) => s.replace(/[^\d+]/g, '');
        const matchEmail = cached.twoFactorEmail.trim().toLowerCase() === trimmedEmail.toLowerCase();
        const matchMobile = clean(cached.twoFactorMobile) === clean(trimmedMobile) || cached.twoFactorMobile.trim() === trimmedMobile;
        if (matchEmail && matchMobile) {
          return { success: true, recoveryToken: 'offline-recovery-token', username: cached.username };
        }
      }
      return { success: false, error: 'Provided Data is invalid.' };
    }
  },

  async resetPassword(params: {
    recoveryToken?: string;
    username?: string;
    email?: string;
    mobileNumber?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Provided Data is invalid.' };
      }
      this.clearSession();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  },

  // ==========================================
  // User Management (Admin Only)
  // ==========================================

  async getUsers(): Promise<{ success: boolean; users?: ManagedUser[]; error?: string }> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'Unauthorized.' };
    }

    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to fetch users.' };
      }
      if (Array.isArray(data.users)) {
        localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(data.users));
      }
      return { success: true, users: data.users };
    } catch {
      // Offline fallback
      const cached = localStorage.getItem(CACHED_USERS_KEY);
      if (cached) {
        try {
          return { success: true, users: JSON.parse(cached) };
        } catch {
          // ignore
        }
      }
      return { success: false, error: 'Failed to connect to server.' };
    }
  },

  async createWorker(workerData: {
    name: string;
    username: string;
    password: string;
    photo?: string;
    twoFactorEmail?: string;
    twoFactorMobile?: string;
  }): Promise<{ success: boolean; user?: ManagedUser; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'Unauthorized.' };
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(workerData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create worker account.' };
      }
      return { success: true, user: data.user, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while creating worker.' };
    }
  },

  async updateWorker(id: string, updateData: {
    name?: string;
    username?: string;
    password?: string;
    photo?: string;
    twoFactorEmail?: string;
    twoFactorMobile?: string;
  }): Promise<{ success: boolean; user?: ManagedUser; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'Unauthorized.' };
    }

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update user.' };
      }
      return { success: true, user: data.user, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while updating user.' };
    }
  },

  async deleteWorker(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();

    try {
      const url = token ? `/api/users/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}` : `/api/users/${encodeURIComponent(id)}`;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to delete worker user.' };
      }

      // Sync local cache
      const cached = localStorage.getItem(CACHED_USERS_KEY);
      if (cached) {
        try {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(list.filter((u: any) => u.id !== id)));
          }
        } catch {
          // ignore parse errors
        }
      }

      return { success: true, message: data.message || 'Worker user deleted.' };
    } catch (err: any) {
      // Offline fallback: if server is unreachable, update cached list
      const cached = localStorage.getItem(CACHED_USERS_KEY);
      if (cached) {
        try {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) {
            const updated = list.filter((u: any) => u.id !== id);
            localStorage.setItem(CACHED_USERS_KEY, JSON.stringify(updated));
            return { success: true, message: 'Worker user deleted from local storage.' };
          }
        } catch {
          // ignore
        }
      }
      return { success: false, error: err.message || 'Network error while deleting worker.' };
    }
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(STAY_LOGGED_IN_KEY);
  },
};

