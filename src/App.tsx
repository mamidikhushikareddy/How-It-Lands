/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, MessageSquare, History, Bookmark, BookOpen, 
  Settings, Award, LogOut, Shield, Menu, X, ArrowRight,
  TrendingUp, Play, Zap, CheckCircle2, Lock, FileText, User as UserIcon,
  CreditCard, Search, Sun, Moon
} from 'lucide-react';
import { User, UserProfile, Analysis, Template, Playbook, BlogPost, Testimonial } from './types';
import Marketing from './modules/marketing/components/Marketing';
import SubPages from './modules/marketing/components/SubPages';
import Onboarding from './modules/onboarding/components/Onboarding';
import Dashboard from './modules/dashboard/components/Dashboard';
import AnalyzeWorkspace from './modules/analysis/components/AnalyzeWorkspace';
import SavedVault from './modules/vault/components/SavedVault';
import Playbooks from './modules/playbooks/components/Playbooks';
import AdminPanel from './modules/admin/components/AdminPanel';
import SecurityPanel from './modules/security/components/SecurityPanel';
import ProfilePanel from './modules/profile/components/ProfilePanel';
import { LoginModal } from './modules/auth/components/LoginModal';
import { LoginPage, SignupPage, LogoutPage } from './modules/auth/components/AuthPages';
import { isAdminTier } from './lib/config';

export default function App() {
  // Global Database & State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Navigation & Authentication
  const [route, setRoute] = useState<string>('/');
  const [loading, setLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [emailInput, setEmailInput] = useState<string>('kiaria2514@gmail.com');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [twoFactorPreAuthToken, setTwoFactorPreAuthToken] = useState<string | null>(null);
  const [mfaCodeInput, setMfaCodeInput] = useState<string>('');

  // Secondary sub-state
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [selectedScenarioShortcut, setSelectedScenarioShortcut] = useState<string | null>(null);
  const [selectedDraftShortcut, setSelectedDraftShortcut] = useState<string | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');

  // Accessibility and Theme settings
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app-theme') as 'light' | 'dark') || 'light';
  });
  const [fontScale, setFontScale] = useState<number>(() => {
    return parseFloat(localStorage.getItem('app-font-scale') || '1');
  });

  // Apply theme and fontScale on mount/change
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-scale', fontScale.toString());
    localStorage.setItem('app-font-scale', fontScale.toString());
  }, [fontScale]);

  // Load state from backend on mount
  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/state`);
      const data = await res.json();
      
      setUser(data.user);
      setProfile(data.profile);
      setAnalyses(data.analyses || []);
      setTemplates(data.templates || []);
      setPlaybooks(data.playbooks || []);
      setBlogPosts(data.blog_posts || []);
      setTestimonials(data.testimonials || []);

      if (data.user && (data.user.role === 'admin' || data.user.role === 'super_admin')) {
        try {
          const uRes = await fetch('/api/admin/users');
          const uData = await uRes.json();
          if (uData.success) {
            setUsers(uData.users);
          }
        } catch (ue) {
          console.error('Failed to pre-fetch admin users:', ue);
        }
      }

      // If user has completed onboarding and we are at root, redirect to app dashboard
      if (data.user && data.user.onboarding_completed && route === '/') {
        setRoute('/app/dashboard');
      } else if (data.user && !data.user.onboarding_completed) {
        setRoute('/onboarding');
      }
    } catch (e) {
      console.error('Failed to load state from backend:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch admin users:', e);
    }
  };

  useEffect(() => {
    if (route === '/app/admin' && user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchAdminUsers();
    }
  }, [route, user]);

  // Handles onboarding completion
  const handleOnboardingComplete = async (profileData: Partial<UserProfile>) => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setProfile(data.profile);
        setRoute('/app/dashboard');
      }
    } catch (e) {
      console.error('Onboarding update failed:', e);
    } finally {
      setLoading(false);
    }
  };

  // Handles premium plan upgrading override
  const handleUpgradePlan = async (plan: 'pro' | 'plus') => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        alert(`Successfully upgraded to premium ${plan.toUpperCase()}! You now have unlimited strategic analyses.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Submit dynamic strategic analysis using backend Gemini SDK
  const handleAnalyze = async (payload: {
    original_message: string;
    scenario: string;
    relationship_context: string;
    user_goal: string;
    extra_context?: string;
    tone_settings: any;
    preferences: Record<string, any>;
    target_language?: string;
  }) => {
    if (!user) return;
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        if (data.gateType === 'usage_limit') {
          handleUpgradePlan('pro');
        }
        return;
      }
      if (data.success) {
        const newAnalysis = data.analysis;
        setAnalyses([newAnalysis, ...analyses]);
        return newAnalysis;
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    }
  };

  // Handle save bookmark toggle
  const handleSaveToggle = async (analysisId: string, saved: boolean) => {
    try {
      const res = await fetch('/api/analyses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId, saved })
      });
      const data = await res.json();
      if (data.success) {
        setAnalyses(analyses.map(a => a.id === analysisId ? { ...a, saved } : a));
      }
    } catch (e) {
      console.error('Failed to toggle save:', e);
    }
  };

  // Delete analysis
  const handleDeleteAnalysis = async (id: string) => {
    try {
      const res = await fetch(`/api/analyses/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setAnalyses(analyses.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Backoffice admin manager operations
  const handleAdminAction = async (payload: {
    type: 'template' | 'playbook' | 'blog' | 'testimonial' | 'user';
    action: 'save' | 'delete' | 'update';
    item: any;
  }) => {
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.status >= 400 || !data.success) {
        alert(data.error || 'Admin operation failed.');
        return;
      }
      if (data.success) {
        // Reload global state to reflect updates cleanly
        fetchState();
        if (payload.type === 'user') {
          fetchAdminUsers();
        }
      }
    } catch (e) {
      console.error('Admin operation failed:', e);
      alert('Network or server error during admin operation.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // If we are currently responding to a 2FA challenge, route to verification instead
      if (twoFactorPreAuthToken) {
        const res = await fetch('/api/auth/2fa/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pre_auth_token: twoFactorPreAuthToken, code: mfaCodeInput })
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          return;
        }
        setUser(data.user);
        setProfile(data.profile);
        setAuthMode(null);
        setTwoFactorPreAuthToken(null);
        setMfaCodeInput('');
        setPasswordInput('');
        if (data.user?.onboarding_completed) {
          setRoute('/app/dashboard');
        } else {
          setRoute('/onboarding');
        }
        return;
      }

      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, password: passwordInput })
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          return;
        }

        // If 2FA is required, transition the login window state to challenge view
        if (data.two_factor_required) {
          setTwoFactorPreAuthToken(data.pre_auth_token);
          return;
        }

        setUser(data.user);
        setProfile(data.profile);
        setAuthMode(null);
        setPasswordInput('');
        if (data.user?.onboarding_completed) {
          setRoute('/app/dashboard');
        } else {
          setRoute('/onboarding');
        }
      } else if (authMode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: nameInput || emailInput.split('@')[0], 
            email: emailInput, 
            password: passwordInput 
          })
        });
        const data = await res.json();
        if (data.error) {
          alert(data.error);
          return;
        }
        setUser(data.user);
        setProfile(data.profile);
        setAuthMode(null);
        setPasswordInput('');
        setNameInput('');
        setRoute('/onboarding');
      }
    } catch (err) {
      console.error('Auth action failed:', err);
      alert('Internal authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    } finally {
      setUser(null);
      setProfile(null);
      setAnalyses([]);
      setRoute('/');
      setMobileMenuOpen(false);
      setLoading(false);
    }
  };

  // Router dispatcher
  const renderPage = () => {
    if (route === '/') {
      return (
        <Marketing 
          onNavigate={(r) => {
            setRoute(r);
          }} 
          onLogin={() => setRoute('/login')} 
        />
      );
    }

    if (route === '/login') {
      return (
        <LoginPage 
          onSuccess={(u, p) => {
            setUser(u);
            setProfile(p);
            if (u.onboarding_completed) {
              setRoute('/app/dashboard');
            } else {
              setRoute('/onboarding');
            }
          }}
          onNavigate={setRoute}
        />
      );
    }

    if (route === '/signup') {
      return (
        <SignupPage 
          onSuccess={(u, p) => {
            setUser(u);
            setProfile(p);
            if (u.onboarding_completed) {
              setRoute('/app/dashboard');
            } else {
              setRoute('/onboarding');
            }
          }}
          onNavigate={setRoute}
        />
      );
    }

    if (route === '/logout') {
      return (
        <LogoutPage 
          onLogoutComplete={() => {
            setUser(null);
            setProfile(null);
            setRoute('/');
          }}
          onNavigate={setRoute}
        />
      );
    }

    if (route === '/onboarding') {
      if (!user) return <div className="text-center py-20 text-xs text-[#B5B8BE]">Loading account details...</div>;
      return <Onboarding user={user} onComplete={handleOnboardingComplete} />;
    }

    // Secondary marketing templates or generic content
    if (['/features', '/how-it-works', '/examples', '/faq', '/privacy', '/terms'].includes(route)) {
      return (
        <SubPages 
          route={route} 
          onNavigate={(r) => setRoute(r)} 
        />
      );
    }

    // App Logged-in shell
    if (route.startsWith('/app')) {
      if (!user || !profile) return <div className="text-center py-20 text-xs text-[#B5B8BE]">Retrieving security credentials...</div>;

      return (
        <div className="min-h-screen bg-[#111315] text-[#FAF8F5] flex flex-col md:flex-row font-sans">
          
          {/* Desktop Sidebar (Left: Cols 2) */}
          <aside className="hidden md:flex flex-col justify-between w-64 bg-[#111315] border-r border-white/5 p-5 text-xs h-screen sticky top-0">
            <div className="space-y-6">
              {/* App Logo */}
              <div className="flex items-center gap-3 cursor-pointer pb-4 border-b border-white/5" onClick={() => setRoute('/app/dashboard')}>
                <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center">
                  <span className="font-serif font-bold text-[#FAF8F5] text-sm italic">H</span>
                </div>
                <div>
                  <span className="font-sans font-medium text-[#FAF8F5] tracking-tight">How It Lands</span>
                  <p className="text-[9px] text-[#B5B8BE] uppercase tracking-wider font-mono">WORKSPACE</p>
                </div>
              </div>

              {/* Navigation links */}
              <div className="space-y-1 font-sans">
                <button 
                  onClick={() => { setRoute('/app/dashboard'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/dashboard' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                >
                  <TrendingUp className="w-4 h-4 opacity-70" />
                  <span>Workspace</span>
                </button>

                <button 
                  onClick={() => setRoute('/app/analyze')}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/analyze' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                >
                  <MessageSquare className="w-4 h-4 opacity-70" />
                  <span>Message Analyst</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/vault'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/vault' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                >
                  <Bookmark className="w-4 h-4 opacity-70" />
                  <span>Personal Vault</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/templates'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/templates' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                >
                  <FileText className="w-4 h-4 opacity-70" />
                  <span>Library & Starters</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/playbooks'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/playbooks' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                >
                  <BookOpen className="w-4 h-4 opacity-70" />
                  <span>Strategy Playbooks</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/profile'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/profile' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                >
                  <UserIcon className="w-4 h-4 opacity-70 text-white/50" />
                  <span>Profile & Settings</span>
                </button>

                {isAdminTier(user?.role) && (
                  <button 
                    onClick={() => { setRoute('/app/admin'); setSelectedAnalysis(null); }}
                    className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/admin' ? 'bg-[#1A1D20] text-[#FAF8F5] font-medium' : 'text-[#B5B8BE] hover:text-[#FAF8F5] hover:bg-[#1A1D20]/50'}`}
                  >
                    <Settings className="w-4 h-4 opacity-70" />
                    <span>Admin Terminal</span>
                  </button>
                )}
              </div>

              {/* Accessibility Controls Widget */}
              <div className="border-t border-white/5 pt-4 space-y-3 font-sans">
                <span className="text-[9px] text-[#B5B8BE]/60 uppercase tracking-wider font-mono block">Accessibility</span>
                
                {/* Theme Toggle Button */}
                <div className="flex items-center justify-between">
                  <span className="text-[#B5B8BE] text-[11px]">Interface Theme</span>
                  <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="p-1.5 rounded-lg bg-[#1A1D20]/40 hover:bg-[#1A1D20] text-[#B5B8BE] hover:text-[#FAF8F5] border border-white/5 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title={theme === 'light' ? "Switch to Dark Theme" : "Switch to Light Theme"}
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="w-3.5 h-3.5 text-[#B5B8BE]" />
                        <span className="text-[9px] font-mono">Dark</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-3.5 h-3.5 text-[#00E5FF]" />
                        <span className="text-[9px] font-mono text-[#00E5FF]">Light</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Font Size Adjuster */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#B5B8BE] text-[11px]">Font Scale</span>
                    <span className="text-[9px] font-mono bg-[#1A1D20]/60 px-1.5 py-0.5 rounded text-white/80">{Math.round(fontScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFontScale(Math.max(0.75, fontScale - 0.05))}
                      className="flex-1 py-1 text-center bg-[#1A1D20]/40 hover:bg-[#1A1D20] text-[#B5B8BE] hover:text-[#FAF8F5] border border-white/5 rounded text-[10px] font-medium transition cursor-pointer"
                      title="Decrease text size"
                      disabled={fontScale <= 0.75}
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontScale(1)}
                      className="px-2 py-1 bg-[#1A1D20]/40 hover:bg-[#1A1D20] text-[#B5B8BE] hover:text-[#FAF8F5] border border-white/5 rounded text-[10px] font-mono transition cursor-pointer"
                      title="Reset text size"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFontScale(Math.min(1.4, fontScale + 0.05))}
                      className="flex-1 py-1 text-center bg-[#1A1D20]/40 hover:bg-[#1A1D20] text-[#B5B8BE] hover:text-[#FAF8F5] border border-white/5 rounded text-[10px] font-medium transition cursor-pointer"
                      title="Increase text size"
                      disabled={fontScale >= 1.4}
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile footer section */}
            <div className="border-t border-white/5 pt-4 font-sans">
              <div className="relative group/account flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-[#1A1D20]/40 transition duration-300">
                <div 
                  onClick={() => { setRoute('/app/profile'); setSelectedAnalysis(null); }}
                  className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1A1D20] flex items-center justify-center border border-white/5 shrink-0 transition group-hover/account:border-[#00E5FF]/30">
                    <UserIcon className="w-4 h-4 text-[#B5B8BE] group-hover/account:text-[#00E5FF] transition" />
                  </div>
                  <div className="overflow-hidden min-w-0 pr-2">
                    <span className="font-medium text-[#FAF8F5] block truncate transition text-xs">{user.name}</span>
                    <span className="text-[9px] text-[#B5B8BE]/60 uppercase block font-mono tracking-wider">{user.plan} account</span>
                  </div>
                </div>

                {/* Hover-reveal Logout Button */}
                <button 
                  onClick={() => setRoute('/logout')}
                  className="opacity-0 group-hover/account:opacity-100 translate-x-2 group-hover/account:translate-x-0 transition-all duration-300 bg-[#1A1D20] hover:bg-red-950 text-[#B5B8BE] hover:text-red-200 px-2.5 py-1.5 rounded-lg border border-white/5 hover:border-red-500/20 shadow-lg cursor-pointer flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-mono shrink-0"
                  title="Logout securely"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile Header (Dropdown drawers) */}
          <header className="md:hidden border-b border-white/5 bg-[#111315] px-6 h-14 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-2" onClick={() => setRoute('/app/dashboard')}>
              <div className="w-7 h-7 bg-white/15 rounded flex items-center justify-center">
                <span className="font-serif font-bold text-[#FAF8F5] text-xs">H</span>
              </div>
              <span className="font-sans font-medium text-[#FAF8F5] tracking-tight text-xs">How It Lands</span>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[#B5B8BE] hover:text-[#FAF8F5]">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#111315] border-b border-white/5 p-6 space-y-4 absolute top-14 left-0 right-0 z-50 text-xs">
              <button onClick={() => { setRoute('/app/dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-[#B5B8BE]">Workspace</button>
              <button onClick={() => { setRoute('/app/analyze'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-[#B5B8BE]">Message Analyst</button>
              <button onClick={() => { setRoute('/app/vault'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-[#B5B8BE]">Saved Vault</button>
              <button onClick={() => { setRoute('/app/templates'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-[#B5B8BE]">Starters & Templates</button>
              <button onClick={() => { setRoute('/app/playbooks'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-[#B5B8BE]">Playbooks</button>
              <button onClick={() => { setRoute('/app/profile'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-[#B5B8BE]">Profile & Settings</button>
              {isAdminTier(user?.role) && (
                <button onClick={() => { setRoute('/app/admin'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-red-400">Admin Panel</button>
              )}
              
              {/* Mobile Accessibility Controls */}
              <div className="border-t border-white/5 pt-3 space-y-3">
                <span className="text-[9px] text-[#B5B8BE]/60 uppercase tracking-wider font-mono block">Accessibility</span>
                <div className="flex items-center justify-between">
                  <span className="text-[#B5B8BE] text-[11px]">Theme</span>
                  <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="py-1 px-3 rounded-lg bg-[#1A1D20] text-[#B5B8BE] hover:text-white border border-white/5 transition flex items-center gap-1.5 cursor-pointer text-[10px]"
                  >
                    {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-[#00E5FF]" />}
                    <span>{theme === 'light' ? "Dark Theme" : "Light Theme"}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#B5B8BE] text-[11px]">Font Scale ({Math.round(fontScale * 100)}%)</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFontScale(Math.max(0.75, fontScale - 0.05))}
                      className="px-2 py-1 bg-[#1A1D20] text-[#B5B8BE] border border-white/5 rounded text-[10px] cursor-pointer"
                      disabled={fontScale <= 0.75}
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontScale(1)}
                      className="px-2 py-1 bg-[#1A1D20] text-[#B5B8BE] border border-white/5 rounded text-[10px] cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFontScale(Math.min(1.4, fontScale + 0.05))}
                      className="px-2 py-1 bg-[#1A1D20] text-[#B5B8BE] border border-white/5 rounded text-[10px] cursor-pointer"
                      disabled={fontScale >= 1.4}
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => { setRoute('/logout'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-red-500 font-semibold border-t border-white/5 pt-3">Logout</button>
            </div>
          )}

          {/* Core App View dispatcher */}
          <main className="flex-1 p-6 md:p-8 min-h-screen overflow-y-auto bg-[#111315]">
            {route === '/app/dashboard' && (
              <Dashboard 
                user={user} 
                profile={profile} 
                analyses={analyses} 
                onNavigate={(r) => {
                  if (r.startsWith('/app/scenarios/')) {
                    const scene = r.split('/').pop() || null;
                    setSelectedScenarioShortcut(scene);
                    setRoute('/app/analyze');
                  } else {
                    setRoute(r);
                  }
                }}
                onSelectAnalysis={(item) => {
                  setSelectedAnalysis(item);
                  setRoute('/app/analyze');
                }}
              />
            )}

            {route === '/app/analyze' && (
              <AnalyzeWorkspace 
                userId={user.id}
                userPlan={user.plan}
                trialActive={user.trial_active}
                initialAnalysis={selectedAnalysis}
                onAnalyze={handleAnalyze}
                onSaveAnalysis={handleSaveToggle}
                onUpgradePlan={() => setRoute('/app/profile')}
                selectedScenarioFromShortcuts={selectedScenarioShortcut}
                onClearScenarioShortcut={() => setSelectedScenarioShortcut(null)}
                initialDraftText={selectedDraftShortcut}
                onClearInitialDraftText={() => setSelectedDraftShortcut(null)}
              />
            )}

            {route === '/app/vault' && (
              <SavedVault 
                analyses={analyses}
                onSelectAnalysis={(item) => {
                  setSelectedAnalysis(item);
                  setRoute('/app/analyze');
                }}
                onDeleteAnalysis={handleDeleteAnalysis}
                onSaveToggle={handleSaveToggle}
              />
            )}

            {route === '/app/templates' && (() => {
              const filteredTemplates = templates.filter((t) => {
                const query = templateSearchQuery.toLowerCase().trim();
                if (!query) return true;
                return (
                  t.title.toLowerCase().includes(query) ||
                  t.category.toLowerCase().includes(query)
                );
              });

              return (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="border-b border-[#262626] pb-4 space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#00E5FF] font-bold">PRE-BUILT STARTERS DISPATCH</span>
                    <h1 className="text-2xl font-light font-display text-white">Scenario Templates Library</h1>
                    <p className="text-xs text-[#a0a0a0]">Choose an awkward draft starter to customize and run through our strategy diagnostics.</p>
                  </div>

                  {/* Search Input Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search templates by title or category..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full pl-4 pr-16 py-3 bg-[#141414] border border-[#262626] focus:border-[#00E5FF]/40 rounded-xl text-xs text-white placeholder-[#888] focus:outline-none transition font-sans font-light"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 gap-2.5 text-[#888]">
                      {templateSearchQuery && (
                        <button
                          onClick={() => setTemplateSearchQuery('')}
                          className="hover:text-white transition flex items-center justify-center"
                          title="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div 
                        style={{ backgroundColor: '#fbf8e5' }}
                        className="p-1.5 rounded-lg flex items-center justify-center"
                      >
                        <Search className="w-4 h-4 text-black" />
                      </div>
                    </div>
                  </div>

                  {filteredTemplates.length === 0 ? (
                    <div className="py-16 text-center space-y-4 bg-[#141414] border border-[#262626] rounded-2xl max-w-md mx-auto">
                      <Search className="w-10 h-10 text-[#888] opacity-30 mx-auto animate-pulse" />
                      <div className="space-y-1.5 px-6">
                        <h3 className="text-white font-sans font-medium text-sm">No templates found</h3>
                        <p className="text-xs text-[#a0a0a0] leading-relaxed">
                          We couldn't find any scenario templates matching <span className="text-cyan-400 font-mono">"{templateSearchQuery}"</span>. Try searching for other terms or categories.
                        </p>
                      </div>
                      <button 
                        onClick={() => setTemplateSearchQuery('')}
                        style={{ backgroundColor: '#7F6000', color: '#FFFFFF', borderColor: '#ffff18' }}
                        className="px-4 py-2 text-xs font-semibold hover:opacity-90 text-white rounded-lg transition border"
                      >
                        Clear Search Query
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredTemplates.map((t) => (
                        <div 
                          key={t.id}
                          className="p-5 bg-[#141414] border border-[#262626] hover:border-[#00E5FF]/20 transition rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden"
                        >
                          <div className="space-y-2">
                            <span className="text-[9px] uppercase font-mono bg-[#00E5FF]/5 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/10 w-fit block font-bold">
                              {t.category}
                            </span>
                            <h4 className="font-bold text-white text-sm">{t.title}</h4>
                            <p className="text-xs text-[#a0a0a0] leading-relaxed italic line-clamp-3">
                              "{t.draft}"
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedAnalysis(null);
                              setSelectedScenarioShortcut(t.scenario || 'general');
                              setSelectedDraftShortcut(t.draft);
                              setRoute('/app/analyze');
                            }}
                            style={{ backgroundColor: '#7F6000', color: '#FFFFFF' }}
                            className="w-full py-2.5 rounded-xl hover:opacity-90 font-semibold text-xs transition text-center"
                          >
                            Customize & Analyze Starter
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {route === '/app/playbooks' && <Playbooks dbPlaybooks={playbooks} />}

            {(route === '/app/profile' || route === '/app/security') && (
              <ProfilePanel 
                user={user} 
                onUpdateUser={(updatedUser) => {
                  setUser(updatedUser);
                }} 
                profile={profile}
                onUpdateProfile={(updatedProfile) => {
                  setProfile(updatedProfile);
                }}
                theme={theme}
                setTheme={setTheme}
                fontScale={fontScale}
                setFontScale={setFontScale}
              />
            )}

            {route === '/app/admin' && isAdminTier(user?.role) && (
              <AdminPanel 
                users={users}
                templates={templates}
                playbooks={playbooks}
                blog_posts={blogPosts}
                testimonials={testimonials}
                onAdminAction={handleAdminAction}
                currentUser={user || undefined}
              />
            )}
          </main>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {renderPage()}

      {/* Beautiful Authentication Modals */}
      {authMode && (
        <LoginModal
          authMode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(u, p) => {
            setUser(u);
            setProfile(p);
            if (u.onboarding_completed) {
              setRoute('/app/dashboard');
            } else {
              setRoute('/onboarding');
            }
          }}
          onNavigateToOnboarding={() => setRoute('/onboarding')}
        />
      )}
    </div>
  );
}
