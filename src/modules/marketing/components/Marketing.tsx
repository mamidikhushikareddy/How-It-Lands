/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, MessageSquare, Zap, Target, BookOpen, HelpCircle, 
  ArrowRight, Sparkles, CheckCircle, Quote, AlertTriangle, 
  Send, RefreshCw, Mail, Phone, Lock, Eye, Trash, Bookmark
} from 'lucide-react';
import { SEED_LANDING_EXAMPLES } from '../../../seedData';

interface MarketingProps {
  onNavigate: (route: string) => void;
  onLogin: () => void;
}

export default function Marketing({ onNavigate, onLogin }: MarketingProps) {
  const [activeTab, setActiveTab] = useState<'breakup' | 'apology' | 'payment'>('breakup');
  const [currentBlogSlug, setCurrentBlogSlug] = useState<string | null>(null);

  // Filter examples for interactive section
  const getExample = () => {
    if (activeTab === 'breakup') {
      return {
        title: 'Ending an early dating connection cleanly',
        draft: 'Hey, so sorry but I have been super busy with work and don\'t really have time to date. You are perfect and amazing but I just can\'t right now. Maybe we can hang out as friends in a few months?',
        risks: ['Creates false hope / future loophole', 'Dishonest reason (busy-ness instead of fit)', 'Excessive apologizing lowers status'],
        interpretation: 'The recipient hears: "I like you, but I\'m overwhelmed right now. If I wait around or check back in a few weeks, we can date."',
        rewritten: 'Hey [Name], I have really valued our time together, but after some reflection, I do not feel we are a romantic match. You are a wonderful person and I wanted to be honest with you. I truly wish you the absolute best.',
        scores: { clarity: 95, warmth: 70, confidence: 90, risk: 10 }
      };
    } else if (activeTab === 'apology') {
      return {
        title: 'Apologizing for a missed project deadline',
        draft: 'I am so incredibly sorry for missing the deadline! I had a massive headache and my internet went out, and my alarm didn\'t go off. I feel so unprofessional and terrible, please don\'t hate me! I will finish it right now!',
        risks: ['Highly defensive / listing excuses', 'Forces client to manage your guilt', 'Weakens professional authority'],
        interpretation: 'Reads as panicked, disorganized, and insecure. Makes the client feel burdened with reassuring you.',
        rewritten: 'Please accept my sincere apologies for the delay on this delivery. I took full responsibility for the oversight and understand the impact on our timeline. I have corrected the bottleneck and will deliver the complete files by 10:00 AM tomorrow.',
        scores: { clarity: 92, warmth: 55, confidence: 85, risk: 15 }
      };
    } else {
      return {
        title: 'Asking a client for an overdue payment',
        draft: 'So sorry to bother you! Just checking in to see if by any chance you got a free second to look at invoice #42? No rush at all, I know you are super busy! Let me know if everything is okay! Thanks so much!!',
        risks: ['Apologizing for your own hard-earned money', 'Creates zero urgency / priority', 'Treats billing as a nuisance'],
        interpretation: 'Signals that payment is optional or lower priority. The client will de-prioritize this in their accounts payable.',
        rewritten: 'Hi [Name], this is a reminder that invoice #42 ($2,200) is now 10 days past due. Please let me know when I can expect the payment to clear, or if you need me to re-send the billing details.',
        scores: { clarity: 98, warmth: 45, confidence: 95, risk: 5 }
      };
    }
  };

  const sample = getExample();

  return (
    <div className="min-h-screen bg-[#111315] text-[#FAF8F5] flex flex-col font-sans selection:bg-[#888888] selection:text-white animate-fade-in">
      {/* Navigation Header */}
      <nav className="border-b border-white/5 bg-[#111315]/95 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center border border-white/5">
              <span className="font-serif font-bold text-[#FAF8F5] text-sm italic">H</span>
            </div>
            <div>
              <span className="font-sans font-medium text-[#FAF8F5] tracking-tight text-sm">How It Lands</span>
              <p className="text-[9px] text-[#B5B8BE] uppercase tracking-wider font-mono">Communication Intelligence</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-[#B5B8BE]">
            <button onClick={() => onNavigate('/features')} className="hover:text-white transition bg-transparent border-none cursor-pointer">Features</button>
            <button onClick={() => onNavigate('/how-it-works')} className="hover:text-white transition bg-transparent border-none cursor-pointer">How It Works</button>
            <button onClick={() => onNavigate('/examples')} className="hover:text-white transition bg-transparent border-none cursor-pointer">Examples</button>
            <button onClick={() => onNavigate('/faq')} className="hover:text-white transition bg-transparent border-none cursor-pointer">FAQ</button>
          </div>

          <div className="flex items-center gap-4 font-sans">
            <button onClick={onLogin} className="text-xs font-medium text-[#FAF8F5] hover:text-[#B5B8BE] transition bg-transparent border-none cursor-pointer">
              Sign In
            </button>
            <button 
              onClick={() => onNavigate('/signup')}
              className="px-4 py-2 rounded bg-[#FAF8F5] text-[#111315] text-xs font-medium hover:bg-[#FAF8F5]/90 transition cursor-pointer font-sans"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Editorial Hero Section */}
      <section className="relative py-24 px-6 max-w-6xl mx-auto w-full flex flex-col items-center text-center overflow-hidden space-y-12">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-[#B5B8BE] font-mono uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-white" />
            <span>Tactical Communication Engine</span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-serif font-light leading-[1.1] text-[#FAF8F5] tracking-tight">
            What you write<br />
            <span className="italic font-normal text-[#B5B8BE]">isn't always</span> what people read.
          </h1>
          
          <p className="text-sm sm:text-base text-[#B5B8BE] max-w-xl mx-auto leading-relaxed font-sans font-light">
            Paste an uncomfortable draft—breakups, late payments, or salary negotiations. Discover hidden subtext, map structural risk patterns, and review clear, strategic rewrites built on communication science.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button 
              onClick={() => onNavigate('/signup')}
              className="w-full sm:w-auto px-6 py-3 rounded bg-[#FAF8F5] text-[#111315] text-xs font-medium hover:bg-[#FAF8F5]/90 transition flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              Analyze Your Message
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onNavigate('/examples')}
              className="w-full sm:w-auto px-6 py-3 rounded bg-[#1A1D20] border border-white/5 text-[#FAF8F5] text-xs font-medium hover:bg-[#1A1D20]/80 transition flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              See Real Scenarios
            </button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-5 opacity-40 text-[9px] font-mono tracking-widest uppercase">
            <span>✓ SECURE & ENCRYPTED</span>
            <span>•</span>
            <span>✓ ZERO TRAINING ON PRIVATE TEXTS</span>
            <span>•</span>
            <span>✓ CLIENTS, TEAMS, & RELATIONSHIPS</span>
          </div>
        </div>

        {/* Live Interactive Product Preview */}
        <div className="w-full max-w-4xl bg-[#1A1D20] rounded-2xl border border-white/5 shadow-2xl p-6 md:p-8 text-left animate-fade-in relative">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-30">
            <span className="w-2.5 h-2.5 rounded-full bg-white/10"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-white/10"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-white/10"></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-5">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B5B8BE]">Original Draft Input</span>
                <p className="text-xs italic text-[#B5B8BE]/80 mt-2 font-serif leading-relaxed font-light">
                  "Hi sorry to bug you again, I know you are so busy! Just checking in on invoice 42 to see if there is any chance you got a free second to look at it? No rush at all, sorry to be a nuisance!"
                </p>
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-white">Diagnostic Review</span>
                
                <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="bg-[#111315] p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center text-[#B5B8BE]">
                      <span>Overexplaining Flag</span>
                      <span className="text-[#C97A7A] font-medium">85%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-[#C97A7A]" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="bg-[#111315] p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center text-[#B5B8BE]">
                      <span>Boundary Score</span>
                      <span className="text-[#FAF8F5] font-medium">30%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-white" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111315]/80 p-4 rounded-xl border border-white/5 text-xs">
                  <span className="text-[9px] font-mono text-[#B5B8BE] block mb-1 uppercase tracking-wider">LIKELY RECIPIENT INTERPRETATION</span>
                  <p className="text-[#FAF8F5]/80 leading-relaxed font-sans font-light">
                    "This feels insecure. The apologetic framing signals that billing is optional or low-priority, which invites further delay without consequences."
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 flex flex-col justify-between space-y-6">
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-[10px] font-mono text-[#FAF8F5] uppercase tracking-wider">HOW IT SHOULD LAND</span>
                  <span className="text-[9px] bg-white/5 text-white px-2 py-0.5 rounded font-mono font-medium tracking-wide border border-white/10">100% SECURE</span>
                </div>
                <p className="text-sm text-[#FAF8F5] leading-relaxed font-serif font-light">
                  "Hi [Name], this is a reminder that invoice #42 ($2,200) is now 10 days past due. Please let me know when I can expect the payment to clear so we can align our accounting records."
                </p>
              </div>

              <div className="flex items-center gap-4 bg-[#111315]/50 p-4 rounded-xl border border-white/5 text-xs text-[#B5B8BE] font-light font-sans">
                <Shield className="w-5 h-5 text-[#FAF8F5] flex-shrink-0" />
                <span>Our system analyzes structural tone syntax, never using generic cookie-cutter templates. Everything runs locally and privately.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section (What this app actually does) */}
      <section className="py-24 px-6 bg-[#1A1D20] border-y border-white/5">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-serif font-light text-[#FAF8F5]">
              Designed for communication, <span className="italic text-[#B5B8BE]">not automation.</span>
            </h2>
            <p className="text-[#B5B8BE] text-xs leading-relaxed font-sans font-light">
              Most tools write robotic corporate emails. How It Lands is built specifically for emotionally complex, high-stakes conversations where every single word matters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#1A1D20] p-8 rounded-xl border border-white/5 hover:border-white/10 transition space-y-4 font-sans font-light">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                <AlertTriangle className="w-5 h-5 text-[#C97A7A]" />
              </div>
              <h3 className="text-base font-medium text-[#FAF8F5]">Overexplaining Flag</h3>
              <p className="text-xs text-[#B5B8BE] leading-relaxed">
                Recovering people-pleaser? Our engine instantly flags defensive padding, excessive context, and apologetic buffers that weaken your professional authority.
              </p>
            </div>

            <div className="bg-[#1A1D20] p-8 rounded-xl border border-white/5 hover:border-white/10 transition space-y-4 font-sans font-light">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-[#FAF8F5]">Polite Boundary Lock</h3>
              <p className="text-xs text-[#B5B8BE] leading-relaxed">
                Learn how to decline requests, scope creep, or overstepping partners in two concise sentences, removing passive negotiation loops entirely.
              </p>
            </div>

            <div className="bg-[#1A1D20] p-8 rounded-xl border border-white/5 hover:border-white/10 transition space-y-4 font-sans font-light">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                <Zap className="w-5 h-5 text-[#6D8294]" />
              </div>
              <h3 className="text-base font-medium text-[#FAF8F5]">Sovereign Tone Guard</h3>
              <p className="text-xs text-[#B5B8BE] leading-relaxed">
                Collect outstanding invoices, push back on client requests, or decline social pressure confidently without sounding robotic, aggressive, or apologetic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Example Section */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE]">PROTOTYPE DEEP DIVE</span>
          <h2 className="text-3xl font-serif font-light text-[#FAF8F5]">
            See the difference <span className="italic text-[#B5B8BE]">clarity makes.</span>
          </h2>
        </div>

        {/* Tab controls */}
        <div className="flex justify-center gap-2">
          <button 
            onClick={() => setActiveTab('breakup')}
            className={`px-4 py-2 rounded text-xs font-medium tracking-wide transition cursor-pointer ${activeTab === 'breakup' ? 'bg-[#FAF8F5] text-[#111315]' : 'bg-[#1A1D20] text-[#B5B8BE] border border-white/5'}`}
          >
            BREAKUP / CLOSURE
          </button>
          <button 
            onClick={() => setActiveTab('apology')}
            className={`px-4 py-2 rounded text-xs font-medium tracking-wide transition cursor-pointer ${activeTab === 'apology' ? 'bg-[#FAF8F5] text-[#111315]' : 'bg-[#1A1D20] text-[#B5B8BE] border border-white/5'}`}
          >
            APOLOGY / REPAIR
          </button>
          <button 
            onClick={() => setActiveTab('payment')}
            className={`px-4 py-2 rounded text-xs font-medium tracking-wide transition cursor-pointer ${activeTab === 'payment' ? 'bg-[#FAF8F5] text-[#111315]' : 'bg-[#1A1D20] text-[#B5B8BE] border border-white/5'}`}
          >
            ASKING FOR PAYMENT
          </button>
        </div>

        {/* Interactive content block */}
        <div className="bg-[#1A1D20] rounded-xl border border-white/5 p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-[9px] font-mono text-[#B5B8BE] uppercase tracking-wider block mb-2">ORIGINAL MESSENGER DRAFT</span>
              <div className="bg-[#111315] p-5 rounded-lg border border-white/5 italic text-[#FAF8F5]/90 text-xs font-serif relative font-light">
                "{sample.draft}"
                <span className="absolute -bottom-2 -right-2 bg-[#C97A7A] text-[#FAF8F5] rounded-full p-1 shadow-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            <div className="space-y-3 font-sans font-light">
              <span className="text-[9px] font-mono text-[#C97A7A] uppercase tracking-wider block">KEY RISK REASONS</span>
              <ul className="space-y-2">
                {sample.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#B5B8BE]">
                    <span className="text-[#C97A7A] font-medium">✕</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-center items-center gap-4 py-4 border-y lg:border-y-0 lg:border-x border-white/5">
            <div className="text-center">
              <span className="text-[9px] font-mono text-[#B5B8BE] block uppercase tracking-wider mb-2">CLARITY RATING</span>
              <div className="flex justify-center items-end gap-1 mb-1">
                <span className="text-3xl font-light text-[#FAF8F5] font-serif">{sample.scores.clarity}%</span>
              </div>
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#FAF8F5] bg-white/5 border border-white/10 px-2 py-0.5 rounded">Clarity Fit</span>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-[9px] font-mono text-[#FAF8F5] uppercase tracking-wider block mb-2">HOW THE RECIPIENT FEELS READING IT</span>
              <div className="bg-[#111315] p-5 rounded-lg border border-white/5 text-[#B5B8BE] text-xs leading-relaxed font-sans font-light">
                {sample.interpretation}
              </div>
            </div>

            <div>
              <span className="text-[9px] font-mono text-[#FAF8F5] uppercase tracking-wider block mb-2">THE STRATEGIC REWRITE RESULT</span>
              <div className="bg-white/[0.02] p-5 rounded-lg border border-white/10 text-[#FAF8F5] text-xs font-serif relative font-light">
                "{sample.rewritten}"
                <span className="absolute -bottom-2 -right-2 bg-white text-black rounded-full p-1 shadow-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid: Built for difficult conversations */}
      <section className="py-24 px-6 bg-[#1A1D20] border-y border-white/5">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif font-light text-[#FAF8F5]">
              Every uncomfortable conversation, <span className="italic text-[#B5B8BE]">expertly analyzed.</span>
            </h2>
            <p className="text-[#B5B8BE] text-xs max-w-lg mx-auto font-sans font-light">
              Different interpersonal challenges need completely distinct communication dynamics. Choose from tailored scenario guides.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 font-sans">
            <div className="md:col-span-6 bg-[#111315] p-6 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition h-64">
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded bg-[#C97A7A]/10 border border-[#C97A7A]/20 text-[#C97A7A] font-mono text-[9px] tracking-widest uppercase">Relationship Breakups</span>
                <span className="text-[9px] font-mono text-[#B5B8BE]">01 / BOUNDARY</span>
              </div>
              <div>
                <h3 className="text-lg font-serif font-light text-[#FAF8F5] mb-2">Breakup & Closure Mode</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-light">
                  End connections transparently and maturely without leaving accidental loopholes, vague details, or unresolved emotional hope that results in repetitive texts.
                </p>
              </div>
            </div>

            <div className="md:col-span-6 bg-[#111315] p-6 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition h-64">
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-white font-mono text-[9px] tracking-widest uppercase">Accountability Repair</span>
                <span className="text-[9px] font-mono text-[#B5B8BE]">02 / ACCOUNTABILITY</span>
              </div>
              <div>
                <h3 className="text-lg font-serif font-light text-[#FAF8F5] mb-2">Sincere Apology Mode</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-light">
                  Acknowledge errors cleanly, take true ownership of outcomes, and propose actionable restoration without centering your guilt or overexplaining excuses.
                </p>
              </div>
            </div>

            <div className="md:col-span-4 bg-[#111315] p-6 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition h-60">
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-white font-mono text-[9px] tracking-widest uppercase w-fit">Client Invoicing</span>
              <div>
                <h3 className="text-base font-serif font-light text-[#FAF8F5] mb-1.5">Late Payment Firmness</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-light">
                  Stop feeling guilty for requesting your money. Send high-urgency billing reminders with total professional confidence.
                </p>
              </div>
            </div>

            <div className="md:col-span-4 bg-[#111315] p-6 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition h-60">
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-white font-mono text-[9px] tracking-widest uppercase w-fit">Workplace</span>
              <div>
                <h3 className="text-base font-serif font-light text-[#FAF8F5] mb-1.5">Salary & Boss Negotiation</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-light">
                  Deliver difficult feedback, say no to workloads, or frame base salary negotiation asks around objective accomplishments.
                </p>
              </div>
            </div>

            <div className="md:col-span-4 bg-[#111315] p-6 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition h-60">
              <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-white font-mono text-[9px] tracking-widest uppercase w-fit">Social Vulnerability</span>
              <div>
                <h3 className="text-base font-serif font-light text-[#FAF8F5] mb-1.5">Confession & Vulnerability</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-light">
                  Express difficult personal feelings or ask someone out without sounding desperate or placing emotional weight on them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Frequently Asked Questions */}
      <section className="py-24 px-6 max-w-3xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#B5B8BE]">GOT QUESTIONS?</span>
          <h2 className="text-3xl font-serif font-light text-[#FAF8F5]">
            Frequently Asked <span className="italic text-[#B5B8BE]">Questions</span>
          </h2>
        </div>

        <div className="space-y-4 font-sans font-light">
          <div className="bg-[#1A1D20] rounded-xl border border-white/5 p-6 space-y-2">
            <h4 className="font-medium text-[#FAF8F5] text-sm font-sans">How is this different from ChatGPT or other writing tools?</h4>
            <p className="text-xs text-[#B5B8BE] leading-relaxed">
              Standard LLMs write overly formal, cliché, "as an AI assistant" text that sounds immediately fake. How It Lands is custom-prompted with communication theories, focused entirely on subtle social dynamics like over-apologizing, mixed signal loops, and psychological leverage. It preserves your unique conversational voice while strategically optimizing clarity.
            </p>
          </div>

          <div className="bg-[#1A1D20] rounded-xl border border-white/5 p-6 space-y-2">
            <h4 className="font-medium text-[#FAF8F5] text-sm font-sans">Is my sensitive conversational data kept private?</h4>
            <p className="text-xs text-[#B5B8BE] leading-relaxed">
              Yes, entirely. We strictly respect your privacy. None of the conversations or texts you paste are ever sold, stored indefinitely without your permission, or used to train public machine learning models. You can export or hard delete your data completely from your account settings at any time.
            </p>
          </div>

          <div className="bg-[#1A1D20] rounded-xl border border-white/5 p-6 space-y-2">
            <h4 className="font-medium text-[#FAF8F5] text-sm font-sans">Can I adjust how blunt or kind the feedback is?</h4>
            <p className="text-xs text-[#B5B8BE] leading-relaxed">
              Absolutely. In the Analyze page, you can choose output toggles like "give me blunt feedback", "prioritize kindness", or "keep it short". Pro users can also adjust a 1-100 slider range across warmth, directness, and formality.
            </p>
          </div>

          <div className="bg-[#1A1D20] rounded-xl border border-white/5 p-6 space-y-2">
            <h4 className="font-medium text-[#FAF8F5] text-sm font-sans">Do you offer playbooks for specific real-world situations?</h4>
            <p className="text-xs text-[#B5B8BE] leading-relaxed">
              Yes. We have structured, guided playbooks covering complex interactions like asking for space in a dating relationship, confronting a toxic coworker, setting boundaries with family, or handling invoice scope-creep.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111315] border-t border-white/5 py-16 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10 text-xs text-[#B5B8BE] font-light font-sans">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/10 rounded flex items-center justify-center border border-white/5">
                <span className="font-serif font-bold text-[#FAF8F5] text-sm italic">H</span>
              </div>
              <span className="font-sans font-medium text-white tracking-tight">How It Lands</span>
            </div>
            <p className="leading-relaxed">
              The high-stakes strategic communication assistant. Know exactly how your messages look before they read them.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-[#FAF8F5] uppercase tracking-wider mb-3 text-[10px] font-mono">Product</h5>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('/features')} className="hover:text-white transition bg-transparent border-none cursor-pointer">Features</button></li>
              <li><button onClick={() => onNavigate('/examples')} className="hover:text-white transition bg-transparent border-none cursor-pointer">Interactive Examples</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-[#FAF8F5] uppercase tracking-wider mb-3 text-[10px] font-mono">Legal & Safe</h5>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('/privacy')} className="hover:text-white transition bg-transparent border-none cursor-pointer">Privacy & Encryption Policy</button></li>
              <li><button onClick={() => onNavigate('/terms')} className="hover:text-white transition bg-transparent border-none cursor-pointer">Terms of Service</button></li>
              <li><span className="opacity-40 italic">Disclaimer: Guidance only, not counseling.</span></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-[#FAF8F5] uppercase tracking-wider mb-3 text-[10px] font-mono">Connect</h5>
            <ul className="space-y-2 font-mono text-[11px]">
              <li><span className="block text-white">kiaria2514@gmail.com</span></li>
              <li><span className="block">AI Studio Development Sandbox</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#B5B8BE]/50 font-light font-sans">
          <span>© 2026 How It Lands. All rights reserved. Built beautifully.</span>
          <div className="flex gap-4 mt-2 sm:mt-0 font-mono text-[10px] uppercase">
            <span>Server Active</span>
            <span>•</span>
            <span>Gemini 3.5 Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
