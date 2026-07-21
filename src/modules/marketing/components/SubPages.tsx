/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, CheckCircle, AlertTriangle, ArrowRight, Search, 
  X, MessageSquare, Shield, Target, Zap, HelpCircle, Copy, 
  Check, UserCheck, BookOpen, Layers, Settings, Send, 
  MousePointerClick, Compass, RefreshCw
} from 'lucide-react';
import { SEED_TEMPLATES } from '../../../seedData';

// Map of template IDs to curated realistic rewrites
const CURATED_REWRITES: Record<string, { rewrite: string; scores: { clarity: number; warmth: number; confidence: number; risk: number } }> = {
  t_dating_rejection: {
    rewrite: "Hey [Name], I have really valued our time together, but after some reflection, I do not feel we are a romantic match. You are a wonderful person and I wanted to be honest with you. I truly wish you the absolute best.",
    scores: { clarity: 98, warmth: 70, confidence: 95, risk: 5 }
  },
  t_invoice_reminder: {
    rewrite: "Hi [Name], this is a reminder that invoice #42 ($2,200) is now 10 days past due. Please let me know when I can expect the payment to clear so we can align our accounting records.",
    scores: { clarity: 99, warmth: 45, confidence: 98, risk: 2 }
  },
  t_workplace_boundary: {
    rewrite: "Thank you for assigning this to me. Due to my current project commitments, I do not have the bandwidth to complete this to our standard by the current deadline. Can we reschedule this delivery, or reallocate some of my secondary tasks?",
    scores: { clarity: 95, warmth: 55, confidence: 92, risk: 8 }
  },
  t_apology_deadline: {
    rewrite: "Please accept my sincere apologies for the delay on this delivery. I take full responsibility for the oversight and have corrected the bottleneck. I will deliver the complete files by 10:00 AM tomorrow.",
    scores: { clarity: 96, warmth: 60, confidence: 90, risk: 5 }
  },
  t_remote_work: {
    rewrite: "I would like to propose transitioning my role to a remote work arrangement. Based on my performance metrics, working remotely will allow me to minimize daily transit fatigue and dedicate more uninterrupted focus hours to our client deliveries.",
    scores: { clarity: 94, warmth: 50, confidence: 95, risk: 10 }
  },
  t_out_of_scope: {
    rewrite: "I would be happy to help with this additional page. Since this falls outside our original contract scope, this will require a separate addendum. I can draft a brief work order for $350 to cover this scope expansion.",
    scores: { clarity: 97, warmth: 55, confidence: 96, risk: 4 }
  },
  t_decline_social: {
    rewrite: "Hey [Name], thank you so much for the invite! I am unable to make it tonight as I need to catch up on some rest this weekend, but I hope you guys have an incredible time.",
    scores: { clarity: 98, warmth: 75, confidence: 90, risk: 2 }
  },
  t_salary_raise: {
    rewrite: "I would like to schedule a brief call next week to discuss my compensation. Over the last year, I have successfully delivered three major projects ahead of schedule and expanded my role responsibilities. I would like to align my compensation with this market value.",
    scores: { clarity: 95, warmth: 50, confidence: 98, risk: 8 }
  },
  t_roommate_rent: {
    rewrite: "Hey [Name], just a reminder that your portion of the rent ($850) is due today. Please transfer it over by tonight so I can submit the full payment to the landlord on time.",
    scores: { clarity: 99, warmth: 45, confidence: 98, risk: 1 }
  },
  t_meeting_cancel: {
    rewrite: "Please accept my apologies, but a sudden priority has arisen and I must reschedule our 2:00 PM call today. Let me know if tomorrow at 11:00 AM or 3:00 PM works for you.",
    scores: { clarity: 96, warmth: 60, confidence: 92, risk: 4 }
  },
  t_job_feedback: {
    rewrite: "Hi [Name], I am following up on my application for the role submitted last month. I remain very interested in the position. Could you please share an update on the hiring timeline or if any further information is needed from my end?",
    scores: { clarity: 97, warmth: 65, confidence: 94, risk: 3 }
  },
  t_friend_money: {
    rewrite: "Hey [Name], I hope you are doing well. Just a quick reminder regarding the $50 for dinner last month—could you Venmo or Zelle that over when you have a moment? Thanks!",
    scores: { clarity: 98, warmth: 60, confidence: 92, risk: 2 }
  },
  t_unpaid_gig: {
    rewrite: "Thank you so much for the invitation to speak at your conference. It sounds like an incredible event. However, as a matter of professional policy, I only accept engagements that align with my standard speaking fee. Please let me know if budget opens up in the future.",
    scores: { clarity: 96, warmth: 55, confidence: 97, risk: 5 }
  },
  t_late_delivery: {
    rewrite: "Hi [Name], our agreement specified delivery of the project files by yesterday, which has now been missed. This delay directly impacts our client timeline. Please provide an immediate status update and a firm, guaranteed delivery hour.",
    scores: { clarity: 98, warmth: 40, confidence: 95, risk: 6 }
  },
  t_job_negotiation: {
    rewrite: "Thank you so much for the offer. I am thrilled about the opportunity to join the team. However, given my experience level and background in the sector, I was expecting a base salary closer to $95,000. Is there any flexibility in the base salary or compensation package?",
    scores: { clarity: 94, warmth: 60, confidence: 94, risk: 8 }
  },
  t_decline_project: {
    rewrite: "Thank you for considering me for this project. While it sounds fascinating, my current operational commitments are fully booked and I am unable to allocate the focus this project deserves. I must respectfully decline so I can maintain quality on my existing deliverables.",
    scores: { clarity: 96, warmth: 60, confidence: 95, risk: 4 }
  },
  t_micromanager: {
    rewrite: "I appreciate your dedication to this project. To help me work most efficiently, I would like to establish a structured cadence—such as a single daily summary email—instead of hourly checks. This will allow me to maintain deep focus and deliver the high-quality outcomes we are aiming for.",
    scores: { clarity: 95, warmth: 55, confidence: 93, risk: 7 }
  },
  t_rate_increase: {
    rewrite: "I am writing to notify you of an upcoming adjustment to my standard hourly rates, which will change to $85/hour effective next month. This adjustment allows me to continue delivering the high-quality strategic assets and support you expect.",
    scores: { clarity: 98, warmth: 50, confidence: 96, risk: 3 }
  },
  t_second_date_rejection: {
    rewrite: "Thank you for the wonderful dinner. I enjoyed meeting you and appreciate your time. However, I did not feel a romantic connection between us. I wanted to be direct and honest with you. I truly wish you the very best.",
    scores: { clarity: 99, warmth: 65, confidence: 98, risk: 2 }
  },
  t_slow_responder: {
    rewrite: "Hi [Name], following up on my email regarding the project specs. Please let me know if you have any questions or when we can expect to align on the next steps.",
    scores: { clarity: 98, warmth: 55, confidence: 95, risk: 2 }
  },
  t_quitting_notice: {
    rewrite: "Please accept this message as formal notification that I am resigning from my position. My last day of employment will be [Date], two weeks from today. Thank you for the opportunities and professional growth during my time here.",
    scores: { clarity: 99, warmth: 55, confidence: 96, risk: 1 }
  },
  t_unsolicited_advice: {
    rewrite: "I really appreciate your care and interest in my career path. Right now, I find it most helpful to explore these decisions independently, but I would love to just catch up and chat about other things next time we meet.",
    scores: { clarity: 95, warmth: 70, confidence: 90, risk: 3 }
  },
  t_dispute_review: {
    rewrite: "Thank you for the feedback. After reviewing the performance report, I believe some of the marks do not align with my actual output metrics and project delivery records. I would like to schedule a meeting to review my specific performance data.",
    scores: { clarity: 96, warmth: 45, confidence: 95, risk: 6 }
  },
  t_extension_request: {
    rewrite: "I am writing to request a brief extension on the report delivery. To ensure we include the complete end-of-week analytics and maintain our high standards, I would like to adjust the delivery date from Friday morning to next Tuesday afternoon.",
    scores: { clarity: 97, warmth: 55, confidence: 91, risk: 5 }
  }
};

interface SubPagesProps {
  route: '/features' | '/how-it-works' | '/examples' | '/faq' | '/privacy' | '/terms' | string;
  onNavigate: (route: string) => void;
}

export default function SubPages({ route, onNavigate }: SubPagesProps) {
  // Common states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States for How It Works Interactive Simulation
  const [hiwStep, setHiwStep] = useState<number>(1);
  const [hiwTone, setHiwTone] = useState<'firm' | 'concise'>('firm');

  // States for Examples page
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeExampleId, setActiveExampleId] = useState<string | null>('t_dating_rejection');

  // States for FAQ page
  const [faqCategory, setFaqCategory] = useState<'all' | 'product' | 'privacy' | 'psychology'>('all');
  const [expandedFaq, setExpandedFaq] = useState<Record<string, boolean>>({
    faq_1: true,
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Categories extracted from SEED_TEMPLATES
  const categories = ['All', ...Array.from(new Set(SEED_TEMPLATES.map(t => t.category)))];

  // Filter templates
  const filteredTemplates = SEED_TEMPLATES.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.draft.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Current active example complete details
  const activeTemplate = SEED_TEMPLATES.find(t => t.id === activeExampleId) || SEED_TEMPLATES[0];
  const activeCurated = CURATED_REWRITES[activeTemplate.id] || {
    rewrite: `Hi [Name], thank you for the feedback. Regarding ${activeTemplate.title.toLowerCase()}, I would like to proceed by aligning our goals with this clear standard outcome.`,
    scores: { clarity: 95, warmth: 50, confidence: 92, risk: 5 }
  };

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
            <button 
              onClick={() => onNavigate('/features')} 
              className={`hover:text-white transition bg-transparent border-none cursor-pointer ${route === '/features' ? 'text-white border-b-2 border-white pb-1' : ''}`}
            >
              Features
            </button>
            <button 
              onClick={() => onNavigate('/how-it-works')} 
              className={`hover:text-white transition bg-transparent border-none cursor-pointer ${route === '/how-it-works' ? 'text-white border-b-2 border-white pb-1' : ''}`}
            >
              How It Works
            </button>
            <button 
              onClick={() => onNavigate('/examples')} 
              className={`hover:text-white transition bg-transparent border-none cursor-pointer ${route === '/examples' ? 'text-white border-b-2 border-white pb-1' : ''}`}
            >
              Examples
            </button>
            <button 
              onClick={() => onNavigate('/faq')} 
              className={`hover:text-white transition bg-transparent border-none cursor-pointer ${route === '/faq' ? 'text-white border-b-2 border-white pb-1' : ''}`}
            >
              FAQ
            </button>
          </div>

          <div className="flex items-center gap-4 font-sans">
            <button onClick={() => onNavigate('/login')} className="text-xs font-medium text-[#FAF8F5] hover:text-[#B5B8BE] transition bg-transparent border-none cursor-pointer">
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

      {/* RENDER DYNAMIC CONTENT BASED ON ROUTE */}
      <main className="flex-grow">
        
        {/* ==================== FEATURES PAGE ==================== */}
        {route === '/features' && (
          <div className="py-20 px-6 max-w-6xl mx-auto w-full space-y-20">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B5B8BE] bg-white/5 border border-white/10 px-3 py-1 rounded">PRODUCT MATRIX</span>
              <h1 className="text-4xl sm:text-6xl font-serif font-light text-[#FAF8F5] tracking-tight">
                Designed to eliminate <span className="italic text-[#B5B8BE]">relational friction.</span>
              </h1>
              <p className="text-sm text-[#B5B8BE] font-sans font-light leading-relaxed max-w-xl mx-auto">
                Unlike generic writing assistants, How It Lands is custom-engineered with communication models to detect social vulnerabilities and deliver precise, authoritative rewrites.
              </p>
            </div>

            {/* Core Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
              <div className="bg-[#1A1D20] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 space-y-5">
                <div className="w-12 h-12 bg-[#C97A7A]/10 text-[#C97A7A] rounded-xl flex items-center justify-center border border-[#C97A7A]/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-light text-white">Defensive Buffer Radar</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-sans font-light">
                  Instantly captures and highlights nervous, apologetic padding like *"just checking in"*, *"sorry to bother you"*, or *"I might be wrong but"*. Regain instant stature.
                </p>
              </div>

              <div className="bg-[#1A1D20] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 space-y-5">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-light text-white">Negotiation Loophole Guard</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-sans font-light">
                  Flags detailed physical or emotional excuses (e.g. *"busy with the kids"*, *"feeling under the weather"*) which open the door for the other party to negotiate your boundaries.
                </p>
              </div>

              <div className="bg-[#1A1D20] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 space-y-5">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-light text-white">Recipient Subtext Mapping</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-sans font-light">
                  Decodes psychological subtext. Our algorithm calculates how the receiver actually digests your message across key metrics: Clarity, Boundaries, and Executive Confidence.
                </p>
              </div>

              <div className="bg-[#1A1D20] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 space-y-5">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-light text-white">Dynamic Tone Modulator</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-sans font-light">
                  Effortlessly alter your message pitch with single-click tactical profiles: **Kinder** (high warmth, firm limits), **Firmer** (executive authority), or **Shorter** (minimal friction).
                </p>
              </div>

              <div className="bg-[#1A1D20] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 space-y-5">
                <div className="w-12 h-12 bg-cyan-400/10 text-cyan-400 rounded-xl flex items-center justify-center border border-cyan-400/20">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-light text-white">Response Simulation Engine</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-sans font-light">
                  Simulate potential follow-ups before hitting send. Our system predicts how they will respond to both your raw draft and our rewrite, proving the impact of the shift.
                </p>
              </div>

              <div className="bg-[#1A1D20] p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 space-y-5">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center border border-purple-500/20">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-light text-white">Zero Model Training Policy</h3>
                <p className="text-xs text-[#B5B8BE] leading-relaxed font-sans font-light">
                  Your private relationships are strictly your business. We never train generative AI models on your inputs. Everything is completely private and secure.
                </p>
              </div>
            </div>

            {/* In-Depth Feature Comparison */}
            <div className="bg-[#1A1D20] rounded-2xl border border-white/5 p-8 max-w-4xl mx-auto space-y-8">
              <div className="text-center md:text-left space-y-1">
                <h3 className="text-xl font-serif font-light text-white">Why standard LLMs are not enough</h3>
                <p className="text-xs text-[#B5B8BE] font-sans font-light">ChatGPT and generic assistants often output boilerplate clichés that are immediately recognizable as artificial.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans font-light text-xs pt-4 border-t border-white/5">
                <div className="space-y-4">
                  <h4 className="font-semibold text-[#C97A7A] uppercase tracking-wider text-[10px] font-mono">Standard AI Assistants</h4>
                  <ul className="space-y-3 text-[#B5B8BE]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#C97A7A] font-bold">✕</span>
                      <span>"Dear Recipient, I hope this email finds you well..."</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#C97A7A] font-bold">✕</span>
                      <span>Overly wordy, clinical, or preachy corporate language.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#C97A7A] font-bold">✕</span>
                      <span>Lacks psychological context or relational strategic rules.</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] font-mono">How It Lands Engine</h4>
                  <ul className="space-y-3 text-[#B5B8BE]">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Concise, human, and modern conversational patterns.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Calculates exactly what relational leverage you hold.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Maintains your actual voice, filtered of anxiety indicators.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Feature CTA */}
            <div className="text-center pt-8">
              <button 
                onClick={() => onNavigate('/signup')}
                className="px-8 py-4 rounded-xl bg-white text-black font-medium text-xs hover:bg-white/90 transition flex items-center justify-center gap-3.5 mx-auto font-sans shadow-lg"
              >
                Experience the Full Strategic Suite
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== HOW IT WORKS PAGE ==================== */}
        {route === '/how-it-works' && (
          <div className="py-20 px-6 max-w-6xl mx-auto w-full space-y-20">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B5B8BE] bg-white/5 border border-white/10 px-3 py-1 rounded">METHODOLOGY</span>
              <h1 className="text-4xl sm:text-6xl font-serif font-light text-[#FAF8F5] tracking-tight">
                Our strategic <span className="italic text-[#B5B8BE]">delivery framework.</span>
              </h1>
              <p className="text-sm text-[#B5B8BE] font-sans font-light leading-relaxed max-w-xl mx-auto">
                Discover the 4-step communications process that translates defensive drafts into powerful, clean, and highly effective dialogues.
              </p>
            </div>

            {/* Steps Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 font-sans">
              <div className="space-y-3">
                <span className="text-2xl font-serif font-light text-[#B5B8BE]/30 font-mono">01</span>
                <h3 className="text-base font-semibold text-white">Paste Unfiltered Draft</h3>
                <p className="text-xs text-[#B5B8BE] font-sans font-light leading-relaxed">
                  Type or paste your raw draft exactly as you're feeling it. Leave the emotional baggage, apologies, and detailed context inside.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-2xl font-serif font-light text-[#B5B8BE]/30 font-mono">02</span>
                <h3 className="text-base font-semibold text-white">Scan Cognitive Structure</h3>
                <p className="text-xs text-[#B5B8BE] font-sans font-light leading-relaxed">
                  Our system highlights defensive language patterns, evaluates recipient subtext impact, and flags potential communication loop holes.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-2xl font-serif font-light text-[#B5B8BE]/30 font-mono">03</span>
                <h3 className="text-base font-semibold text-white">Modulate Strategic Tone</h3>
                <p className="text-xs text-[#B5B8BE] font-sans font-light leading-relaxed">
                  Select your tactical goals. Make it kinder to preserve warmth, firmer to lock down boundaries, or short to avoid back-and-forth threads.
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-2xl font-serif font-light text-[#B5B8BE]/30 font-mono">04</span>
                <h3 className="text-base font-semibold text-white">Review & Dispatch</h3>
                <p className="text-xs text-[#B5B8BE] font-sans font-light leading-relaxed">
                  Export or copy your newly minted strategic rewrite. Hit send with absolute executive confidence, knowing exactly how it will land.
                </p>
              </div>
            </div>

            {/* Interactive Step Simulator */}
            <div className="bg-[#1A1D20] rounded-2xl border border-white/5 p-8 max-w-4xl mx-auto space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                <div 
                  className="h-full bg-white transition-all duration-500" 
                  style={{ width: `${(hiwStep / 4) * 100}%` }}
                ></div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#B5B8BE]">LIVE SIMULATION</span>
                  <h3 className="text-lg font-serif font-light text-white">Interactive Step-by-Step Experience</h3>
                </div>
                {/* Step Switcher Buttons */}
                <div className="flex flex-wrap gap-1 bg-[#111315] p-1.5 rounded-lg border border-white/5 w-fit">
                  {[1, 2, 3, 4].map(s => (
                    <button 
                      key={s}
                      onClick={() => setHiwStep(s)}
                      className={`px-3 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${hiwStep === s ? 'bg-white text-black' : 'text-[#B5B8BE] hover:text-white'}`}
                    >
                      Step {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sandbox display container */}
              <div className="bg-[#111315] rounded-xl border border-white/5 p-6 space-y-6">
                {/* STEP 1 INPUT */}
                {hiwStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[9px] text-[#B5B8BE] uppercase tracking-wider">01 / INPUT FEED</span>
                      <span className="text-amber-400 font-mono text-[9px] animate-pulse">● USER TYPING...</span>
                    </div>
                    <div className="bg-[#1A1D20] p-4 rounded-lg border border-white/5 text-xs text-white italic font-serif leading-relaxed font-light">
                      "so sorry to bug you again, I know you are so busy! Just checking in on invoice 42 to see if there is any chance you got a free second to look at it? No rush at all, sorry to be a nuisance!"
                    </div>
                    <p className="text-[11px] text-[#B5B8BE] font-sans font-light">
                      This is a typical draft submitted by a freelancer. It is highly apologetic, lacks authority, and de-prioritizes the payment.
                    </p>
                  </div>
                )}

                {/* STEP 2 ANALYSIS */}
                {hiwStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[9px] text-[#B5B8BE] uppercase tracking-wider">02 / COGNITIVE SYNTAX SCAN</span>
                      <span className="text-red-400 font-mono text-[9px]">3 CRITICAL ISSUES DETECTED</span>
                    </div>
                    <div className="bg-[#1A1D20] p-4 rounded-lg border border-white/5 text-xs font-serif leading-relaxed font-light space-y-3">
                      <p className="text-white">
                        "<span className="bg-[#C97A7A]/20 border border-[#C97A7A]/40 px-1 py-0.5 rounded text-[#FAF8F5]" title="Apologetic Cushion">so sorry to bug you again</span>, I know you are <span className="bg-amber-400/10 border border-amber-400/30 px-1 py-0.5 rounded text-amber-400" title="Future Negotiation Loophole">so busy</span>! Just checking in on invoice 42 to see if there is <span className="bg-[#C97A7A]/20 border border-[#C97A7A]/40 px-1 py-0.5 rounded text-[#FAF8F5]" title="Submissive Phrasing">any chance</span> you got a free second to look at it? No rush at all, <span className="bg-[#C97A7A]/20 border border-[#C97A7A]/40 px-1 py-0.5 rounded text-[#FAF8F5]" title="Status Devaluation">sorry to be a nuisance</span>!"
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans font-light">
                      <div className="bg-[#1A1D20] p-3 rounded border border-red-900/10 space-y-1">
                        <span className="text-[9px] font-mono text-red-400 font-bold uppercase">Apology Buffers</span>
                        <p className="text-[#B5B8BE] text-[11px] leading-snug">Apologizing twice for collecting your hard-earned money lowers your relational stature.</p>
                      </div>
                      <div className="bg-[#1A1D20] p-3 rounded border border-amber-900/10 space-y-1">
                        <span className="text-[9px] font-mono text-amber-400 font-bold uppercase">Loophole Explanations</span>
                        <p className="text-[#B5B8BE] text-[11px] leading-snug">Stating "I know you are so busy" allows the recipient to stay silent under the cover of busy-ness.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 TONAL SELECTION */}
                {hiwStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[9px] text-[#B5B8BE] uppercase tracking-wider">03 / TONAL MODULATOR SELECT</span>
                      <span className="text-[#00E5FF] font-mono text-[9px]">ACTIVE TARGET TUNING</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setHiwTone('firm')}
                        className={`flex-1 p-3 rounded-lg border text-xs text-left transition font-sans font-light ${hiwTone === 'firm' ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20 text-white' : 'bg-[#1A1D20] border-white/5 text-[#B5B8BE]'}`}
                      >
                        <div className="font-medium text-white font-serif mb-1">Corporate Strategic Firmness</div>
                        <div className="text-[10px] text-[#B5B8BE]/80">Maximum executive authority, clean boundaries, highly professional.</div>
                      </button>
                      <button 
                        onClick={() => setHiwTone('concise')}
                        className={`flex-1 p-3 rounded-lg border text-xs text-left transition font-sans font-light ${hiwTone === 'concise' ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20 text-white' : 'bg-[#1A1D20] border-white/5 text-[#B5B8BE]'}`}
                      >
                        <div className="font-medium text-white font-serif mb-1">Polite & Ultra-Concise</div>
                        <div className="text-[10px] text-[#B5B8BE]/80">No explanation, highly direct, minimal relational noise.</div>
                      </button>
                    </div>
                    <p className="text-[11px] text-[#B5B8BE] font-sans font-light leading-relaxed">
                      Choose the perfect posture based on your relationship. Modifying tone recalculates the rewrite rules instantly.
                    </p>
                  </div>
                )}

                {/* STEP 4 ELITE DISPATCH */}
                {hiwStep === 4 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[9px] text-[#B5B8BE] uppercase tracking-wider">04 / STRATEGIC OUTPUT DISPATCH</span>
                      <span className="text-emerald-400 font-mono text-[9px] font-bold">✓ REWRITE READY</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/10 p-5 rounded-lg text-xs font-serif leading-relaxed font-light text-white relative">
                      {hiwTone === 'firm' ? (
                        "\"Hi [Name], this is a reminder that invoice #42 ($2,200) is now 10 days past due. Please let me know when I can expect the payment to clear so we can align our accounting records.\""
                      ) : (
                        "\"Hi [Name], hope you're well. Invoice #42 ($2,200) is past due. Please transfer the payment over when you have a moment today. Thank you.\""
                      )}
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 bg-[#1A1D20] p-3 rounded border border-white/5 text-xs text-[#B5B8BE] font-light">
                      <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>This rewrite successfully secures the payment, states the exact overdue period, establishes accountability, and completely removes emotional apologies.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation button inside simulation */}
              <div className="flex justify-between items-center pt-2 text-xs font-sans">
                <span className="text-[#B5B8BE]/50 font-mono">STEP {hiwStep} OF 4</span>
                <button 
                  onClick={() => {
                    if (hiwStep < 4) {
                      setHiwStep(hiwStep + 1);
                    } else {
                      setHiwStep(1);
                    }
                  }}
                  className="px-4 py-2 rounded bg-white text-black font-semibold text-[10px] hover:bg-white/90 transition flex items-center gap-1.5 cursor-pointer font-mono"
                >
                  {hiwStep === 4 ? 'RESTART DEMO' : 'NEXT STEP'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* General CTA */}
            <div className="text-center pt-8">
              <button 
                onClick={() => onNavigate('/signup')}
                className="px-8 py-4 rounded-xl bg-white text-black font-medium text-xs hover:bg-white/90 transition flex items-center justify-center gap-3.5 mx-auto font-sans shadow-lg"
              >
                Start Tuning Your Drafts Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== EXAMPLES PAGE ==================== */}
        {route === '/examples' && (
          <div className="py-20 px-6 max-w-6xl mx-auto w-full space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B5B8BE] bg-white/5 border border-white/10 px-3 py-1 rounded">MOCK TESTGROUND</span>
              <h1 className="text-4xl sm:text-6xl font-serif font-light text-[#FAF8F5] tracking-tight">
                Explore real <span className="italic text-[#B5B8BE]">dialogue mappings.</span>
              </h1>
              <p className="text-sm text-[#B5B8BE] font-sans font-light leading-relaxed max-w-xl mx-auto">
                Compare common anxious drafts with their elite, custom-reconstructed strategic counterparts. Search or filter through standard relational templates.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
              
              {/* Left Column: Search & Examples List (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Search Bar */}
                <div className="relative font-sans">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#888]">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search scenario templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-[#1A1D20] border border-white/5 focus:border-[#00E5FF]/30 rounded-lg text-xs text-white placeholder-[#888] focus:outline-none transition font-sans font-light"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#888] hover:text-white"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Category Chips */}
                <div className="flex flex-wrap gap-1 font-mono text-[9px] uppercase tracking-wider pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        // Default selection on filter change
                        const match = SEED_TEMPLATES.find(t => cat === 'All' || t.category === cat);
                        if (match) setActiveExampleId(match.id);
                      }}
                      className={`px-2 py-1 rounded border transition cursor-pointer ${selectedCategory === cat ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20' : 'bg-transparent border-white/5 text-[#B5B8BE] hover:text-white'}`}
                    >
                      {cat.replace(' / Dating', '').replace('Freelance & ', '')}
                    </button>
                  ))}
                </div>

                {/* Examples Scroll Container */}
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-10 border border-white/5 rounded-xl bg-[#1A1D20]">
                      <p className="text-xs text-[#B5B8BE] font-sans font-light">No templates match search query.</p>
                    </div>
                  ) : (
                    filteredTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveExampleId(t.id)}
                        className={`w-full text-left p-3.5 rounded-lg border transition duration-150 flex flex-col justify-between space-y-2 cursor-pointer ${activeExampleId === t.id ? 'bg-white/5 border-white/20' : 'bg-[#1A1D20] border-white/5 hover:border-white/10'}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="text-[10px] font-mono text-[#00E5FF] uppercase font-bold tracking-wider">{t.category}</span>
                          <span className="text-[8px] uppercase font-mono text-[#B5B8BE]/40">{t.scenario}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-white font-serif">{t.title}</h4>
                        <p className="text-[10px] text-[#B5B8BE] truncate font-sans font-light w-full">"{t.draft}"</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Comparative Interactive View (8 cols) */}
              <div className="lg:col-span-8">
                {activeTemplate ? (
                  <div className="bg-[#1A1D20] rounded-2xl border border-white/10 p-6 md:p-8 space-y-6 animate-fade-in relative">
                    
                    {/* Header bar */}
                    <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#00E5FF] uppercase tracking-widest font-bold">ACTIVE TEMPLATE TRANSFORMATION</span>
                        <h3 className="text-xl font-serif font-light text-[#FAF8F5] mt-1">{activeTemplate.title}</h3>
                      </div>
                      <span className="text-[10px] font-mono bg-white/5 border border-white/10 text-[#B5B8BE] px-2.5 py-1 rounded">
                        Goal: {activeTemplate.goal}
                      </span>
                    </div>

                    {/* Left/Right Draft vs Rewrite layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      
                      {/* Original Anxious Draft */}
                      <div className="space-y-3">
                        <span className="text-[10px] font-mono text-[#C97A7A] uppercase tracking-widest block font-bold">✕ ORIGINAL RAW DRAFT</span>
                        <div className="bg-[#111315] p-5 rounded-xl border border-white/5 h-[160px] overflow-y-auto italic font-serif text-[#FAF8F5]/80 text-xs font-light leading-relaxed relative">
                          "{activeTemplate.draft}"
                          <span className="absolute bottom-3 right-3 bg-[#C97A7A]/10 text-[#C97A7A] border border-[#C97A7A]/20 text-[9px] uppercase font-mono px-2 py-0.5 rounded">
                            Flagged
                          </span>
                        </div>
                        <p className="text-[10px] text-[#B5B8BE] font-sans font-light leading-relaxed">
                          This draft contains passive buffer cushions, overexplaining loops, and submissive phrasing that significantly devalues professional authority.
                        </p>
                      </div>

                      {/* Strategic Elite Rewrite */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">✓ STRATEGIC ELITE REWRITE</span>
                          <button
                            onClick={() => handleCopy(activeTemplate.id, activeCurated.rewrite)}
                            className="text-[#B5B8BE] hover:text-white flex items-center gap-1 text-[10px] transition bg-transparent cursor-pointer font-mono border-none"
                          >
                            {copiedId === activeTemplate.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">COPIED</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>COPY</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 p-5 rounded-xl h-[160px] overflow-y-auto text-white text-xs font-serif leading-relaxed font-light relative">
                          "{activeCurated.rewrite}"
                          <span className="absolute bottom-3 right-3 bg-emerald-500 text-black text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded">
                            Optimized
                          </span>
                        </div>
                        <p className="text-[10px] text-[#B5B8BE] font-sans font-light leading-relaxed">
                          This strategic rewrite sets firm boundaries, establishes immediate professional clarity, removes anxiety signals, and keeps negotiations focused.
                        </p>
                      </div>
                    </div>

                    {/* Output metric calculations */}
                    <div className="border-t border-white/5 pt-6 space-y-4">
                      <span className="text-[10px] font-mono text-white uppercase tracking-widest block font-bold">RECIPIENT READING MAP</span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-[10px]">
                        <div className="bg-[#111315] p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[#B5B8BE] mb-1">
                            <span>Clarity Score</span>
                            <span className="text-[#FAF8F5] font-semibold">{activeCurated.scores.clarity}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${activeCurated.scores.clarity}%` }}></div>
                          </div>
                        </div>

                        <div className="bg-[#111315] p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[#B5B8BE] mb-1">
                            <span>Warmth Balance</span>
                            <span className="text-[#FAF8F5] font-semibold">{activeCurated.scores.warmth}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${activeCurated.scores.warmth}%` }}></div>
                          </div>
                        </div>

                        <div className="bg-[#111315] p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[#B5B8BE] mb-1">
                            <span>Confidence Limit</span>
                            <span className="text-[#FAF8F5] font-semibold">{activeCurated.scores.confidence}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${activeCurated.scores.confidence}%` }}></div>
                          </div>
                        </div>

                        <div className="bg-[#111315] p-3 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[#B5B8BE] mb-1">
                            <span>Relational Risk</span>
                            <span className="text-red-400 font-semibold">{activeCurated.scores.risk}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400" style={{ width: `${activeCurated.scores.risk}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-full bg-[#1A1D20] rounded-2xl border border-white/5 flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <BookOpen className="w-12 h-12 text-[#B5B8BE] opacity-30 animate-pulse" />
                    <h3 className="text-lg font-serif font-light text-white">Select a template on the left</h3>
                    <p className="text-xs text-[#B5B8BE] max-w-sm">
                      Click any scenario draft starter to see how our engine transforms passive phrasing into high-impact communication.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ==================== FAQ PAGE ==================== */}
        {route === '/faq' && (
          <div className="py-20 px-6 max-w-4xl mx-auto w-full space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B5B8BE] bg-white/5 border border-white/10 px-3 py-1 rounded">HAVE QUESTIONS?</span>
              <h1 className="text-4xl sm:text-6xl font-serif font-light text-[#FAF8F5] tracking-tight">
                Frequently Asked <span className="italic text-[#B5B8BE]">Questions.</span>
              </h1>
              <p className="text-sm text-[#B5B8BE] font-sans font-light leading-relaxed max-w-xl mx-auto">
                Discover how How It Lands manages private communication, constructs subtext diagnostics, and integrates with your workflows.
              </p>
            </div>

            {/* Filter categories */}
            <div className="flex justify-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
              {[
                { id: 'all', label: 'ALL QUESTIONS' },
                { id: 'product', label: 'PRODUCT MECHANICS' },
                { id: 'privacy', label: 'PRIVACY & SAFETY' },
                { id: 'psychology', label: 'COMMUNICATION COGNITION' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFaqCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded border transition cursor-pointer ${faqCategory === cat.id ? 'bg-[#FAF8F5] text-[#111315] border-white' : 'bg-[#1A1D20] text-[#B5B8BE] border-white/5 hover:text-white'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Accordion FAQ list */}
            <div className="space-y-4 font-sans font-light pt-4 max-w-3xl mx-auto">
              
              {/* FAQ 1 */}
              {(faqCategory === 'all' || faqCategory === 'product') && (
                <div className="bg-[#1A1D20] rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq('faq_1')}
                    className="w-full text-left p-5 flex justify-between items-center hover:bg-white/[0.02] transition cursor-pointer bg-transparent border-none"
                  >
                    <h4 className="font-medium text-white text-sm font-sans">How is this different from ChatGPT, Grammarly, or other writing aids?</h4>
                    <span className="text-[#00E5FF] font-mono text-sm">{expandedFaq.faq_1 ? '−' : '+'}</span>
                  </button>
                  {expandedFaq.faq_1 && (
                    <div className="p-5 pt-0 text-xs text-[#B5B8BE] leading-relaxed border-t border-white/5 animate-fade-in space-y-3 font-sans font-light">
                      <p>
                        Standard writing models are trained to output polished, generic corporate templates. If you ask them to write a breakup text or demand an overdue invoice, they typically write sterile, artificial-sounding "AI blocks" (e.g. *"Dear client, I hope this finds you well. I write to inform you..."*).
                      </p>
                      <p>
                        **How It Lands** is custom-prompted with communication theories, focusing specifically on defensive language, submissive buffers, and future negotiation loopholes. It maintains your raw conversational format and voice while ensuring you set a healthy, polite, and completely unnegotiable boundary.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ 2 */}
              {(faqCategory === 'all' || faqCategory === 'privacy') && (
                <div className="bg-[#1A1D20] rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq('faq_2')}
                    className="w-full text-left p-5 flex justify-between items-center hover:bg-white/[0.02] transition cursor-pointer bg-transparent border-none"
                  >
                    <h4 className="font-medium text-white text-sm font-sans">Is my relationship and workplace data kept entirely confidential?</h4>
                    <span className="text-[#00E5FF] font-mono text-sm">{expandedFaq.faq_2 ? '−' : '+'}</span>
                  </button>
                  {expandedFaq.faq_2 && (
                    <div className="p-5 pt-0 text-xs text-[#B5B8BE] leading-relaxed border-t border-white/5 animate-fade-in space-y-2 font-sans font-light">
                      <p>
                        Yes, absolutely. This is our core commitment. We operate on a strict **Zero Private Model Training** policy. None of the draft messages you analyze or save in your private Vault are ever shared with external aggregators, sold to advertising data brokers, or used to train public machine learning engines.
                      </p>
                      <p>
                        All strategic parsing calculations are encrypted in transit. You also maintain complete sovereignty over your record history, with the ability to export your files or hard delete your account logs instantly from your Profile Settings.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ 3 */}
              {(faqCategory === 'all' || faqCategory === 'product') && (
                <div className="bg-[#1A1D20] rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq('faq_3')}
                    className="w-full text-left p-5 flex justify-between items-center hover:bg-white/[0.02] transition cursor-pointer bg-transparent border-none"
                  >
                    <h4 className="font-medium text-white text-sm font-sans">Can I select different tones (e.g. kinder, shorter, firmer)?</h4>
                    <span className="text-[#00E5FF] font-mono text-sm">{expandedFaq.faq_3 ? '−' : '+'}</span>
                  </button>
                  {expandedFaq.faq_3 && (
                    <div className="p-5 pt-0 text-xs text-[#B5B8BE] leading-relaxed border-t border-white/5 animate-fade-in font-sans font-light">
                      <p>
                        Yes. After pasting your draft inside our workspace app, you can easily shift your tonal targets. We provide dynamic presets like:
                      </p>
                      <ul className="list-disc pl-5 space-y-1.5 mt-3 text-white">
                        <li><strong>Kinder:</strong> Retains high relational warmth and politeness, but cleanly isolates the boundary.</li>
                        <li><strong>Firmer:</strong> Enhances executive stature and professional authority (excellent for invoices or salary asks).</li>
                        <li><strong>Shorter:</strong> Maximizes brevity, minimizing textual noise that often triggers redundant threads.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ 4 */}
              {(faqCategory === 'all' || faqCategory === 'psychology') && (
                <div className="bg-[#1A1D20] rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq('faq_4')}
                    className="w-full text-left p-5 flex justify-between items-center hover:bg-white/[0.02] transition cursor-pointer bg-transparent border-none"
                  >
                    <h4 className="font-medium text-white text-sm font-sans">What are "Defensive Buffers" and why does the app flag them?</h4>
                    <span className="text-[#00E5FF] font-mono text-sm">{expandedFaq.faq_4 ? '−' : '+'}</span>
                  </button>
                  {expandedFaq.faq_4 && (
                    <div className="p-5 pt-0 text-xs text-[#B5B8BE] leading-relaxed border-t border-white/5 animate-fade-in space-y-2 font-sans font-light">
                      <p>
                        Defensive buffers are anxious conversational qualifiers—like *"I just wanted to check"*, *"sorry to bother you again"*, *"I think"*, or *"correct me if I'm wrong but"*. 
                      </p>
                      <p>
                        Psychologically, these buffers signal high anxiety and low relational confidence. When you over-apologize, you teach the recipient that your request is an inconvenience, which de-prioritizes your boundary. Our engine identifies these markers and helps you remove them.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ 5 */}
              {(faqCategory === 'all' || faqCategory === 'psychology') && (
                <div className="bg-[#1A1D20] rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq('faq_5')}
                    className="w-full text-left p-5 flex justify-between items-center hover:bg-white/[0.02] transition cursor-pointer bg-transparent border-none"
                  >
                    <h4 className="font-medium text-white text-sm font-sans">How do "excuses" create negotiation loopholes in boundaries?</h4>
                    <span className="text-[#00E5FF] font-mono text-sm">{expandedFaq.faq_5 ? '−' : '+'}</span>
                  </button>
                  {expandedFaq.faq_5 && (
                    <div className="p-5 pt-0 text-xs text-[#B5B8BE] leading-relaxed border-t border-white/5 animate-fade-in space-y-2 font-sans font-light">
                      <p>
                        When you decline an invitation or boundary creep by overexplaining with a specific excuse (e.g., *"I can't make it because my car is in the shop"*), the receiving party naturally hears a problem to be solved. They might respond with, *"Oh, I can pick you up! No worries!"*, which traps you into either saying yes anyway or coming up with a second, increasingly awkward excuse.
                      </p>
                      <p>
                        By setting a **Hard Boundary Frame** (e.g., *"I cannot make it tonight as my bandwidth is fully booked"*), there is no specific transactional factor for them to negotiate. Politeness is maintained, but the door is completely closed.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ 6 */}
              {(faqCategory === 'all' || faqCategory === 'product') && (
                <div className="bg-[#1A1D20] rounded-xl border border-white/5 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq('faq_6')}
                    className="w-full text-left p-5 flex justify-between items-center hover:bg-white/[0.02] transition cursor-pointer bg-transparent border-none"
                  >
                    <h4 className="font-medium text-white text-sm font-sans">Do you support specialized playbooks for tough conversations?</h4>
                    <span className="text-[#00E5FF] font-mono text-sm">{expandedFaq.faq_6 ? '−' : '+'}</span>
                  </button>
                  {expandedFaq.faq_6 && (
                    <div className="p-5 pt-0 text-xs text-[#B5B8BE] leading-relaxed border-t border-white/5 animate-fade-in space-y-2 font-sans font-light">
                      <p>
                        Absolutely. Once you log in, we offer pre-formatted, step-by-step communication guides covering complex situations:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 mt-2 text-[#FAF8F5]">
                        <li>Pushing back on out-of-scope freelance work.</li>
                        <li>Addressing roommates regarding rent obligations.</li>
                        <li>Delivering formal notice of resignation cleanly.</li>
                        <li>Negotiating job offers or compensation increases.</li>
                        <li>Decline social events without offending peers.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==================== PRIVACY & TERMS ==================== */}
        {(route === '/privacy' || route === '/terms') && (
          <div className="py-20 px-6 max-w-3xl mx-auto w-full space-y-8 font-sans font-light text-xs leading-relaxed text-[#B5B8BE]">
            <div className="border-b border-white/5 pb-4">
              <span className="text-[10px] font-mono text-[#00E5FF] uppercase tracking-widest font-bold">SOVEREIGN WORKSPACE CHARTER</span>
              <h1 className="text-3xl font-serif font-light text-white mt-1 capitalize">{route.replace('/', '')} Agreement</h1>
              <p className="text-[11px] text-[#B5B8BE]/65 mt-2">Last Updated: June 2026. All communications are bound by modern digital encryption standards.</p>
            </div>

            {route === '/privacy' ? (
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">1. Privacy First Mandate</h3>
                  <p>
                    How It Lands prioritizes individual relational sovereignty. We operate under the philosophy that your private conversations, messages, relationship draft letters, and workplace drafts belong exclusively to you. Your text values are encrypted at transit.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">2. Zero Generative Model Training</h3>
                  <p>
                    We strictly guarantee that your input text is processed transiently to generate strategic diagnostics and rewrites. None of your private conversation data is compiled or aggregated to train commercial machine learning models or sold to downstream advertising agencies.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">3. Full Sovereignty & Auditing</h3>
                  <p>
                    You retain full control over your saved communications history. At any point, you can download all diagnostic logs or permanently hard-delete your account records and profile details. Deletions are mathematically immediate and irreversible.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">4. Encrypted Security Logs</h3>
                  <p>
                    All security audit trails are isolated using modern container sandboxes. We record transient system metadata (e.g. login timestamps) exclusively to safeguard your workspace account from unauthorized infiltration or credential stuffing.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">1. Acceptance of Strategic Terms</h3>
                  <p>
                    By activating a workspace account on How It Lands, you acknowledge and agree that our system provides interpersonal strategy and tone-modifying analysis based on standard communication science guidelines. We do not provide licensed mental health, legal, or therapeutic counseling.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">2. User Conduct Standards</h3>
                  <p>
                    You agree to use this communication engine solely for constructive interpersonal alignment, boundary setting, and executive workplace negotiations. You are strictly forbidden from leveraging this platform to draft malicious harassment material or automate deceptive spam networks.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">3. System Service Sandbox</h3>
                  <p>
                    This is an AI Studio sandbox. All features are fully functional. The platform is designed with unlimited free diagnostic runs for all sovereign users. We provide no guarantees of continuous server uptime or immediate message responses under heavy cloud load.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white font-serif">4. Limitation of Relational Liability</h3>
                  <p>
                    How It Lands analyzes subtext syntax, but ultimately, the choice of what message to send rests entirely with you. We hold zero liability for the outcomes of your relationship breakups, payment collections, or workplace compensation review negotiations.
                  </p>
                </section>
              </div>
            )}

            <div className="pt-6">
              <button 
                onClick={() => onNavigate('/')}
                className="px-4 py-2 rounded bg-white/5 text-[#FAF8F5] border border-white/10 hover:bg-white/10 text-[10px] font-mono tracking-wider transition uppercase"
              >
                ← Return to Home
              </button>
            </div>
          </div>
        )}

      </main>

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
              <li><button onClick={() => onNavigate('/how-it-works')} className="hover:text-white transition bg-transparent border-none cursor-pointer">How It Works</button></li>
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
