/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionPlanId = 'free' | 'plus' | 'pro' | 'teams' | 'enterprise';

export interface PlanDetail {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  limits: {
    analysisPerMonth: number;
    savedHistory: number; // -1 for unlimited
    customTemplates: number;
    customPlaybooks: number;
  };
  features: string[];
  description: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, PlanDetail> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    tagline: 'Evaluate core communication signals.',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: {
      analysisPerMonth: 5,
      savedHistory: 10,
      customTemplates: 2,
      customPlaybooks: 0,
    },
    features: [
      'Basic message risk analysis',
      'Basic rewrite suggestions (standard styles)',
      'Core Communication Fingerprint insights',
      'Recent analysis history (up to 10 days)',
      'Limited pre-built starters library',
      'Limited playbooks view',
      'Basic Message DNA mapping',
      'One-click clipboard copy',
      'Responsive web experience',
      'Basic privacy controls',
    ],
    description: 'Perfect for professionals evaluating core communication landing diagnostics.',
  },
  plus: {
    id: 'plus',
    name: 'Plus Professional',
    tagline: 'Deepen emotional control & rewrite logic.',
    monthlyPrice: 12,
    annualPrice: 96,
    popular: true,
    limits: {
      analysisPerMonth: 50, // High standard limit
      savedHistory: -1, // Unlimited
      customTemplates: 15,
      customPlaybooks: 5,
    },
    features: [
      'Everything in Free plan',
      'Advanced communication deep analysis',
      'Unlimited rewrites (fair-use policy)',
      'Advanced Message DNA mapping',
      'Emotional Blueprint scoring & charts',
      'Interactive Risk Heatmap',
      'Likely Interpretation analysis',
      'Communication Timeline tracking',
      'Communication Identity insights',
      'Unlimited saved history in Personal Vault',
      'Custom templates (up to 15)',
      'Custom playbooks (up to 5)',
      'Favorite rewrites save & load',
      'Search across previous analyses',
      'Priority queue AI processing',
      'Export analyses to PDF or Markdown',
      'Custom Dark & Light themes',
      'Accelerated response times',
      'Early access to new strategic features',
    ],
    description: 'Designed for professionals, managers, and frequent individual communicators.',
  },
  pro: {
    id: 'pro',
    name: 'Pro Sovereign',
    tagline: 'Full personalized AI communication coaching.',
    monthlyPrice: 29,
    annualPrice: 232,
    limits: {
      analysisPerMonth: 500, // Practically unlimited
      savedHistory: -1,
      customTemplates: 100,
      customPlaybooks: 50,
    },
    features: [
      'Everything in Plus plan',
      'Personalized Communication Coach',
      'Weekly Communication Review analytics',
      'Relationship Profiles & style tuning',
      'Advanced communications analytics panel',
      'Scenario Simulator (multi-move chats)',
      'Multi-version parallel rewrite comparison',
      'Custom AI behavior preferences',
      'Custom writing styles mapping',
      'Advanced system prompt customization',
      'Bulk analysis for batch communications',
      'Folders & tags smart organization',
      'Pinned favorite analyses',
      'Smart context collections',
      'Official Browser Extension support',
      'Dedicated Desktop Application',
      'Future-ready developer API access',
      'Highest priority AI server nodes',
      'Premium 1-on-1 expert support',
    ],
    description: 'For power users, consultants, founders, and content creators commanding high-stakes relations.',
  },
  teams: {
    id: 'teams',
    name: 'Teams Hub',
    tagline: 'Synchronize high-standards across your organization.',
    monthlyPrice: 15, // Per user
    annualPrice: 120, // Per user
    limits: {
      analysisPerMonth: 2500,
      savedHistory: -1,
      customTemplates: -1,
      customPlaybooks: -1,
    },
    features: [
      'Everything in Pro plan',
      'Centralized Team Workspaces',
      'Shared message templates library',
      'Shared corporate strategy playbooks',
      'Role-Based Access Control (RBAC)',
      'Team-wide communication analytics',
      'Shared communication standards guardrails',
      'Interactive Team onboarding program',
      'Central Admin Dashboard & reports',
      'Detailed billing & member management',
      'Organization centralized invoices',
      'Complete security audit logs',
      'Centralized global workspace controls',
    ],
    description: 'Collaborative solution for growing teams, departments, and communication-driven agencies.',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Secure',
    tagline: 'SSO, compliance-ready controls, and dedicated support.',
    monthlyPrice: 99, // Starting/custom base
    annualPrice: 950,
    limits: {
      analysisPerMonth: -1, // Unlimited
      savedHistory: -1,
      customTemplates: -1,
      customPlaybooks: -1,
    },
    features: [
      'Everything in Teams plan',
      'Single Sign-On (SSO) integration (SAML, OIDC)',
      'Custom data retention policies',
      'Advanced administrative audit logs & exports',
      'Corporate enterprise security controls',
      'Dedicated 24/7 Account Management',
      'Custom CRM & API integrations',
      'Custom-negotiated high-throughput API limits',
      'Custom multi-session team onboarding',
      'Compliance-ready secure hosting options',
      'SLA-backed network guarantees',
    ],
    description: 'Robust alignment, security, and elite support for multi-department enterprises.',
  },
};

export interface FeatureGate {
  id: string;
  name: string;
  requiredPlan: SubscriptionPlanId;
  description: string;
  benefits: string[];
  examples: string[];
  gracePeriodDays?: number;
  futureReadyPlaceholder?: boolean;
}

export const FEATURE_GATES: Record<string, FeatureGate> = {
  // Free / Plus Features
  basicAnalysis: {
    id: 'basicAnalysis',
    name: 'Basic Message Analysis',
    requiredPlan: 'free',
    description: 'Core analysis of language, risks, and recommended improvements.',
    benefits: ['Identify critical tone issues before sending', 'Immediate readability scoring'],
    examples: ['Spotting aggressive subtext in emails', 'Simplifying complex announcements'],
  },
  basicRewrites: {
    id: 'basicRewrites',
    name: 'Basic Rewrite Suggestions',
    requiredPlan: 'free',
    description: 'Standard rewrites like warmer, confident, or shorter versions.',
    benefits: ['Improve communication style immediately', 'Compare multiple standard drafts'],
    examples: ['Converting passive phrasing to active', 'Adding professional warmth'],
  },
  
  // Plus features
  advancedAnalysis: {
    id: 'advancedAnalysis',
    name: 'Advanced Communication Diagnostics',
    requiredPlan: 'plus',
    description: 'A deep psychological reading of the recipient\'s potential reactions.',
    benefits: [
      'Uncover hidden micro-risks in negotiation dynamics',
      'Calculate recipient psychological safety index',
      'Highlight unintended power play indicators'
    ],
    examples: [
      'Analyzing a resignation letter for key bridge preservation',
      'Negotiating a retainer contract raise with executive authority'
    ]
  },
  emotionalBlueprint: {
    id: 'emotionalBlueprint',
    name: 'Emotional Blueprint & Timeline Mapping',
    requiredPlan: 'plus',
    description: 'Visual multidimensional heat charts detailing emotional triggers and response trajectories.',
    benefits: [
      'Map 6 dimensions: warmth, directness, formality, confidence, softness, openness',
      'Track the psychological tone shift from sentence to sentence'
    ],
    examples: [
      'Visualizing a critical bug announcement timeline to prevent client panic',
      'Optimizing a performance review email balance'
    ]
  },
  riskHeatmap: {
    id: 'riskHeatmap',
    name: 'Interactive Risk Heatmap',
    requiredPlan: 'plus',
    description: 'Dynamic highlights on risky passages indicating specific levels of defensive triggering danger.',
    benefits: [
      'Instant color-coded risk flags (Red for Danger, Amber for Caution)',
      'Explanation popovers on exactly why a specific sentence might feel passive-aggressive'
    ],
    examples: [
      'Avoiding the dreaded "As per my last email" toxic tone cycle',
      'Softening strict project delay notices'
    ]
  },
  likelyInterpretation: {
    id: 'likelyInterpretation',
    name: 'Likely Interpretation Diagnostics',
    requiredPlan: 'plus',
    description: 'Calculates the highest-probability scenarios of how a human recipient actually processes your subtext.',
    benefits: [
      'Simulate optimistic, cynical, and defensive reading states',
      'Adjust drafts until defensive reading probability drops below 15%'
    ],
    examples: [
      'Ensuring a casual Slack ping does not sound like an urgent reprimand',
      'Polishing constructive feedback so it builds trust rather than triggering defensiveness'
    ]
  },
  customTemplates: {
    id: 'customTemplates',
    name: 'Custom Templates Builder',
    requiredPlan: 'plus',
    description: 'Save and reuse custom awkward-scenario templates designed for your regular work context.',
    benefits: [
      'Scale your exact communication voice across routine replies',
      'Store high-stakes response structures for immediate access'
    ],
    examples: [
      'Client scope creep rejection templates',
      'Candidate rejection templates with warm candidate experience preservation'
    ]
  },

  // Pro features
  communicationCoach: {
    id: 'communicationCoach',
    name: 'AI Communication Coach',
    requiredPlan: 'pro',
    description: 'Interactive real-time companion guiding your negotiation moves and relationship growth.',
    benefits: [
      'Ask the Coach follow-up strategic questions about your message diagnostics',
      'Obtain precise advice on when to send, what channel to use, and how to follow up'
    ],
    examples: [
      'Coach advising: "Wait until Tuesday morning for this pitch because Mondays are triage-heavy."',
      'Coach drafting a phone script follow-up to match the email stance'
    ]
  },
  scenarioSimulator: {
    id: 'scenarioSimulator',
    name: 'Scenario Simulator',
    requiredPlan: 'pro',
    description: 'Simulate high-stakes multi-turn conversations before sending the first message.',
    benefits: [
      'Interactive dialog tree visualization',
      'Generates predicted recipient reactions to multiple possible pathways'
    ],
    examples: [
      'Simulating salary negotiation counter-offers',
      'Mock-testing a difficult board of directors resolution'
    ]
  },
  relationshipProfiles: {
    id: 'relationshipProfiles',
    name: 'Relationship Profiles',
    requiredPlan: 'pro',
    description: 'Build long-term communication history profiles for key clients, bosses, or partners.',
    benefits: [
      'Tuning the analyzer to match specific individual personality baselines',
      'Store cognitive style, triggers, and preferences for a recipient'
    ],
    examples: [
      'Client Profile: "Highly analytical, hates fluff, values absolute directness"',
      'Direct Report: "Needs high praise, high reassurance, sensitive to authority tone"'
    ]
  },
  writingStyles: {
    id: 'writingStyles',
    name: 'Custom Writing Styles & AI Preferences',
    requiredPlan: 'pro',
    description: 'Train the AI analyzer to match and analyze customized communication personas.',
    benefits: [
      'Calibrate analysis recommendations to fit your specific professional brand',
      'Inject your historic high-scoring messages as behavioral references'
    ],
    examples: [
      'Adjust rewrite engine to emulate executive brief brevity',
      'Tune suggestions to align with standard empathetic customer success values'
    ]
  },

  // Team Features
  teamWorkspace: {
    id: 'teamWorkspace',
    name: 'Team Shared Workspaces',
    requiredPlan: 'teams',
    description: 'Collaborate with your coworkers on strategic communications.',
    benefits: [
      'Review high-importance outgoing customer-facing emails collaboratively',
      'Align communication tone and guidelines across all departments'
    ],
    examples: [
      'PR team reviewing crisis management statements',
      'Sales department calibrating cold outbound sequences'
    ]
  },
  teamAnalytics: {
    id: 'teamAnalytics',
    name: 'Team-Wide Communication Analytics',
    requiredPlan: 'teams',
    description: 'Track communication metrics, risk tendencies, and template efficiency.',
    benefits: [
      'Measure organization-wide tone metrics (e.g., directness vs empathy levels)',
      'Track response rates of shared sales template variations'
    ],
    examples: [
      'CS team detecting a shift toward passive-aggressive responses under heavy queue load',
      'Identifying which shared leadership template preserves highest employee engagement scores'
    ]
  },

  // Enterprise Features
  enterpriseSSO: {
    id: 'enterpriseSSO',
    name: 'Single Sign-On (SSO)',
    requiredPlan: 'enterprise',
    description: 'Enterprise SSO via SAML 2.0 or OIDC protocols.',
    benefits: ['Centralized user provisioning', 'Enforced corporate MFA configurations'],
    examples: ['Okta workspace setup', 'Microsoft Azure AD active authentication'],
  },
  auditLogs: {
    id: 'auditLogs',
    name: 'Enterprise Audit Logging',
    requiredPlan: 'enterprise',
    description: 'Exhaustive history of all workspace accesses, billing changes, and template updates.',
    benefits: ['Compliance-ready record keeping', 'Instantly exportable reports for corporate security audits'],
    examples: ['Tracking key file access records', 'Monitoring administrative role modifications'],
  }
};

export interface PremiumPack {
  id: string;
  name: string;
  tagline: string;
  costInCredits: number;
  description: string;
  playbooks: string[];
  templates: string[];
  specializedAI: string;
  icon: string;
}

export const PREMIUM_PACKS: Record<string, PremiumPack> = {
  interview_success: {
    id: 'interview_success',
    name: 'Interview Success Pack',
    tagline: 'Land elite offers with strategic responses.',
    costInCredits: 100,
    description: 'Specialized AI training for behavioral and technical interviews. Master the STAR response method with custom communication filters.',
    playbooks: ['STAR Framework Pivot', 'Handling Missing Competency Answers'],
    templates: ['Post-Interview Follow-Up with Subtext Value Add', 'Rescheduling Last Minute Professionally'],
    specializedAI: 'Direct alignment to Fortune 100 recruiter standards.',
    icon: 'Briefcase'
  },
  salary_negotiation: {
    id: 'salary_negotiation',
    name: 'Salary Negotiation Pack',
    tagline: 'Claim your absolute market value confidently.',
    costInCredits: 100,
    description: 'Comprehensive toolkit to pivot lowballs, structure multi-variable counter-offers, and request sign-on bonuses without triggering defensiveness.',
    playbooks: ['The Anchor Strategy', 'Handling Lowball Retorts'],
    templates: ['Counter-Offer Template (Executive standard)', 'Equity vs Salary trade-off conversation'],
    specializedAI: 'Salary Anchor Matrix calculation logic.',
    icon: 'DollarSign'
  },
  leadership: {
    id: 'leadership',
    name: 'Executive Leadership Pack',
    tagline: 'Uphold flawless authority and alignment.',
    costInCredits: 150,
    description: 'Designed for executives and directors. Learn to deliver painful corrective feedback, coordinate complex alignment directives, and handle organizational friction.',
    playbooks: ['Constructive Radical Candor', 'Crisis Mitigation Announcements'],
    templates: ['Directive Change Alignment Brief', 'Difficult Team Member Correction Notice'],
    specializedAI: 'Calibrated for corporate gravitas and high psychological safety.',
    icon: 'Shield'
  },
  sales: {
    id: 'sales',
    name: 'Sales Champion Pack',
    tagline: 'Convert hesitations into commitments.',
    costInCredits: 120,
    description: 'Unlock enterprise sales intelligence. Standardize your team\'s outbound sequences, tackle budget objections, and secure signatures with authoritative framing.',
    playbooks: ['Overcoming Budget Blocks', 'Closing with Collaborative Momentum'],
    templates: ['Enterprise Retention Pitch Brief', 'Follow-Up Post-Proposal Silent Client'],
    specializedAI: 'Optimized for urgency generation and value perception.',
    icon: 'Zap'
  },
  freelancer: {
    id: 'freelancer',
    name: 'Freelancer Freedom Pack',
    tagline: 'Uphold strict client boundaries flawlessly.',
    costInCredits: 80,
    description: 'Prevent scope creep, enforce payment schedules, and decline low-paying bids politely but firmly.',
    playbooks: ['Scope Creep Deflection Protocol', 'Late Payment Escalation Progression'],
    templates: ['Decline Budget Constraint Pitch', 'Schedule Interrupter Notice'],
    specializedAI: 'Calibrated to defend working hours and fee integrity.',
    icon: 'FileText'
  },
  dating: {
    id: 'dating',
    name: 'Dating & Relationships Pack',
    tagline: 'Communicate boundaries with profound empathy.',
    costInCredits: 80,
    description: 'Formulate delicate emotional statements, manage domestic boundaries, or handle breakups/tough personal transitions with integrity and kindness.',
    playbooks: ['Non-Violent Boundary Statements', 'Managing Space Request Dialogues'],
    templates: ['Expressing Disappointment with Warm Preservation', 'Tough Chat Scheduling Prompt'],
    specializedAI: 'High-warmth, low-rigidity empathetic parsing.',
    icon: 'Heart'
  },
  conflict_resolution: {
    id: 'conflict_resolution',
    name: 'Conflict Resolution Pack',
    tagline: 'De-escalate high-stakes friction instantly.',
    costInCredits: 100,
    description: 'Resolve passive-aggressive peer cycles, client disputes, or family friction with balanced, objective mediation frameworks.',
    playbooks: ['Objective Calibration Bridge', 'The Reassurance-Pivot Method'],
    templates: ['De-Escalating Hostile Slack Exchanges', 'Formal Retraction Offer With Grace'],
    specializedAI: 'High-mediator capability, focusing purely on non-defensive language.',
    icon: 'Compass'
  },
  customer_support: {
    id: 'customer_support',
    name: 'Elite Support Pack',
    tagline: 'De-escalate tickets into lifetime loyalty.',
    costInCredits: 90,
    description: 'Transform frustrated bug reports and SLA outages into trust-building opportunities. Master the Art of the Elegant Concession.',
    playbooks: ['The Concession-Bridge Formula', 'Apologizing Without Admitting General Liability'],
    templates: ['Outage Notification to VIP Clients', 'Frustrated Bug Report Retort'],
    specializedAI: 'Optimized for retention, empathy, and professional closure.',
    icon: 'Users'
  },
  business_communication: {
    id: 'business_communication',
    name: 'Business Growth Pack',
    tagline: 'Coordinate standard cross-department writing.',
    costInCredits: 150,
    description: 'Synchronize high professional standards. Ideal for departments wanting clear internal and external memos with minimal administrative noise.',
    playbooks: ['Cross-Department Strategic Alignment', 'Constructive Slack Etiquette'],
    templates: ['Quarterly OKR Realignment Brief', 'Inter-departmental Block Notice'],
    specializedAI: 'Formatted for executive summary brevity.',
    icon: 'Bookmark'
  },
  academic_writing: {
    id: 'academic_writing',
    name: 'Academic Rigor Pack',
    tagline: 'Refine research defenses and peer feedback.',
    costInCredits: 60,
    description: 'Polish peer review responses, grant requests, and research paper summaries with exact, precise academic gravitas.',
    playbooks: ['Defending Methodology Tactfully', 'Responding to Biased Peer Reviews'],
    templates: ['Requesting Additional Peer Collaboration', 'Grant Response Correction Proposal'],
    specializedAI: 'Highly formal, high-complexity, objective scientific parsing.',
    icon: 'Award'
  }
};

/**
 * Entitlement Check Function
 *
 * This app has no billing — every account gets full access to every
 * feature, regardless of the `requiredPlan` a FEATURE_GATES entry
 * declares. The plan tiers and requiredPlan fields still exist (the
 * gate objects carry display copy used elsewhere, e.g. feature
 * descriptions on the pricing/marketing pages), but they no longer
 * gate access. Always returning allowed: true here is intentional,
 * not a stub — the previous version of this function had the exact
 * same signature and return value as a genuine bug (it silently never
 * read the plan-tier comparison it appeared to be doing). This time
 * it's correct because there's nothing left to gate against: there is
 * no paid tier a user could fail to have.
 */
export function hasFeatureAccess(
  userPlan: SubscriptionPlanId,
  featureId: keyof typeof FEATURE_GATES,
  trialActive: boolean = false
): {
  allowed: boolean;
  gate: FeatureGate;
} {
  const gate = FEATURE_GATES[featureId] || {
    id: featureId,
    name: featureId,
    requiredPlan: 'free',
    description: '',
    benefits: [],
    examples: []
  };
  return {
    allowed: true,
    gate
  };
}

/**
 * Simulates Prorated billing.
 * Calculates credit remaining on old plan and displays adjustment for new plan.
 */
export function calculateProratedPrice(
  currentPlanId: SubscriptionPlanId,
  newPlanId: SubscriptionPlanId,
  isAnnual: boolean,
  daysIntoCycle: number = 15,
  daysInCycle: number = 30
): {
  oldCreditRemaining: number;
  newPlanPriceProrated: number;
  netDueToday: number;
} {
  const currentPlan = SUBSCRIPTION_PLANS[currentPlanId];
  const newPlan = SUBSCRIPTION_PLANS[newPlanId];

  if (!currentPlan || !newPlan) {
    return { oldCreditRemaining: 0, newPlanPriceProrated: 0, netDueToday: 0 };
  }

  const oldPrice = isAnnual ? currentPlan.annualPrice : currentPlan.monthlyPrice;
  const newPrice = isAnnual ? newPlan.annualPrice : newPlan.monthlyPrice;

  const fractionRemaining = Math.max(0, (daysInCycle - daysIntoCycle) / daysInCycle);

  // Credit from unused portion of current plan
  const oldCreditRemaining = Number((oldPrice * fractionRemaining).toFixed(2));
  
  // Prorated price of new plan for remainder of cycle
  const newPlanPriceProrated = Number((newPrice * fractionRemaining).toFixed(2));

  // Net due = new price - old credit
  const netDueToday = Number(Math.max(0, newPrice - oldCreditRemaining).toFixed(2));

  return {
    oldCreditRemaining,
    newPlanPriceProrated,
    netDueToday
  };
}
