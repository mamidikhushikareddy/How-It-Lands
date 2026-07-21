/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { User, UserProfile } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface OnboardingProps {
  user: User;
  onComplete: (profileData: Partial<UserProfile>) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<number>(1);
  const [useCase, setUseCase] = useState<'personal' | 'work' | 'both'>('both');
  const [style, setStyle] = useState<string>('apologetic');
  const [overdo, setOverdo] = useState<string[]>(['overexplain']);
  const [tonePref, setTonePref] = useState<string>('kind but direct');
  const [scenariosHelp, setScenariosHelp] = useState<string>('boundaries');

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
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full bg-[#141414] rounded-3xl border border-[#262626] p-8 space-y-8 relative overflow-hidden shadow-2xl">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#3E6F58]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/[0.01] rounded-full blur-3xl pointer-events-none"></div>

        {/* Steps indicator */}
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/5 text-[#FAF8F5] rounded-lg flex items-center justify-center font-bold font-mono text-sm border border-white/10">
              {step}
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-[#a0a0a0] font-mono">Step {step} of 5</span>
              <p className="text-xs font-semibold text-white">
                {step === 1 && "Personalize Your Account"}
                {step === 2 && "Communication Style Diagnosis"}
                {step === 3 && "Difficult Scenario Focus"}
                {step === 4 && "Preferred Output Tone"}
                {step === 5 && "Onboarding Complete"}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={`w-4 h-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-[#FAF8F5] w-6' : 'bg-[#262626]'}`}
              ></div>
            ))}
          </div>
        </div>

        {/* Dynamic step rendering */}
        <div className="min-h-[260px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-2xl font-light font-serif text-white">
                  Welcome to <span className="font-serif italic text-white font-light">How It Lands</span>
                </h3>
                <p className="text-xs text-[#a0a0a0] leading-relaxed font-light">
                  We customize the strategic communication assistant specifically around your daily relationships and text dynamics. Where do you face difficult messages most?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button 
                  onClick={() => setUseCase('personal')}
                  className={`p-4 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${useCase === 'personal' ? 'bg-white/5 border-white text-white' : 'bg-[#1e1e1e] border-[#262626] text-[#a0a0a0] hover:border-[#333]'}`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white font-sans">Personal & Dating</p>
                    <p className="text-[11px] opacity-70 font-light mt-0.5">Breakups, dating apps, family discussions, friendship tensions.</p>
                  </div>
                  {useCase === 'personal' && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>

                <button 
                  onClick={() => setUseCase('work')}
                  className={`p-4 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${useCase === 'work' ? 'bg-white/5 border-white text-white' : 'bg-[#1e1e1e] border-[#262626] text-[#a0a0a0] hover:border-[#333]'}`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white font-sans">Workplace & Clients</p>
                    <p className="text-[11px] opacity-70 font-light mt-0.5">Overdue bills, boss negotiations, out-of-scope requests, salary asks.</p>
                  </div>
                  {useCase === 'work' && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>

                <button 
                  onClick={() => setUseCase('both')}
                  className={`p-4 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${useCase === 'both' ? 'bg-white/5 border-white text-white' : 'bg-[#1e1e1e] border-[#262626] text-[#a0a0a0] hover:border-[#333]'}`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white font-sans">Fully Blended (Both contexts)</p>
                    <p className="text-[11px] opacity-70 font-light mt-0.5">A comprehensive split profile analyzing professional and private texts.</p>
                  </div>
                  {useCase === 'both' && <CheckCircle2 className="w-5 h-5 text-white" />}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-xl font-light font-serif text-white">
                  Identify your default <span className="italic font-light">communication tendencies</span>
                </h3>
                <p className="text-xs text-[#a0a0a0] leading-relaxed font-light">
                  How do you typically tend to come across when a message feels stressful or awkward? We calibrate feedback based on these presets.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'apologetic', title: 'Too Apologetic', desc: 'Starting requests with apologies' },
                  { id: 'cold', title: 'Too Cold/Blunt', desc: 'Appearing rude without intent' },
                  { id: 'wordy', title: 'Too Wordy', desc: 'Overexplaining reasons' },
                  { id: 'indirect', title: 'Too Indirect/Vague', desc: 'Cushioning actual demands' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStyle(item.id)}
                    className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${style === item.id ? 'bg-white/5 border-white' : 'bg-[#1e1e1e] border-[#262626]'}`}
                  >
                    <p className="text-xs font-bold text-white font-sans">{item.title}</p>
                    <p className="text-[10px] text-[#a0a0a0] mt-1 font-light">{item.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-[#a0a0a0]">Which behaviors do you want our AI strategist to proactively flag?</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'overexplain', label: 'Overexplaining' },
                    { id: 'apologize too much', label: 'Excessive Apologies' },
                    { id: 'sound too cold', label: 'Sounding Too Cold' },
                    { id: 'indirect asks', label: 'Indirect Asks' },
                    { id: 'loophole invites', label: 'Leaving Loopholes' },
                    { id: 'guilt frames', label: 'Guilt Pressure' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => toggleOverdo(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition cursor-pointer ${overdo.includes(p.id) ? 'bg-white/10 border-white text-white' : 'bg-[#1e1e1e] border-[#262626] text-[#a0a0a0]'}`}
                    >
                      {overdo.includes(p.id) ? '✓ ' : ''}{p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-xl font-light font-serif text-white">
                  What conversation type <span className="italic font-light">worries you most?</span>
                </h3>
                <p className="text-xs text-[#a0a0a0] leading-relaxed font-light">
                  We pre-configure your dashboard workspace and default scenarios around this selection.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'boundaries', label: 'Setting Boundaries & Saying No' },
                  { id: 'apology', label: 'Apologies & Repair' },
                  { id: 'client-money', label: 'Client Payments & Rates' },
                  { id: 'breakup', label: 'Breakups & Ending Things' },
                  { id: 'workplace', label: 'Salary Negotiate & Workplace' },
                  { id: 'general', label: 'General Awkward Situations' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setScenariosHelp(s.id)}
                    className={`p-3.5 rounded-xl text-left border text-xs font-medium transition cursor-pointer ${scenariosHelp === s.id ? 'bg-white/5 border-white text-white' : 'bg-[#1e1e1e] border-[#262626] text-[#a0a0a0]'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-xl font-light font-serif text-white">
                  Choose your default <span className="italic font-light">tone archetype</span>
                </h3>
                <p className="text-xs text-[#a0a0a0] leading-relaxed font-light">
                  When rewriting draft texts, how do you prefer the default strategic recommendation to feel?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {[
                  { id: 'kind but direct', title: 'Kind but Direct (Recommended)', desc: 'Optimally balanced. Deeply respectful but doesn\'t leave room for debate.' },
                  { id: 'soft but boundaried', title: 'Soft but Boundaried', desc: 'Warmer, highly relational, but keeps core constraints perfectly clear.' },
                  { id: 'concise and confident', title: 'Concise and Confident', desc: 'No fluff. Extreme economy of words. Best for business or past-due situations.' },
                  { id: 'professional and direct', title: 'Professional and Direct', desc: 'Perfect for work dynamics. Focuses on achievements and outcomes.' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTonePref(t.id)}
                    className={`p-4 rounded-xl text-left border transition flex items-center justify-between cursor-pointer ${tonePref === t.id ? 'bg-white/5 border-white text-white' : 'bg-[#1e1e1e] border-[#262626] text-[#a0a0a0] hover:border-[#333]'}`}
                  >
                    <div>
                      <p className="text-xs font-bold text-white font-sans">{t.title}</p>
                      <p className="text-[10px] text-[#a0a0a0] mt-1 font-light">{t.desc}</p>
                    </div>
                    {tonePref === t.id && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-white/5 text-white rounded-full flex items-center justify-center mx-auto shadow-md border border-white/10">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-light font-serif text-white">
                  Calibration <span className="italic font-light">Complete!</span>
                </h3>
                <p className="text-xs text-[#a0a0a0] leading-relaxed max-w-sm mx-auto font-sans font-light">
                  Your strategy engine is now fully tuned to your communication voice. You are ready to start analyzing texts and crafting pristine boundaries.
                </p>
              </div>
              <div className="bg-[#1e1e1e] border border-[#262626] p-4 rounded-xl text-xs max-w-xs mx-auto space-y-1.5 text-left font-mono">
                <p className="text-[#a0a0a0]">✓ PROFILE PRESET: <span className="text-white uppercase">{style}</span></p>
                <p className="text-[#a0a0a0]">✓ FLAGS: <span className="text-white uppercase">{overdo.join(', ')}</span></p>
                <p className="text-[#a0a0a0]">✓ TARGET TONE: <span className="text-white uppercase">{tonePref}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-[#262626] pt-6">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 text-xs font-semibold text-[#a0a0a0] hover:text-white transition bg-transparent border-none cursor-pointer ${step === 1 ? 'opacity-0 cursor-default pointer-events-none' : ''}`}
            disabled={step === 1}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <Button
            onClick={handleNext}
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
          >
            {step === 5 ? "Launch Dashboard" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
