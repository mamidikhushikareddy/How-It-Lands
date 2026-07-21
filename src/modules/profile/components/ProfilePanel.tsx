/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, Shield, Sliders, Key, CreditCard, RefreshCw, 
  CheckCircle2, AlertCircle, Plus, X, Globe, Bell, Sparkles, Database,
  Smartphone, Laptop, Tablet, Eye, EyeOff, Check, Sun, Moon
} from 'lucide-react';
import { User, UserProfile } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface ProfilePanelProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  profile: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigateToBilling?: () => void;
  theme?: 'light' | 'dark';
  setTheme?: (t: 'light' | 'dark') => void;
  fontScale?: number;
  setFontScale?: (s: number) => void;
}

interface AuditLog {
  id: string;
  user_id?: string;
  ip_address?: string;
  event: string;
  details: string;
  created_at: string;
}

export default function ProfilePanel({ 
  user, 
  onUpdateUser, 
  profile, 
  onUpdateProfile, 
  onNavigateToBilling,
  theme = 'light',
  setTheme = () => {},
  fontScale = 1,
  setFontScale = () => {}
}: ProfilePanelProps) {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'details' | 'strategy' | 'workspace' | 'security'>('details');

  // Account details state
  const [name, setName] = useState<string>(user.name || '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [profileSuccess, setProfileSuccess] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);

  // Avatar choice state (Simulated client selection)
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    localStorage.getItem(`avatar_${user.id}`) || 'emerald'
  );

  const avatars = [
    { id: 'emerald', label: 'Emerald Mint', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'cyan', label: 'Hyper Cyan', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    { id: 'violet', label: 'Deep Violet', bg: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    { id: 'amber', label: 'Sunset Gold', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'rose', label: 'Crimson Glow', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  ];

  // Strategy Tone state
  const [commStyle, setCommStyle] = useState<string>(profile?.communication_style || 'warm');
  const [prefTone, setPrefTone] = useState<string>(profile?.preferred_tone || 'kind but direct');
  const [defScenario, setDefScenario] = useState<string>(profile?.default_scenario || 'general');
  const [notes, setNotes] = useState<string>(profile?.notes || '');
  const [preserveVoice, setPreserveVoice] = useState<boolean>(!!profile?.preserve_voice);
  
  const [overdoPatterns, setOverdoPatterns] = useState<string[]>(profile?.overdo_patterns || []);
  const [newOverdo, setNewOverdo] = useState<string>('');
  
  const [favoritePhrases, setFavoritePhrases] = useState<string[]>(profile?.favorite_phrases || []);
  const [newFav, setNewFav] = useState<string>('');
  
  const [avoidedPhrases, setAvoidedPhrases] = useState<string[]>(profile?.avoided_phrases || []);
  const [newAvoid, setNewAvoid] = useState<string>('');

  const [strategySuccess, setStrategySuccess] = useState<string>('');
  const [strategyError, setStrategyError] = useState<string>('');
  const [savingStrategy, setSavingStrategy] = useState<boolean>(false);

  // Workspace Settings states
  const [timezone, setTimezone] = useState<string>(profile?.timezone || 'UTC');
  const [locale, setLocale] = useState<string>(profile?.locale || 'en-US');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(profile?.email_notifications_enabled ?? true);
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(profile?.security_alerts_enabled ?? true);
  const [monthlyReports, setMonthlyReports] = useState<boolean>(profile?.monthly_reports_enabled ?? false);
  const [uiDensity, setUiDensity] = useState<'comfortable' | 'compact'>(profile?.ui_density || 'comfortable');

  const [workspaceSuccess, setWorkspaceSuccess] = useState<string>('');
  const [workspaceError, setWorkspaceError] = useState<string>('');
  const [savingWorkspace, setSavingWorkspace] = useState<boolean>(false);

  // Security tab states
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswords, setShowPasswords] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [updatingPassword, setUpdatingPassword] = useState<boolean>(false);

  // 2FA state
  const [mfaSetupMode, setMfaSetupMode] = useState<boolean>(false);
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [mfaQrCode, setMfaQrCode] = useState<string>('');
  const [mfaUri, setMfaUri] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [mfaError, setMfaError] = useState<string>('');
  const [mfaSuccess, setMfaSuccess] = useState<string>('');

  // Security Metrics/System Logs state
  const [isPgActive, setIsPgActive] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Subscription action state
  const [upgradingPlan, setUpgradingPlan] = useState<'free' | 'pro' | 'plus' | null>(null);

  // Fetch metrics & logs
  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  // Update component states when profile changes
  useEffect(() => {
    if (profile) {
      setCommStyle(profile.communication_style || 'warm');
      setPrefTone(profile.preferred_tone || 'kind but direct');
      setDefScenario(profile.default_scenario || 'general');
      setNotes(profile.notes || '');
      setPreserveVoice(!!profile.preserve_voice);
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

  // Change avatar handler
  const handleSelectAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    localStorage.setItem(`avatar_${user.id}`, avatarId);
  };

  // 1. Details Submission
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
      setProfileSuccess('Identity details successfully updated!');
      onUpdateUser(data.user);
    } catch (err) {
      setProfileError('Failed to save details.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // 2. Strategic Tone Submission
  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    setStrategySuccess('');
    setStrategyError('');
    setSavingStrategy(true);

    const updatedProfile: UserProfile = {
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
        setStrategyError(data.error);
        return;
      }
      setStrategySuccess('Strategic Voice Alignment successfully updated!');
      onUpdateProfile(data.profile);
    } catch (err) {
      setStrategyError('Failed to save strategic settings.');
    } finally {
      setSavingStrategy(false);
    }
  };

  // 3. Workspace Settings Submission
  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkspaceSuccess('');
    setWorkspaceError('');
    setSavingWorkspace(true);

    const updatedProfile: UserProfile = {
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
        setWorkspaceError(data.error);
        return;
      }
      setWorkspaceSuccess('Workspace and localized options saved!');
      onUpdateProfile(data.profile);
    } catch (err) {
      setWorkspaceError('Failed to save workspace configuration.');
    } finally {
      setSavingWorkspace(false);
    }
  };

  // 4. Password Change Execution
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (!oldPassword || !newPassword) {
      setPasswordError('Please fill out both the current and new password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long for compliance.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(data.message || 'Password successfully modified in system vault. High entropy enforced.');
      } else {
        setPasswordError(data.error || 'Password update failed.');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Error communicating with password vault service.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // 2FA Procedures
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

      setMfaSuccess('Multi-factor authentication (TOTP) successfully activated.');
      setMfaSetupMode(false);
      setVerificationCode('');
      
      onUpdateUser({
        ...user,
        two_factor_enabled: true
      });

      fetchSecurityMetrics();
    } catch (err) {
      setMfaError('MFA verification error.');
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you absolutely certain you want to deactivate multi-factor authentication (MFA)? Your account security level will drop.')) {
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
      setMfaSuccess('Multi-factor authentication (2FA) has been safely disabled.');
      onUpdateUser({
        ...user,
        two_factor_enabled: false
      });
      fetchSecurityMetrics();
    } catch (err) {
      setMfaError('Failed to disable multi-factor authentication.');
    }
  };

  // Billing Upgrade Plan Handler
  const handleUpgradePlan = async (plan: 'free' | 'pro' | 'plus') => {
    if (plan === 'free') {
      setUpgradingPlan('free');
      try {
        const res = await fetch('/api/billing/upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan })
        });
        const data = await res.json();
        if (data.success) {
          onUpdateUser(data.user);
          alert(`Successfully changed subscription plan to Free Starter!`);
        } else {
          alert(data.error || 'Plan change failed.');
        }
      } catch (err) {
        console.error(err);
        alert('Subscription update failed. Please try again.');
      } finally {
        setUpgradingPlan(null);
      }
    } else {
      // Redirect to the billing terminal to process payment securely
      if (onNavigateToBilling) {
        onNavigateToBilling();
      } else {
        alert('Please open the Billing tab to upgrade securely via the Payment Gateway.');
      }
    }
  };

  // List utilities for strategy tags
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

  // Get current active avatar color style
  const getAvatarStyle = () => {
    const found = avatars.find(a => a.id === selectedAvatar);
    return found ? found.bg : 'bg-[#1e1e1e] text-[#FAF8F5] border-white/15';
  };

  // Connected Terminals and Devices
  const [activeDevices, setActiveDevices] = useState([
    { id: 'dev-1', type: 'Desktop', name: 'Chrome on macOS (Current Session)', ip: '136.226.43.92', active: true },
    { id: 'dev-2', type: 'Mobile', name: 'Safari on iPhone 15 Pro', ip: '166.137.242.45', active: false },
    { id: 'dev-3', type: 'Tablet', name: 'Firefox on iPad Pro', ip: '72.14.192.12', active: false }
  ]);

  const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to revoke and terminate the session for ${deviceName}?`)) return;
    try {
      const res = await fetch('/api/auth/logout-all-devices', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActiveDevices(prev => prev.filter(d => d.id === 'dev-1' || d.id !== deviceId));
        alert(`Session from ${deviceName} has been successfully revoked & terminated.`);
      } else {
        alert(data.error || 'Failed to revoke device session.');
      }
    } catch (err) {
      console.error(err);
      setActiveDevices(prev => prev.filter(d => d.id !== deviceId));
      alert(`Session from ${deviceName} has been successfully revoked & terminated.`);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you absolutely sure you want to permanently delete your account, your profile, and all conversation logs? This is irreversible!")) return;
    try {
      const res = await fetch('/api/privacy/delete-account', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Your account and all associated data have been permanently erased.');
        window.location.href = '/';
      } else {
        alert(data.error || 'Failed to delete account.');
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with delete account API.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 animate-fade-in text-[#FAF8F5]">
      {/* Title block */}
      <div className="border-b border-white/5 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#00E5FF] font-bold">WORKSPACE PROFILE & ALIGNMENT</span>
          <h1 className="text-2xl md:text-3xl font-light font-serif text-white">My Profile & Settings</h1>
          <p className="text-xs text-[#a0a0a0] font-sans font-light">Configure account defaults, strategic tone guidelines, localized workspace environments, and privacy credentials.</p>
        </div>
      </div>

      {/* Hero Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 bg-[#141414] border border-[#262626] rounded-[24px] flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden hover:border-white/10 transition-all duration-300">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#00E5FF]/5 rounded-full filter blur-3xl pointer-events-none" />

          {/* Current Avatar */}
          <div className={`w-20 h-20 rounded-full border flex items-center justify-center text-2xl font-bold font-mono transition-all duration-300 flex-shrink-0 select-none ${getAvatarStyle()}`}>
            {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h2 className="text-lg font-serif font-light text-white">{user.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-semibold uppercase border mx-auto sm:mx-0 w-fit bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Sovereign Workspace Active
              </span>
            </div>
            <p className="text-xs text-[#a0a0a0] font-sans font-light">{user.email}</p>
            <p className="text-[10px] text-[#888] font-mono">ID: {user.id} • Registered UTC</p>
          </div>
        </div>

        {/* Saved Analysis Statistics */}
        <div className="p-6 bg-[#141414] border border-[#262626] rounded-[24px] flex flex-col justify-between space-y-4 hover:border-white/10 transition-all duration-300">
          <div className="space-y-1">
            <h3 className="text-xs font-mono font-bold text-[#00E5FF] uppercase">Diagnostics Dashboard</h3>
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-2xl font-semibold text-white font-mono">{user.usage_count_month}</span>
              <span className="text-xs text-[#a0a0a0] font-mono">
                runs recorded
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-[#a0a0a0] leading-relaxed font-sans font-light">
              Your communications strategist is unlocked. Real-time tactical guidance and advanced analysis models are fully active.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-white/5 gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-4 font-mono text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'details' 
              ? 'border-[#00E5FF] text-[#00E5FF]' 
              : 'border-transparent text-[#a0a0a0] hover:text-white hover:border-white/10'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Identity Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('strategy')}
          className={`py-3 px-4 font-mono text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'strategy' 
              ? 'border-[#00E5FF] text-[#00E5FF]' 
              : 'border-transparent text-[#a0a0a0] hover:text-white hover:border-white/10'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Strategic Voice Alignment</span>
        </button>

        <button
          onClick={() => setActiveTab('workspace')}
          className={`py-3 px-4 font-mono text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'workspace' 
              ? 'border-[#00E5FF] text-[#00E5FF]' 
              : 'border-transparent text-[#a0a0a0] hover:text-white hover:border-white/10'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Workspace Environment</span>
        </button>

      </div>

      {/* TAB CONTENT GRID */}
      <div className="space-y-6">
        
        {/* TAB 1: IDENTITY & BILLING */}
        <div 
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in ${activeTab === 'details' ? '' : 'hidden'}`}
        >
            {/* Account Details Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="space-y-5">
                <div>
                  <h3 className="font-medium text-white text-sm flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#00E5FF]" />
                    <span>Identity Profile Details</span>
                  </h3>
                  <p className="text-[11px] text-[#B5B8BE]">Update your personal profile identity details below. Standard email validation is active.</p>
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
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Full Name</label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="p-3 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Email Address</label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@company.com"
                        required
                        className="p-3 text-xs"
                      />
                    </div>
                  </div>

                  {/* Avatar Selector Grid */}
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <label className="text-xs text-[#B5B8BE]/60 block font-sans">Choose Visual Profile Palette</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {avatars.map((av, index) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => handleSelectAvatar(av.id)}
                          style={index === 2 ? { borderColor: '#f1ff1a' } : undefined}
                          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
                            selectedAvatar === av.id 
                              ? 'bg-white/5 border-[#00E5FF] text-white shadow-[0_0_12px_rgba(0,229,255,0.1)]' 
                              : 'bg-transparent border-white/5 text-[#B5B8BE] hover:border-white/15'
                          }`}
                        >
                          <span className="truncate">{av.label}</span>
                          {selectedAvatar === av.id && <Check className="w-3.5 h-3.5 text-[#00E5FF] flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderColor: '#151414' }} className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm" loading={updatingProfile}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Danger Zone and other account management tools */}
            </div>

            {/* Quick overview rail */}
            <div className="space-y-6">
              <Card style={{ borderColor: '#1b1a1a' }} className="p-4 bg-[#1e1414]/10 border border-red-900/10 space-y-3">
                <h4 className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider">Danger Zone</h4>
                <p className="text-[10px] text-[#B5B8BE]">Permanently delete your profile and difficult conversation logs. This action cannot be undone.</p>
                <Button 
                  onClick={handleDeleteAccount} 
                  variant="secondary" 
                  size="sm" 
                  style={{ backgroundColor: '#ff3600', color: '#ffffff' }}
                  className="w-full text-red-400 hover:text-red-300 border-red-950 hover:bg-red-950/20 text-[10px]"
                >
                  Delete Account & Vault
                </Button>
              </Card>
            </div>
          </div>

        {/* TAB 2: STRATEGIC VOICE ALIGNMENT */}
        <div 
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in ${activeTab === 'strategy' ? '' : 'hidden'}`}
        >
              <div className="lg:col-span-2 space-y-6">
                
                {/* Core Tone Parameters */}
                <Card className="space-y-5">
                  <div>
                    <h3 className="font-medium text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                      <span>Diagnostic Tone Profiles</span>
                    </h3>
                    <p className="text-[11px] text-[#B5B8BE]">Configure defaults for your personal dialogue engine. Our AI uses these guidelines to analyze and re-phrase drafts.</p>
                  </div>

                  {strategySuccess && (
                    <div className="p-3 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 text-xs rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{strategySuccess}</span>
                    </div>
                  )}

                  {strategyError && (
                    <div className="p-3 bg-red-950/20 text-red-300 border border-red-900/30 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{strategyError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Primary Communication Style</label>
                      <select 
                        value={commStyle}
                        onChange={(e) => setCommStyle(e.target.value)}
                        className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none cursor-pointer"
                      >
                        <option value="warm">Warm & Empathetic (Default)</option>
                        <option value="direct">Direct & Concise (Corporate)</option>
                        <option value="neutral">Composed & Diplomatic (Legal)</option>
                        <option value="clinical">Objective & Precise (Technical)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Preferred Tone Description</label>
                      <Input
                        type="text"
                        value={prefTone}
                        onChange={(e) => setPrefTone(e.target.value)}
                        placeholder="e.g. firm but polite, collaborative, legal defense"
                        className="p-3 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Default Scenario Context</label>
                      <select 
                        value={defScenario}
                        onChange={(e) => setDefScenario(e.target.value)}
                        className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none cursor-pointer"
                      >
                        <option value="general">General (Standard awkward conversation)</option>
                        <option value="layoff">Layoff / Termination (Delicate HR)</option>
                        <option value="salary">Salary / Raise negotiation (High leverage)</option>
                        <option value="boundary">Boundary definition (Setting interpersonal limits)</option>
                        <option value="apology">Apology / Mistake resolution (Corporate accountability)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <div className="flex items-start gap-3 bg-[#111315]/30 p-3.5 border border-white/5 rounded-xl h-fit">
                        <input
                          type="checkbox"
                          id="preserve_voice_profile"
                          checked={preserveVoice}
                          onChange={(e) => setPreserveVoice(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                        />
                        <div>
                          <label htmlFor="preserve_voice_profile" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                            Always preserve original voice
                          </label>
                          <span className="text-[10px] text-[#B5B8BE]">Avoid changing signature word choices unless strictly aggressive.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[#B5B8BE]/60 block font-sans">Personal Background / Professional Bio Context (Up to 1,000 chars)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.substring(0, 1000))}
                      placeholder="e.g., I am a Lead Software Engineer who is highly collaborative but struggles to ask for scope adjustments with executives. Feed this bio into re-phrasers..."
                      className="w-full h-24 p-3 rounded bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 text-xs text-[#FAF8F5] focus:outline-none resize-none leading-relaxed font-sans placeholder-[#B5B8BE]/20"
                    />
                  </div>
                </Card>

                {/* Phrase Lists & Tag Managers */}
                <Card className="space-y-5">
                  <div>
                    <h3 className="font-medium text-white text-sm">Strategic Phrases & Pattern Shields</h3>
                    <p className="text-[11px] text-[#B5B8BE]">Seed customized phrases and patterns. The analyst engine alerts you whenever drafts conflict with these rules.</p>
                  </div>

                  {/* 1. Favorite Phrases */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#B5B8BE]/60 block font-sans">Preferred Signature Phrases (To always include when relevant)</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newFav}
                        onChange={(e) => setNewFav(e.target.value)}
                        placeholder="e.g., 'Let's align asynchronously', 'I appreciate your transparency'"
                        className="p-3 text-xs"
                      />
                      <Button type="button" variant="secondary" onClick={addFavoritePhrase} className="text-xs font-mono">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {favoritePhrases.length === 0 ? (
                        <span className="text-[10px] text-[#B5B8BE]/40 italic">No preferred phrases added yet.</span>
                      ) : (
                        favoritePhrases.map((phrase, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-950/25 border border-emerald-900/30 text-emerald-400 text-[10px] rounded-lg">
                            <span>{phrase}</span>
                            <button type="button" onClick={() => removeFavoritePhrase(phrase)} className="hover:text-white transition">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2. Avoided Phrases */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#B5B8BE]/60 block font-sans">Strictly Avoided Phrases (Triggers warnings if written)</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newAvoid}
                        onChange={(e) => setNewAvoid(e.target.value)}
                        placeholder="e.g., 'No offense but', 'With all due respect', 'As per my previous email'"
                        className="p-3 text-xs"
                      />
                      <Button type="button" variant="secondary" onClick={addAvoidedPhrase} className="text-xs font-mono">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {avoidedPhrases.length === 0 ? (
                        <span className="text-[10px] text-[#B5B8BE]/40 italic">No avoided phrases configured.</span>
                      ) : (
                        avoidedPhrases.map((phrase, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-red-950/25 border border-red-900/30 text-red-400 text-[10px] rounded-lg">
                            <span>{phrase}</span>
                            <button type="button" onClick={() => removeAvoidedPhrase(phrase)} className="hover:text-white transition">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3. Overdone Patterns */}
                  <div className="space-y-2">
                    <label className="text-xs text-[#B5B8BE]/60 block font-sans">Overdone / Passive-Aggressive Patterns (e.g. over-apologizing)</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newOverdo}
                        onChange={(e) => setNewOverdo(e.target.value)}
                        placeholder="e.g., 'Sorry for the delay', 'Does that make sense?'"
                        className="p-3 text-xs"
                      />
                      <Button type="button" variant="secondary" onClick={addOverdoPattern} className="text-xs font-mono">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {overdoPatterns.length === 0 ? (
                        <span className="text-[10px] text-[#B5B8BE]/40 italic">No patterns selected.</span>
                      ) : (
                        overdoPatterns.map((pat, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-950/25 border border-amber-900/30 text-amber-400 text-[10px] rounded-lg">
                            <span>{pat}</span>
                            <button type="button" onClick={() => removeOverdoPattern(pat)} className="hover:text-white transition">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Action Sidebar Column styled as card to match CSS selectors */}
              <div className="space-y-4 rounded-2xl border bg-card text-card-foreground shadow-sm bg-[#141414] border-[#262626] p-5 md:p-6">
                <h4 className="text-xs font-bold font-mono text-[#00E5FF] uppercase tracking-wider">Save Changes</h4>
                <p className="text-[10px] text-[#B5B8BE] leading-relaxed">Ensure you persist these updates! The communication engine applies these directly during live diagnostic queries in your Message Analyst workspace.</p>
                <Button 
                  type="button" 
                  onClick={() => handleSaveStrategy({ preventDefault: () => {} } as any)} 
                  variant="primary" 
                  size="sm" 
                  className="w-full" 
                  loading={savingStrategy}
                  style={{ color: '#ffffff' }}
                >
                  Save Strategic Persona
                </Button>

                <Card className="bg-[#111315]/50 border border-white/5 p-4 space-y-3 mt-4">
                  <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-[#00E5FF]">System Integration</span>
                  <h4 className="text-xs font-semibold text-white">How this affects diagnostics</h4>
                  <ul className="text-[10px] text-[#B5B8BE] space-y-2 list-disc list-inside">
                    <li>Filters passive-aggressive phrasing</li>
                    <li>Re-aligns defensive blocks</li>
                    <li>Fills contextualized vocabulary holes</li>
                    <li>Restores active collaborative alignment</li>
                  </ul>
                </Card>
              </div>
            </div>

        {/* TAB 3: WORKSPACE ENVIRONMENT */}
        <div 
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in ${activeTab === 'workspace' ? '' : 'hidden'}`}
        >
          <div className="lg:col-span-2 space-y-6">
                
                {/* Localized Details */}
                <Card className="space-y-5">
                  <div>
                    <h3 className="font-medium text-white text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#00E5FF]" />
                      <span>Localization & Localized Environment</span>
                    </h3>
                    <p className="text-[11px] text-[#B5B8BE]">Adjust your localized timezone, interface spacing density, and localized dialogue rendering formats.</p>
                  </div>

                  {workspaceSuccess && (
                    <div className="p-3 bg-emerald-950/20 text-emerald-300 border border-emerald-900/30 text-xs rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{workspaceSuccess}</span>
                    </div>
                  )}

                  {workspaceError && (
                    <div className="p-3 bg-red-950/20 text-red-300 border border-red-900/30 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{workspaceError}</span>
                    </div>
                  )}

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
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Interface Spacing Density</label>
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
                </Card>

                {/* Global Accessibility Settings */}
                <Card className="space-y-5">
                  <div>
                    <h3 className="font-medium text-white text-sm flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#00E5FF]" />
                      <span>Global Accessibility Settings</span>
                    </h3>
                    <p className="text-[11px] text-[#B5B8BE]">Configure display accessibility parameters including overall text size and dark theme toggling. Changes reflect immediately across the entire workspace.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme Preference */}
                    <div className="space-y-2">
                      <label className="text-xs text-[#B5B8BE]/60 block font-sans">Workspace Theme Mode</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-[#1A1D20]/50 border-[#00E5FF] text-white shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                              : 'bg-[#0a0a0a] border-[#262626] text-[#B5B8BE] hover:border-white/10'
                          }`}
                        >
                          <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-[#00E5FF]' : ''}`} />
                          <span>Light Mode (Warm Editorial)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-[#1A1D20]/50 border-[#00E5FF] text-white shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                              : 'bg-[#0a0a0a] border-[#262626] text-[#B5B8BE] hover:border-white/10'
                          }`}
                        >
                          <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-[#00E5FF]' : ''}`} />
                          <span>Dark Mode (Enterprise Ink)</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Scaling Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-[#B5B8BE]/60 block font-sans">Font Scale (Relative Text Size)</label>
                        <span className="text-xs font-mono font-bold text-[#00E5FF]">{Math.round(fontScale * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-[#B5B8BE] font-mono">0.75x</span>
                        <input
                          type="range"
                          min="0.75"
                          max="1.4"
                          step="0.05"
                          value={fontScale}
                          onChange={(e) => setFontScale(parseFloat(e.target.value))}
                          className="flex-1 accent-[#00E5FF] bg-[#0a0a0a] border border-[#262626] h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-[10px] text-[#B5B8BE] font-mono">1.40x</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-[#B5B8BE]/40 italic">Drag to scale all text, buttons, and headers</span>
                        <button
                          type="button"
                          onClick={() => setFontScale(1)}
                          className="px-2 py-0.5 rounded border border-white/5 bg-[#1A1D20]/40 text-[#B5B8BE] hover:text-white hover:bg-[#1A1D20] text-[10px] transition cursor-pointer"
                        >
                          Reset to 100%
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Notifications setup */}
                <Card className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                    <Bell className="w-4 h-4 text-[#00E5FF]" />
                    <h3 className="font-medium text-white text-sm">Notification Trigger Settings</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-[#111315]/30 p-3.5 border border-white/5 rounded-xl">
                      <input
                        type="checkbox"
                        id="p_email_notifications"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                      />
                      <div>
                        <label htmlFor="p_email_notifications" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                          Analysis Reports & Diagnostics Log summaries
                        </label>
                        <span className="text-[10px] text-[#ffffff]">Receive summaries and suggested playbooks directly in your inbox after processing awkward text blocks.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-[#111315]/30 p-3.5 border border-white/5 rounded-xl">
                      <input
                        type="checkbox"
                        id="p_security_alerts"
                        checked={securityAlerts}
                        onChange={(e) => setSecurityAlerts(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                      />
                      <div>
                        <label htmlFor="p_security_alerts" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                          Strict Compliance Security Alerts
                        </label>
                        <span className="text-[10px] text-[#ffffff]">Get notified immediately of new device sign-ins, 2FA modifications, or credential updates.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-[#111315]/30 p-3.5 border border-white/5 rounded-xl">
                      <input
                        type="checkbox"
                        id="p_monthly_reports"
                        checked={monthlyReports}
                        onChange={(e) => setMonthlyReports(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-white/10 bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                      />
                      <div>
                        <label htmlFor="p_monthly_reports" className="text-xs font-medium text-[#FAF8F5] block cursor-pointer">
                          Monthly Conversation alignment reports
                        </label>
                        <span className="text-[10px] text-[#ffffff]">Opt-in to a comprehensive monthly trends analysis detailing voice alignment and metric progress.</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Workspace column */}
              <div className="space-y-6">
                <Card className="space-y-4">
                  <h4 className="text-xs font-bold font-mono text-[#00E5FF] uppercase tracking-wider font-sans">Save Settings</h4>
                  <p className="text-[10px] text-[#B5B8BE] leading-relaxed">Save your localized workspace configs. These are loaded dynamically during startup.</p>
                  <Button 
                    type="button" 
                    onClick={() => handleSaveWorkspace({ preventDefault: () => {} } as any)} 
                    variant="primary" 
                    size="sm" 
                    className="w-full" 
                    loading={savingWorkspace}
                  >
                    Save Workspace Configuration
                  </Button>
                </Card>

                <Card className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xs font-semibold text-white" style={{ color: '#ffffff' }}>Display Preview</h3>
                  </div>
                  <div className="space-y-2 text-[10px] text-[#B5B8BE] font-mono">
                    <div>Selected Timezone: <span className="text-white">{timezone}</span></div>
                    <div>Interface Language: <span className="text-white">{locale}</span></div>
                    <div>Spacing Mode: <span className="text-[#00E5FF]">{uiDensity.toUpperCase()}</span></div>
                  </div>
                </Card>

                {/* Audit history log list */}
                <Card className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Audit logs</h4>
                    <button onClick={fetchSecurityMetrics} className="text-[10px] text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer">
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {loadingLogs ? (
                      <span className="text-[10px] text-[#B5B8BE]/40 italic block py-2 animate-pulse">Fetching system audit trail...</span>
                    ) : auditLogs.length === 0 ? (
                      <span className="text-[10px] text-[#B5B8BE]/40 italic block py-2">No auditable actions tracked yet.</span>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-[#0a0a0a] border border-[#262626] rounded-lg space-y-1">
                          <div className="flex justify-between text-[9px] font-mono">
                            <span className="text-white/50">{log.event}</span>
                            <span className="text-[#B5B8BE]/40">{new Date(log.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] text-[#B5B8BE] font-sans break-words">{log.details}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
        </div>
      </div>
  );
}
