/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import http from 'http';

// Secret key for cryptographic signing of checkout tokens and webhooks.
//
// REMOVED: these previously fell back to hardcoded default strings
// ('hil_sig_secret_prod_grade_987654321', 'whsec_howitlands_secure_key_123456789')
// if the env vars weren't set. Since those defaults are visible to anyone
// with the source code, an unset env var in production didn't mean "no
// signing" — it meant "signing with a secret every reader of this file
// already knows," which is worse than no signing at all: it looks secure
// while being forgeable. A forged, correctly-signed webhook to
// /api/webhooks/gateway could grant free paid billing status. Both now
// fail closed at startup instead.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[BILLING] ${name} is not set. Refusing to start without a real signing secret — ` +
      `a missing secret must never silently fall back to a value that's readable in source control. ` +
      `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" ` +
      `and set it as ${name} in your environment.`
    );
  }
  return value;
}

const SIGNING_SECRET = requireEnv('SIGNING_SECRET');
export const WEBHOOK_SECRET = requireEnv('WEBHOOK_SECRET');

export interface CheckoutSession {
  sessionId: string;
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: string;
  expiresAt: number;
  couponCode?: string;
  signature: string;
}

export interface PaymentDetails {
  method: 'card' | 'upi' | 'netbanking' | 'wallet' | 'emi';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  upiId?: string;
  bankName?: string;
  walletProvider?: string;
  emiTenure?: number;
  zipCode?: string;
  country?: string;
}

/**
 * Generates a cryptographically signed checkout session token
 */
export function createCheckoutSession(
  userId: string,
  planId: string,
  billingCycle: 'monthly' | 'annual',
  amount: number,
  currency: string,
  couponCode?: string
): CheckoutSession {
  const sessionId = 'cs_' + crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes expiration

  // Create token payload
  const payload = `${sessionId}|${userId}|${planId}|${billingCycle}|${amount}|${currency}|${expiresAt}|${couponCode || ''}`;
  
  // Create HMAC signature to prevent client tampering
  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('hex');

  return {
    sessionId,
    userId,
    planId,
    billingCycle,
    amount,
    currency,
    expiresAt,
    couponCode,
    signature,
  };
}

/**
 * Verifies a checkout session token signature to prevent fraud
 */
export function verifyCheckoutSession(session: CheckoutSession): boolean {
  if (Date.now() > session.expiresAt) {
    return false;
  }
  const payload = `${session.sessionId}|${session.userId}|${session.planId}|${session.billingCycle}|${session.amount}|${session.currency}|${session.expiresAt}|${session.couponCode || ''}`;
  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(session.signature), Buffer.from(expectedSignature));
}

/**
 * Enforces production-grade Fraud Prevention rules.
 * Returns fraud scoring and validation details.
 */
export async function evaluateFraudRisk(
  userId: string,
  amount: number,
  payment: PaymentDetails,
  clientIp: string
): Promise<{ block: boolean; reason?: string; fraudScore: number }> {
  let fraudScore = 0;

  // Rule 1: High Frequency Velocity Checking (DoS & Card Testing prevention)
  const { auditRepo } = await import('./db/index.ts');
  const recentAuditLogs = await auditRepo.listAuditLogs({ userId, event: 'billing.payment_attempt_failed', limit: 10, offset: 0 });
  const recentFailures = recentAuditLogs.filter(
    (log: any) => new Date(log.created_at).getTime() > Date.now() - 10 * 60 * 1000 // Last 10 minutes
  );

  if (recentFailures.length >= 3) {
    fraudScore += 60;
    if (recentFailures.length >= 5) {
      await auditRepo.logSecurityEvent(userId, clientIp, 'fraud.blocked_by_velocity', 'Payment blocked due to high-frequency failure velocity.');
      return { block: true, reason: 'Transaction blocked: too many failed attempts. Please contact security support.', fraudScore: 100 };
    }
  }

  // Rule 2: Blacklisted/Fraudulent Card BINs
  if (payment.method === 'card' && payment.cardNumber) {
    const cleanCard = payment.cardNumber.replace(/\s+/g, '');
    
    // Testing specific blocks
    if (cleanCard.startsWith('4111111111111111') || cleanCard.startsWith('4000000000000000')) {
      fraudScore += 100;
      return { block: true, reason: 'Payment card flagged on global high-risk blacklist.', fraudScore: 100 };
    }
    
    // Check for obvious card length/format errors
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      return { block: true, reason: 'Invalid card format or length.', fraudScore: 30 };
    }
  }

  // Rule 3: High-Value Risk Controls
  if (amount > 1000) {
    fraudScore += 40;
    // Require extra address details
    if (!payment.zipCode || !payment.country) {
      return { block: true, reason: 'High-value transactions require complete billing country and zip code alignment.', fraudScore: 40 };
    }
  }

  // Rule 4: UPI Address Validation
  if (payment.method === 'upi' && payment.upiId) {
    const upiRegex = /^[\w.\-_]+@[\w\-]+$/;
    if (!upiRegex.test(payment.upiId)) {
      return { block: true, reason: 'Invalid UPI VPA handle. Format must be name@bank.', fraudScore: 30 };
    }
  }

  return { block: false, fraudScore };
}

/**
 * Triggers a secure Webhook event internally.
 * Signs the webhook payload with an HMAC signature.
 */
export async function sendWebhookEvent(event: string, data: any): Promise<boolean> {
  const eventId = 'evt_' + crypto.randomBytes(12).toString('hex');
  const payload = JSON.stringify({
    id: eventId,
    event,
    created_at: new Date().toISOString(),
    data,
  });

  const hmacSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return new Promise((resolve) => {
    const postData = payload;
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhooks/gateway',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-gateway-signature': `sha256=${hmacSignature}`,
        'x-gateway-event-id': eventId,
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`[GATEWAY WEBHOOK] Successfully delivered event ${event} (ID: ${eventId})`);
          resolve(true);
        } else {
          console.error(`[GATEWAY WEBHOOK] Delivery failed for event ${event}. Status: ${res.statusCode}. Body: ${responseBody}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[GATEWAY WEBHOOK] Network error during delivery of event ${event}:`, e.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}
