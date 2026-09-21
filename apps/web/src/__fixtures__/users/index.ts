/**
 * User Fixtures
 *
 * Realistic user fixtures for testing authentication flows
 * and authorization checks.
 *
 * Philosophy: NO mocks - use data that mirrors real user structure.
 */

// ============================================================================
// Types
// ============================================================================

export type UserRole = "researcher" | "admin" | "observer" | "guest";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  last_login_at?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  keyboard_shortcuts_enabled: boolean;
  notifications_enabled: boolean;
  default_model?: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  issued_at: string;
}

export interface CloudflareAccessPayload {
  email: string;
  sub: string;
  aud: string[];
  iss: string;
  iat: number;
  exp: number;
  nonce?: string;
}

// ============================================================================
// User Fixtures
// ============================================================================

/**
 * Standard authenticated researcher user.
 */
export const authenticatedUserFixture: User = {
  id: "user-researcher-001",
  email: "researcher@example.com",
  name: "Test Researcher",
  role: "researcher",
  created_at: "2025-01-01T00:00:00Z",
  last_login_at: "2025-12-30T12:00:00Z",
  preferences: {
    theme: "dark",
    keyboard_shortcuts_enabled: true,
    notifications_enabled: true,
    default_model: "opus-4.5",
  },
};

/**
 * Admin user with elevated permissions.
 */
export const adminUserFixture: User = {
  id: "user-admin-001",
  email: "admin@brennerbot.org",
  name: "Admin User",
  role: "admin",
  avatar_url: "https://example.com/avatars/admin.png",
  created_at: "2024-06-01T00:00:00Z",
  last_login_at: "2025-12-30T09:00:00Z",
  preferences: {
    theme: "system",
    keyboard_shortcuts_enabled: true,
    notifications_enabled: true,
  },
};

/**
 * Observer user (read-only access).
 */
export const observerUserFixture: User = {
  id: "user-observer-001",
  email: "observer@example.com",
  name: "Observer User",
  role: "observer",
  created_at: "2025-06-01T00:00:00Z",
  preferences: {
    theme: "light",
    keyboard_shortcuts_enabled: false,
    notifications_enabled: false,
  },
};

/**
 * Guest user (minimal permissions).
 */
export const guestUserFixture: User = {
  id: "user-guest-001",
  email: "guest@example.com",
  name: "Guest User",
  role: "guest",
  created_at: "2025-12-30T00:00:00Z",
};

/**
 * User with no preferences set.
 */
export const minimalUserFixture: User = {
  id: "user-minimal-001",
  email: "minimal@example.com",
  name: "Minimal User",
  role: "researcher",
  created_at: "2025-12-30T00:00:00Z",
};

// ============================================================================
// Auth Session Fixtures
// ============================================================================

/**
 * Valid auth session for testing authenticated requests.
 */
export const validAuthSessionFixture: AuthSession = {
  user: authenticatedUserFixture,
  access_token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXJlc2VhcmNoZXItMDAxIiwiZW1haWwiOiJyZXNlYXJjaGVyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzM1NTcwMDAwLCJleHAiOjE3MzU1NzM2MDB9.test-signature",
  refresh_token: "refresh-token-abc123",
  expires_at: "2025-12-30T13:00:00Z",
  issued_at: "2025-12-30T12:00:00Z",
};

/**
 * Expired auth session for testing token refresh.
 */
export const expiredAuthSessionFixture: AuthSession = {
  user: authenticatedUserFixture,
  access_token: "expired-token",
  expires_at: "2025-12-29T12:00:00Z",
  issued_at: "2025-12-29T11:00:00Z",
};

/**
 * Admin auth session.
 */
export const adminAuthSessionFixture: AuthSession = {
  user: adminUserFixture,
  access_token: "admin-access-token-xyz789",
  expires_at: "2025-12-30T18:00:00Z",
  issued_at: "2025-12-30T09:00:00Z",
};

// ============================================================================
// Cloudflare Access Fixtures
// ============================================================================

/**
 * Valid Cloudflare Access JWT payload.
 */
export const validCloudflarePayloadFixture: CloudflareAccessPayload = {
  email: "researcher@example.com",
  sub: "cf-user-abc123",
  aud: ["aud-brennerbot-lab"],
  iss: "https://brennerbot.cloudflareaccess.com",
  iat: 1735570000,
  exp: 1735573600,
  nonce: "nonce-123",
};

/**
 * Expired Cloudflare Access JWT payload.
 */
export const expiredCloudflarePayloadFixture: CloudflareAccessPayload = {
  email: "expired@example.com",
  sub: "cf-user-expired",
  aud: ["aud-brennerbot-lab"],
  iss: "https://brennerbot.cloudflareaccess.com",
  iat: 1735480000,
  exp: 1735483600, // Expired
};

/**
 * Invalid audience Cloudflare payload.
 */
export const invalidAudienceCloudflarePayloadFixture: CloudflareAccessPayload = {
  email: "wrong@example.com",
  sub: "cf-user-wrong",
  aud: ["wrong-audience"],
  iss: "https://brennerbot.cloudflareaccess.com",
  iat: 1735570000,
  exp: 1735573600,
};

// ============================================================================
// Permission Matrix
// ============================================================================

/**
 * Permission matrix for testing authorization.
 */
export const permissionMatrixFixture = {
  researcher: {
    canReadCorpus: true,
    canCreateSession: true,
    canEditOwnSession: true,
    canEditAnySession: false,
    canDeleteSession: false,
    canManageUsers: false,
    canAccessAdmin: false,
  },
  admin: {
    canReadCorpus: true,
    canCreateSession: true,
    canEditOwnSession: true,
    canEditAnySession: true,
    canDeleteSession: true,
    canManageUsers: true,
    canAccessAdmin: true,
  },
  observer: {
    canReadCorpus: true,
    canCreateSession: false,
    canEditOwnSession: false,
    canEditAnySession: false,
    canDeleteSession: false,
    canManageUsers: false,
    canAccessAdmin: false,
  },
  guest: {
    canReadCorpus: true,
    canCreateSession: false,
    canEditOwnSession: false,
    canEditAnySession: false,
    canDeleteSession: false,
    canManageUsers: false,
    canAccessAdmin: false,
  },
} as const;
