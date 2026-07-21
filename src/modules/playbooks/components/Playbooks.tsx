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

// Shape of a playbook as returned by the API (server/db/repositories/content.repo.ts) —
// looser than the curated Playbook type above since admin-authored rows
// don't populate every field (no scenario/goal, dos/donts can be empty).
interface DbPlaybook {
  id: string;
  title: string;
  category: string;
  summary?: string;
  tagline?: string;
  critique?: string;
  remedy?: string;
  dos?: string[];
  donts?: string[];
  example_original?: string;
  example_rewritten?: string;
}

interface PlaybooksProps {
  // Admin-authored playbooks fetched from the database. Previously fetched
  // into App.tsx but only ever passed to AdminPanel for editing — never
  // actually rendered anywhere a regular user could see them, so anything
  // an admin added here never reached real accounts.
  dbPlaybooks?: DbPlaybook[];
}

export default function Playbooks({ dbPlaybooks = [] }: PlaybooksProps) {
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
      const response = await fetch('/api/analyze', {
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
    <div className="space-y-8 max-w-5xl mx-auto p-2 font-sans pb-16 animate-fade-in text-[#FAF8F5]">
      {/* Title Header */}
      <div className="border-b border-white/5 pb-5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#a0a0a0] font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-white" />
              INTERPERSONAL STRATEGY PLAYBOOKS
            </span>
          </div>
          <button
            onClick={() => setQuizActive(true)}
            className="text-[10px] uppercase font-mono bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/20 px-3 py-1.5 rounded-lg border border-[#00E5FF]/20 transition flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <Sparkles className="w-3 h-3" />
            Strategy Matcher Quiz
          </button>
        </div>
        <h1 className="text-2xl font-light font-serif text-white">Strategic Playbooks</h1>
        <p className="text-xs text-[#a0a0a0] font-sans font-light">
          Step-by-step communication playbooks calibrated with relational psychology, high-stakes negotiation framework, and boundary defense mechanisms.
        </p>
      </div>

      {/* Admin-authored playbooks, pulled from the database */}
      {dbPlaybooks.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#a0a0a0] font-medium">Team Library</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dbPlaybooks.map((pb) => (
              <div key={pb.id} className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-mono bg-[#00E5FF]/5 text-[#00E5FF] px-2 py-0.5 rounded border border-[#00E5FF]/10 w-fit inline-block font-bold">
                  {pb.category}
                </span>
                <h4 className="font-bold text-white text-sm">{pb.title}</h4>
                {(pb.summary || pb.tagline) && (
                  <p className="text-xs text-[#a0a0a0] leading-relaxed">{pb.summary || pb.tagline}</p>
                )}
                {pb.remedy && (
                  <p className="text-xs text-[#FAF8F5]/90 leading-relaxed"><span className="text-[#00E5FF] font-semibold">Try this: </span>{pb.remedy}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selector Quiz Modal/Overlay */}
      {quizActive && (
        <div className="bg-[#FDF8E1] border border-[#EAE2A6] rounded-[24px] p-6 space-y-5 animate-fade-in shadow-xl text-[#111315]">
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E85D04]" />
              <h3 className="text-xs uppercase font-mono tracking-wider font-semibold text-[#111315]">Strategy Selector Diagnostic</h3>
            </div>
            <button 
              onClick={resetQuiz}
              className="text-xs text-[#555555] hover:text-[#111315] transition bg-transparent border-none cursor-pointer"
            >
              Exit Quiz
            </button>
          </div>

          {!quizRecommendation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#555555]">STEP {quizStep + 1} OF {quizQuestions.length}</span>
                <div className="flex gap-1">
                  {quizQuestions.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`w-4 h-1 rounded ${idx <= quizStep ? 'bg-[#FFDD44]' : 'bg-black/10'}`} 
                    />
                  ))}
                </div>
              </div>

              <h4 className="text-sm font-medium text-[#111315]">{quizQuestions[quizStep].question}</h4>

              <div className="grid grid-cols-1 gap-2.5">
                {quizQuestions[quizStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(opt.value)}
                    className="w-full text-left p-3.5 bg-white/60 hover:bg-[#F9F0CD] border border-[#EAE2A6] hover:border-[#D2C58A] text-xs text-[#111315] rounded-xl transition flex items-center justify-between cursor-pointer shadow-sm"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#111315]/40" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[#111315]">Diagnostic Recommendation Generated</h4>
                <p className="text-xs text-[#555555] max-w-md mx-auto">
                  Based on your situation, we recommend deploying the following communication framework immediately:
                </p>
              </div>

              <div className="p-4 bg-white border border-[#EAE2A6] rounded-xl max-w-sm mx-auto space-y-1">
                <span className="text-[9px] uppercase font-mono text-[#555555]">Recommended Framework</span>
                <h5 className="font-serif text-[#E85D04] text-sm font-medium">
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
                  className="px-4 py-2 text-xs text-[#555555] hover:text-[#111315] transition bg-transparent border-none cursor-pointer font-medium"
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
            <span className="text-[9px] font-mono uppercase text-[#888] tracking-wider">Playbook Frameworks</span>
            <div className="space-y-2.5">
              {playbooks.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePlaybook(p.id);
                    setUserDraft('');
                    setCalibrationResult(null);
                  }}
                  className={`w-full p-4 rounded-[20px] text-left border transition flex flex-col justify-between text-xs cursor-pointer ${
                    activePlaybook === p.id 
                      ? 'bg-[#FFDD44] border-[#E5C110] text-[#111315] shadow-sm font-semibold' 
                      : 'bg-[#FDF8E1] border-[#EAE2A6] text-[#555555] hover:bg-[#F9F0CD] hover:border-[#D2C58A]'
                  }`}
                >
                  <div className="space-y-1 font-sans">
                    <span className={`text-[8px] font-mono uppercase tracking-wider font-bold ${
                      activePlaybook === p.id ? 'text-[#111315]/80' : 'text-[#888]'
                    }`}>
                      {p.category}
                    </span>
                    <h4 className="font-serif text-sm leading-snug text-[#111315]">{p.title}</h4>
                    <p className={`text-[10px] font-light line-clamp-2 leading-relaxed mt-1 ${
                      activePlaybook === p.id ? 'text-[#111315]/80' : 'text-[#555555]'
                    }`}>{p.tagline}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Strategic Vocabulary Cheat Sheet */}
          <div className="bg-[#FDF8E1] border border-[#EAE2A6] rounded-[24px] p-5 space-y-4 text-[#111315]">
            <div className="space-y-1">
              <span className="text-[9px] font-mono text-[#E85D04] uppercase tracking-wider block font-bold">The Strategic Vocabulary</span>
              <h3 className="text-xs font-semibold text-[#111315]">Power Phrase Swaps</h3>
              <p className="text-[10px] text-[#555555] leading-relaxed font-sans font-light">Instantly upgrade weak passive habits to executive confidence.</p>
            </div>

            {/* Swap Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 select-none">
              {['All', 'Boundaries', 'Professional', 'Freelance', 'Authority', 'Apologies'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSwapTab(cat)}
                  className={`text-[9px] font-mono px-2.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    swapTab === cat 
                      ? 'bg-[#FFDD44] text-[#111315] font-bold border border-[#E5C110]/20' 
                      : 'bg-white/60 text-[#555555] hover:text-[#111315] hover:bg-[#F9F0CD] border border-[#EAE2A6]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#111315]/40 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search phrase swaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#EAE2A6] text-[10px] text-[#111315] placeholder-[#888] rounded-xl focus:outline-none focus:border-[#D2C58A] font-sans font-light"
              />
            </div>

            {/* List of Swaps */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {filteredSwaps.length === 0 ? (
                <p className="text-[10px] text-center text-[#888] py-3 font-sans font-light">No matching phrases found.</p>
              ) : (
                filteredSwaps.map((swap, idx) => (
                  <div key={idx} className="bg-white/60 p-3.5 rounded-xl border border-[#EAE2A6] space-y-2 relative group hover:border-[#D2C58A] transition">
                    <span className="text-[8px] font-mono text-[#555555] uppercase tracking-widest">{swap.category}</span>
                    <div className="space-y-1">
                      <p className="text-[10px] text-[#C97A7A] line-through font-sans italic opacity-90">
                        "{swap.weak}"
                      </p>
                      <p className="text-[11px] text-[#111315] font-serif font-medium leading-relaxed">
                        "{swap.strategic}"
                      </p>
                    </div>
                    <p className="text-[9px] text-[#555555] border-t border-black/5 pt-1.5 font-light font-sans">
                      {swap.rationale}
                    </p>
                    <button
                      onClick={() => handleCopy(swap.strategic, idx)}
                      className="absolute top-2.5 right-2.5 text-[#555555] hover:text-[#111315] opacity-0 group-hover:opacity-100 transition bg-transparent border-none cursor-pointer"
                      title="Copy Strategic Swap"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
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
        <div className="lg:col-span-8 bg-[#FDF8E1] border border-[#EAE2A6] p-6 rounded-[24px] space-y-6 text-[#111315]">
          
          {/* Header walk-through */}
          <div className="border-b border-black/10 pb-5 space-y-1">
            <span className="text-[9px] uppercase font-mono text-[#E85D04] tracking-widest block font-bold">
              {active.category} PLAYBOOK
            </span>
            <h2 className="text-xl font-serif font-semibold text-[#111315]">{active.title}</h2>
            <p className="text-xs text-[#555555] font-light font-sans italic">"{active.tagline}"</p>
          </div>

          {/* Social Chemistry Critique */}
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-mono font-semibold tracking-wider text-[#C97A7A]">
              The Friction Point (Why standard texts fail)
            </h4>
            <p className="text-xs text-[#555555] leading-relaxed bg-white/40 p-4 rounded-xl border border-[#EAE2A6] font-sans font-light">
              {active.critique}
            </p>
          </div>

          {/* Remedy */}
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-mono font-semibold tracking-wider text-[#E85D04]">
              The Strategic Shift
            </h4>
            <p className="text-xs text-[#111315] leading-relaxed font-sans font-light pl-1">
              {active.remedy}
            </p>
          </div>

          {/* Dos vs Donts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#3E6F58]/5 border border-[#3E6F58]/20 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-mono uppercase font-semibold text-emerald-700">Do This:</span>
              <ul className="space-y-2 text-xs">
                {active.dos.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#333333] font-sans font-light">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#C97A7A]/5 border border-[#C97A7A]/20 p-4 rounded-xl space-y-2">
              <span className="text-[10px] font-mono uppercase font-semibold text-rose-700">Avoid This:</span>
              <ul className="space-y-2 text-xs">
                {active.donts.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#333333] font-sans font-light">
                    <span className="text-rose-700 font-bold">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Example Side-by-side translation */}
          <div className="border-t border-black/10 pt-5 space-y-4">
            <span className="text-[9px] font-mono uppercase text-[#555555] tracking-widest block font-medium">
              EXAMPLE INTERACTION TRANSFORMATION
            </span>
            
            <div className="space-y-4 font-sans font-light">
              <div className="bg-white/40 p-4 rounded-xl border border-[#EAE2A6] space-y-1.5">
                <span className="text-[8px] text-[#C97A7A] font-mono uppercase tracking-wider block font-bold">Standard Weak Draft (High Excuses / Overexplain)</span>
                <p className="text-xs text-[#555555] italic leading-relaxed font-serif">
                  "{active.example_original}"
                </p>
              </div>

              <div className="bg-[#FFDD44]/10 p-4 rounded-xl border border-[#E5C110]/20 space-y-1.5 relative group">
                <span className="text-[8px] text-[#E85D04] font-mono uppercase tracking-wider block font-bold">Calibrated Version (Strategic Framing)</span>
                <p className="text-xs text-[#111315] italic font-serif leading-relaxed">
                  "{active.example_rewritten}"
                </p>
                <button 
                  onClick={() => handleCopy(active.example_rewritten, 999)}
                  className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white/60 border border-[#EAE2A6] text-[9px] text-[#555555] font-mono hover:text-[#111315] hover:border-[#D2C58A] transition opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-transparent cursor-pointer"
                >
                  {copiedIndex === 999 ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700" />
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
          <div className="border-t border-black/10 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E85D04]" />
              <span className="text-[10px] font-mono uppercase text-[#111315] tracking-widest font-semibold">Playbook Draft Simulator</span>
            </div>
            
            <div className="bg-white/40 p-5 rounded-2xl border border-[#EAE2A6] space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-[#111315]">Test Your Real-World Draft</h3>
                <p className="text-[11px] text-[#555555] leading-relaxed font-sans font-light">
                  Type or paste the raw, tentative message you are planning to send. Our strategy engine will run a full cryptographic-style calibration audit against this specific playbook.
                </p>
              </div>

              <textarea
                value={userDraft}
                onChange={(e) => setUserDraft(e.target.value)}
                placeholder={`Type your awkward draft for "${active.title}"...`}
                className="w-full h-24 p-3.5 bg-[#ffffff] border border-[#EAE2A6] focus:border-[#D2C58A] rounded-xl text-xs text-[#111315] focus:outline-none placeholder-[#888] font-sans font-light resize-none"
              />

              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={handleCalibrateDraft}
                  disabled={isCalibrating || !userDraft.trim()}
                  variant="primary"
                  size="sm"
                  style={{ backgroundColor: '#ffdd44', borderWidth: '2px', borderStyle: 'solid', borderColor: '#ff9f00', color: '#000000' }}
                  className="flex items-center gap-2 rounded-xl hover:opacity-90"
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
                    className="text-[11px] text-[#555555] hover:text-[#111315] transition bg-transparent border-none cursor-pointer"
                  >
                    Clear Draft
                  </button>
                )}
              </div>

              {calibrationError && (
                <div className="p-3 bg-red-950/10 text-red-700 border border-red-900/20 text-xs rounded-xl flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" />
                  <span>{calibrationError}</span>
                </div>
              )}

              {calibrationResult && (
                <div className="space-y-5 pt-4 border-t border-black/10 animate-fade-in">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] font-mono text-[#555555]">CALIBRATION SCOREBOARD</span>
                    <span className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded-full font-bold border ${
                      calibrationResult.summary?.landing_status === 'well' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                      calibrationResult.summary?.landing_status === 'neutral' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' :
                      calibrationResult.summary?.landing_status === 'poor' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' :
                      'bg-rose-50/40 text-rose-700 border border-rose-900/40'
                    }`}>
                      Landing Status: {calibrationResult.summary?.landing_status || 'risky'}
                    </span>
                  </div>

                  {/* Calibration Scores */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(calibrationResult.scores || []).slice(0, 4).map((score: any, index: number) => (
                      <div key={index} className="bg-white p-3 rounded-xl border border-[#EAE2A6] text-center">
                        <span className="text-[9px] text-[#555555] font-mono block truncate">{score.dimension}</span>
                        <div className="flex items-baseline justify-center gap-1 mt-1">
                          <span className="text-sm font-semibold font-mono text-[#111315]">{score.score}</span>
                          <span className="text-[9px] text-[#555555]">/100</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subtext and Impressions */}
                  <div className="space-y-3.5 text-xs font-sans">
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-mono uppercase text-[#111315] font-semibold font-sans">Immediate Subtext (What they hear):</h4>
                      <p className="text-[#111315] bg-white p-3 rounded-xl border border-[#EAE2A6] italic font-serif font-light leading-relaxed">
                        "{calibrationResult.how_it_may_be_read?.subtext || calibrationResult.summary?.overall_read || "The message may broadcast standard apologetic hesitation."}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 font-light">
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-mono uppercase text-emerald-700 font-semibold font-sans">Whats Working:</h4>
                        <ul className="text-[11px] text-[#555555] space-y-1.5 list-disc list-inside bg-white p-3 rounded-xl border border-[#EAE2A6]">
                          {(calibrationResult.whats_working || ["Clean initial sentence context"]).map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-mono uppercase text-rose-700 font-semibold font-sans font-light">Friction Points:</h4>
                        <ul className="text-[11px] text-[#555555] space-y-1.5 list-disc list-inside bg-white p-3 rounded-xl border border-[#EAE2A6]">
                          {(calibrationResult.whats_risky || ["Contains apologetic cues", "Overexplains personal constraints"]).map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic rewrite crafted for this playbook context */}
                  <div className="pt-2 font-sans">
                    <div className="bg-[#FFDD44]/10 p-4 rounded-xl border border-[#E5C110]/20 space-y-2 relative group">
                      <span className="text-[9px] text-[#111315] font-mono uppercase tracking-wider block font-bold">CUSTOM PLAYBOOK REWRITE (RECOMMENDED)</span>
                      <p className="text-xs text-[#111315] italic font-serif font-light leading-relaxed">
                        "{calibrationResult.rewrites?.find((r: any) => r.type === 'confident' || r.type === 'best')?.content || calibrationResult.rewrites?.[0]?.content || 'Calibrating alternative text...'}"
                      </p>
                      <button 
                        onClick={() => {
                          const rewrite = calibrationResult.rewrites?.find((r: any) => r.type === 'confident' || r.type === 'best')?.content || calibrationResult.rewrites?.[0]?.content;
                          if (rewrite) {
                            navigator.clipboard.writeText(rewrite);
                            alert("Calibrated rewrite copied to clipboard!");
                          }
                        }}
                        className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white/60 border border-[#EAE2A6] text-[9px] text-[#555555] font-mono hover:text-[#111315] hover:border-[#D2C58A] transition cursor-pointer"
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
