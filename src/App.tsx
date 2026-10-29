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
import { notify } from './components/ui/Toast';
import { saveAuthSession, clearAuthSession, getStoredUser, getStoredProfile, authFetch } from './lib/authStorage';

export default function App() {
  // Global Database & State (initialized from persistent storage for zero-flash auth)
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [profile, setProfile] = useState<UserProfile | null>(() => getStoredProfile());
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
  const [emailInput, setEmailInput] = useState<string>('');
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
      root.classList.add('dark');
      root.classList.add('dark-theme');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.remove('dark-theme');
      root.setAttribute('data-theme', 'light');
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

  // Firebase Auth sync effect
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    async function initFirebaseSync() {
      try {
        const { auth } = await import('./lib/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        const { getProfileFromFirestore, getAnalysesFromFirestore } = await import('./lib/firestoreService');

        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            console.log('Firebase sync active for user:', fbUser.uid);
            try {
              const fbProfile = await getProfileFromFirestore(fbUser.uid);
              if (fbProfile) {
                setProfile(fbProfile);
              }
              const fbAnalyses = await getAnalysesFromFirestore(fbUser.uid);
              if (fbAnalyses) {
                setAnalyses(fbAnalyses);
              }
            } catch (err) {
              console.error('Failed to sync data from Firestore:', err);
            }
          }
        });
      } catch (err) {
        console.error('Failed to initialize Firebase Auth Sync:', err);
      }
    }

    initFirebaseSync();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const fetchState = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/state`);
      const data = await res.json();
      
      if (data.user) {
        setUser(data.user);
        setProfile(data.profile);
        saveAuthSession(data.token || data.sessionId, data.user, data.profile);
      }
      setAnalyses(data.analyses || []);
      setTemplates(data.templates || []);
      setPlaybooks(data.playbooks || []);
      setBlogPosts(data.blog_posts || []);
      setTestimonials(data.testimonials || []);

      if (data.user && (data.user.role === 'admin' || data.user.role === 'super_admin')) {
        try {
          const uRes = await authFetch('/api/admin/users');
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
      const res = await authFetch('/api/admin/users');
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
      const res = await authFetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setProfile(data.profile);

        // Sync profile to Firestore
        try {
          const { auth } = await import('./lib/firebase');
          if (auth.currentUser) {
            const { saveProfileToFirestore } = await import('./lib/firestoreService');
            await saveProfileToFirestore(auth.currentUser.uid, data.profile || profileData as UserProfile);
          }
        } catch (syncErr) {
          console.error('Failed to sync completed profile to Firestore:', syncErr);
        }

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
      const res = await authFetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);

        // Sync upgraded user details to Firestore
        try {
          const { auth } = await import('./lib/firebase');
          if (auth.currentUser) {
            const { saveUserToFirestore } = await import('./lib/firestoreService');
            await saveUserToFirestore(auth.currentUser.uid, {
              ...user,
              plan: plan
            });
          }
        } catch (syncErr) {
          console.error('Failed to sync upgraded user to Firestore:', syncErr);
        }

        notify(`Successfully upgraded to premium ${plan.toUpperCase()}! You now have unlimited strategic analyses.`, 'success');
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
      const res = await authFetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        notify(data.error, 'error');
        if (data.gateType === 'usage_limit') {
          handleUpgradePlan('pro');
        }
        return;
      }
      if (data.success) {
        const newAnalysis = data.analysis;
        setAnalyses([newAnalysis, ...analyses]);

        // Sync new analysis to Firestore
        try {
          const { auth } = await import('./lib/firebase');
          if (auth.currentUser) {
            const { saveAnalysisToFirestore } = await import('./lib/firestoreService');
            await saveAnalysisToFirestore(auth.currentUser.uid, newAnalysis);
          }
        } catch (syncErr) {
          console.error('Failed to sync new analysis to Firestore:', syncErr);
        }

        return newAnalysis;
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    }
  };

  // Handle save bookmark toggle
  const handleSaveToggle = async (analysisId: string, saved: boolean) => {
    try {
      const res = await authFetch('/api/analyses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: analysisId, saved })
      });
      const data = await res.json();
      if (data.success) {
        setAnalyses(analyses.map(a => a.id === analysisId ? { ...a, saved } : a));

        // Sync saved status to Firestore
        try {
          const { auth } = await import('./lib/firebase');
          if (auth.currentUser) {
            const { saveAnalysisToFirestore } = await import('./lib/firestoreService');
            const target = analyses.find(a => a.id === analysisId);
            if (target) {
              await saveAnalysisToFirestore(auth.currentUser.uid, { ...target, saved });
            }
          }
        } catch (syncErr) {
          console.error('Failed to sync saved toggle to Firestore:', syncErr);
        }
      }
    } catch (e) {
      console.error('Failed to toggle save:', e);
    }
  };

  // Delete analysis
  const handleDeleteAnalysis = async (id: string) => {
    try {
      const res = await authFetch(`/api/analyses/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setAnalyses(analyses.filter(a => a.id !== id));

        // Sync delete to Firestore
        try {
          const { auth } = await import('./lib/firebase');
          if (auth.currentUser) {
            const { deleteAnalysisFromFirestore } = await import('./lib/firestoreService');
            await deleteAnalysisFromFirestore(auth.currentUser.uid, id);
          }
        } catch (syncErr) {
          console.error('Failed to sync deleted analysis to Firestore:', syncErr);
        }
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
      const res = await authFetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.status >= 400 || !data.success) {
        notify(data.error || 'Admin operation failed.', 'error');
        return;
      }
      if (data.success) {
        notify('Operation successful.', 'success');
        // Reload global state to reflect updates cleanly
        fetchState();
        if (payload.type === 'user') {
          fetchAdminUsers();
        }
      }
    } catch (e) {
      console.error('Admin operation failed:', e);
      notify('Network or server error during admin operation.', 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // If we are currently responding to a 2FA challenge, route to verification instead
      if (twoFactorPreAuthToken) {
        const res = await authFetch('/api/auth/2fa/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pre_auth_token: twoFactorPreAuthToken, code: mfaCodeInput })
        });
        const data = await res.json();
        if (data.error) {
          notify(data.error, 'error');
          return;
        }
        saveAuthSession(data.token || data.sessionId, data.user, data.profile);
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
        const res = await authFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput, password: passwordInput })
        });
        const data = await res.json();
        if (data.error) {
          notify(data.error, 'error');
          return;
        }

        // If 2FA is required, transition the login window state to challenge view
        if (data.two_factor_required) {
          setTwoFactorPreAuthToken(data.pre_auth_token);
          return;
        }

        saveAuthSession(data.token || data.sessionId, data.user, data.profile);
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
        const res = await authFetch('/api/auth/signup', {
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
          notify(data.error, 'error');
          return;
        }
        saveAuthSession(data.token || data.sessionId, data.user, data.profile);
        setUser(data.user);
        setProfile(data.profile);
        setAuthMode(null);
        setPasswordInput('');
        setNameInput('');
        setRoute('/onboarding');
      }
    } catch (err) {
      console.error('Auth action failed:', err);
      notify('Internal authentication error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      try {
        const { auth } = await import('./lib/firebase');
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      } catch (authErr) {
        console.error('Firebase signout failed:', authErr);
      }
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    } finally {
      clearAuthSession();
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
            saveAuthSession(undefined, u, p);
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
            saveAuthSession(undefined, u, p);
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
            clearAuthSession();
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
      if (!user || !profile) return <div className="text-center py-20 text-xs text-slate-500 dark:text-slate-400">Retrieving security credentials...</div>;

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans">
          
          {/* Desktop Sidebar (Left: Cols 2) */}
          <aside className="hidden md:flex flex-col justify-between w-64 bg-white dark:bg-[#151B28] border-r border-slate-200 dark:border-slate-800 p-5 text-xs h-screen sticky top-0 shadow-xs transition-colors duration-200">
            <div className="space-y-6">
              {/* App Logo */}
              <div className="flex items-center gap-3 cursor-pointer pb-4 border-b border-slate-200 dark:border-white/10" onClick={() => setRoute('/app/dashboard')}>
                <div className="w-7 h-7 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded flex items-center justify-center font-bold">
                  <span className="font-serif text-sm italic">H</span>
                </div>
                <div>
                  <span className="font-sans font-semibold text-slate-900 dark:text-white tracking-tight">How It Lands</span>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">WORKSPACE</p>
                </div>
              </div>

              {/* Navigation links */}
              <div className="space-y-1 font-sans">
                <button 
                  onClick={() => { setRoute('/app/dashboard'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/dashboard' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <TrendingUp className="w-4 h-4 opacity-70" />
                  <span>Workspace</span>
                </button>

                <button 
                  onClick={() => setRoute('/app/analyze')}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/analyze' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <MessageSquare className="w-4 h-4 opacity-70" />
                  <span>Message Analyst</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/vault'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/vault' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Bookmark className="w-4 h-4 opacity-70" />
                  <span>Personal Vault</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/templates'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/templates' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <FileText className="w-4 h-4 opacity-70" />
                  <span>Library & Starters</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/playbooks'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/playbooks' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <BookOpen className="w-4 h-4 opacity-70" />
                  <span>Strategy Playbooks</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/profile'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/profile' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <UserIcon className="w-4 h-4 opacity-70 " />
                  <span>Profile & Settings</span>
                </button>

                <button 
                  onClick={() => { setRoute('/app/admin'); setSelectedAnalysis(null); }}
                  className={`w-full py-2 px-3 rounded-lg text-left transition flex items-center gap-2.5 ${route === '/app/admin' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Settings className="w-4 h-4 opacity-70" />
                  <span>Admin Terminal</span>
                </button>
              </div>

              {/* Accessibility Controls Widget */}
              <div className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-3 font-sans">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono block font-semibold">Accessibility</span>
                
                {/* Theme Toggle Button */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">Interface Theme</span>
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 transition cursor-pointer ${
                        theme === 'light'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="Set Light Theme"
                    >
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 transition cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-[#151B28] text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="Set Dark Theme"
                    >
                      <Moon className="w-3 h-3 text-sky-400" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Font Size Adjuster */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">Font Scale</span>
                    <span className="text-[9px] font-mono bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200 font-semibold">{Math.round(fontScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFontScale(Math.max(0.75, fontScale - 0.05))}
                      className="flex-1 py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:border-white/10 rounded text-[10px] font-medium transition cursor-pointer"
                      title="Decrease text size"
                      disabled={fontScale <= 0.75}
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontScale(1)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:border-white/10 rounded text-[10px] font-mono transition cursor-pointer"
                      title="Reset text size"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFontScale(Math.min(1.4, fontScale + 0.05))}
                      className="flex-1 py-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:border-white/10 rounded text-[10px] font-medium transition cursor-pointer"
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
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 font-sans">
              <div className="relative group/account flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition duration-200">
                <div 
                  onClick={() => { setRoute('/app/profile'); setSelectedAnalysis(null); }}
                  className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 shrink-0 transition group-hover/account:border-sky-500 dark:group-hover/account:border-cyan-400">
                    <UserIcon className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover/account:text-sky-600 dark:group-hover/account:text-cyan-400 transition" />
                  </div>
                  <div className="overflow-hidden min-w-0 pr-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate transition text-xs">{user.name}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase block font-mono tracking-wider font-medium">{user.plan} account</span>
                  </div>
                </div>

                {/* Hover-reveal Logout Button */}
                <button 
                  onClick={() => setRoute('/logout')}
                  className="opacity-0 group-hover/account:opacity-100 translate-x-2 group-hover/account:translate-x-0 transition-all duration-200 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950 dark:text-slate-300 dark:hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-mono shrink-0"
                  title="Logout securely"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile Header (Dropdown drawers) */}
          <header className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151B28] px-6 h-14 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRoute('/app/dashboard')}>
              <div className="w-7 h-7 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded flex items-center justify-center">
                <span className="font-serif font-bold text-xs">H</span>
              </div>
              <span className="font-sans font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-xs">How It Lands</span>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </header>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white dark:bg-[#151B28] border-b border-slate-200 dark:border-slate-800 p-6 space-y-2 absolute top-14 left-0 right-0 z-50 text-xs shadow-xl">
              <button onClick={() => { setRoute('/app/dashboard'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Workspace</button>
              <button onClick={() => { setRoute('/app/analyze'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Message Analyst</button>
              <button onClick={() => { setRoute('/app/vault'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Saved Vault</button>
              <button onClick={() => { setRoute('/app/templates'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Starters & Templates</button>
              <button onClick={() => { setRoute('/app/playbooks'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Playbooks</button>
              <button onClick={() => { setRoute('/app/profile'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">Profile & Settings</button>
              <button onClick={() => { setRoute('/app/admin'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 px-3 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium">Admin Panel</button>
              
              {/* Mobile Accessibility Controls */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono block font-semibold">Accessibility</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">Interface Theme</span>
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 transition cursor-pointer ${
                        theme === 'light'
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono flex items-center gap-1 transition cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-[#151B28] text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <Moon className="w-3 h-3 text-sky-400" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">Font Scale ({Math.round(fontScale * 100)}%)</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFontScale(Math.max(0.75, fontScale - 0.05))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                      disabled={fontScale <= 0.75}
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontScale(1)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setFontScale(Math.min(1.4, fontScale + 0.05))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded text-[10px] font-medium transition cursor-pointer"
                      disabled={fontScale >= 1.4}
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => { setRoute('/logout'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-rose-600 dark:text-rose-400 font-semibold border-t border-slate-200 dark:border-slate-800 pt-3">Logout</button>
            </div>
          )}

          {/* Core App View dispatcher */}
          <main className="flex-1 p-6 md:p-8 min-h-screen overflow-y-auto bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100">
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
                  <div className="border-b border-slate-200 dark:border-white/10 pb-4 space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#00E5FF] font-bold">PRE-BUILT STARTERS DISPATCH</span>
                    <h1 className="text-2xl font-light font-display text-slate-900 dark:text-slate-100">Scenario Templates Library</h1>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Choose an awkward draft starter to customize and run through our strategy diagnostics.</p>
                  </div>

                  {/* Search Input Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search templates by title or category..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full pl-4 pr-16 py-3 bg-white dark:bg-[#141821] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition font-sans"
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
                      <div className="p-2 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <Search className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {filteredTemplates.length === 0 ? (
                    <div className="py-16 text-center space-y-4 bg-white dark:bg-[#14171B] border border-black/10 dark:border-white/10 rounded-2xl max-w-md mx-auto p-6 shadow-sm">
                      <Search className="w-10 h-10 text-gray-400 opacity-40 mx-auto" />
                      <div className="space-y-1.5 px-6">
                        <h3 className="text-gray-900 dark:text-white font-sans font-medium text-sm">No templates found</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          We couldn't find any scenario templates matching <span className="text-[#00A6B8] dark:text-[#00D2E0] font-mono">"{templateSearchQuery}"</span>. Try searching for other terms or categories.
                        </p>
                      </div>
                      <button 
                        onClick={() => setTemplateSearchQuery('')}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-800 dark:text-gray-200 transition border border-black/10 dark:border-white/10 cursor-pointer"
                      >
                        Clear Search Query
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {filteredTemplates.map((t) => (
                        <div 
                          key={t.id}
                          className="p-5 bg-white dark:bg-[#14171B] border border-black/10 dark:border-white/10 hover:border-[#00D2E0]/40 transition-all duration-200 rounded-xl flex flex-col justify-between space-y-4 shadow-sm"
                        >
                          <div className="space-y-2.5">
                            <span className="text-[10px] uppercase font-mono bg-[#00D2E0]/10 text-[#00A6B8] dark:text-[#00D2E0] px-2.5 py-0.5 rounded border border-[#00D2E0]/20 w-fit block font-semibold tracking-wider">
                              {t.category}
                            </span>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{t.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic line-clamp-3">
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
                            className="w-full py-2.5 rounded-lg font-medium text-xs transition text-center bg-[#111418] dark:bg-white text-white dark:text-[#0D0F12] hover:bg-[#23272E] dark:hover:bg-gray-100 shadow-sm cursor-pointer"
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

            {route === '/app/playbooks' && <Playbooks />}

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

            {route === '/app/admin' && (
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {renderPage()}

      {/* Beautiful Authentication Modals */}
      {authMode && (
        <LoginModal
          authMode={authMode}
          onClose={() => setAuthMode(null)}
          onSuccess={(u, p) => {
            saveAuthSession(undefined, u, p);
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
