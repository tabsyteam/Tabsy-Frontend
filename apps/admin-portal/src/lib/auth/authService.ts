import { TabsyAPI } from '@tabsy/api-client';
import { User, UserRole } from '@tabsy/shared-types';

interface AuthSession {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  lastActivity: Date;
  loginTime: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface SecuritySettings {
  maxSessionDuration: number; // in milliseconds
  inactivityTimeout: number; // in milliseconds
  rememberMeDuration: number; // in milliseconds
  requireMFA: boolean;
  allowMultipleSessions: boolean;
}

class AdminAuthService {
  private static instance: AdminAuthService;
  private session: AuthSession | null = null;
  private apiClient: TabsyAPI | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private readonly storageKey = 'tabsy_admin_session';
  private readonly rememberMeKey = 'tabsy_admin_remember';

  private securitySettings: SecuritySettings = {
    maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    rememberMeDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    requireMFA: false, // Can be enabled later
    allowMultipleSessions: false
  };

  private constructor() {
    this.initializeFromStorage();
    this.setupActivityMonitoring();
  }

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  // Initialize session from storage
  private initializeFromStorage() {
    try {
      const storedSession = localStorage.getItem(this.storageKey);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        const expiresAt = new Date(session.expiresAt);

        // Check if session is still valid
        if (expiresAt > new Date()) {
          this.session = {
            ...session,
            expiresAt,
            lastActivity: new Date(session.lastActivity),
            loginTime: new Date(session.loginTime)
          };

          // Initialize API client with token
          this.initializeApiClient(session.token);

          // Setup auto-refresh
          this.setupTokenRefresh();
        } else {
          // Session expired, clear storage
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.clearSession();
    }
  }

  // Setup activity monitoring for inactivity timeout
  private setupActivityMonitoring() {
    if (typeof window === 'undefined') return;

    const resetActivityTimer = () => {
      if (this.session) {
        this.session.lastActivity = new Date();
        this.saveSession();

        // Clear existing timer
        if (this.activityTimer) {
          clearTimeout(this.activityTimer);
        }

        // Set new inactivity timer
        this.activityTimer = setTimeout(() => {
          this.handleInactivityTimeout();
        }, this.securitySettings.inactivityTimeout);
      }
    };

    // Monitor user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, resetActivityTimer, { passive: true });
    });

    // Start the timer if we have a session
    if (this.session) {
      resetActivityTimer();
    }
  }

  // Handle inactivity timeout
  private handleInactivityTimeout() {
    console.warn('Session expired due to inactivity');
    this.logout('Session expired due to inactivity');
  }

  // Login with enhanced security
  async login(email: string, password: string, rememberMe: boolean = false): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> {
    try {
      // Initialize API client if not already
      if (!this.apiClient) {
        this.apiClient = new TabsyAPI({
          baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1'
        });
      }

      // Attempt login
      const response = await this.apiClient.auth.login({ email, password });

      if (response.user && response.token) {
        const user = response.user;

        // Verify admin role
        if (user.role !== UserRole.ADMIN) {
          return {
            success: false,
            error: 'Access denied. Administrator privileges required.'
          };
        }

        // Create session
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + (rememberMe
            ? this.securitySettings.rememberMeDuration
            : this.securitySettings.maxSessionDuration)
        );

        this.session = {
          user,
          token: response.token,
          refreshToken: response.refreshToken,
          expiresAt,
          lastActivity: now,
          loginTime: now,
          ipAddress: undefined, // Removed for privacy
          userAgent: navigator.userAgent
        };

        // Save session
        this.saveSession();

        // Save remember me preference
        if (rememberMe) {
          localStorage.setItem(this.rememberMeKey, 'true');
        } else {
          localStorage.removeItem(this.rememberMeKey);
        }

        // Initialize API client with token
        this.initializeApiClient(response.token);

        // Setup token refresh
        this.setupTokenRefresh();

        // Log successful login (audit)
        this.logAuthEvent('LOGIN_SUCCESS', { email, role: user.role });

        return { success: true, user };
      }

      return {
        success: false,
        error: 'Invalid credentials'
      };
    } catch (error: any) {
      // Log failed login attempt (audit)
      this.logAuthEvent('LOGIN_FAILED', { email, error: error.message });

      return {
        success: false,
        error: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  }

  // Logout with reason tracking
  logout(reason: string = 'User initiated') {
    if (this.session) {
      // Log logout event (audit)
      this.logAuthEvent('LOGOUT', {
        reason,
        sessionDuration: new Date().getTime() - this.session.loginTime.getTime()
      });
    }

    this.clearSession();

    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Clear session and cleanup
  private clearSession() {
    this.session = null;
    localStorage.removeItem(this.storageKey);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    // Clear API client auth
    if (this.apiClient) {
      this.apiClient = null;
    }
  }

  // Save session to storage
  private saveSession() {
    if (this.session) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.session));
    }
  }

  // Initialize API client with authentication
  private initializeApiClient(token: string) {
    this.apiClient = new TabsyAPI({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1'
    });
    this.apiClient.setAuthToken(token);
  }

  // Setup automatic token refresh
  private setupTokenRefresh() {
    if (!this.session || !this.session.refreshToken) return;

    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Calculate when to refresh (5 minutes before expiry)
    const refreshTime = this.session.expiresAt.getTime() - new Date().getTime() - 5 * 60 * 1000;

    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, refreshTime);
    }
  }

  // Refresh authentication token
  private async refreshToken() {
    if (!this.session || !this.session.refreshToken || !this.apiClient) return;

    try {
      const response = await this.apiClient.auth.refreshToken(this.session.refreshToken);

      if (response.token) {
        this.session.token = response.token;
        this.session.expiresAt = new Date(
          new Date().getTime() + this.securitySettings.maxSessionDuration
        );

        // Update API client with new token
        this.initializeApiClient(response.token);

        // Save updated session
        this.saveSession();

        // Setup next refresh
        this.setupTokenRefresh();

        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout('Session expired');
    }
  }


  // Log authentication events for audit (simplified)
  private logAuthEvent(event: string, data?: any) {
    const logEntry = {
      event,
      timestamp: new Date().toISOString(),
      userId: this.session?.user?.id,
      email: this.session?.user?.email,
      ...data
    };

    // In production, send to proper logging service (CloudWatch, DataDog, etc)
    console.log('[AUTH]', logEntry);
  }

  // Public getters
  get isAuthenticated(): boolean {
    return !!this.session && this.session.expiresAt > new Date();
  }

  get currentUser(): User | null {
    return this.session?.user || null;
  }

  get token(): string | null {
    return this.session?.token || null;
  }

  get sessionInfo() {
    if (!this.session) return null;

    const now = new Date();
    const sessionDuration = now.getTime() - this.session.loginTime.getTime();
    const timeRemaining = this.session.expiresAt.getTime() - now.getTime();
    const lastActivityAgo = now.getTime() - this.session.lastActivity.getTime();

    return {
      user: this.session.user,
      loginTime: this.session.loginTime,
      expiresAt: this.session.expiresAt,
      lastActivity: this.session.lastActivity,
      sessionDuration: Math.floor(sessionDuration / 1000), // in seconds
      timeRemaining: Math.floor(timeRemaining / 1000), // in seconds
      lastActivityAgo: Math.floor(lastActivityAgo / 1000), // in seconds
      ipAddress: this.session.ipAddress,
      userAgent: this.session.userAgent
    };
  }

  // Update security settings (admin only)
  updateSecuritySettings(settings: Partial<SecuritySettings>) {
    this.securitySettings = { ...this.securitySettings, ...settings };
  }
}

export const authService = AdminAuthService.getInstance();
export default authService;