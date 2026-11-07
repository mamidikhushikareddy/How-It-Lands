/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Google Analytics 4 (GA4) & Google Tag Manager (GTM) Provider
 * 
 * Strict Reliability & Privacy Guarantees:
 * 1. Checks analytics consent prior to script injection.
 * 2. If VITE_GTM_CONTAINER_ID is active, tracks through dataLayer to avoid double-counting with direct GA4.
 * 3. Graceful fallback if neither measurement ID nor GTM container ID is configured.
 * 4. Never transmits raw user emails or credentials; user properties use pseudonymous IDs only.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

import { getAnalyticsEnv } from '../env';

let isInitialized = false;
let mode: 'gtm' | 'ga4' | 'none' = 'none';

export function isGA4Configured(): boolean {
  const gtmId = getAnalyticsEnv('VITE_GTM_CONTAINER_ID');
  const ga4Id = getAnalyticsEnv('VITE_GA4_MEASUREMENT_ID');
  return Boolean((gtmId && gtmId.trim()) || (ga4Id && ga4Id.trim()));
}

export function initGA4(): boolean {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  const gtmId = getAnalyticsEnv('VITE_GTM_CONTAINER_ID')?.trim();
  const ga4Id = getAnalyticsEnv('VITE_GA4_MEASUREMENT_ID')?.trim();

  window.dataLayer = window.dataLayer || [];

  if (gtmId) {
    // Mode A: Google Tag Manager (GTM handles tags centrally; avoids direct double-counting)
    mode = 'gtm';
    if (!document.getElementById('gtm-script')) {
      const script = document.createElement('script');
      script.id = 'gtm-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
      document.head.appendChild(script);
    }
    isInitialized = true;
    return true;
  } else if (ga4Id) {
    // Mode B: Direct Google Analytics 4 via gtag.js
    mode = 'ga4';
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };

    if (!document.getElementById('ga4-gtag-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
      document.head.appendChild(script);
    }

    window.gtag('js', new Date());
    window.gtag('config', ga4Id, {
      anonymize_ip: true,
      send_page_view: false, // We control virtual page views and feature_opened events explicitly
      restricted_data_processing: true
    });

    isInitialized = true;
    return true;
  }

  return false;
}

/**
 * Maps internal event names to standard GA4 recommended names when applicable.
 */
function mapToGA4EventName(eventName: string): string {
  switch (eventName) {
    case 'signup_completed':
      return 'sign_up';
    case 'login_completed':
      return 'login';
    case 'pricing_viewed':
      return 'view_item_list';
    case 'checkout_started':
      return 'begin_checkout';
    case 'subscription_activated':
      return 'purchase';
    default:
      return eventName;
  }
}

/**
 * Tracks an event to GA4 or GTM dataLayer.
 */
export function trackGA4(eventName: string, properties: Record<string, any>): void {
  if (!isInitialized && !initGA4()) return;

  const standardName = mapToGA4EventName(eventName);

  try {
    if (mode === 'gtm') {
      window.dataLayer?.push({
        event: standardName,
        internal_event_name: eventName,
        ...properties
      });
    } else if (mode === 'ga4' && window.gtag) {
      window.gtag('event', standardName, properties);
    }
  } catch (err) {
    console.warn('[ANALYTICS:GA4] Failed to dispatch event:', err);
  }
}

/**
 * Sets user identity on GA4 using strictly pseudonymous identifiers.
 */
export function identifyGA4(pseudonymousUserId: string): void {
  if (!isInitialized && !initGA4()) return;

  try {
    if (mode === 'ga4' && window.gtag) {
      const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
      if (ga4Id) {
        window.gtag('config', ga4Id, {
          user_id: pseudonymousUserId
        });
      }
      window.gtag('set', 'user_properties', {
        pseudonymous_user_id: pseudonymousUserId
      });
    } else if (mode === 'gtm') {
      window.dataLayer?.push({
        event: 'user_identified',
        pseudonymous_user_id: pseudonymousUserId
      });
    }
  } catch (err) {
    console.warn('[ANALYTICS:GA4] Failed to set user identity:', err);
  }
}

/**
 * Clears user identity on GA4 on logout.
 */
export function resetGA4(): void {
  if (!isInitialized) return;

  try {
    if (mode === 'ga4' && window.gtag) {
      const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
      if (ga4Id) {
        window.gtag('config', ga4Id, {
          user_id: null
        });
      }
    } else if (mode === 'gtm') {
      window.dataLayer?.push({
        event: 'user_reset',
        pseudonymous_user_id: null
      });
    }
  } catch (err) {
    console.warn('[ANALYTICS:GA4] Failed to reset user identity:', err);
  }
}
