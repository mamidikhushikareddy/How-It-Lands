/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { api } from '../../lib/api';
import { CONFIG } from '../../lib/config';
import { User, UserProfile } from '../../types';

export interface AuthResponse {
  success?: boolean;
  user: User;
  profile: UserProfile;
  two_factor_required?: boolean;
  pre_auth_token?: string;
  error?: string;
}

export const authApi = {
  async login(payload: { email: string; passwordInput: string; rememberMe?: boolean }): Promise<AuthResponse> {
    return api.post<AuthResponse>(CONFIG.endpoints.login, {
      email: payload.email,
      password: payload.passwordInput,
      rememberMe: payload.rememberMe
    });
  },

  async signup(payload: { name: string; email: string; passwordInput: string }): Promise<AuthResponse & { verification_code?: string }> {
    return api.post<any>(CONFIG.endpoints.signup, {
      name: payload.name,
      email: payload.email,
      password: payload.passwordInput,
    });
  },

  async loginVerify2fa(payload: { preAuthToken: string; code: string }): Promise<AuthResponse> {
    return api.post<AuthResponse>(CONFIG.endpoints.mfaLoginVerify, {
      pre_auth_token: payload.preAuthToken,
      code: payload.code,
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return api.post<{ success: boolean }>(CONFIG.endpoints.logout);
  },

  async setupMfa(): Promise<{ secret: string; qrCodeDataUrl: string; uri: string; error?: string }> {
    return api.post<any>(CONFIG.endpoints.mfaSetup);
  },

  async verifyMfa(secret: string, code: string): Promise<{ success: boolean; error?: string }> {
    return api.post<any>(CONFIG.endpoints.mfaVerify, { secret, code });
  },

  async disableMfa(): Promise<{ success: boolean; error?: string }> {
    return api.post<any>(CONFIG.endpoints.mfaDisable);
  },

  async verifyEmail(payload: { email: string; code: string }): Promise<{ success: boolean; message: string; error?: string }> {
    return api.post<any>('/api/auth/verify-email', payload);
  },

  async resendVerification(payload: { email: string }): Promise<{ success: boolean; message: string; code?: string; error?: string }> {
    return api.post<any>('/api/auth/resend-verification', payload);
  },

  async forgotPassword(payload: { email: string }): Promise<{ success: boolean; message: string; token?: string; error?: string }> {
    return api.post<any>('/api/auth/forgot-password', payload);
  },

  async resetPassword(payload: { token: string; newPasswordInput: string }): Promise<{ success: boolean; message: string; error?: string }> {
    return api.post<any>('/api/auth/reset-password', {
      token: payload.token,
      newPassword: payload.newPasswordInput
    });
  },

  async changePassword(payload: { currentPasswordInput: string; newPasswordInput: string }): Promise<{ success: boolean; message: string; error?: string }> {
    return api.post<any>('/api/auth/change-password', {
      currentPassword: payload.currentPasswordInput,
      newPassword: payload.newPasswordInput
    });
  },

  async logoutAllDevices(): Promise<{ success: boolean; message: string; error?: string }> {
    return api.post<any>('/api/auth/logout-all-devices');
  },

  async oauthCallback(payload: { credential: string }): Promise<AuthResponse> {
    return api.post<AuthResponse>('/api/auth/oauth-callback', payload);
  },

  async oauthLink(payload: { credential: string }): Promise<{ success: boolean; user: User; error?: string }> {
    return api.post<any>('/api/auth/oauth-link', payload);
  },

  async oauthUnlink(): Promise<{ success: boolean; user: User; error?: string }> {
    return api.post<any>('/api/auth/oauth-unlink');
  },

  // Admin endpoints
  async getAdminUsers(): Promise<{ success: boolean; users: any[]; error?: string }> {
    return api.get<any>('/api/admin/users');
  },

  async updateAdminUser(id: string, payload: { role?: string; plan?: string; status?: string; resetPassword?: boolean }): Promise<{ success: boolean; user?: any; temp_password?: string; error?: string }> {
    return api.put<any>(`/api/admin/users/${id}`, payload);
  },

  async deleteAdminUser(id: string): Promise<{ success: boolean; message: string; error?: string }> {
    return api.delete<any>(`/api/admin/users/${id}`);
  },

  async getUserAuditLogs(id: string): Promise<{ success: boolean; logs: any[]; error?: string }> {
    return api.get<any>(`/api/admin/users/${id}/audit-logs`);
  },

  async getSystemAuditLogs(): Promise<{ success: boolean; logs: any[]; error?: string }> {
    return api.get<any>('/api/admin/audit-logs');
  }
};
