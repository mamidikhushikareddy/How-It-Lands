/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Database, Smartphone, Trash2, ShieldCheck, Eye, EyeOff, 
  AlertCircle, CheckCircle2, User as UserIcon, Sparkles, CreditCard, 
  Plus, X, RefreshCw, Zap, MessageSquare, Award, Globe, Sliders, Bell
} from 'lucide-react';
import { User, UserProfile } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authApi } from '../../auth/auth.api';

interface SecurityPanelProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  profile: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
}

interface AuditLog {
  id: string;
  user_id?: string;
  ip_address?: string;
  event: string;
  details: string;
  created_at: string;
}

export default function SecurityPanel({ user, onUpdateUser, profile, onUpdateProfile }: SecurityPanelProps) {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'subscription' | 'security'>('profile');

  // Tab 1: Profile State
  const [name, setName] = useState<string>(user.name || '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [profileSuccess, setProfileSuccess] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);

  // Settings states
  const [timezone, setTimezone] = useState<string>(profile?.timezone || 'UTC');
  const [locale, setLocale] = useState<string>(profile?.locale || 'en-US');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(profile?.email_notifications_enabled ?? true);
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(profile?.security_alerts_enabled ?? true);
  const [monthlyReports, setMonthlyReports] = useState<boolean>(profile?.monthly_reports_enabled ?? false);
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>(profile?.ui_density || 'comfortable');

  const [settingsSuccess, setSettingsSuccess] = useState<string>('');
  const [settingsError, setSettingsError] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Tab 2: Preferences State
  const [commStyle, setCommStyle] = useState<string>(profile?.communication_style || 'warm');
  const [prefTone, setPrefTone] = useState<string>(profile?.preferred_tone || 'kind but direct');
  const [defScenario, setDefScenario] = useState<string>(profile?.default_scenario || 'general');
  const [notes, setNotes] = useState<string>(profile?.notes || '');
  const [preserveVoice, setPreserveVoice] = useState<boolean>(profile?.preserve_voice ?? true);
  
  const [overdoPatterns, setOverdoPatterns] = useState<string[]>(profile?.overdo_patterns || []);
  const [favoritePhrases, setFavoritePhrases] = useState<string[]>(profile?.favorite_phrases || []);
  const [avoidedPhrases, setAvoidedPhrases] = useState<string[]>(profile?.avoided_phrases || []);

  const [newOverdo, setNewOverdo] = useState<string>('');
  const [newFav, setNewFav] = useState<string>('');
  const [newAvoid, setNewAvoid] = useState<string>('');

  const [prefSuccess, setPrefSuccess] = useState<string>('');
  const [prefError, setPrefError] = useState<string>('');
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);

  // Tab 3: Plan state
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Tab 4: Security (Original States)
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [mfaQrCode, setMfaQrCode] = useState<string>('');
  const [mfaUri, setMfaUri] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [mfaSetupMode, setMfaSetupMode] = useState<boolean>(false);
  const [mfaError, setMfaError] = useState<string>('');
  const [mfaSuccess, setMfaSuccess] = useState<string>('');
  const [showSecret, setShowSecret] = useState<boolean>(false);

  // Change password and session security states
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string>('');
  const [changePasswordError, setChangePasswordError] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [terminateSessionsLoading, setTerminateSessionsLoading] = useState<boolean>(false);
  const [terminateSessionsSuccess, setTerminateSessionsSuccess] = useState<string>('');
  const [terminateSessionsError, setTerminateSessionsError] = useState<string>('');

  const [isPgActive, setIsPgActive] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Sync state values on initial load or profile changes
  useEffect(() => {
    if (profile) {
      setCommStyle(profile.communication_style || 'warm');
      setPrefTone(profile.preferred_tone || 'kind but direct');
      setDefScenario(profile.default_scenario || 'general');
      setNotes(profile.notes || '');
      setPreserveVoice(profile.preserve_voice ?? true);
      setOverdoPatterns(profile.overdo_patterns || []);
      setFavoritePhrases(profile.favorite_phrases || []);
      setAvoidedPhrases(profile.avoided_phrases || []);

      setTimezone(profile.timezone || 'UTC');
      setLocale(profile.locale || 'en-US');
      setEmailNotifications(profile.email_notifications_enabled ?? true);
      setSecurityAlerts(profile.security_alerts_enabled ?? true);
      setMonthlyReports(profile.monthly_reports_enabled ?? false);
      setUiDensity(profile.ui_density || 'comfortable');
    }
  }, [profile]);

  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/security/metrics');
      const data = await res.json();
      setIsPgActive(data.postgresActive);
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      console.error('Failed to load security metrics:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Profile submission
  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setUpdatingProfile(true);

    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (data.error) {
        setProfileError(data.error);
        return;
      }
      setProfileSuccess('Account details successfully updated!');
      onUpdateUser(data.user);
    } catch (err) {
      setProfileError('Failed to save account details.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordSuccess('');
    setChangePasswordError('');
    
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New password inputs do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPasswordInput: currentPassword,
        newPasswordInput: newPassword
      });

      if (res.error) {
        setChangePasswordError(res.error);
        return;
      }

      setChangePasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure you want to terminate all other active login sessions? This will instantly log you out of all other devices.')) {
      return;
    }

    setTerminateSessionsLoading(true);
    setTerminateSessionsSuccess('');
    setTerminateSessionsError('');

    try {
      const res = await authApi.logoutAllDevices();
      if (res.error) {
        setTerminateSessionsError(res.error);
        return;
      }
      setTerminateSessionsSuccess('All active sessions terminated successfully.');
    } catch (err: any) {
      setTerminateSessionsError(err.message || 'Failed to terminate other sessions.');
    } finally {
      setTerminateSessionsLoading(false);
    }
  };

  // Preference submission
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSuccess('');
    setPrefError('');
    setSavingPrefs(true);

    const updatedProfile = {
      user_id: user.id,
      communication_style: commStyle,
      preferred_tone: prefTone,
      default_scenario: defScenario,
      notes,
      preserve_voice: preserveVoice,
      overdo_patterns: overdoPatterns,
      favorite_phrases: favoritePhrases,
      avoided_phrases: avoidedPhrases,
      timezone,
      locale,
      email_notifications_enabled: emailNotifications,
      security_alerts_enabled: securityAlerts,
      monthly_reports_enabled: monthlyReports,
      ui_density: uiDensity
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updatedProfile })
      });
      const data = await res.json();
      if (data.error) {
        setPrefError(data.error);
        return;
      }
      setPrefSuccess('AI style preferences saved successfully!');
      onUpdateProfile(data.profile);
    } catch (err) {
      setPrefError('Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Save general system settings
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    setSavingSettings(true);

    const updatedProfile = {
      user_id: user.id,
      communication_style: commStyle,
      preferred_tone: prefTone,
      default_scenario: defScenario,
      notes,
      preserve_voice: preserveVoice,
      overdo_patterns: overdoPatterns,
      favorite_phrases: favoritePhrases,
      avoided_phrases: avoidedPhrases,
      timezone,
      locale,
      email_notifications_enabled: emailNotifications,
      security_alerts_enabled: securityAlerts,
      monthly_reports_enabled: monthlyReports,
      ui_density: uiDensity
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: updatedProfile })
      });
      const data = await res.json();
      if (data.error) {
        setSettingsError(data.error);
        return;
      }
      setSettingsSuccess('System settings and preferences successfully updated!');
      onUpdateProfile(data.profile);
    } catch (err) {
      setSettingsError('Failed to save system settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Upgrade Plan handler
  const handleUpgradeLocal = async (plan: 'free' | 'pro' | 'plus') => {
    setUpgradingPlan(plan);
    try {
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        onUpdateUser(data.user);
        alert(`Successfully changed subscription plan to ${plan.toUpperCase()}!`);
      } else {
        alert(data.error || 'Upgrade failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Subscription upgrade failed. Please try again.');
    } finally {
      setUpgradingPlan(null);
    }
  };

  // List utilities
  const addOverdoPattern = () => {
    if (newOverdo.trim() && !overdoPatterns.includes(newOverdo.trim())) {
      setOverdoPatterns([...overdoPatterns, newOverdo.trim()]);
      setNewOverdo('');
    }
  };

  const removeOverdoPattern = (pattern: string) => {
    setOverdoPatterns(overdoPatterns.filter(p => p !== pattern));
  };

  const addFavoritePhrase = () => {
    if (newFav.trim() && !favoritePhrases.includes(newFav.trim())) {
      setFavoritePhrases([...favoritePhrases, newFav.trim()]);
      setNewFav('');
    }
  };

  const removeFavoritePhrase = (phrase: string) => {
    setFavoritePhrases(favoritePhrases.filter(p => p !== phrase));
  };

  const addAvoidedPhrase = () => {
    if (newAvoid.trim() && !avoidedPhrases.includes(newAvoid.trim())) {
      setAvoidedPhrases([...avoidedPhrases, newAvoid.trim()]);
      setNewAvoid('');
    }
  };

  const removeAvoidedPhrase = (phrase: string) => {
    setAvoidedPhrases(avoidedPhrases.filter(p => p !== phrase));
  };

  // Original 2FA procedures
  const handleInitiate2FA = async () => {
    setMfaError('');
    setMfaSuccess('');
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setMfaError(data.error);
        return;
      }
      setMfaSecret(data.secret);
      setMfaQrCode(data.qrCodeDataUrl);
      setMfaUri(data.uri);
      setMfaSetupMode(true);
    } catch (err) {
      setMfaError('Failed to initialize multi-factor authentication setup.');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: mfaSecret, code: verificationCode })
      });
      const data = await res.json();
      if (data.error) {
        setMfaError(data.error);
        return;
      }

      setMfaSuccess('Multi-factor authentication (TOTP) successfully activated on your enterprise account.');
      setMfaSetupMode(false);
      setVerificationCode('');
      
      onUpdateUser({
        ...user,
        two_factor_enabled: true
      });

      fetchSecurityMetrics();
    } catch (err) {
      setMfaError('Failed to complete multi-factor verification.');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable Multi-Factor Authentication? This will lower your account security rating.')) {
      return;
    }
    setMfaError('');
    setMfaSuccess('');
    try {
      const res = await fetch('/api/auth/2fa/disable', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setMfaError(data.error);
        return;
      }

      setMfaSuccess('Multi-factor authentication has been disabled.');
      onUpdateUser({
        ...user,
        two_factor_enabled: false
      });

      fetchSecurityMetrics();
    } catch (err) {
      setMfaError('Failed to disable multi-factor authentication.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans pb-16 animate-fade-in">
      {/* Header and overview */}
      <div className="border-b border-white/5 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#00E5FF] font-bold">Account Center</span>
          <h1 className="text-2xl font-light font-display text-[#FAF8F5]">Settings & Workspace Configuration</h1>
          <p className="text-xs text-[#B5B8BE]">Configure personal info, tweak custom communication parameters, adjust active tiers, and audit zero-trust logs.</p>
        </div>
        
        {/* Short info badge */}
        <div className="flex items-center gap-2 bg-[#111315] border border-white/5 px-3 py-1.5 rounded-xl self-start md:self-auto">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span className="text-[10px] font-mono text-[#FAF8F5]">Tenant ID: <span className="opacity-60">{user.id}</span></span>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex border-b border-white/5 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-5 py-3 text-xs border-b-2 font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#00E5FF] text-[#00E5FF]'
              : 'border-transparent text-[#B5B8BE] hover:text-[#FAF8F5]'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Profile & Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-5 py-3 text-xs border-b-2 font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === 'preferences'
              ? 'border-[#00E5FF] text-[#00E5FF]'
              : 'border-transparent text-[#B5B8BE] hover:text-[#FAF8F5]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Communication Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex items-center gap-2 px-5 py-3 text-xs border-b-2 font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === 'subscription'
              ? 'border-[#00E5FF] text-[#00E5FF]'
              : 'border-transparent text-[#B5B8BE] hover:text-[#FAF8F5]'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Usage & Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-5 py-3 text-xs border-b-2 font-medium transition whitespace-nowrap cursor-pointer ${
            activeTab === 'security'
              ? 'border-[#00E5FF] text-[#00E5FF]'
              : 'border-transparent text-[#B5B8BE] hover:text-[#FAF8F5]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Enterprise Security</span>
        </button>
      </div>

      {/* Render Selected Tab content */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* TAB 1: Profile & Identity */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="md:col-span-2 space-y-6">
              <Card className="space-y-5">
                <div>
                  <h3 className="font-medium text-[#FAF8F5] text-sm">Personal Details</h3>
                  <p className="text-[11px] text-[#B5B8BE]">Update your display name and email address for alerts and custom templates.</p>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 bg-red-950/20 text-red-300 border border-red-900/30 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdateDetails} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@example.com"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm" loading={updatingProfile}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Workspace Settings Card */}
              <Card className="space-y-5">
                <div>
                  <h3 className="font-medium text-[#FAF8F5] text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#00E5FF]" />
                    <span>Workspace & System Settings</span>
                  </h3>
                  <p className="text-[11px] text-[#B5B8BE]">Adjust your localized environment, display preferences, and notification triggers.</p>
                </div>

                {settingsSuccess && (
                  <div className="p-3 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{settingsSuccess}</span>
                  </div>
                )}

                {settingsError && (
                  <div className="p-3 bg-red-950/20 text-red-300 border border-red-900/30 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{settingsError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveSystemSettings} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none cursor-pointer"
                      >
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="America/New_York">EST (America/New_York)</option>
                        <option value="America/Los_Angeles">PST (America/Los_Angeles)</option>
                        <option value="Europe/London">GMT (Europe/London)</option>
                        <option value="Europe/Paris">CET (Europe/Paris)</option>
                        <option value="Asia/Tokyo">JST (Asia/Tokyo)</option>
                        <option value="Asia/Singapore">SGT (Asia/Singapore)</option>
                        <option value="Australia/Sydney">AEST (Australia/Sydney)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Language & Region</label>
                      <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none cursor-pointer"
                      >
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="es-ES">Español (España)</option>
                        <option value="fr-FR">Français (France)</option>
                        <option value="de-DE">Deutsch (Deutschland)</option>
                        <option value="ja-JP">日本語 (日本)</option>
                        <option value="zh-CN">简体中文 (中国)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Interface Density</label>
                      <select
                        value={uiDensity}
                        onChange={(e) => setUiDensity(e.target.value as 'comfortable' | 'compact')}
                        className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none cursor-pointer"
                      >
                        <option value="comfortable">Comfortable Spacing</option>
                        <option value="compact">Compact Spacing</option>
                      </select>
                    </div>
                  </div>

                  {/* Notification Section */}
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase font-mono text-[#00E5FF] tracking-wider flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Notification Subscriptions</span>
                    </h4>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 bg-[#111315]/30 p-3 border border-white/5 rounded-xl">
                        <input
                          type="checkbox"
                          id="email_notifications"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                        />
                        <div>
                          <label htmlFor="email_notifications" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                            Analysis Reports
                          </label>
                          <span className="text-[10px] text-[#B5B8BE]">Receive summaries and suggested playbooks directly in your inbox after processing logs.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-[#111315]/30 p-3 border border-white/5 rounded-xl">
                        <input
                          type="checkbox"
                          id="security_alerts"
                          checked={securityAlerts}
                          onChange={(e) => setSecurityAlerts(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                        />
                        <div>
                          <label htmlFor="security_alerts" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                            Security Alerts
                          </label>
                          <span className="text-[10px] text-[#B5B8BE]">Get notified immediately of new device sign-ins, 2FA modifications, or credential updates.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 bg-[#111315]/30 p-3 border border-white/5 rounded-xl">
                        <input
                          type="checkbox"
                          id="monthly_reports"
                          checked={monthlyReports}
                          onChange={(e) => setMonthlyReports(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                        />
                        <div>
                          <label htmlFor="monthly_reports" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                            Monthly Strategic Reports
                          </label>
                          <span className="text-[10px] text-[#B5B8BE]">Opt-in to a comprehensive monthly trends analysis detailing voice alignment and metric progress.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm" loading={savingSettings}>
                      Save Settings
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Security Credentials info card */}
              <Card className="space-y-6">
                <div>
                  <h3 className="font-medium text-[#FAF8F5] text-sm">Identity Management</h3>
                  <p className="text-[11px] text-[#B5B8BE]">Your login security settings and access tokens.</p>
                </div>

                {changePasswordSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
                    {changePasswordSuccess}
                  </div>
                )}
                {changePasswordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                    {changePasswordError}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-3.5 border-t border-white/5 pt-4">
                  <h4 className="text-xs font-semibold text-[#FAF8F5]">Change Account Password</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#B5B8BE] block font-medium">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full p-2 bg-[#0a0a0a] border border-white/5 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#B5B8BE] block font-medium">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 10 characters, upper/lower/numbers/symbols"
                      required
                      className="w-full p-2 bg-[#0a0a0a] border border-white/5 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#B5B8BE] block font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full p-2 bg-[#0a0a0a] border border-white/5 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button type="submit" variant="primary" size="sm" loading={savingPassword}>
                      Update Password
                    </Button>
                  </div>
                </form>
                
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-[#FAF8F5]">Session and Device Security</h4>
                  <p className="text-[10px] text-[#B5B8BE]">If you suspect unauthorized access or have signed in from public computers, you can force-terminate all other active login sessions globally.</p>
                  
                  {terminateSessionsSuccess && (
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium">
                      {terminateSessionsSuccess}
                    </div>
                  )}
                  {terminateSessionsError && (
                    <div className="p-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium">
                      {terminateSessionsError}
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-xl">
                    <div>
                      <span className="font-semibold block text-xs text-[#FAF8F5]">Active Sessions</span>
                      <span className="text-[10px] text-[#B5B8BE]">Secure enterprise sessions resolved</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="danger" 
                      size="sm" 
                      onClick={handleLogoutAllDevices} 
                      loading={terminateSessionsLoading}
                    >
                      Revoke Other Devices
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Profile card summary */}
              <Card className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00E5FF]/20 to-purple-500/20 border border-white/15 flex items-center justify-center mx-auto shadow-inner">
                  <UserIcon className="w-8 h-8 text-[#00E5FF]" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-base font-medium text-[#FAF8F5]">{user.name}</h4>
                  <p className="text-xs text-[#B5B8BE] font-mono truncate">{user.email}</p>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#B5B8BE]">Account Class:</span>
                    <span className="font-mono text-cyan-400 font-semibold uppercase">{user.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B5B8BE]">Authorized Role:</span>
                    <span className="font-mono text-emerald-400 font-semibold uppercase">{user.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B5B8BE]">Monthly Usage Count:</span>
                    <span className="font-mono text-purple-300 font-semibold">{user.usage_count_month}</span>
                  </div>
                </div>
              </Card>

              {/* Developer notice */}
              <Card className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#00E5FF] text-xs font-semibold uppercase font-mono tracking-wider">
                  <Award className="w-4 h-4" />
                  <span>Tenant Integrity</span>
                </div>
                <p className="text-[11px] text-[#B5B8BE] leading-relaxed">
                  Your profile belongs to a zero-trust tenant container, isolating your analyses and communication logs safely from external networks.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: AI Communication Preferences */}
        {activeTab === 'preferences' && (
          <form onSubmit={handleSavePreferences} className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="md:col-span-2 space-y-6">
              <Card className="space-y-5">
                <div>
                  <h3 className="font-medium text-[#FAF8F5] text-sm">Strategic Communication Style</h3>
                  <p className="text-[11px] text-[#B5B8BE]">Tailor how the analyzer shapes alternative revisions. These properties adjust recommendations automatically.</p>
                </div>

                {prefSuccess && (
                  <div className="p-3 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{prefSuccess}</span>
                  </div>
                )}

                {prefError && (
                  <div className="p-3 bg-red-950/20 text-red-300 border border-red-900/30 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{prefError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#B5B8BE]/60 font-sans block">Primary Style Class</label>
                    <select
                      value={commStyle}
                      onChange={(e) => setCommStyle(e.target.value)}
                      className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none"
                    >
                      <option value="warm">Warm & Encouraging (Collaborative)</option>
                      <option value="direct">Direct & Concise (High-Efficiency)</option>
                      <option value="diplomatic">Tactful & Diplomatic (Conflict Prevention)</option>
                      <option value="persuasive">Assertive & Persuasive (Sales & Pitch)</option>
                      <option value="analytical">Cool & Analytical (Formal & Fact-Based)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#B5B8BE]/60 font-sans block">Default Target Tone</label>
                    <input
                      type="text"
                      value={prefTone}
                      onChange={(e) => setPrefTone(e.target.value)}
                      placeholder="e.g. professional and brief, warm yet assertive"
                      className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[#B5B8BE]/60 font-sans block">General Strategic Directives / Workspace Context</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="e.g. 'I tend to write long paragraphs when anxious. Keep revisions short.' or 'I manage a team of remote engineers. Revisions should emphasize clarity.'"
                    className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 bg-[#111315]/50 p-4 border border-white/5 rounded-xl">
                  <input
                    type="checkbox"
                    id="preserve_voice"
                    checked={preserveVoice}
                    onChange={(e) => setPreserveVoice(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF]"
                  />
                  <div>
                    <label htmlFor="preserve_voice" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                      Preserve Original Signature Voice
                    </label>
                    <span className="text-[10px] text-[#B5B8BE]">Ensure AI matches your personal syntactic quirks and vocabulary choices where safe.</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" loading={savingPrefs}>
                    Save Preferences
                  </Button>
                </div>
              </Card>

              {/* Dynamic list preferences card */}
              <Card className="space-y-5">
                <div>
                  <h3 className="font-medium text-[#FAF8F5] text-sm">Phrases & Pattern Checklists</h3>
                  <p className="text-[11px] text-[#B5B8BE]">Supply specific word patterns that the AI analyzer should explicitly favor, filter, or avoid.</p>
                </div>

                {/* Overdone Patterns */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-[#FAF8F5] block">Phrasing Patterns I Overdo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOverdo}
                      onChange={(e) => setNewOverdo(e.target.value)}
                      placeholder="e.g. 'Just checking in', 'Sorry to bug you'"
                      className="flex-1 p-2.5 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-[#FAF8F5] focus:outline-none"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOverdoPattern(); } }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={addOverdoPattern}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {overdoPatterns.length === 0 ? (
                      <span className="text-[10px] text-[#B5B8BE]/40 font-mono italic">No patterns added yet.</span>
                    ) : (
                      overdoPatterns.map((p) => (
                        <span key={p} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/20 text-amber-300 border border-amber-900/30 rounded-lg text-xs">
                          <span>{p}</span>
                          <button type="button" onClick={() => removeOverdoPattern(p)} className="text-amber-400 hover:text-white bg-transparent">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Favorite Phrases */}
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <label className="text-xs font-medium text-[#FAF8F5] block">Favorite Terminology (Explicitly Prefer)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFav}
                      onChange={(e) => setNewFav(e.target.value)}
                      placeholder="e.g. 'Aligning vectors', 'Action item'"
                      className="flex-1 p-2.5 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-[#FAF8F5] focus:outline-none"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFavoritePhrase(); } }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={addFavoritePhrase}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {favoritePhrases.length === 0 ? (
                      <span className="text-[10px] text-[#B5B8BE]/40 font-mono italic">No favorite phrases added yet.</span>
                    ) : (
                      favoritePhrases.map((p) => (
                        <span key={p} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 rounded-lg text-xs">
                          <span>{p}</span>
                          <button type="button" onClick={() => removeFavoritePhrase(p)} className="text-emerald-400 hover:text-white bg-transparent">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Avoided Phrases */}
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <label className="text-xs font-medium text-[#FAF8F5] block">Terms to Avoid (Filter Out)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAvoid}
                      onChange={(e) => setNewAvoid(e.target.value)}
                      placeholder="e.g. 'No worries', 'Basically'"
                      className="flex-1 p-2.5 bg-[#0a0a0a] border border-[#262626] rounded-xl text-xs text-[#FAF8F5] focus:outline-none"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAvoidedPhrase(); } }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={addAvoidedPhrase}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {avoidedPhrases.length === 0 ? (
                      <span className="text-[10px] text-[#B5B8BE]/40 font-mono italic">No avoided phrases added yet.</span>
                    ) : (
                      avoidedPhrases.map((p) => (
                        <span key={p} className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/20 text-red-300 border border-red-900/30 rounded-lg text-xs">
                          <span>{p}</span>
                          <button type="button" onClick={() => removeAvoidedPhrase(p)} className="text-red-400 hover:text-white bg-transparent">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="space-y-3">
                <div className="flex items-center gap-2 text-[#00E5FF] text-xs font-semibold uppercase font-mono">
                  <Sparkles className="w-4 h-4" />
                  <span>Analyzer Calibration</span>
                </div>
                <p className="text-[11px] text-[#B5B8BE] leading-relaxed">
                  These filters are combined with specific scenario matrices (such as boundaries, billing, missed deadlines) and passed into the LLM during structural analysis.
                </p>
                <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-[#B5B8BE] space-y-1">
                  <div>• Default scenario: <span className="text-[#FAF8F5]">{defScenario}</span></div>
                  <div>• Filter arrays size: <span className="text-[#FAF8F5]">{overdoPatterns.length + favoritePhrases.length + avoidedPhrases.length} rules</span></div>
                </div>
              </Card>
            </div>
          </form>
        )}

        {/* TAB 3: Usage & Subscription */}
        {activeTab === 'subscription' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="md:col-span-2 space-y-6">
              
              {/* Usage stats card */}
              <Card className="space-y-5">
                <div>
                  <h3 className="font-medium text-[#FAF8F5] text-sm">Monthly Strategic Analysis Usage</h3>
                  <p className="text-[11px] text-[#B5B8BE]">Usage metrics reset on the 1st of every month.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#B5B8BE]">Strategic Revisions Count:</span>
                    <span className="font-mono text-[#FAF8F5] font-semibold">
                      {user.usage_count_month} analyses (unlimited)
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[#111315]/50 border border-white/5 rounded-xl flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="font-medium text-[#FAF8F5] block">Full access, no limits</span>
                    <p className="text-[11px] text-[#B5B8BE]">Every account gets unlimited strategic analyses, the AI Communication Coach, Scenario Simulator, and full diagnostic breakdowns — no upgrade required.</p>
                  </div>
                </div>
              </Card>

              {/* Tiers Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Free plan */}
                <Card className={`space-y-4 flex flex-col justify-between border ${user.plan === 'free' ? 'border-[#00E5FF]/40 bg-[#00E5FF]/5' : 'border-white/5'}`}>
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-[#B5B8BE]">Standard Sandbox</span>
                    <h4 className="text-sm font-semibold text-[#FAF8F5]">Free Tier</h4>
                    <p className="text-[11px] text-[#B5B8BE]">Basic tone adjustment, 5 analyses per month.</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="font-mono text-xs font-semibold text-[#FAF8F5]">$0 <span className="text-[10px] opacity-60">/ mo</span></div>
                    {user.plan === 'free' ? (
                      <span className="block text-center text-[10px] font-mono py-1.5 bg-white/5 border border-white/10 rounded-lg text-[#FAF8F5]">ACTIVE</span>
                    ) : (
                      <Button variant="secondary" size="sm" className="w-full text-center text-xs" onClick={() => handleUpgradeLocal('free')} loading={upgradingPlan === 'free'}>
                        Downgrade
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Pro plan */}
                <Card className={`space-y-4 flex flex-col justify-between border ${user.plan === 'pro' ? 'border-[#00E5FF]/40 bg-[#00E5FF]/5' : 'border-white/5'}`}>
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-[#00E5FF] font-semibold">Most Popular</span>
                    <h4 className="text-sm font-semibold text-[#FAF8F5]">Pro Analyst</h4>
                    <p className="text-[11px] text-[#B5B8BE]">100 analyses, custom templates creator, priority speed.</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="font-mono text-xs font-semibold text-[#FAF8F5]">$19 <span className="text-[10px] opacity-60">/ mo</span></div>
                    {user.plan === 'pro' ? (
                      <span className="block text-center text-[10px] font-mono py-1.5 bg-white/5 border border-white/10 rounded-lg text-[#00E5FF]">ACTIVE</span>
                    ) : (
                      <Button variant="primary" size="sm" className="w-full text-center text-xs" onClick={() => handleUpgradeLocal('pro')} loading={upgradingPlan === 'pro'}>
                        Upgrade Pro
                      </Button>
                    )}
                  </div>
                </Card>

                {/* Plus plan */}
                <Card className={`space-y-4 flex flex-col justify-between border ${user.plan === 'plus' ? 'border-[#00E5FF]/40 bg-[#00E5FF]/5' : 'border-white/5'}`}>
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-purple-400 font-semibold">Unlimited Power</span>
                    <h4 className="text-sm font-semibold text-[#FAF8F5]">Plus Executive</h4>
                    <p className="text-[11px] text-[#B5B8BE]">Unlimited analyses, premium playbooks, full audit trail.</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="font-mono text-xs font-semibold text-[#FAF8F5]">$49 <span className="text-[10px] opacity-60">/ mo</span></div>
                    {user.plan === 'plus' ? (
                      <span className="block text-center text-[10px] font-mono py-1.5 bg-white/5 border border-white/10 rounded-lg text-[#00E5FF]">ACTIVE</span>
                    ) : (
                      <Button variant="primary" size="sm" className="w-full text-center text-xs" onClick={() => handleUpgradeLocal('plus')} loading={upgradingPlan === 'plus'}>
                        Upgrade Plus
                      </Button>
                    )}
                  </div>
                </Card>

              </div>
            </div>

            {/* Right details sidebar */}
            <div className="space-y-6">
              <Card className="space-y-3">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase font-mono">
                  <CreditCard className="w-4 h-4" />
                  <span>Billing Ledger</span>
                </div>
                <div className="text-xs space-y-2 text-[#B5B8BE]">
                  <div className="flex justify-between">
                    <span>Customer ID:</span>
                    <span className="font-mono text-[#FAF8F5] truncate max-w-[120px]" title={user.billing_customer_id || 'unassigned'}>
                      {user.billing_customer_id || 'not_billed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice Status:</span>
                    <span className="font-mono text-emerald-400 uppercase font-semibold">{user.billing_status || 'none'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currency Profile:</span>
                    <span className="font-mono text-[#FAF8F5]">USD ($)</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 4: Enterprise Security (Original Controls) */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section: Two-Factor Authentication */}
              <Card className="space-y-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-[#00E5FF]" />
                      <h3 className="font-medium text-[#FAF8F5] text-sm">Two-Factor Authentication (2FA)</h3>
                    </div>
                    <p className="text-xs text-[#B5B8BE] max-w-md">
                      Enforce an additional layer of security by requiring a 6-digit cryptographic TOTP token from an authenticator app (Google Authenticator, Duo, etc.) upon sign-in.
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    user.two_factor_enabled 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' 
                      : 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                  }`}>
                    {user.two_factor_enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {mfaError && (
                  <div className="p-3 bg-red-950/20 text-red-300 border border-red-900/30 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{mfaError}</span>
                  </div>
                )}

                {mfaSuccess && (
                  <div className="p-3 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{mfaSuccess}</span>
                  </div>
                )}

                {!mfaSetupMode && !user.two_factor_enabled && (
                  <Button
                    onClick={handleInitiate2FA}
                    variant="secondary"
                    size="sm"
                  >
                    Configure Authenticator App (TOTP)
                  </Button>
                )}

                {!mfaSetupMode && user.two_factor_enabled && (
                  <Button
                    onClick={handleDisable2FA}
                    variant="danger"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disable Multi-Factor Authentication
                  </Button>
                )}

                {mfaSetupMode && (
                  <div className="p-5 bg-[#111315]/80 border border-white/5 rounded-xl space-y-5 animate-fade-in">
                    <h4 className="text-xs font-semibold uppercase font-mono text-[#00E5FF] tracking-wider">Setup Multi-Factor Authentication</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                      {/* QR Code */}
                      <div className="bg-white p-3 rounded-lg w-fit mx-auto md:mx-0 border border-white/10">
                        <img src={mfaQrCode} alt="TOTP QR Code" className="w-32 h-32 select-none" />
                      </div>

                      {/* Guide */}
                      <div className="md:col-span-2 space-y-2 text-xs">
                        <p className="text-[#FAF8F5]">
                          1. Scan the QR code using your authenticator app.
                        </p>
                        <p className="text-[#B5B8BE]">
                          Alternatively, input the manual configuration key:
                        </p>
                        <div className="flex items-center gap-2 bg-[#1A1D20] p-2 rounded border border-white/5 font-mono text-[10px]">
                          <span className="truncate flex-1">
                            {showSecret ? mfaSecret : '•••• •••• •••• •••• ••••'}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => setShowSecret(!showSecret)}
                            className="text-[#00E5FF] hover:underline bg-transparent border-none cursor-pointer"
                          >
                            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Verification form */}
                    <form onSubmit={handleVerify2FA} className="space-y-3 pt-3 border-t border-white/5">
                      <label className="text-xs text-[#FAF8F5] block">
                        2. Input the generated 6-digit confirmation code:
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-36 p-2.5 bg-[#0a0a0a] border border-white/5 focus:border-[#00E5FF] rounded-xl text-center font-mono text-sm tracking-widest text-[#FAF8F5] focus:outline-none"
                          required
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                        >
                          Verify and Enable MFA
                        </Button>
                        <button
                          type="button"
                          onClick={() => setMfaSetupMode(false)}
                          className="px-4 py-2.5 text-xs text-[#B5B8BE] hover:text-white transition bg-transparent cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </Card>

              {/* Section: WAF edge metrics & threat report */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-medium text-[#FAF8F5] text-sm">Web Application Firewall (WAF)</h3>
                    <p className="text-[10px] text-[#B5B8BE]">Dynamic SQL injection, Directory Traversal, and XSS filtering is active.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-center">
                  <div className="bg-[#111315]/50 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-[#B5B8BE] font-mono">Status</span>
                    <p className="text-xs text-emerald-400 font-semibold uppercase font-mono">Enforcing</p>
                  </div>
                  <div className="bg-[#111315]/50 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-[#B5B8BE] font-mono">Payload Limit</span>
                    <p className="text-xs text-[#FAF8F5] font-semibold font-mono">100 KB</p>
                  </div>
                  <div className="bg-[#111315]/50 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-[#B5B8BE] font-mono">XSS Filter</span>
                    <p className="text-xs text-emerald-400 font-semibold uppercase font-mono">Sanitizing</p>
                  </div>
                  <div className="bg-[#111315]/50 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-[#B5B8BE] font-mono">Rate Limiters</span>
                    <p className="text-xs text-[#FAF8F5] font-semibold font-mono">Active</p>
                  </div>
                </div>
              </Card>

              {/* Section: Audit Logs */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="space-y-0.5">
                    <h3 className="font-medium text-[#FAF8F5] text-sm">Security Audit Logs</h3>
                    <p className="text-[10px] text-[#B5B8BE]">Immutable ledger tracking authentication, administrative changes, and edge blocks.</p>
                  </div>
                  <button 
                    onClick={fetchSecurityMetrics}
                    className="text-[10px] text-[#00E5FF] hover:underline bg-transparent cursor-pointer"
                  >
                    Refresh Logs
                  </button>
                </div>

                {loadingLogs ? (
                  <p className="text-center py-6 text-xs text-[#B5B8BE]">Querying security database...</p>
                ) : auditLogs.length === 0 ? (
                  <p className="text-center py-6 text-xs text-[#B5B8BE]">No audit ledger records available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-sans">
                      <thead>
                        <tr className="border-b border-white/5 text-[#B5B8BE] uppercase font-mono text-[9px] tracking-wider">
                          <th className="py-2">Timestamp</th>
                          <th className="py-2">Event</th>
                          <th className="py-2">IP Address</th>
                          <th className="py-2">Audit Action Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[#FAF8F5]">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/5 transition">
                            <td className="py-2.5 text-[10px] opacity-70">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-tight ${
                                log.event.includes('fail') || log.event.includes('blocked')
                                  ? 'bg-red-950/40 text-red-400 border border-red-900/20'
                                  : 'bg-white/10 text-white'
                              }`}>
                                {log.event}
                              </span>
                            </td>
                            <td className="py-2.5 text-[#B5B8BE]">{log.ip_address || 'system'}</td>
                            <td className="py-2.5 text-xs text-[#B5B8BE] font-sans max-w-xs truncate" title={log.details}>
                              {log.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

            </div>

            {/* Right column: Database resilience indicators */}
            <div className="space-y-6">
              <Card className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                  <Database className="w-5 h-5 text-purple-400" />
                  <div>
                    <h3 className="font-medium text-[#FAF8F5] text-sm">Resilient Database Info</h3>
                    <p className="text-[10px] text-[#B5B8BE]">PostgreSQL schema & RLS policies.</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-[#111315]/50 p-4 border border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#B5B8BE]">Primary DB Engine:</span>
                      <span className="font-mono text-[#FAF8F5] font-semibold">PostgreSQL</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#B5B8BE]">Isolation Mode:</span>
                      <span className="font-mono text-emerald-400 font-bold">ROW-LEVEL SECURITY</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#B5B8BE]">Status:</span>
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-400 font-mono">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        {isPgActive ? 'PG_CLOUD_ACTIVE' : 'PG_EMULATOR_ENFORCED'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#111315]/30 rounded-xl space-y-2 border border-white/5">
                    <h4 className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#00E5FF]">Active RLS Policies</h4>
                    <ul className="space-y-1.5 text-[11px] font-mono text-[#B5B8BE] list-disc list-inside">
                      <li>analyses (user_id = context_user)</li>
                      <li>user_profiles (user_id = context_user)</li>
                      <li>sessions (user_id = context_user)</li>
                      <li>users (id = context_user OR admin)</li>
                    </ul>
                  </div>

                  <p className="text-[10px] text-[#B5B8BE] leading-relaxed font-sans font-light">
                    Database queries execute in transaction contexts, setting secure user variables prior to query dispatch. This guarantees zero leak across tenant profiles.
                  </p>
                </div>
              </Card>

              {/* Encryption indicator */}
              <Card className="text-center space-y-3">
                <Lock className="w-8 h-8 text-[#00E5FF] mx-auto opacity-80" />
                <h4 className="text-sm font-medium text-[#FAF8F5]">Strict Zero-Trust Encryption</h4>
                <p className="text-[11px] text-[#B5B8BE] leading-relaxed max-w-xs mx-auto font-sans font-light">
                  Password keys are hashed using enterprise standard SHA-512 PBKDF2 with unique salts. Active session tracking is enforced with 256-bit cryptographically secure identifiers.
                </p>
              </Card>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
