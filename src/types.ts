/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  plan: 'free' | 'plus' | 'pro' | 'teams' | 'enterprise';
  billing_cycle: 'monthly' | 'annual';
  created_at: string;
  paid_at?: string;
  pdf_url?: string;
}

export interface CreditTransaction {
  id: string;
  amount: number; // Positive (purchase/gift/refund) or negative (usage)
  description: string;
  created_at: string;
  expires_at?: string;
  refunded?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'plus' | 'pro' | 'teams' | 'enterprise';
  role: 'user' | 'admin' | 'super_admin' | 'moderator' | 'editor' | 'guest';
  created_at: string;
  onboarding_completed: boolean;
  usage_count_month: number;
  billing_customer_id: string;
  billing_status: string;
  two_factor_enabled?: boolean;
  billing_cycle?: 'monthly' | 'annual';
  billing_paused?: boolean;
  billing_canceled?: boolean;
  trial_active?: boolean;
  trial_expires_at?: string | null;
  trial_duration_days?: number;
  invoices?: Invoice[];
  credit_balance?: number;
  credit_history?: CreditTransaction[];
  premium_packs?: string[]; // E.g., ['interview_success', 'salary_negotiation']
  promotions_applied?: string[]; // Referral, Coupon, Student, etc.
  email_verified?: boolean;
  status?: 'active' | 'suspended';
  failed_login_attempts?: number;
  locked_until?: string | null;
  recent_passwords?: string[];
  oauth_provider?: string | null;
  oauth_id?: string | null;
}

export interface UserProfile {
  user_id: string;
  communication_style: string;
  overdo_patterns: string[];
  preferred_tone: string;
  preserve_voice: boolean;
  favorite_phrases: string[];
  avoided_phrases: string[];
  default_scenario: string;
  notes: string;
  timezone?: string;
  locale?: string;
  email_notifications_enabled?: boolean;
  security_alerts_enabled?: boolean;
  monthly_reports_enabled?: boolean;
  ui_density?: 'comfortable' | 'compact';
}

export interface ToneSettings {
  warmth: number; // 0-100
  directness: number; // 0-100
  softness: number; // 0-100
  confidence: number; // 0-100
  formality: number; // 0-100
  emotional_openness: number; // 0-100
}

export interface OutputJson {
  summary: {
    overall_read: string;
    landing_status: 'well' | 'neutral' | 'poor' | 'risky';
    top_risks: string[];
    top_strengths: string[];
    recommended_move: string;
  };
  scores: {
    dimension: string;
    score: number; // 0-100
    explanation: string;
  }[];
  how_it_may_be_read: {
    emotional_impression: string;
    subtext: string;
    confusing_points: string;
    unintentional_signals: string;
    invited_responses: string;
  };
  whats_working: string[];
  whats_risky: string[];
  line_by_line: {
    line: string;
    tag?: string;
    type?: 'strength' | 'risk' | 'neutral';
    feedback: string;
    suggestion?: string;
  }[];
  rewrites: {
    type: string; // 'kinder' | 'confident' | 'shorter' | 'best_strategic' | string
    content: string;
    label: string;
    description: string;
  }[];
  follow_ups: {
    condition: string;
    message: string;
  }[];
  send_recommendation: {
    action: string;
    time_advice?: string;
    delivery_advice?: string;
  };
  tags: string[];
  is_fallback?: boolean;
  fallback_reason?: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  title: string;
  original_message: string;
  scenario: string;
  relationship_context: string;
  user_goal: string;
  extra_context?: string;
  tone_settings: ToneSettings;
  output_json: OutputJson;
  target_language?: string;
  created_at: string;
  updated_at: string;
  saved: boolean;
  archived: boolean;
}

export interface Rewrite {
  id: string;
  analysis_id: string;
  rewrite_type: string;
  content: string;
  saved: boolean;
  created_at: string;
}

export interface Template {
  id: string;
  title: string;
  category: string;
  description?: string;
  template_text?: string;
  draft?: string;
  goal?: string;
  scenario?: string;
  premium?: boolean;
  active?: boolean;
  sort_order?: number;
}

export interface Playbook {
  id: string;
  title: string;
  slug?: string;
  category: string;
  summary?: string;
  tagline?: string;
  critique?: string;
  remedy?: string;
  dos?: string[];
  donts?: string[];
  example_original?: string;
  example_rewritten?: string;
  content?: string; // Markdown or text
  premium?: boolean;
  published?: boolean;
  avoid_points?: string[];
  good_examples?: { bad: string; good: string; why: string }[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  published?: boolean;
  published_at?: string;
  created_at?: string;
  author?: string;
  read_time?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote?: string;
  text?: string;
  avatar?: string;
  stars?: number;
  scenarios_resolved?: string;
  active?: boolean;
}

export interface UsageEvent {
  id: string;
  user_id: string;
  event_type: string;
  metadata_json: Record<string, any>;
  created_at: string;
}
