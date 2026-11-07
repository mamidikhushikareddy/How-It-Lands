/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { getConsentStatus, acceptAllConsent, rejectAllConsent, setConsent, onConsentChange, ConsentPreferences } from '../../lib/analytics/consent';

export function ConsentBanner() {
  const [consent, setConsentState] = useState<ConsentPreferences>(() => getConsentStatus());
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [replayOptIn, setReplayOptIn] = useState(false);

  useEffect(() => {
    return onConsentChange((newConsent) => {
      setConsentState(newConsent);
    });
  }, []);

  if (consent.hasResponded) {
    return null;
  }

  const handleAcceptAll = () => {
    acceptAllConsent();
  };

  const handleRejectAll = () => {
    rejectAllConsent();
  };

  const handleSaveCustom = () => {
    setConsent({
      analytics: analyticsOptIn,
      replay: replayOptIn
    });
  };

  return (
    <aside
      aria-label="Privacy & Analytics Preferences"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-lg z-50 p-5 rounded-2xl bg-white/95 dark:bg-[#151B28]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl text-xs font-sans transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex-1 space-y-1.5">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <span>Privacy & Analytics Choices</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal">
              Zero Content Tracking
            </span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
            We use privacy-preserving, pseudonymous analytics (GA4, Mixpanel, Amplitude) to improve product reliability. 
            We <strong>never</strong> record your confidential drafts, message text, AI responses, or credentials.
          </p>

          {showCustomizer && (
            <div className="pt-3 pb-2 space-y-3 border-t border-slate-200 dark:border-slate-800 text-[11px]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">Strictly Necessary</span>
                  <span className="text-slate-500 text-[10px]">Session state, authentication, and core application security.</span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Always Active</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">Product Performance Analytics</span>
                  <span className="text-slate-500 text-[10px]">Pseudonymous metrics on latency, feature usage, and conversion.</span>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsOptIn}
                  onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                  aria-label="Toggle Product Performance Analytics"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">Diagnostic Session Replay</span>
                  <span className="text-slate-500 text-[10px]">Clarity visual heatmaps and anonymized interaction paths with text masked.</span>
                </div>
                <input
                  type="checkbox"
                  checked={replayOptIn}
                  onChange={(e) => setReplayOptIn(e.target.checked)}
                  aria-label="Toggle Diagnostic Session Replay"
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-2">
            {!showCustomizer ? (
              <>
                <button
                  onClick={handleAcceptAll}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-[11px] hover:opacity-90 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept All</span>
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[11px] transition cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowCustomizer(true)}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Customize</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveCustom}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-[11px] hover:bg-blue-700 transition cursor-pointer shadow-xs"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setShowCustomizer(false)}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 text-[11px] transition cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
