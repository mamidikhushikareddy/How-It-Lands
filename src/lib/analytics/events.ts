/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Strongly Typed Event Registry & Runtime Schema Validation
 * 
 * Strict Privacy Constraint:
 * NO raw emails, NO passwords, NO tokens, NO message contents, NO user prompts,
 * and NO raw AI outputs are permitted in analytics event properties.
 */

export const APP_VERSION = '2.0.0';
export const PLATFORM = 'web' as const;

/**
 * Common envelope properties automatically attached to every event.
 */
export interface BaseEventEnvelope {
  event_id: string;
  event_timestamp_utc: string;
  anonymous_id: string;
  pseudonymous_user_id?: string | null;
  session_id: string;
  feature_name: string;
  app_version: string;
  platform: 'web';
  authentication_state: 'authenticated' | 'unauthenticated';
  experiment_variant?: string;
}

/**
 * Specific Event Schema Definitions
 */
export interface EventMap {
  // Authentication Workflows
  signup_started: {
    method?: 'email' | 'google' | 'oauth' | 'modal';
    source?: string;
  };
  signup_completed: {
    method: 'email' | 'google' | 'oauth' | 'modal';
  };
  login_completed: {
    method: 'email' | 'google' | 'oauth' | 'session_restore' | 'email_2fa' | 'modal';
  };
  logout_completed: {
    session_duration_seconds?: number;
  };

  // Onboarding Workflows
  onboarding_started: {
    initial_scenario?: string;
  };
  onboarding_step_viewed: {
    step_number: number;
    step_title: string;
  };
  onboarding_step_completed: {
    step_number: number;
    step_title: string;
    duration_seconds?: number;
  };
  onboarding_completed: {
    total_steps: number;
    duration_seconds?: number;
    communication_style?: string;
    preferred_tone?: string;
  };
  onboarding_abandoned: {
    last_step: number;
    reason?: string;
  };

  // Product Usage Workflows
  feature_opened: {
    feature_name: string;
    source?: string;
  };
  ai_request_started: {
    request_type: 'analysis' | 'coach' | 'transcription' | 'scenario_sim';
    input_length_bracket: '< 100' | '100-500' | '500-1500' | '> 1500';
    scenario?: string;
    target_language?: string;
    thinking_mode?: boolean;
    low_latency?: boolean;
  };
  ai_request_succeeded: {
    request_type: 'analysis' | 'coach' | 'transcription' | 'scenario_sim';
    latency_ms: number;
    model_used?: string;
    score_bracket?: 'low' | 'moderate' | 'high' | 'excellent';
    target_language?: string;
    turn_count?: number;
  };
  ai_request_failed: {
    request_type: 'analysis' | 'coach' | 'transcription' | 'scenario_sim';
    latency_ms: number;
    error_type: string;
    error_code?: number | string;
  };
  result_saved: {
    item_type: 'analysis' | 'coach_draft' | 'template';
    scenario?: string;
  };
  result_copied: {
    item_type: 'rewrite' | 'coaching_tip' | 'summary';
    variant_type?: string;
  };

  // Subscriptions & Monetization Workflows
  pricing_viewed: {
    current_plan: string;
    trigger_source?: string;
  };
  checkout_started: {
    target_plan: string;
    billing_cycle?: 'monthly' | 'annual';
    currency?: string;
  };
  subscription_activated: {
    plan_id: string;
    billing_cycle?: 'monthly' | 'annual';
    status: 'active';
  };
}

export type AnalyticsEventName = keyof EventMap;
export type AnalyticsEventProperties<E extends AnalyticsEventName> = EventMap[E];

/**
 * Valid event names list for fast lookup
 */
export const VALID_EVENT_NAMES = new Set<AnalyticsEventName>([
  'signup_started',
  'signup_completed',
  'login_completed',
  'logout_completed',
  'onboarding_started',
  'onboarding_step_viewed',
  'onboarding_step_completed',
  'onboarding_completed',
  'onboarding_abandoned',
  'feature_opened',
  'ai_request_started',
  'ai_request_succeeded',
  'ai_request_failed',
  'result_saved',
  'result_copied',
  'pricing_viewed',
  'checkout_started',
  'subscription_activated'
]);

/**
 * Denylist of forbidden property keys that might compromise user privacy or security.
 */
const FORBIDDEN_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'raw_message',
  'original_message',
  'message_content',
  'content',
  'prompt',
  'chat_history',
  'transcript',
  'body',
  'input_text',
  'email',
  'user_id' // Must use pseudonymous_user_id instead
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedProperties: Record<string, any>;
}

/**
 * Validates and sanitizes an event payload at runtime.
 * Strips any sensitive data and rejects payloads violating privacy schemas.
 */
export function validateEventPayload<E extends AnalyticsEventName>(
  eventName: E,
  properties: AnalyticsEventProperties<E>
): ValidationResult {
  const errors: string[] = [];

  if (!VALID_EVENT_NAMES.has(eventName)) {
    return {
      isValid: false,
      errors: [`Unrecognized event name: "${eventName}"`],
      sanitizedProperties: {}
    };
  }

  if (typeof properties !== 'object' || properties === null) {
    return {
      isValid: false,
      errors: ['Event properties must be a non-null object'],
      sanitizedProperties: {}
    };
  }

  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();

    // Check forbidden keys
    if (FORBIDDEN_KEYS.some(forbidden => lowerKey === forbidden || lowerKey.endsWith(`_${forbidden}`))) {
      errors.push(`Forbidden sensitive property key detected: "${key}"`);
      continue;
    }

    // Inspect values for sensitive content
    if (typeof val === 'string') {
      // Check for raw email leak
      if (EMAIL_REGEX.test(val)) {
        errors.push(`Sensitive email detected in value for key "${key}"`);
        continue;
      }

      // Check for large message blob leak (exceeding reasonable metadata length)
      if (val.length > 250) {
        errors.push(`Value for key "${key}" exceeds maximum safe metadata length (250 chars)`);
        continue;
      }

      sanitized[key] = val;
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    } else if (val === null || val === undefined) {
      // safe to omit
    } else {
      errors.push(`Unsupported property type for key "${key}": ${typeof val}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedProperties: sanitized
  };
}

/**
 * Utility helper to categorize message lengths into safe non-sensitive brackets.
 */
export function getMessageLengthBracket(input: string | number | null | undefined): '< 100' | '100-500' | '500-1500' | '> 1500' {
  const len = typeof input === 'number' ? input : (input || '').trim().length;
  if (len < 100) return '< 100';
  if (len <= 500) return '100-500';
  if (len <= 1500) return '500-1500';
  return '> 1500';
}
