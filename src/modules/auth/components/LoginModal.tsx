/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Shield, KeyRound, Mail, UserPlus, Lock, RefreshCw, Check } from 'lucide-react';
import { authApi } from '../auth.api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { User, UserProfile } from '../../../types';
import { renderGoogleSignInButton } from '../../../lib/googleAuth';

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

  // Google Identity Services button (replaces Firebase's popup — see src/lib/googleAuth.ts)
  const googleButtonRef = useRef<HTMLDivElement>(null);

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

  // Handles the signed ID token from Google's own Identity Services button (see googleAuth.ts)
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
      onClose();
      if (!res.user.onboarding_completed) {
        onNavigateToOnboarding();
      }
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

        setVerificationEmail(emailInput);
        if (data.verification_code) {
          setLastSentCode(data.verification_code);
          setVerificationMessage(`In sandbox mode, enter code: ${data.verification_code}`);
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

        // Successfully verified email! Log them in now
        const loginData = await authApi.login({
          email: verificationEmail,
          passwordInput
        });

        if (loginData.error) {
          setSuccessMessage('Your email is verified! Please log in using your password.');
          setAuthMode('login');
          return;
        }

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
      <div data-theme-locked="light" className="max-w-md w-full bg-[#FAF9F6] text-[#1D1818] rounded-3xl border border-[#E5E5E0] p-8 space-y-6 relative overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#7A7570] hover:text-[#1D1818] transition-colors rounded-full hover:bg-[#EAE8E3]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security / Branding Icon */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-[#E85D04]/10 text-[#E85D04] rounded-2xl flex items-center justify-center mx-auto">
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
          
          <h2 className="text-2xl font-bold font-display tracking-tight text-[#1D1818]">
            {twoFactorPreAuthToken && 'Two-Factor Authentication'}
            {!twoFactorPreAuthToken && authMode === 'login' && 'Welcome Back'}
            {!twoFactorPreAuthToken && authMode === 'signup' && 'Create Free Account'}
            {!twoFactorPreAuthToken && authMode === 'verify-email' && 'Verify Your Email'}
            {!twoFactorPreAuthToken && authMode === 'forgot-password' && 'Reset Password'}
            {!twoFactorPreAuthToken && authMode === 'reset-password' && 'Enter New Password'}
          </h2>

          <p className="text-sm text-[#7A7570] max-w-sm mx-auto">
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
                <label className="text-xs font-medium text-[#7A7570] block text-center">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCodeInput}
                  onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  required
                  className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-center font-mono text-xl tracking-widest text-[#1D1818] focus:outline-none placeholder-[#C0BCB6]"
                />
              </div>

              <Button type="submit" loading={loading} className="w-full bg-[#E85D04] hover:bg-[#D05203] text-white">
                Verify Securely
              </Button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorPreAuthToken(null);
                  setMfaCodeInput('');
                }}
                className="w-full text-center text-xs text-[#E85D04] hover:underline"
              >
                ← Back to Login
              </button>
            </div>
          ) : (
            <>
              {/* Registration Only Fields */}
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#7A7570]">Your Name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. Robin Peterson"
                    required
                    className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-sm focus:outline-none text-[#1D1818] placeholder-[#C0BCB6]"
                  />
                </div>
              )}

              {/* Email Address */}
              {(authMode === 'login' || authMode === 'signup' || authMode === 'forgot-password') && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#7A7570]">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. strategist@gmail.com"
                    required
                    className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-sm focus:outline-none text-[#1D1818] placeholder-[#C0BCB6]"
                  />
                </div>
              )}

              {/* Password Fields with Strength Gauge */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-[#7A7570]">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSuccessMessage(null);
                          setAuthMode('forgot-password');
                        }}
                        className="text-xs text-[#E85D04] hover:underline"
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
                    className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-sm focus:outline-none text-[#1D1818] placeholder-[#C0BCB6]"
                  />

                  {/* Signup Strength Meter */}
                  {authMode === 'signup' && passwordInput.length > 0 && (
                    <div className="mt-2 space-y-2 bg-[#FAF9F6] border border-[#E5E5E0] p-3 rounded-xl animate-fade-in text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#7A7570] font-medium">Strength:</span>
                        <span className={`font-semibold ${strengthCount >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {strengthLabels[Math.min(strengthCount - 1, 4)] || 'Weak'}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-1 bg-[#EAE8E3] rounded-full overflow-hidden flex gap-0.5">
                        {[0, 1, 2, 3, 4].map((idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-full rounded-sm transition-colors duration-300 ${
                              idx < strengthCount ? strengthColors[strengthCount - 1] : 'bg-[#EAE8E3]'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Explicit Checklist */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 border-t border-[#E5E5E0] pt-2 text-[#7A7570]">
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
                    className="rounded border-[#E5E5E0] text-[#E85D04] focus:ring-[#E85D04]"
                  />
                  <label htmlFor="remember_me" className="text-xs text-[#7A7570] select-none cursor-pointer">
                    Keep me signed in for 30 days
                  </label>
                </div>
              )}

              {/* Verification Code Stage */}
              {authMode === 'verify-email' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#7A7570]">Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.trim())}
                      placeholder="Enter 6-digit code"
                      required
                      className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-center font-mono tracking-widest text-lg focus:outline-none text-[#1D1818]"
                    />
                  </div>

                  {verificationMessage && (
                    <div className="p-3 bg-[#EAE8E3] border border-[#E5E5E0] text-[#1D1818] rounded-xl text-xs font-mono text-center">
                      ⚡ {verificationMessage}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <button
                      type="button"
                      onClick={triggerResendCode}
                      className="text-[#E85D04] hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Resend Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className="text-[#7A7570] hover:underline"
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
                    <label className="text-xs font-medium text-[#7A7570]">Reset Token</label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.trim())}
                      placeholder="Paste secure token"
                      required
                      className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-xs font-mono focus:outline-none text-[#1D1818]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#7A7570]">New Security Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        checkPasswordStrength(e.target.value);
                      }}
                      placeholder="••••••••••••"
                      required
                      className="w-full p-3 bg-white border border-[#E5E5E0] focus:border-[#E85D04] rounded-xl text-sm focus:outline-none text-[#1D1818]"
                    />

                    {newPassword.length > 0 && (
                      <div className="mt-2 space-y-2 bg-[#FAF9F6] border border-[#E5E5E0] p-3 rounded-xl text-[11px] text-[#7A7570]">
                        <div className="flex items-center justify-between">
                          <span>Strength:</span>
                          <span className={`font-semibold ${strengthCount >= 4 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {strengthLabels[Math.min(strengthCount - 1, 4)]}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-[#EAE8E3] rounded-full overflow-hidden flex gap-0.5">
                          {[0, 1, 2, 3, 4].map((idx) => (
                            <div
                              key={idx}
                              className={`flex-1 h-full rounded-sm transition-colors duration-300 ${
                                idx < strengthCount ? strengthColors[strengthCount - 1] : 'bg-[#EAE8E3]'
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
              <Button type="submit" loading={loading} className="w-full bg-[#E85D04] hover:bg-[#D05203] text-white py-3 rounded-xl font-medium tracking-tight mt-2 flex items-center justify-center">
                {authMode === 'login' && 'Sign In to Workspace'}
                {authMode === 'signup' && 'Register Secure Account'}
                {authMode === 'verify-email' && 'Verify & Access'}
                {authMode === 'forgot-password' && 'Generate Reset Token'}
                {authMode === 'reset-password' && 'Confirm Password Reset'}
              </Button>

              {/* Social Login Options */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="space-y-4 pt-2 border-t border-[#E5E5E0]">
                  <div className="text-center relative">
                    <span className="bg-[#FAF9F6] px-3 text-[11px] font-medium text-[#7A7570] relative z-10">
                      OR CONNECT VIA WORKSPACE SIGN-IN
                    </span>
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#E5E5E0]" />
                  </div>

                  <div className="flex justify-center">
                    <div ref={googleButtonRef} className="flex items-center justify-center" />
                  </div>
                </div>
              )}
            </>
          )}
        </form>

        {/* Auth Mode Toggle Links */}
        {!twoFactorPreAuthToken && (
          <div className="text-center space-y-2 border-t border-[#E5E5E0] pt-4 text-xs">
            {authMode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAuthMode('signup');
                }}
                className="text-[#E85D04] hover:underline font-semibold"
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
                className="text-[#E85D04] hover:underline font-semibold"
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
                className="text-[#7A7570] hover:text-[#1D1818] underline font-semibold"
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
  return <LoginModalContent {...props} />;
}
