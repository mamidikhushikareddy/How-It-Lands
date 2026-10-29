/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, Sparkles, AlertCircle, Copy, HelpCircle, 
  CheckCircle, ArrowRight, Send, RefreshCw, Layers, Check, Search
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { notify } from '../../../components/ui/Toast';
import { authFetch } from '../../../lib/authStorage';

interface Playbook {
  id: string;
  title: string;
  category: string;
  tagline: string;
  critique: string;
  remedy: string;
  dos: string[];
  donts: string[];
  example_original: string;
  example_rewritten: string;
  scenario: string;
  goal: string;
}

export default function Playbooks() {
  const [activePlaybook, setActivePlaybook] = useState<string>('people-pleasing');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Strategy Matcher Quiz State
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizRecommendation, setQuizRecommendation] = useState<string | null>(null);

  // Draft Simulator State
  const [userDraft, setUserDraft] = useState<string>('');
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationError, setCalibrationError] = useState<string | null>(null);
  const [calibrationResult, setCalibrationResult] = useState<any | null>(null);

  // Power Swap state
  const [swapTab, setSwapTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const playbooks: Playbook[] = [
    {
      id: 'people-pleasing',
      title: 'Breaking Free From People-Pleasing Language',
      category: 'Interpersonal Psychology',
      tagline: 'Stop auditing your calendar and apologizing for standard human constraints.',
      critique: 'When we feel anxious or guilty, we automatically overexplain why we cannot attend, buy, or help. We detail calendar conflicts (e.g. "my dog is sick", "I have an exam"). This is a psychological signal of submission, which unintentionally trains the other party to negotiate your excuse (e.g., "Oh, we can do it after your exam then!").',
      remedy: 'Use the "Hard Boundary Frame." Your calendar fits inside a simple boundary. If you cannot do something, the reason is simply bandwidth or fit, which needs no further sub-excuses.',
      dos: [
        'State constraints cleanly: "I cannot commit to this right now."',
        'Use "No, but thank you for asking!" with total directness.',
        'Accept the micro-awkwardness of silence—do not send a second text.'
      ],
      donts: [
        'Do not list personal medical, family, or task reasons for choosing no.',
        'Never apologize for your lack of time or availability.'
      ],
      example_original: 'Hey sorry! I literally wish I could come but I have 3 exams this week and my sister is visiting from out of town, and then I am super exhausted. If I get free later maybe I can stop by? Sorry to miss it!',
      example_rewritten: 'Hey [Name], thank you so much for the invite! I am unable to make it this week, but I hope you guys have an incredible time. Let us definitely grab a coffee sometime soon.',
      scenario: 'declining invitation',
      goal: 'clear boundary'
    },
    {
      id: 'past-due-invoices',
      title: 'The Late Invoice Escalation Playbook',
      category: 'Freelance & Business',
      tagline: 'Recover outstanding payments from clients without sounding awkward or desperate.',
      critique: 'Freelancers often feel highly awkward requesting their hard-earned money. They send messages like "So sorry to bug you! Just checking if you got a second to look at invoice #42?" This treats billing as an optional nuisance instead of a strict contract, allowing accounts payable to delay payment.',
      remedy: 'Pivot immediately to an accounting tone. State base terms, specify exact balances, and omit apologies.',
      dos: [
        'State overdue length: "This invoice is now 10 days past due."',
        'Provide immediate next actions: "Please let me know when we can expect the clearance."',
        'Include payment links directly in the message.'
      ],
      donts: [
        'Never apologize ("sorry to bug you") for requesting contractually owed payments.',
        'Never suggest the client is simply "too busy" to pay you.'
      ],
      example_original: 'Hi! So sorry to bother you again, I know you are super busy with the launch! Just checking in to see if by any chance you got a free second to look at invoice #42? No rush at all, let me know if everything is okay! Thanks!!',
      example_rewritten: 'Hi [Name], this is a reminder that invoice #42 ($2,200) is now 10 days past due. Please let me know when I can expect the payment to clear, or if you need me to re-send the billing details.',
      scenario: 'payment reminder',
      goal: 'get paid'
    },
    {
      id: 'dating-breakups',
      title: 'Ending Connections Cleanly without Drama',
      category: 'Dating & Relationships',
      tagline: 'Deliver dating rejection or end early-stage connections with ultimate dignity.',
      critique: 'In early-stage dating (first 1-4 dates), people often delay ending things or send vague excuses ("I am super busy at work right now"). This creates a "false future loophole" where the other person thinks they can check back in next month, drag out texting loops, and experience unresolved hope.',
      remedy: 'Deliver a soft, respectful, but absolute closure frame. Confirm fit rather than excuses.',
      dos: [
        'Validate the connection: "I really valued our conversation / time together."',
        'State romantic misfit directly: "I do not feel a romantic fit between us."',
        'Wish them well cleanly.'
      ],
      donts: [
        'Do not blame temporary busy-ness as the reason for ending it.',
        'Do not suggest "let\'s be best friends" unless you truly intend to maintain a close platonic friendship.'
      ],
      example_original: 'Hey, so sorry but I have been super busy with work and don\'t really have time to date right now. You are literally perfect and amazing but I just can\'t right now. Maybe we can hang out as friends in a few months?',
      example_rewritten: 'Hey [Name], I have really valued our time together, but after some reflection, I do not feel we are a romantic match. You are a wonderful person and I wanted to be honest with you. I truly wish you the absolute best.',
      scenario: 'dating rejection',
      goal: 'clear boundary'
    },
    {
      id: 'salary-negotiation',
      title: 'The Confident Salary & Rate Negotiation Playbook',
      category: 'Career & Income',
      tagline: 'Claim your true market value without sounding defensive or apologetic.',
      critique: 'Professionals often approach raise or rate discussions apologetically, citing personal expenses ("rent is rising") or pleading ("I really hope you can consider this"). This frames the negotiation as a personal favor or an expense issue, which employers can easily brush off citing budget caps.',
      remedy: 'Anchor your negotiation on objective market indices, specific achievements delivered, and your future strategic impact.',
      dos: [
        'Cite market comparisons: "Based on current market indices for this role..."',
        'Detail quantifiable outcomes: "In the past year, I have successfully driven a 20% increase in..."',
        'Frame it as a partnership: "I want to align my contribution with a fair market level."'
      ],
      donts: [
        'Do not mention personal cost of living or financial burdens as the core reason.',
        'Avoid soft conditional verbs like "I was wondering if maybe you could..."'
      ],
      example_original: 'Hey Pradeep, I was just wondering if there is any chance I could get a little raise? Rent is getting crazy expensive and I have been here over a year now, and I really hope you can consider it because I really love working here!',
      example_rewritten: 'Hi Pradeep, I would like to schedule a brief call to review my compensation. Given the expansion of my role in leading our client delivery and the 22% increase in project throughput we achieved this quarter, I am proposing an adjustment of my rate to align with the current market standard of $95,000.',
      scenario: 'compensation review',
      goal: 'salary raise'
    },
    {
      id: 'scope-creep',
      title: 'Preventing Client Scope Creep (A-La-Carte Frame)',
      category: 'Freelance & Business',
      tagline: 'Manage expanding project requests smoothly while securing fair compensation.',
      critique: 'When clients ask for additions outside the initial contract, freelancers often either accept the extra work for free to avoid awkwardness, or push back defensively, causing relationship friction. Accepting for free trains clients to expect unlimited unpaid iterations.',
      remedy: 'Use the "A-La-Carte Frame." Welcome the request with enthusiasm, treat it as an exciting expansion, and immediately attach the corresponding price schedule.',
      dos: [
        'Validate the new idea: "I think that would be a fantastic addition to the project!"',
        'Frame the cost naturally: "I can absolutely execute this as an add-on. Here is the estimate..."',
        'Provide options: "We can prioritize this immediately for $400, or handle this in phase 2."'
      ],
      donts: [
        'Do not say "I don\'t usually do this for free but okay."',
        'Never execute additional features without written client confirmation on rates.'
      ],
      example_original: 'Oh wow, that is a cool idea! I guess I can add the interactive dashboard in for you too since we are already doing the charts, it might take me some extra hours but don\'t worry about it, I will just get it done!',
      example_rewritten: 'That is an excellent feature idea, [Name]! Adding an interactive dashboard would elevate the user experience. I would be glad to include this. It falls outside our original contract, so I can add it as a scope change for $650. Let me know if you would like me to update our agreement to proceed.',
      scenario: 'client request',
      goal: 'manage scope creep'
    },
    {
      id: 'family-boundaries',
      title: 'Deflecting Overstepping Family Members',
      category: 'Interpersonal Psychology',
      tagline: 'Decline unsolicited advice or excessive demands from relatives with warm finality.',
      critique: 'When parents, siblings, or in-laws cross boundaries with unsolicited advice or high-pressure demands, we tend to either submit to preserve peace (while harboring deep resentment) or snap with aggressive frustration, sparking massive family drama.',
      remedy: 'Use the "Warm but Rigid Standard Frame." Firmly separate your appreciation for their intent (warmth) from the unshakeable nature of your personal decision (rigid boundary).',
      dos: [
        'Validate their care: "I know you are telling me this out of love/care."',
        'Use a direct "I have decided" statement: "I have made my decision on how to handle this."',
        'Pivot gracefully to a neutral topic to close the door on further negotiation.'
      ],
      donts: [
        'Do not enter into debates or defend your reasoning. This invites them to dissect and dismantle your choices.',
        'Do not apologize for living your life according to your own choices.'
      ],
      example_original: 'Look, I know you think I am raising my kids wrong and that I should feed them organic stuff only, but you don\'t understand how expensive it is and you are stressing me out so much! Please just stop telling me what to do every single holiday!',
      example_rewritten: 'I always appreciate how much you care about the children\'s health, [Name]. I have actually researched this topic extensively and am comfortable with our current routine. Tell me, how is your garden coming along this spring?',
      scenario: 'family boundary',
      goal: 'warm but firm boundary'
    }
  ];

  const phraseSwaps = [
    {
      category: 'Boundaries',
      weak: "I'm so sorry, I literally can't because my week is super crazy...",
      strategic: "I cannot commit to this right now.",
      rationale: "Omit excuses; they invite negotiation of your time."
    },
    {
      category: 'Professional',
      weak: "I was wondering if maybe I could get a little raise if that's okay?",
      strategic: "I am proposing an adjustment to align with market standards.",
      rationale: "Anchor on objective value rather than pleading."
    },
    {
      category: 'Freelance',
      weak: "Sorry to bother you! Just checking in on that late invoice?",
      strategic: "This reminder indicates invoice #42 is now 10 days past due.",
      rationale: "Treat billing as a strict contract, not an annoying favor."
    },
    {
      category: 'Authority',
      weak: "Does that make sense? Let me know if I'm wrong...",
      strategic: "Let me know if you have any questions on this approach.",
      rationale: "Own your expertise; do not pre-emptively undermine yourself."
    },
    {
      category: 'Apologies',
      weak: "Sorry for the slow response, I've been drowning in work!",
      strategic: "Thank you for your patience.",
      rationale: "Gratitude keeps you in control; apologies frame you as failing."
    },
    {
      category: 'Softness',
      weak: "Just thought I would check if you had a second...",
      strategic: "Do you have 10 minutes to sync on this priority?",
      rationale: "Omit minimizers like 'just' and be crisp on commitments."
    },
    {
      category: 'Authority',
      weak: "I think we should probably try to maybe do X...",
      strategic: "My recommendation is to execute X.",
      rationale: "Express professional suggestions with decisive clarity."
    }
  ];

  const active = playbooks.find(p => p.id === activePlaybook) || playbooks[0];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Strategy Matcher Quiz Questions
  const quizQuestions = [
    {
      question: "What is the primary context of your dilemma?",
      options: [
        { label: "Salary, career advancement or raises", value: "career" },
        { label: "Client scope, freelancing or invoicing", value: "business" },
        { label: "Declining invitations, favors or social demands", value: "social" },
        { label: "Dating, relationships or early rejection", value: "romantic" },
        { label: "Unsolicited pressure or demands from relatives", value: "family" }
      ]
    },
    {
      question: "What is your biggest psychological friction?",
      options: [
        { label: "I feel incredibly guilty saying no", value: "guilt" },
        { label: "I am afraid of sounding confrontational or desperate", value: "fear" },
        { label: "I don't know how to ask for what I'm truly worth", value: "worth" },
        { label: "I'm worried about creating irreversible family drama", value: "drama" }
      ]
    },
    {
      question: "What is your ideal immediate outcome?",
      options: [
        { label: "A soft but completely non-negotiable boundary", value: "boundary" },
        { label: "Secure clear, fair financial compensation", value: "compensation" },
        { label: "Deliver final romantic closure with zero loopholes", value: "closure" },
        { label: "Deflect overstepping while maintaining absolute warmth", value: "warm_boundary" }
      ]
    }
  ];

  const handleQuizAnswer = (value: string) => {
    const nextAnswers = [...quizAnswers, value];
    setQuizAnswers(nextAnswers);

    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Calculate Recommendation
      const context = nextAnswers[0];
      let recommendedId = "people-pleasing";

      if (context === "career") {
        recommendedId = "salary-negotiation";
      } else if (context === "business") {
        const outcome = nextAnswers[2];
        recommendedId = outcome === "boundary" ? "scope-creep" : "past-due-invoices";
      } else if (context === "social") {
        recommendedId = "people-pleasing";
      } else if (context === "romantic") {
        recommendedId = "dating-breakups";
      } else if (context === "family") {
        recommendedId = "family-boundaries";
      }

      setQuizRecommendation(recommendedId);
    }
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers([]);
    setQuizRecommendation(null);
    setQuizActive(false);
  };

  // Draft Simulator Calibration API
  const handleCalibrateDraft = async () => {
    if (!userDraft.trim()) return;

    setIsCalibrating(true);
    setCalibrationError(null);
    setCalibrationResult(null);

    try {
      const response = await authFetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_message: userDraft,
          scenario: active.scenario,
          user_goal: active.goal,
          relationship_context: active.category,
          tone_settings: {
            warmth: active.id.includes('pleasing') || active.id.includes('family') ? 60 : 30,
            directness: 80,
            confidence: 85,
            softness: active.id.includes('dating') || active.id.includes('family') ? 50 : 20,
            formality: active.id.includes('invoice') || active.id.includes('negotiation') ? 85 : 40,
            emotional_openness: 20
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server returned an error.');
      }

      const data = await response.json();
      setCalibrationResult(data.output_json || data);
    } catch (err: any) {
      console.error('Draft Simulator calibration failed:', err);
      setCalibrationError(err.message || 'Calibration engine timed out. Please try again.');
    } finally {
      setIsCalibrating(false);
    }
  };

  // Filter Phrase Swaps
  const filteredSwaps = phraseSwaps.filter(swap => {
    const matchesTab = swapTab === 'All' || swap.category === swapTab;
    const matchesSearch = swap.weak.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          swap.strategic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          swap.rationale.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-2 font-sans pb-16 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Title Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-600 dark:bg-[#00E5FF] animate-pulse" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-700 dark:text-cyan-400" />
              INTERPERSONAL STRATEGY PLAYBOOKS
            </span>
          </div>
          <button
            onClick={() => setQuizActive(true)}
            className="text-[10px] uppercase font-mono bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300 dark:bg-cyan-950/30 dark:hover:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800/40 px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
            Strategy Matcher Quiz
          </button>
        </div>
        <h1 className="text-2xl font-light font-serif text-slate-900 dark:text-slate-100">Strategic Playbooks</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans font-light">
          Step-by-step communication playbooks calibrated with relational psychology, high-stakes negotiation framework, and boundary defense mechanisms.
        </p>
      </div>

      {/* Selector Quiz Modal/Overlay */}
      {quizActive && (
        <div className="bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 animate-fade-in shadow-xl text-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              <h3 className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-900 dark:text-slate-100">Strategy Selector Diagnostic</h3>
            </div>
            <button 
              onClick={resetQuiz}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition bg-transparent border-none cursor-pointer"
            >
              Exit Quiz
            </button>
          </div>

          {!quizRecommendation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">STEP {quizStep + 1} OF {quizQuestions.length}</span>
                <div className="flex gap-1">
                  {quizQuestions.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`w-4 h-1 rounded ${idx <= quizStep ? 'bg-slate-900 dark:bg-cyan-400 font-semibold' : 'bg-slate-200 dark:bg-slate-800'}`} 
                    />
                  ))}
                </div>
              </div>

              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{quizQuestions[quizStep].question}</h4>

              <div className="grid grid-cols-1 gap-2.5">
                {quizQuestions[quizStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(opt.value)}
                    className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1E293B] dark:hover:bg-[#273449] border border-slate-200 dark:border-slate-700 hover:border-sky-500 dark:hover:border-cyan-400 text-xs text-slate-900 dark:text-slate-100 rounded-xl transition flex items-center justify-between cursor-pointer shadow-xs"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-800">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Diagnostic Recommendation Generated</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Based on your situation, we recommend deploying the following communication framework immediately:
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl max-w-sm mx-auto space-y-1">
                <span className="text-[9px] uppercase font-mono text-slate-500 dark:text-slate-400">Recommended Framework</span>
                <h5 className="font-serif text-sky-700 dark:text-cyan-400 text-sm font-semibold">
                  {playbooks.find(p => p.id === quizRecommendation)?.title}
                </h5>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    setActivePlaybook(quizRecommendation);
                    setQuizActive(false);
                    setQuizRecommendation(null);
                    setQuizAnswers([]);
                    setQuizStep(0);
                  }}
                  variant="primary"
                  size="sm"
                  className="rounded-xl"
                >
                  Load Playbook
                </Button>
                <button
                  onClick={resetQuiz}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition bg-transparent border-none cursor-pointer font-medium"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Directory List & Power Swaps Cheat Sheet */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-2.5">
            <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider font-semibold block">Playbook Frameworks</span>
            <div className="space-y-2.5">
              {playbooks.map((p) => {
                const isSelected = activePlaybook === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePlaybook(p.id);
                      setUserDraft('');
                      setCalibrationResult(null);
                    }}
                    className={`w-full p-4 rounded-2xl text-left border transition-all duration-150 flex flex-col justify-between text-xs cursor-pointer ${
                      isSelected 
                        ? 'bg-sky-50/80 dark:bg-[#1E293B] border-sky-600 dark:border-cyan-400 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-sky-600/20 dark:ring-cyan-400/20' 
                        : 'bg-white dark:bg-[#151B28] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1A2234] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5 font-sans">
                      <span className={`text-[9px] font-mono uppercase tracking-wider font-bold block ${
                        isSelected ? 'text-sky-700 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {p.category}
                      </span>
                      <h4 className={`font-serif text-sm leading-snug ${
                        isSelected ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-800 dark:text-slate-200 font-medium'
                      }`}>{p.title}</h4>
                      <p className={`text-[11px] font-light line-clamp-2 leading-relaxed ${
                        isSelected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'
                      }`}>{p.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strategic Vocabulary Cheat Sheet */}
          <div className="bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-sky-700 dark:text-cyan-400 uppercase tracking-wider block font-bold">The Strategic Vocabulary</span>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Power Phrase Swaps</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans font-light">Instantly upgrade weak passive habits to executive confidence.</p>
            </div>

            {/* Swap Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 select-none">
              {['All', 'Boundaries', 'Professional', 'Freelance', 'Authority', 'Apologies'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSwapTab(cat)}
                  className={`text-[9px] font-mono px-2.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    swapTab === cat 
                      ? 'bg-sky-50 dark:bg-[#1E293B] text-sky-900 dark:text-cyan-300 font-bold border border-sky-600 dark:border-cyan-400 shadow-xs' 
                      : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search phrase swaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#10141C] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:border-sky-500 dark:focus:border-cyan-400 font-sans font-light"
              />
            </div>

            {/* List of Swaps */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {filteredSwaps.length === 0 ? (
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 py-3 font-sans font-light">No matching phrases found.</p>
              ) : (
                filteredSwaps.map((swap, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-[#1E293B] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 relative group hover:border-slate-300 dark:hover:border-slate-700 transition">
                    <span className="text-[8px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">{swap.category}</span>
                    <div className="space-y-1">
                      <p className="text-[10px] text-rose-700 dark:text-rose-400 line-through font-sans italic opacity-90">
                        "{swap.weak}"
                      </p>
                      <p className="text-[11px] text-slate-900 dark:text-slate-100 font-serif font-medium leading-relaxed">
                        "{swap.strategic}"
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5 font-light font-sans">
                      {swap.rationale}
                    </p>
                    <button
                      onClick={() => handleCopy(swap.strategic, idx)}
                      className="absolute top-2.5 right-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 opacity-0 group-hover:opacity-100 transition bg-transparent border-none cursor-pointer"
                      title="Copy Strategic Swap"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Playbook Display & Simulator */}
        <div className="lg:col-span-8 bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-2xl space-y-6 text-slate-900 dark:text-slate-100">
          
          {/* Header walk-through */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-1">
            <span className="text-[9px] uppercase font-mono text-sky-700 dark:text-cyan-400 tracking-widest block font-bold">
              {active.category} PLAYBOOK
            </span>
            <h2 className="text-xl font-serif font-semibold text-slate-900 dark:text-slate-100">{active.title}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-light font-sans italic">"{active.tagline}"</p>
          </div>

          {/* Social Chemistry Critique (The Friction Point) */}
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-700 dark:text-rose-400">
              The Friction Point (Why standard texts fail)
            </h4>
            <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-rose-50/70 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 font-sans font-light">
              {active.critique}
            </div>
          </div>

          {/* Remedy (The Strategic Shift) */}
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-sky-700 dark:text-cyan-400">
              The Strategic Shift
            </h4>
            <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-sky-50/60 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-200 dark:border-sky-900/40 font-sans font-light">
              {active.remedy}
            </div>
          </div>

          {/* Dos vs Donts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-xl space-y-2.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 dark:text-emerald-400">Do This:</span>
              <ul className="space-y-2 text-xs">
                {active.dos.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-800 dark:text-slate-200 font-sans font-light">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-4 rounded-xl space-y-2.5">
              <span className="text-[10px] font-mono uppercase font-bold text-rose-800 dark:text-rose-400">Avoid This:</span>
              <ul className="space-y-2 text-xs">
                {active.donts.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-800 dark:text-slate-200 font-sans font-light">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Example Side-by-side translation */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <span className="text-[9px] font-mono uppercase text-slate-600 dark:text-slate-400 tracking-widest block font-medium">
              EXAMPLE INTERACTION TRANSFORMATION
            </span>
            
            <div className="space-y-4 font-sans font-light">
              <div className="bg-slate-50 dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <span className="text-[8px] text-rose-700 dark:text-rose-400 font-mono uppercase tracking-wider block font-bold">Standard Weak Draft (High Excuses / Overexplain)</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed font-serif">
                  "{active.example_original}"
                </p>
              </div>

              <div className="bg-sky-50/60 dark:bg-[#1E293B] p-4 rounded-xl border border-sky-300 dark:border-cyan-500/40 space-y-1.5 relative group shadow-xs">
                <span className="text-[8px] text-sky-700 dark:text-cyan-400 font-mono uppercase tracking-wider block font-bold">Calibrated Version (Strategic Framing)</span>
                <p className="text-xs text-slate-900 dark:text-slate-100 italic font-serif leading-relaxed font-medium">
                  "{active.example_rewritten}"
                </p>
                <button 
                  onClick={() => handleCopy(active.example_rewritten, 999)}
                  className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300 font-mono hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  {copiedIndex === 999 ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      COPIED
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      COPY TEMPLATE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Draft Simulator Sandbox */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
              <span className="text-[10px] font-mono uppercase text-slate-900 dark:text-slate-100 tracking-widest font-semibold">Playbook Draft Simulator</span>
            </div>
            
            <div className="bg-slate-50 dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Test Your Real-World Draft</h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans font-light">
                  Type or paste the raw, tentative message you are planning to send. Our strategy engine will run a full calibration audit against this specific playbook.
                </p>
              </div>

              <textarea
                value={userDraft}
                onChange={(e) => setUserDraft(e.target.value)}
                placeholder={`Type your awkward draft for "${active.title}"...`}
                className="w-full h-24 p-3.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 focus:border-sky-500 dark:focus:border-cyan-400 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans resize-none shadow-xs"
              />

              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={handleCalibrateDraft}
                  disabled={isCalibrating || !userDraft.trim()}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-2 rounded-xl"
                >
                  {isCalibrating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Calibrating Draft...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Calibrate & Critique Draft
                    </>
                  )}
                </Button>

                {userDraft && (
                  <button
                    onClick={() => { setUserDraft(''); setCalibrationResult(null); }}
                    className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition bg-transparent border-none cursor-pointer"
                  >
                    Clear Draft
                  </button>
                )}
              </div>

              {calibrationError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-xs rounded-xl flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <span>{calibrationError}</span>
                </div>
              )}

              {calibrationResult && (
                <div className="space-y-5 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold">CALIBRATION SCOREBOARD</span>
                    <span className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                      calibrationResult.summary?.landing_status === 'well' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                      calibrationResult.summary?.landing_status === 'neutral' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30' :
                      'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    }`}>
                      Landing Status: {calibrationResult.summary?.landing_status || 'risky'}
                    </span>
                  </div>

                  {/* Calibration Scores */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(calibrationResult.scores || []).slice(0, 4).map((score: any, index: number) => (
                      <div key={index} className="bg-white dark:bg-[#151B28] p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-xs">
                        <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono block truncate">{score.dimension}</span>
                        <div className="flex items-baseline justify-center gap-1 mt-1">
                          <span className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">{score.score}</span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400">/100</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtext and Impressions */}
                  <div className="space-y-3.5 text-xs font-sans">
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-mono uppercase text-slate-900 dark:text-slate-100 font-semibold font-sans">Immediate Subtext (What they hear):</h4>
                      <p className="text-slate-900 dark:text-slate-100 bg-white dark:bg-[#151B28] p-3 rounded-xl border border-slate-200 dark:border-slate-700 italic font-serif font-light leading-relaxed shadow-xs">
                        "{calibrationResult.how_it_may_be_read?.subtext || calibrationResult.summary?.overall_read || "The message may broadcast standard apologetic hesitation."}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 font-light">
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-400 font-semibold font-sans">Whats Working:</h4>
                        <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside bg-white dark:bg-[#151B28] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                          {(calibrationResult.whats_working || ["Clean initial sentence context"]).map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-mono uppercase text-rose-700 dark:text-rose-400 font-semibold font-sans font-light">Friction Points:</h4>
                        <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside bg-white dark:bg-[#151B28] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                          {(calibrationResult.whats_risky || ["Contains apologetic cues", "Overexplains personal constraints"]).map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic rewrite crafted for this playbook context */}
                  <div className="pt-2 font-sans">
                    <div className="bg-sky-50/60 dark:bg-[#151B28] p-4 rounded-xl border border-sky-300 dark:border-cyan-500/40 space-y-2 relative group shadow-xs">
                      <span className="text-[9px] text-sky-700 dark:text-cyan-400 font-mono uppercase tracking-wider block font-bold">CUSTOM PLAYBOOK REWRITE (RECOMMENDED)</span>
                      <p className="text-xs text-slate-900 dark:text-slate-100 italic font-serif leading-relaxed">
                        "{calibrationResult.rewrites?.find((r: any) => r.type === 'confident' || r.type === 'best')?.content || calibrationResult.rewrites?.[0]?.content || 'Calibrating alternative text...'}"
                      </p>
                      <button 
                        onClick={() => {
                          const rewrite = calibrationResult.rewrites?.find((r: any) => r.type === 'confident' || r.type === 'best')?.content || calibrationResult.rewrites?.[0]?.content;
                          if (rewrite) {
                            navigator.clipboard.writeText(rewrite);
                            notify("Calibrated rewrite copied to clipboard!", "success");
                          }
                        }}
                        className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300 font-mono hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-xs"
                      >
                        COPY REWRITE
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
