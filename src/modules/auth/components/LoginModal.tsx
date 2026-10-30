/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, KeyRound, Mail, UserPlus, Lock, RefreshCw, Check, Globe } from 'lucide-react';
import { authApi } from '../auth.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { User, UserProfile } from '../../../types';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { saveAuthSession } from '../../../lib/authStorage';

// Fallback Google Client ID
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '1234567890-mockgoogleclientid.apps.googleusercontent.com';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface LoginModalProps {
  authMode: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (user: User, profile: UserProfile) => void;
  onNavigateToOnboarding: () => void;
}

function LoginModalContent({
  authMode: initialAuthMode,
  onClose,
  onSuccess,
  onNavigateToOnboarding,
}: LoginModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify-email' | 'forgot-password' | 'reset-password'>(initialAuthMode);
  
  // Input fields
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Verification states
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [lastSentCode, setLastSentCode] = useState<string | null>(null);

  // Recovery states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Loading & error handling
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 2FA login challenge state
  const [twoFactorPreAuthToken, setTwoFactorPreAuthToken] = useState<string | null>(null);
  const [mfaCodeInput, setMfaCodeInput] = useState('');

  // Password strength checks (real-time helper)
  const [strengthChecks, setStrengthChecks] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    special: false
  });

  const checkPasswordStrength = (pass: string) => {
    setStrengthChecks({
      length: pass.length >= 10,
      lowercase: /[a-z]/.test(pass),
      uppercase: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[^A-Za-z0-9]/.test(pass)
    });
  };

  const strengthCount = Object.values(strengthChecks).filter(Boolean).length;
  const strengthLabels = ['Weak', 'Fair', 'Medium', 'Strong', 'Excellent'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-emerald-500',
    'bg-teal-500'
  ];

  // Handler for Google sign-in using Firebase Auth
  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const { auth, googleProvider } = await import('../../../lib/firebase');
      const { signInWithPopup } = await import('firebase/auth');
      const { saveUserToFirestore, saveProfileToFirestore } = await import('../../../lib/firestoreService');
      
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();
      
      // Call backend callback to register/login session in Express
      const res = await authApi.oauthCallback({
        provider: 'firebase-google',
        email: fbUser.email || '',
        name: fbUser.displayName || '',
        id: fbUser.uid,
        idToken
      });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      // Save user & profile details to Firestore
      await saveUserToFirestore(fbUser.uid, {
        id: fbUser.uid,
        name: fbUser.displayName || '',
        email: fbUser.email || '',
        plan: res.user.plan || 'free',
        role: res.user.role || 'user',
        created_at: res.user.created_at || new Date().toISOString(),
        onboarding_completed: res.user.onboarding_completed || false,
        usage_count_month: res.user.usage_count_month || 0,
        credit_balance: res.user.credit_balance || 100
      });

      if (res.profile) {
        await saveProfileToFirestore(fbUser.uid, res.profile);
      }

      saveAuthSession(res.token || res.sessionId, res.user, res.profile);
      setSuccessMessage('Successfully authenticated with Google via Firebase.');
      onSuccess(res.user, res.profile);
      onClose();
      if (!res.user.onboarding_completed) {
        onNavigateToOnboarding();
      }
    } catch (err: any) {
      console.error('Firebase Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  // Listener for interactive sandbox OAuth popups
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'OAUTH_AUTH_SUCCESS') {
        setLoading(true);
        setErrorMessage(null);
        try {
          const res = await authApi.oauthCallback({
            provider: event.data.provider,
            email: event.data.email,
            name: event.data.name,
            id: event.data.id
          });

          if (res.error) {
            setErrorMessage(res.error);
            return;
          }

          onSuccess(res.user, res.profile);
          onClose();
          if (!res.user.onboarding_completed) {
            onNavigateToOnboarding();
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'OAuth authentication failed.');
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onSuccess, onClose, onNavigateToOnboarding]);

  const handleOAuthClick = (provider: string) => {
    setErrorMessage(null);
    const width = 480;
    const height = 550;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      `/auth/mock-oauth-login?provider=${provider}`,
      `OAuth_Connect_${provider}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (twoFactorPreAuthToken) {
        const data = await authApi.loginVerify2fa({
          preAuthToken: twoFactorPreAuthToken,
          code: mfaCodeInput,
        });

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        saveAuthSession(data.token || data.sessionId, data.user, data.profile);
        onSuccess(data.user, data.profile);
        onClose();
        return;
      }

      if (authMode === 'login') {
        const data = await authApi.login({
          email: emailInput,
          passwordInput,
          rememberMe
        });

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        if (data.two_factor_required && data.pre_auth_token) {
          setTwoFactorPreAuthToken(data.pre_auth_token);
          return;
        }

        saveAuthSession(data.token || data.sessionId, data.user, data.profile);
        onSuccess(data.user, data.profile);
        onClose();
      } else if (authMode === 'signup') {
        // Enforce robust validation
        if (strengthCount < 4) {
          setErrorMessage('Your password is too weak. It must meet at least 4 of the strength criteria.');
          return;
        }

        const data = await authApi.signup({
          name: nameInput || emailInput.split('@')[0],
          email: emailInput,
          passwordInput,
        });

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        if (data.user) {
          saveAuthSession(data.token || data.sessionId, data.user, data.profile);
        }

        setVerificationEmail(emailInput);
        if (data.verification_code) {
          setLastSentCode(data.verification_code);
          setVerificationMessage(`In sandbox mode, enter code: ${data.verification_code}`);
        }
        setAuthMode('verify-email');
      } else if (authMode === 'verify-email') {
        const data = (await authApi.verifyEmail({
          email: verificationEmail,
          code: verificationCode
        })) as any;

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        // Check if verifyEmail already established the session directly
        if (data.user) {
          saveAuthSession(data.token || data.sessionId, data.user, data.profile);
          onSuccess(data.user, data.profile);
          onClose();
          onNavigateToOnboarding();
          return;
        }

        // Fallback login
        const loginData = await authApi.login({
          email: verificationEmail,
          passwordInput
        });

        if (loginData.error) {
          setSuccessMessage('Your email is verified! Please log in using your password.');
          setAuthMode('login');
          return;
        }

        saveAuthSession(loginData.token || loginData.sessionId, loginData.user, loginData.profile);
        onSuccess(loginData.user, loginData.profile);
        onClose();
        onNavigateToOnboarding();
      } else if (authMode === 'forgot-password') {
        const data = await authApi.forgotPassword({ email: emailInput });
        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        setResetToken(data.token || '');
        setSuccessMessage(`Password recovery instructions generated. Token: ${data.token}`);
        setAuthMode('reset-password');
      } else if (authMode === 'reset-password') {
        const data = await authApi.resetPassword({
          token: resetToken,
          newPasswordInput: newPassword
        });

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        setSuccessMessage('Password changed successfully! Please log in.');
        setAuthMode('login');
      }
    } catch (err: any) {
      console.error('Authentication process failed:', err);
      setErrorMessage(err.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerResendCode = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const data = await authApi.resendVerification({ email: verificationEmail });
      if (data.error) {
        setErrorMessage(data.error);
      } else {
        if (data.code) {
          setLastSentCode(data.code);
          setVerificationMessage(`Resent verification code: ${data.code}`);
        }
        setSuccessMessage('A fresh verification code was sent.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Resend code failed.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-[#141821] text-slate-900 dark:text-slate-100 rounded-3xl border border-slate-200 dark:border-white/10 p-8 space-y-6 relative overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 transition-colors rounded-full hover:bg-slate-100 dark:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security / Branding Icon */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/40 rounded-2xl flex items-center justify-center mx-auto">
            {twoFactorPreAuthToken ? (
              <Shield className="w-6 h-6 animate-pulse" />
            ) : authMode === 'verify-email' ? (
              <Mail className="w-6 h-6" />
            ) : authMode === 'forgot-password' || authMode === 'reset-password' ? (
              <KeyRound className="w-6 h-6" />
            ) : authMode === 'signup' ? (
              <UserPlus className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-100">
            {twoFactorPreAuthToken && 'Two-Factor Authentication'}
            {!twoFactorPreAuthToken && authMode === 'login' && 'Welcome Back'}
            {!twoFactorPreAuthToken && authMode === 'signup' && 'Create Free Account'}
            {!twoFactorPreAuthToken && authMode === 'verify-email' && 'Verify Your Email'}
            {!twoFactorPreAuthToken && authMode === 'forgot-password' && 'Reset Password'}
            {!twoFactorPreAuthToken && authMode === 'reset-password' && 'Enter New Password'}
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {twoFactorPreAuthToken && 'This session requires validation. Please check your secure Authenticator app.'}
            {!twoFactorPreAuthToken && authMode === 'login' && 'Calibrate your voice and get instant strategic analysis on boundaries, tough responses, and emails.'}
            {!twoFactorPreAuthToken && authMode === 'signup' && 'Join professional communicators globally and run your conversations safely.'}
            {!twoFactorPreAuthToken && authMode === 'verify-email' && `A validation code has been generated. Please confirm it below to activate your secure access.`}
            {!twoFactorPreAuthToken && authMode === 'forgot-password' && 'No worries. We will provide instructions and a verification token to update your login credentials securely.'}
            {!twoFactorPreAuthToken && authMode === 'reset-password' && 'Choose a strong password to resume strategic insights.'}
          </p>
        </div>

        {/* Global Messages */}
        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-medium animate-shake">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-xl text-xs font-medium">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {twoFactorPreAuthToken ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block text-center">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCodeInput}
                  onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  required
                  className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-center font-mono text-xl tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <Button type="submit" loading={loading} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md font-semibold">
                Verify Securely
              </Button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorPreAuthToken(null);
                  setMfaCodeInput('');
                }}
                className="w-full text-center text-xs text-cyan-700 dark:text-cyan-400 font-semibold hover:underline"
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <>
              {/* Registration Only Fields */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Your Name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Robin Peterson"
                    required
                    className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* Email Address */}
              {(authMode === 'login' || authMode === 'signup' || authMode === 'forgot-password') && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. strategist@gmail.com"
                    required
                    className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* Password Fields with Strength Gauge */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setAuthMode('forgot-password');
                        }}
                        className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authMode === 'signup') checkPasswordStrength(e.target.value);
                    }}
                    placeholder="••••••••••••"
                    required
                    className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />

                  {/* Signup Strength Meter */}
                  {authMode === 'signup' && passwordInput.length > 0 && (
                    <div className="mt-2 space-y-2 bg-[#FAF9F6] border border-slate-200 dark:border-white/10 p-3 rounded-xl animate-fade-in text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Strength:</span>
                        <span className={`font-semibold ${strengthCount >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {strengthLabels[Math.min(strengthCount - 1, 4)] || 'Weak'}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-full rounded-sm transition-colors duration-300 ${
                              idx < strengthCount ? strengthColors[strengthCount - 1] : 'bg-slate-100 dark:bg-white/10'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Explicit Checklist */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 border-t border-slate-200 dark:border-white/10 pt-2 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${strengthChecks.length ? 'bg-emerald-500' : 'bg-red-400'}`}>
                            {strengthChecks.length ? '✓' : '✗'}
                          </span>
                          <span>10+ Characters</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${strengthChecks.lowercase ? 'bg-emerald-500' : 'bg-red-400'}`}>
                            {strengthChecks.lowercase ? '✓' : '✗'}
                          </span>
                          <span>Lowercase (a-z)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${strengthChecks.uppercase ? 'bg-emerald-500' : 'bg-red-400'}`}>
                            {strengthChecks.uppercase ? '✓' : '✗'}
                          </span>
                          <span>Uppercase (A-Z)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${strengthChecks.number ? 'bg-emerald-500' : 'bg-red-400'}`}>
                            {strengthChecks.number ? '✓' : '✗'}
                          </span>
                          <span>Number (0-9)</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white ${strengthChecks.special ? 'bg-emerald-500' : 'bg-red-400'}`}>
                            {strengthChecks.special ? '✓' : '✗'}
                          </span>
                          <span>Special Character (@, #, $, etc)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Remember Me Option */}
              {authMode === 'login' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember_me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-200 dark:border-white/10 text-cyan-700 dark:text-cyan-400 font-semibold focus:ring-[#E85D04]"
                  />
                  <label htmlFor="remember_me" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                    Keep me signed in for 30 days
                  </label>
                </div>
              )}

              {/* Verification Code Stage */}
              {authMode === 'verify-email' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.trim())}
                      placeholder="Enter 6-digit code"
                      required
                      className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-center font-mono tracking-widest text-lg focus:outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {verificationMessage && (
                    <div className="p-3 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-mono text-center">
                      ⚡ {verificationMessage}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <button
                      type="button"
                      onClick={triggerResendCode}
                      className="text-cyan-700 dark:text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className="text-slate-600 dark:text-slate-400 hover:underline"
                    >
                      Use another email
                    </button>
                  </div>
                </div>
              )}

              {/* Password Recovery - Token Reset stage */}
              {authMode === 'reset-password' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Reset Token</label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.trim())}
                      placeholder="Paste secure token"
                      required
                      className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-xs font-mono focus:outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">New Security Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        checkPasswordStrength(e.target.value);
                      }}
                      placeholder="••••••••••••"
                      required
                      className="w-full p-3 bg-white border border-slate-200 dark:border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-sm focus:outline-none text-slate-900 dark:text-slate-100"
                    />

                    {newPassword.length > 0 && (
                      <div className="mt-2 space-y-2 bg-[#FAF9F6] border border-slate-200 dark:border-white/10 p-3 rounded-xl text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Strength:</span>
                          <span className={`font-semibold ${strengthCount >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {strengthLabels[Math.min(strengthCount - 1, 4)]}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden flex gap-0.5">
                          {[0, 1, 2, 3, 4].map((idx) => (
                            <div
                              key={idx}
                              className={`flex-1 h-full rounded-sm transition-colors duration-300 ${
                                idx < strengthCount ? strengthColors[strengthCount - 1] : 'bg-slate-100 dark:bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Submit Button */}
              <Button type="submit" loading={loading} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md font-semibold py-3 rounded-xl font-medium tracking-tight mt-2 flex items-center justify-center">
                {authMode === 'login' && 'Sign In to Workspace'}
                {authMode === 'signup' && 'Register Secure Account'}
                {authMode === 'verify-email' && 'Verify & Access'}
                {authMode === 'forgot-password' && 'Generate Reset Token'}
                {authMode === 'reset-password' && 'Confirm Password Reset'}
              </Button>

              {/* Social Login Options */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="text-center relative">
                    <span className="bg-[#FAF9F6] px-3 text-[11px] font-medium text-slate-600 dark:text-slate-400 relative z-10">
                      OR CONNECT VIA WORKSPACE SIGN-IN
                    </span>
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#E5E5E0]" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignInClick}
                      className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 dark:border-white/10 hover:bg-[#FAF9F6] rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer"
                    >
                      <GoogleIcon />
                      Google Sign-In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuthClick('microsoft')}
                      className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 dark:border-white/10 hover:bg-[#FAF9F6] rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 transition-colors cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-blue-500" />
                      Microsoft Link
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </form>

        {/* Auth Mode Toggle Links */}
        {!twoFactorPreAuthToken && (
          <div className="text-center space-y-2 border-t border-slate-200 dark:border-white/10 pt-4 text-xs">
            {authMode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAuthMode('signup');
                }}
                className="text-cyan-700 dark:text-cyan-400 font-semibold hover:underline font-semibold"
              >
                Don't have a workspace? Create Account Free
              </button>
            )}
            
            {authMode === 'signup' && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAuthMode('login');
                }}
                className="text-cyan-700 dark:text-cyan-400 font-semibold hover:underline font-semibold"
              >
                Already registered? Sign In
              </button>
            )}

            {(authMode === 'forgot-password' || authMode === 'reset-password' || authMode === 'verify-email') && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAuthMode('login');
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 underline font-semibold"
              >
                ← Return to Login Page
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoginModal(props: LoginModalProps) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginModalContent {...props} />
    </GoogleOAuthProvider>
  );
}
