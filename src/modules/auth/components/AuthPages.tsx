/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Shield, KeyRound, Mail, UserPlus, Lock, RefreshCw, Check, Globe, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '../auth.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { User, UserProfile } from '../../../types';
import { saveAuthSession, authFetch } from '../../../lib/authStorage';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface AuthPageProps {
  onSuccess: (user: User, profile: UserProfile) => void;
  onNavigate: (route: string) => void;
}

// Side Content Panel to make the pages look highly premium and editorial
function AuthLayoutSideContent() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-950 border-r border-white/5 p-12 text-slate-900 dark:text-slate-100 relative overflow-hidden select-none">
      {/* Absolute faint decorative gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E85D04]/5 rounded-full blur-[120px]" />
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 z-10 cursor-pointer">
        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center border border-white/5">
          <span className="font-serif font-bold text-slate-900 dark:text-slate-100 text-sm italic">H</span>
        </div>
        <div>
          <span className="font-sans font-medium text-slate-900 dark:text-slate-100 tracking-tight text-sm">How It Lands</span>
          <p className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-mono">Communication Intelligence</p>
        </div>
      </div>

      {/* Hero Quote Card */}
      <div className="space-y-8 max-w-lg my-auto z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#00E5FF]" />
          <span>Real-time Subtext Analysis</span>
        </div>
        
        <h2 className="text-4xl font-serif font-light leading-snug text-slate-900 dark:text-slate-100 tracking-tight">
          Say what you mean, <br />
          <span className="italic font-normal text-slate-600 dark:text-slate-400">without</span> the relationship fallout.
        </h2>

        <div className="space-y-4 bg-slate-900/90 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
          <span className="text-[9px] font-mono text-[#00E5FF] uppercase tracking-widest font-bold">SAMPLE CONVERSATION RECONSTRUCTION</span>
          <div className="space-y-3 text-xs">
            <div className="border-l-2 border-red-500/30 pl-3">
              <span className="text-[#C97A7A] font-medium block">Original Awkward Draft</span>
              <p className="text-slate-600 dark:text-slate-400 italic mt-1">"Hey sorry but can you please pay the invoice... really need the cash right now so would appreciate it."</p>
            </div>
            <div className="border-l-2 border-emerald-500/30 pl-3">
              <span className="text-emerald-400 font-medium block">Strategic Rewrite</span>
              <p className="text-slate-900 dark:text-slate-100 mt-1">"This is a reminder that invoice #42 is now past due. Please let me know when we can expect the payment to clear."</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Credentials */}
      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-4 z-10 uppercase tracking-widest">
        <span>© How It Lands</span>
        <span>•</span>
        <span>Secured Environment</span>
        <span>•</span>
        <span>No LLM Leakage</span>
      </div>
    </div>
  );
}

function LoginPageContent({ onSuccess, onNavigate }: AuthPageProps) {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'verify-email' | 'forgot-password' | 'reset-password'>('login');

  // MFA & recovery states
  const [twoFactorPreAuthToken, setTwoFactorPreAuthToken] = useState<string | null>(null);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      
      const res = await authApi.oauthCallback({
        provider: 'firebase-google',
        email: fbUser.email || '',
        name: fbUser.displayName || '',
        id: fbUser.uid
      });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

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
    } catch (err: any) {
      console.error('Firebase Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

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

  // Listen for popup messages
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
        } catch (err: any) {
          setErrorMessage(err.message || 'OAuth authentication failed.');
        } finally {
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onSuccess]);

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
      } else if (authMode === 'verify-email') {
        const data = (await authApi.verifyEmail({
          email: verificationEmail,
          code: verificationCode
        })) as any;

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        // Direct login if verifyEmail minted session
        if (data.user) {
          saveAuthSession(data.token || data.sessionId, data.user, data.profile);
          onSuccess(data.user, data.profile);
          return;
        }

        // Auto log in fallback
        const loginData = await authApi.login({
          email: verificationEmail,
          passwordInput
        });

        if (loginData.error) {
          setSuccessMessage('Your email is verified! Please log in with your password.');
          setAuthMode('login');
          return;
        }

        saveAuthSession(loginData.token || loginData.sessionId, loginData.user, loginData.profile);
        onSuccess(loginData.user, loginData.profile);
      } else if (authMode === 'forgot-password') {
        const data = await authApi.forgotPassword({ email: emailInput });
        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        setResetToken(data.token || '');
        setSuccessMessage(`Recovery instructions generated. Reset token is: ${data.token}`);
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

        setSuccessMessage('Password changed successfully! Please sign in.');
        setAuthMode('login');
      }
    } catch (err: any) {
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
          setVerificationMessage(`Resent verification code: ${data.code}`);
        }
        setSuccessMessage('A fresh verification code has been dispatched.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Resend code failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 flex font-sans select-none animate-fade-in">
      <AuthLayoutSideContent />
      
      {/* Right Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/')}
          className="self-start text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 text-xs font-mono flex items-center gap-2 cursor-pointer transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to homepage</span>
        </button>

        {/* Central Card */}
        <div className="max-w-md w-full mx-auto space-y-6 my-auto">
          <div className="space-y-2 text-left">
            <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-sky-700 dark:text-[#00E5FF] rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs">
              {twoFactorPreAuthToken ? (
                <Shield className="w-6 h-6 animate-pulse" />
              ) : authMode === 'verify-email' ? (
                <Mail className="w-6 h-6" />
              ) : authMode === 'forgot-password' || authMode === 'reset-password' ? (
                <KeyRound className="w-6 h-6" />
              ) : (
                <Lock className="w-6 h-6" />
              )}
            </div>
            
            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-100 pt-2">
              {twoFactorPreAuthToken ? 'Two-Factor Challenge' : 
               authMode === 'login' ? 'Welcome back' : 
               authMode === 'verify-email' ? 'Confirm your email' : 
               authMode === 'forgot-password' ? 'Reset password' : 
               'Enter new credentials'}
            </h1>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {twoFactorPreAuthToken ? 'Enter the secure passcode from your mobile authenticator app.' : 
               authMode === 'login' ? 'Sign in to access your dashboard, custom playbooks, and strategic analyses.' : 
               authMode === 'verify-email' ? 'A validation code was generated. Confirm it below to activate access.' : 
               authMode === 'forgot-password' ? 'We will provide an authorization token to update your login credentials.' : 
               'Choose a highly secure password to safeguard your boundary workspace.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/20 border border-red-500/25 text-red-400 rounded-xl text-xs font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-medium">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {twoFactorPreAuthToken ? (
              <div className="space-y-4">
                <Input
                  label="6-Digit Verification Code"
                  type="text"
                  maxLength={6}
                  value={mfaCodeInput}
                  onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  required
                  className="text-center font-mono text-xl tracking-widest bg-white dark:bg-[#10141C]"
                />
                <Button type="submit" loading={loading} className="w-full">
                  Verify Passcode
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorPreAuthToken(null);
                    setMfaCodeInput('');
                  }}
                  className="w-full text-center text-xs text-[#00E5FF] hover:underline"
                >
                  ← Back to standard login
                </button>
              </div>
            ) : (
              <>
                {/* Email input (login/forgot) */}
                {(authMode === 'login' || authMode === 'forgot-password') && (
                  <Input
                    label="Email Address"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="strategist@gmail.com"
                    required
                  />
                )}

                {/* Password Input */}
                {authMode === 'login' && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans tracking-wide">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setAuthMode('forgot-password');
                        }}
                        className="text-[11px] text-[#00E5FF] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full p-3 bg-white dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder-[#444] transition-all"
                    />
                  </div>
                )}

                {/* Remember Me */}
                {authMode === 'login' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember_me_page"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-[#10141C] text-[#00E5FF] focus:ring-[#00E5FF]"
                    />
                    <label htmlFor="remember_me_page" className="text-[11px] text-slate-600 dark:text-slate-400 select-none cursor-pointer">
                      Keep me signed in for 30 days
                    </label>
                  </div>
                )}

                {/* Verification block */}
                {authMode === 'verify-email' && (
                  <div className="space-y-3">
                    <Input
                      label="6-Digit Code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.trim())}
                      placeholder="Enter verification code"
                      required
                      className="text-center font-mono tracking-widest text-lg"
                    />
                    {verificationMessage && (
                      <div className="p-3 bg-white/5 border border-white/5 text-slate-900 dark:text-slate-100 rounded-xl text-[11px] font-mono text-center">
                        💡 {verificationMessage}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[11px]">
                      <button
                        type="button"
                        onClick={triggerResendCode}
                        className="text-[#00E5FF] hover:underline flex items-center gap-1 bg-transparent"
                      >
                        <RefreshCw className="w-3 h-3 animate-spin-slow" /> Resend Code
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('/signup')}
                        className="text-slate-600 dark:text-slate-400 hover:underline"
                      >
                        Change Email Address
                      </button>
                    </div>
                  </div>
                )}

                {/* Reset credentials */}
                {authMode === 'reset-password' && (
                  <div className="space-y-3">
                    <Input
                      label="Reset Token"
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.trim())}
                      placeholder="Paste reset token"
                      required
                      className="font-mono text-xs"
                    />
                    <Input
                      label="New Secure Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                    />
                  </div>
                )}

                {/* Submit Action */}
                <Button type="submit" loading={loading} className="w-full py-3 mt-2 text-[10px]">
                  {authMode === 'login' ? 'Sign In' : 
                   authMode === 'verify-email' ? 'Verify Code' : 
                   authMode === 'forgot-password' ? 'Request Reset Token' : 
                   'Update Password'}
                </Button>

                {/* Social Login Section */}
                {authMode === 'login' && (
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="text-center relative">
                      <span className="bg-[#111315] px-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 relative z-10 uppercase tracking-widest">
                        Or authenticate via SSO
                      </span>
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleGoogleSignInClick}
                        className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/15 rounded-xl text-xs font-semibold text-slate-800 dark:text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <GoogleIcon />
                        Google SSO
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuthClick('microsoft')}
                        className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/15 rounded-xl text-xs font-semibold text-slate-800 dark:text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <Globe className="w-4 h-4 text-sky-400" />
                        Microsoft SSO
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </form>

          {/* Auth mode toggler links */}
          <div className="text-center pt-3 border-t border-white/5 text-xs">
            {authMode === 'login' && (
              <p className="text-slate-600 dark:text-slate-400">
                New to the workspace?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/signup')}
                  className="text-[#00E5FF] hover:underline font-semibold bg-transparent border-none cursor-pointer"
                >
                  Create free account
                </button>
              </p>
            )}
            {authMode !== 'login' && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAuthMode('login');
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 underline bg-transparent"
              >
                ← Return to standard login
              </button>
            )}
          </div>
        </div>

        {/* Small footer notice */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          By signing in, you consent to our terms of intelligence delivery. Secure socket layer active.
        </p>
      </div>
    </div>
  );
}

export function LoginPage(props: AuthPageProps) {
  return (
    <LoginPageContent {...props} />
  );
}

function SignupPageContent({ onSuccess, onNavigate }: AuthPageProps) {
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'verify-email'>('signup');

  // Verification stage
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password checker
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
      
      const res = await authApi.oauthCallback({
        provider: 'firebase-google',
        email: fbUser.email || '',
        name: fbUser.displayName || '',
        id: fbUser.uid
      });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

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
      setSuccessMessage('Successfully registered and authenticated with Google via Firebase.');
      onSuccess(res.user, res.profile);
    } catch (err: any) {
      console.error('Firebase Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (strengthCount < 4) {
          setErrorMessage('Your password is too weak. It must satisfy at least 4 criteria.');
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
          setVerificationMessage(`In sandbox mode, enter verification code: ${data.verification_code}`);
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

        // Check if verifyEmail already minted and returned the session
        if (data.user) {
          saveAuthSession(data.token || data.sessionId, data.user, data.profile);
          onSuccess(data.user, data.profile);
          return;
        }

        // Auto login fallback
        const loginData = await authApi.login({
          email: verificationEmail,
          passwordInput
        });

        if (loginData.error) {
          setSuccessMessage('Your email is verified! Proceed to sign in page.');
          onNavigate('/login');
          return;
        }

        saveAuthSession(loginData.token || loginData.sessionId, loginData.user, loginData.profile);
        onSuccess(loginData.user, loginData.profile);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signup process failed. Please check network.');
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
          setVerificationMessage(`Resent verification code: ${data.code}`);
        }
        setSuccessMessage('A fresh verification code has been dispatched.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Resend code failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 flex font-sans select-none animate-fade-in">
      <AuthLayoutSideContent />

      {/* Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        <button
          onClick={() => onNavigate('/')}
          className="self-start text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100 text-xs font-mono flex items-center gap-2 cursor-pointer transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to homepage</span>
        </button>

        <div className="max-w-md w-full mx-auto space-y-6 my-auto">
          <div className="space-y-2 text-left">
            <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 text-sky-700 dark:text-[#00E5FF] rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-xs">
              {authMode === 'verify-email' ? (
                <Mail className="w-6 h-6" />
              ) : (
                <UserPlus className="w-6 h-6" />
              )}
            </div>

            <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-100 pt-2">
              {authMode === 'verify-email' ? 'Confirm your email' : 'Create Free Workspace Account'}
            </h1>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {authMode === 'verify-email' ? 'Enter the security activation code sent to your email.' : 'Join professional boundary strategists worldwide. Build high-agency boundaries in minutes.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/20 border border-red-500/25 text-red-400 rounded-xl text-xs font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-medium">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' ? (
              <>
                <Input
                  label="Your Full Name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Robin Peterson"
                  required
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="strategist@gmail.com"
                  required
                />

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans tracking-wide block">
                    Choose Security Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      checkPasswordStrength(e.target.value);
                    }}
                    placeholder="••••••••••••"
                    required
                    className="w-full p-3 bg-white dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder-[#444] transition-all"
                  />

                  {passwordInput.length > 0 && (
                    <div className="mt-3 bg-[#1A1D20] border border-white/5 p-4 rounded-xl space-y-3 text-[11px] text-slate-600 dark:text-slate-400 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="font-mono">Strength:</span>
                        <span className={`font-semibold ${strengthCount >= 4 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {strengthLabels[Math.min(strengthCount - 1, 4)] || 'Weak'}
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full h-1 bg-[#111315] rounded-full overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-full rounded-sm transition-colors duration-300 ${
                              idx < strengthCount ? strengthColors[strengthCount - 1] : 'bg-[#111315]'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Checklist */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-[#0a0a0a] ${strengthChecks.length ? 'bg-emerald-400' : 'bg-red-400'}`}>
                            {strengthChecks.length ? '✓' : '✗'}
                          </span>
                          <span>10+ Chars</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-[#0a0a0a] ${strengthChecks.lowercase ? 'bg-emerald-400' : 'bg-red-400'}`}>
                            {strengthChecks.lowercase ? '✓' : '✗'}
                          </span>
                          <span>Lowercase</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-[#0a0a0a] ${strengthChecks.uppercase ? 'bg-emerald-400' : 'bg-red-400'}`}>
                            {strengthChecks.uppercase ? '✓' : '✗'}
                          </span>
                          <span>Uppercase</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-[#0a0a0a] ${strengthChecks.number ? 'bg-emerald-400' : 'bg-red-400'}`}>
                            {strengthChecks.number ? '✓' : '✗'}
                          </span>
                          <span>Number</span>
                        </div>
                        <div className="flex items-center gap-1.5 col-span-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-[#0a0a0a] ${strengthChecks.special ? 'bg-emerald-400' : 'bg-red-400'}`}>
                            {strengthChecks.special ? '✓' : '✗'}
                          </span>
                          <span>Special (@, #, $, etc)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" loading={loading} className="w-full py-3 text-[10px]">
                  Register Secure Account
                </Button>

                {/* Social Login option */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="text-center relative">
                    <span className="bg-[#111315] px-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 relative z-10 uppercase tracking-widest">
                      Or Sign Up with SSO
                    </span>
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/15 rounded-xl text-xs font-semibold text-slate-800 dark:text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <GoogleIcon />
                    Sign up with Google SSO
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <Input
                  label="6-Digit Code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                  placeholder="Enter verification code"
                  required
                  className="text-center font-mono tracking-widest text-lg"
                />
                {verificationMessage && (
                  <div className="p-3 bg-white/5 border border-white/5 text-slate-900 dark:text-slate-100 rounded-xl text-[11px] font-mono text-center">
                    💡 {verificationMessage}
                  </div>
                )}
                <Button type="submit" loading={loading} className="w-full">
                  Activate & Log In
                </Button>
                <div className="flex justify-between items-center text-[11px]">
                  <button
                    type="button"
                    onClick={triggerResendCode}
                    className="text-[#00E5FF] hover:underline flex items-center gap-1 bg-transparent"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-slate-600 dark:text-slate-400 hover:underline"
                  >
                    Change registration email
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Nav toggle */}
          <div className="text-center pt-3 border-t border-white/5 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-[#00E5FF] hover:underline font-semibold bg-transparent"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          By registering, you accept our standard parameters of communication boundaries.
        </p>
      </div>
    </div>
  );
}

export function SignupPage(props: AuthPageProps) {
  return (
    <SignupPageContent {...props} />
  );
}

interface LogoutPageProps {
  onLogoutComplete: () => void;
  onNavigate: (route: string) => void;
}

export function LogoutPage({ onLogoutComplete, onNavigate }: LogoutPageProps) {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    let active = true;
    
    async function triggerLogout() {
      try {
        await authFetch('/api/auth/logout', { method: 'POST' });
        if (active) {
          setStatus('success');
          // Dispatch hook to parent React state
          setTimeout(() => {
            onLogoutComplete();
          }, 1200);
        }
      } catch (err) {
        console.error('Logout error:', err);
        if (active) {
          setStatus('error');
          setTimeout(() => {
            onLogoutComplete();
          }, 2000);
        }
      }
    }

    triggerLogout();

    return () => {
      active = false;
    };
  }, [onLogoutComplete]);

  return (
    <div className="min-h-screen bg-[#111315] text-slate-900 dark:text-slate-100 flex flex-col justify-between items-center p-8 font-sans select-none animate-fade-in text-center">
      <div />

      <div className="space-y-6 max-w-sm">
        {/* Animated Visual lock */}
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto text-[#00E5FF]">
          {status === 'pending' && <RefreshCw className="w-8 h-8 animate-spin text-[#00E5FF]" />}
          {status === 'success' && <Shield className="w-8 h-8 text-emerald-400" />}
          {status === 'error' && <X className="w-8 h-8 text-red-400" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-slate-100">
            {status === 'pending' && 'Ending active workspace session...'}
            {status === 'success' && 'Logged out securely'}
            {status === 'error' && 'Failed to log out cleanly'}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {status === 'pending' && 'Clearing credential keys, cookies, and active strategic buffers from this workstation.'}
            {status === 'success' && 'Workspace closed. Safeguarding your communication history. Redirecting...'}
            {status === 'error' && 'We cleared your client session state locally for security. Returning you to home...'}
          </p>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
        🔐 How It Lands Boundary Protection Service
      </div>
    </div>
  );
}
