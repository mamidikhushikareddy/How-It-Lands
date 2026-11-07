/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Check, Sun, Moon } from 'lucide-react';
import { User, UserProfile } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface OnboardingProps {
  user: User;
  onComplete: (profileData: Partial<UserProfile>) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

function OptionCard({
  selected,
  onClick,
  title,
  description,
  disabled = false,
  ariaLabel
}: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel || title}
      disabled={disabled}
      onClick={onClick}
      className={`relative w-full rounded-2xl p-4 text-left transition-all duration-200 select-none cursor-pointer flex items-center justify-between gap-4 border text-left outline-none ${
        selected
          ? 'bg-sky-50/90 dark:bg-cyan-950/40 border-sky-600 dark:border-cyan-400 ring-1 ring-sky-600/30 dark:ring-cyan-400/30 shadow-xs'
          : 'bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
      } focus-visible:ring-2 focus-visible:ring-sky-500 dark:focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#151B28] disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex-1 min-w-0 pr-1">
        <p
          className={`font-semibold text-sm transition-colors duration-150 ${
            selected
              ? 'text-sky-950 dark:text-cyan-100'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {title}
        </p>
        {description && (
          <p
            className={`text-xs mt-1 leading-relaxed transition-colors duration-150 ${
              selected
                ? 'text-sky-900/80 dark:text-slate-300 font-normal'
                : 'text-slate-600 dark:text-slate-400 font-normal'
            }`}
          >
            {description}
          </p>
        )}
      </div>

      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
          selected
            ? 'bg-sky-600 dark:bg-cyan-400 text-white dark:text-slate-950 shadow-xs'
            : 'border-2 border-slate-300 dark:border-slate-600 bg-transparent'
        }`}
        aria-hidden="true"
      >
        {selected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
      </div>
    </button>
  );
}

export default function Onboarding({ user, onComplete, theme: externalTheme, onToggleTheme }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [useCase, setUseCase] = useState<'personal' | 'work' | 'both'>('both');
  const [style, setStyle] = useState<string>('apologetic');
  const [overdo, setOverdo] = useState<string[]>(['overexplain']);
  const [tonePref, setTonePref] = useState<string>('kind but direct');
  const [scenariosHelp, setScenariosHelp] = useState<string>('boundaries');

  // Internal theme tracking fallback if external handler is not provided
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app-theme') as 'light' | 'dark';
      if (stored) return stored;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const activeTheme = externalTheme || localTheme;

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      setLocalTheme(nextTheme);
      const root = document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
        root.classList.add('dark-theme');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.remove('dark-theme');
        root.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('app-theme', nextTheme);
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Complete and submit profile adjustments
      onComplete({
        communication_style: style,
        overdo_patterns: overdo,
        preferred_tone: tonePref,
        default_scenario: scenariosHelp,
        notes: `User mostly wants help in: ${useCase} context. Main interest: ${scenariosHelp}.`
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleOverdo = (pattern: string) => {
    if (overdo.includes(pattern)) {
      setOverdo(overdo.filter(p => p !== pattern));
    } else {
      setOverdo([...overdo, pattern]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
      <div className="max-w-xl w-full bg-white dark:bg-[#151B28] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-7 relative overflow-hidden shadow-xl transition-colors duration-200">
        {/* Ambient subtle glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/5 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Steps header & Progress indicators */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg flex items-center justify-center font-bold font-mono text-sm border border-slate-200 dark:border-slate-700">
              {step}
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono font-medium block">
                Step {step} of 5
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                {step === 1 && "Personalize Your Account"}
                {step === 2 && "Communication Style Diagnosis"}
                {step === 3 && "Difficult Scenario Focus"}
                {step === 4 && "Preferred Output Tone"}
                {step === 5 && "Onboarding Complete"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step progress bars */}
            <div className="flex gap-1.5 items-center" aria-label={`Progress: Step ${step} of 5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= step
                      ? 'bg-sky-600 dark:bg-cyan-400 w-5 sm:w-6'
                      : 'bg-slate-200 dark:bg-slate-800 w-3 sm:w-4'
                  }`}
                />
              ))}
            </div>

            {/* In-onboarding theme toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {activeTheme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic step rendering */}
        <div className="min-h-[280px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <h3 className="text-2xl font-light font-serif text-slate-900 dark:text-slate-100">
                  Welcome to{' '}
                  <span className="font-serif italic text-sky-700 dark:text-cyan-400 font-normal">
                    How It Lands
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  We customize the strategic communication assistant specifically around your daily relationships and text dynamics. Where do you face difficult messages most?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1" role="radiogroup" aria-label="Target communication context">
                <OptionCard
                  selected={useCase === 'personal'}
                  onClick={() => setUseCase('personal')}
                  title="Personal & Dating"
                  description="Breakups, dating apps, family discussions, friendship tensions."
                />

                <OptionCard
                  selected={useCase === 'work'}
                  onClick={() => setUseCase('work')}
                  title="Workplace & Clients"
                  description="Overdue bills, boss negotiations, out-of-scope requests, salary asks."
                />

                <OptionCard
                  selected={useCase === 'both'}
                  onClick={() => setUseCase('both')}
                  title="Fully Blended (Both contexts)"
                  description="A comprehensive split profile analyzing professional and private texts."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <h3 className="text-xl font-light font-serif text-slate-900 dark:text-slate-100">
                  Identify your default{' '}
                  <span className="italic font-normal text-sky-700 dark:text-cyan-400">
                    communication tendencies
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  How do you typically tend to come across when a message feels stressful or awkward? We calibrate feedback based on these presets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" role="radiogroup" aria-label="Default communication style">
                {[
                  { id: 'apologetic', title: 'Too Apologetic', desc: 'Starting requests with apologies' },
                  { id: 'cold', title: 'Too Cold/Blunt', desc: 'Appearing rude without intent' },
                  { id: 'wordy', title: 'Too Wordy', desc: 'Overexplaining reasons' },
                  { id: 'indirect', title: 'Too Indirect/Vague', desc: 'Cushioning actual demands' }
                ].map((item) => (
                  <OptionCard
                    key={item.id}
                    selected={style === item.id}
                    onClick={() => setStyle(item.id)}
                    title={item.title}
                    description={item.desc}
                  />
                ))}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Which behaviors do you want our AI strategist to proactively flag?
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'overexplain', label: 'Overexplaining' },
                    { id: 'apologize too much', label: 'Excessive Apologies' },
                    { id: 'sound too cold', label: 'Sounding Too Cold' },
                    { id: 'indirect asks', label: 'Indirect Asks' },
                    { id: 'loophole invites', label: 'Leaving Loopholes' },
                    { id: 'guilt frames', label: 'Guilt Pressure' }
                  ].map((p) => {
                    const isChecked = overdo.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="checkbox"
                        aria-checked={isChecked}
                        onClick={() => toggleOverdo(p.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer select-none outline-none ${
                          isChecked
                            ? 'bg-sky-100 hover:bg-sky-200/90 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-sky-900 dark:text-cyan-200 border-sky-500 dark:border-cyan-400 ring-1 ring-sky-500/20 dark:ring-cyan-400/20'
                            : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/70 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        } focus-visible:ring-2 focus-visible:ring-sky-500 dark:focus-visible:ring-cyan-400`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 text-sky-700 dark:text-cyan-300 stroke-[2.5]" />}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <h3 className="text-xl font-light font-serif text-slate-900 dark:text-slate-100">
                  What conversation type{' '}
                  <span className="italic font-normal text-sky-700 dark:text-cyan-400">
                    worries you most?
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  We pre-configure your dashboard workspace and default scenarios around this selection.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" role="radiogroup" aria-label="Target scenario focus">
                {[
                  { id: 'boundaries', label: 'Setting Boundaries & Saying No' },
                  { id: 'apology', label: 'Apologies & Repair' },
                  { id: 'client-money', label: 'Client Payments & Rates' },
                  { id: 'breakup', label: 'Breakups & Ending Things' },
                  { id: 'workplace', label: 'Salary Negotiate & Workplace' },
                  { id: 'general', label: 'General Awkward Situations' }
                ].map((s) => (
                  <OptionCard
                    key={s.id}
                    selected={scenariosHelp === s.id}
                    onClick={() => setScenariosHelp(s.id)}
                    title={s.label}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1.5">
                <h3 className="text-xl font-light font-serif text-slate-900 dark:text-slate-100">
                  Choose your default{' '}
                  <span className="italic font-normal text-sky-700 dark:text-cyan-400">
                    tone archetype
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-light">
                  When rewriting draft texts, how do you prefer the default strategic recommendation to feel?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-1" role="radiogroup" aria-label="Default tone archetype">
                {[
                  {
                    id: 'kind but direct',
                    title: 'Kind but Direct (Recommended)',
                    desc: "Optimally balanced. Deeply respectful but doesn't leave room for debate."
                  },
                  {
                    id: 'soft but boundaried',
                    title: 'Soft but Boundaried',
                    desc: 'Warmer, highly relational, but keeps core constraints perfectly clear.'
                  },
                  {
                    id: 'concise and confident',
                    title: 'Concise and Confident',
                    desc: 'No fluff. Extreme economy of words. Best for business or past-due situations.'
                  },
                  {
                    id: 'professional and direct',
                    title: 'Professional and Direct',
                    desc: 'Perfect for work dynamics. Focuses on achievements and outcomes.'
                  }
                ].map((t) => (
                  <OptionCard
                    key={t.id}
                    selected={tonePref === t.id}
                    onClick={() => setTonePref(t.id)}
                    title={t.title}
                    description={t.desc}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-5 animate-fade-in py-2">
              <div className="w-14 h-14 bg-sky-100 dark:bg-cyan-950/40 text-sky-700 dark:text-cyan-300 rounded-2xl flex items-center justify-center mx-auto border border-sky-200 dark:border-cyan-800/50 shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-light font-serif text-slate-900 dark:text-slate-100">
                  Calibration{' '}
                  <span className="italic font-normal text-sky-700 dark:text-cyan-400">
                    Complete!
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto font-sans font-normal">
                  Your strategy engine is now fully tuned to your communication voice. You are ready to start analyzing texts and crafting pristine boundaries.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl text-xs max-w-sm mx-auto space-y-2.5 text-left font-sans shadow-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-medium uppercase">
                    Profile Preset:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold uppercase font-mono text-xs">
                    {style}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-medium uppercase">
                    Behavior Flags:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold font-mono text-xs truncate">
                    {overdo.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] font-medium uppercase">
                    Target Tone:
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold capitalize font-mono text-xs truncate">
                    {tonePref}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5">
          <button
            type="button"
            onClick={handleBack}
            className={`flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-transparent border-none cursor-pointer py-2 px-1 ${
              step === 1 ? 'opacity-0 cursor-default pointer-events-none' : ''
            }`}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <Button
            onClick={handleNext}
            variant="primary"
            size="md"
            className="flex items-center gap-2 font-semibold shadow-xs"
          >
            {step === 5 ? "Launch Dashboard" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
