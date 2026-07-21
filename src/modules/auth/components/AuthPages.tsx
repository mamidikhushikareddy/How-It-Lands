/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, KeyRound, Mail, UserPlus, Lock, RefreshCw, Check, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '../auth.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { User, UserProfile } from '../../../types';
import { renderGoogleSignInButton } from '../../../lib/googleAuth';

interface AuthPageProps {
  onSuccess: (user: User, profile: UserProfile) => void;
  onNavigate: (route: string) => void;
}

// Side Content Panel to make the pages look highly premium and editorial
function AuthLayoutSideContent() {
  return (
    <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#141618] border-r border-white/5 p-12 text-[#FAF8F5] relative overflow-hidden select-none">
      {/* Absolute faint decorative gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#E85D04]/5 rounded-full blur-[120px]" />
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 z-10 cursor-pointer">
        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center border border-white/5">
          <span className="font-serif font-bold text-[#FAF8F5] text-sm italic">H</span>
        </div>
        <div>
          <span className="font-sans font-medium text-[#FAF8F5] tracking-tight text-sm">How It Lands</span>
          <p className="text-[9px] text-[#B5B8BE] uppercase tracking-wider font-mono">Communication Intelligence</p>
        </div>
      </div>

      {/* Hero Quote Card */}
      <div className="space-y-8 max-w-lg my-auto z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-[#B5B8BE] font-mono uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#00E5FF]" />
          <span>Real-time Subtext Analysis</span>
        </div>
        
        <h2 className="text-4xl font-serif font-light leading-snug text-[#FAF8F5] tracking-tight">
          Say what you mean, <br />
          <span className="italic font-normal text-[#B5B8BE]">without</span> the relationship fallout.
        </h2>

        <div className="space-y-4 bg-[#111315]/80 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
          <span className="text-[9px] font-mono text-[#00E5FF] uppercase tracking-widest font-bold">SAMPLE CONVERSATION RECONSTRUCTION</span>
          <div className="space-y-3 text-xs">
            <div className="border-l-2 border-red-500/30 pl-3">
              <span className="text-[#C97A7A] font-medium block">Original Awkward Draft</span>
              <p className="text-[#B5B8BE] italic mt-1">"Hey sorry but can you please pay the invoice... really need the cash right now so would appreciate it."</p>
            </div>
            <div className="border-l-2 border-emerald-500/30 pl-3">
              <span className="text-emerald-400 font-medium block">Strategic Rewrite</span>
              <p className="text-[#FAF8F5] mt-1">"This is a reminder that invoice #42 is now past due. Please let me know when we can expect the payment to clear."</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Credentials */}
      <div className="text-[10px] text-[#B5B8BE]/50 font-mono flex items-center gap-4 z-10 uppercase tracking-widest">
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
  const [emailInput, setEmailInput] = useState('kiaria2514@gmail.com');
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

  // Google Identity Services button (replaces Firebase's popup — see src/lib/googleAuth.ts)
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = async (credential: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      // Backend verifies this token cryptographically before trusting it — see server/routes/auth.routes.ts
      const res = await authApi.oauthCallback({ credential });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      setSuccessMessage('Successfully authenticated with Google.');
      onSuccess(res.user, res.profile);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleButtonRef.current) {
      renderGoogleSignInButton(googleButtonRef.current, handleGoogleCredential, { width: 130 }).catch((err) => {
        console.error('Failed to render Google sign-in button:', err);
      });
    }
  }, []);

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

        onSuccess(data.user, data.profile);
      } else if (authMode === 'verify-email') {
        const data = await authApi.verifyEmail({
          email: verificationEmail,
          code: verificationCode
        });

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        // Auto log in
        const loginData = await authApi.login({
          email: verificationEmail,
          passwordInput
        });

        if (loginData.error) {
          setSuccessMessage('Your email is verified! Please log in with your password.');
          setAuthMode('login');
          return;
        }

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
    <div className="min-h-screen bg-[#111315] text-[#FAF8F5] flex font-sans select-none animate-fade-in">
      <AuthLayoutSideContent />
      
      {/* Right Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/')}
          className="self-start text-[#B5B8BE] hover:text-[#FAF8F5] text-xs font-mono flex items-center gap-2 cursor-pointer transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to homepage</span>
        </button>

        {/* Central Card */}
        <div className="max-w-md w-full mx-auto space-y-6 my-auto">
          <div className="space-y-2 text-left">
            <div className="w-12 h-12 bg-white/5 text-[#00E5FF] rounded-2xl flex items-center justify-center border border-white/5">
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
            
            <h1 className="text-2xl font-bold font-display tracking-tight text-white pt-2">
              {twoFactorPreAuthToken ? 'Two-Factor Challenge' : 
               authMode === 'login' ? 'Welcome back' : 
               authMode === 'verify-email' ? 'Confirm your email' : 
               authMode === 'forgot-password' ? 'Reset password' : 
               'Enter new credentials'}
            </h1>
            
            <p className="text-xs text-[#B5B8BE] leading-relaxed">
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
                  className="text-center font-mono text-xl tracking-widest bg-[#0a0a0a]"
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
                      <label className="text-xs text-[#B5B8BE]/60 font-sans tracking-wide">
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
                      className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none placeholder-[#444] transition-all"
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
                      className="rounded border-[#262626] bg-[#0a0a0a] text-[#00E5FF] focus:ring-[#00E5FF]"
                    />
                    <label htmlFor="remember_me_page" className="text-[11px] text-[#B5B8BE] select-none cursor-pointer">
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
                      <div className="p-3 bg-white/5 border border-white/5 text-[#FAF8F5] rounded-xl text-[11px] font-mono text-center">
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
                        className="text-[#B5B8BE] hover:underline"
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
                      <span className="bg-[#111315] px-3 text-[10px] font-mono text-[#B5B8BE]/50 relative z-10 uppercase tracking-widest">
                        Or authenticate via SSO
                      </span>
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5" />
                    </div>

                    <div className="flex justify-center">
                      <div ref={googleButtonRef} className="flex items-center justify-center" />
                    </div>
                  </div>
                )}
              </>
            )}
          </form>

          {/* Auth mode toggler links */}
          <div className="text-center pt-3 border-t border-white/5 text-xs">
            {authMode === 'login' && (
              <p className="text-[#B5B8BE]">
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
                className="text-[#B5B8BE] hover:text-[#FAF8F5] underline bg-transparent"
              >
                ← Return to standard login
              </button>
            )}
          </div>
        </div>

        {/* Small footer notice */}
        <p className="text-[10px] text-[#B5B8BE]/30 text-center">
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

  // Google Identity Services button (replaces Firebase's popup — see src/lib/googleAuth.ts)
  const googleButtonRef2 = useRef<HTMLDivElement>(null);

  const handleGoogleCredential2 = async (credential: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      // Backend verifies this token cryptographically before trusting it — see server/routes/auth.routes.ts
      const res = await authApi.oauthCallback({ credential });

      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      setSuccessMessage('Successfully registered and authenticated with Google.');
      onSuccess(res.user, res.profile);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleButtonRef2.current) {
      renderGoogleSignInButton(googleButtonRef2.current, handleGoogleCredential2, { width: 130 }).catch((err) => {
        console.error('Failed to render Google sign-in button:', err);
      });
    }
  }, []);

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

        setVerificationEmail(emailInput);
        if (data.verification_code) {
          setVerificationMessage(`In sandbox mode, enter verification code: ${data.verification_code}`);
        }
        setAuthMode('verify-email');
      } else if (authMode === 'verify-email') {
        const data = await authApi.verifyEmail({
          email: verificationEmail,
          code: verificationCode
        });

        if (data.error) {
          setErrorMessage(data.error);
          return;
        }

        // Auto login
        const loginData = await authApi.login({
          email: verificationEmail,
          passwordInput
        });

        if (loginData.error) {
          setSuccessMessage('Your email is verified! Proceed to sign in page.');
          onNavigate('/login');
          return;
        }

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
    <div className="min-h-screen bg-[#111315] text-[#FAF8F5] flex font-sans select-none animate-fade-in">
      <AuthLayoutSideContent />

      {/* Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 relative">
        <button
          onClick={() => onNavigate('/')}
          className="self-start text-[#B5B8BE] hover:text-[#FAF8F5] text-xs font-mono flex items-center gap-2 cursor-pointer transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to homepage</span>
        </button>

        <div className="max-w-md w-full mx-auto space-y-6 my-auto">
          <div className="space-y-2 text-left">
            <div className="w-12 h-12 bg-white/5 text-[#00E5FF] rounded-2xl flex items-center justify-center border border-white/5">
              {authMode === 'verify-email' ? (
                <Mail className="w-6 h-6" />
              ) : (
                <UserPlus className="w-6 h-6" />
              )}
            </div>

            <h1 className="text-2xl font-bold font-display tracking-tight text-white pt-2">
              {authMode === 'verify-email' ? 'Confirm your email' : 'Create Free Workspace Account'}
            </h1>

            <p className="text-xs text-[#B5B8BE] leading-relaxed">
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
                  <label className="text-xs text-[#B5B8BE]/60 font-sans tracking-wide block">
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
                    className="w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none placeholder-[#444] transition-all"
                  />

                  {passwordInput.length > 0 && (
                    <div className="mt-3 bg-[#1A1D20] border border-white/5 p-4 rounded-xl space-y-3 text-[11px] text-[#B5B8BE] animate-fade-in">
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
                    <span className="bg-[#111315] px-3 text-[10px] font-mono text-[#B5B8BE]/50 relative z-10 uppercase tracking-widest">
                      Or Sign Up with SSO
                    </span>
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/5" />
                  </div>

                  <div className="flex justify-center">
                    <div ref={googleButtonRef2} className="flex items-center justify-center" />
                  </div>
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
                  <div className="p-3 bg-white/5 border border-white/5 text-[#FAF8F5] rounded-xl text-[11px] font-mono text-center">
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
                    className="text-[#B5B8BE] hover:underline"
                  >
                    Change registration email
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Nav toggle */}
          <div className="text-center pt-3 border-t border-white/5 text-xs">
            <p className="text-[#B5B8BE]">
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

        <p className="text-[10px] text-[#B5B8BE]/30 text-center">
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
        await fetch('/api/auth/logout', { method: 'POST' });
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
    <div className="min-h-screen bg-[#111315] text-[#FAF8F5] flex flex-col justify-between items-center p-8 font-sans select-none animate-fade-in text-center">
      <div />

      <div className="space-y-6 max-w-sm">
        {/* Animated Visual lock */}
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto text-[#00E5FF]">
          {status === 'pending' && <RefreshCw className="w-8 h-8 animate-spin text-[#00E5FF]" />}
          {status === 'success' && <Shield className="w-8 h-8 text-emerald-400" />}
          {status === 'error' && <X className="w-8 h-8 text-red-400" />}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-display tracking-tight text-white">
            {status === 'pending' && 'Ending active workspace session...'}
            {status === 'success' && 'Logged out securely'}
            {status === 'error' && 'Failed to log out cleanly'}
          </h1>
          <p className="text-xs text-[#B5B8BE] leading-relaxed">
            {status === 'pending' && 'Clearing credential keys, cookies, and active strategic buffers from this workstation.'}
            {status === 'success' && 'Workspace closed. Safeguarding your communication history. Redirecting...'}
            {status === 'error' && 'We cleared your client session state locally for security. Returning you to home...'}
          </p>
        </div>
      </div>

      <div className="text-[10px] text-[#B5B8BE]/30 font-mono uppercase tracking-widest">
        🔐 How It Lands Boundary Protection Service
      </div>
    </div>
  );
}
