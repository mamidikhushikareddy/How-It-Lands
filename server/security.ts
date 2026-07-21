/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuditLog {
  id: string;
  user_id?: string;
  ip_address?: string;
  event: string;
  details: string;
  created_at: string;
}

/**
 * Fire-and-forget security event logger for use inside synchronous
 * middleware (WAF rules below run per-request and can't easily become
 * async without restructuring Express's middleware chain). Delegates to
 * the real audit repo — failures are caught and logged to stderr rather
 * than thrown, since a logging failure must never block the request it's
 * observing.
 */
export function logSecurityEvent(
  userId: string | undefined,
  ipAddress: string | undefined,
  event: string,
  details: string
): void {
  import('./db/index.ts').then(({ auditRepo }) => {
    auditRepo.logSecurityEvent(userId, ipAddress, event, details).catch((err) => {
      console.error('[AUDIT] Failed to write security event', { event, err });
    });
  });
}

/**
 * Custom light-weight, highly performant rate limiter
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, { count: number; resetTime: number }>();

  return (req: any, res: any, next: any) => {
    // Grab the client IP or User ID as identification token
    const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
    const key = req.user?.id ? `user:${req.user.id}` : `ip:${clientIp}`;
    const now = Date.now();

    // Inline garbage collection: if store size grows, prune expired records to prevent OOM memory leak
    if (store.size > 1000) {
      for (const [k, v] of store.entries()) {
        if (now > v.resetTime) {
          store.delete(k);
        }
      }
    }

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + config.windowMs };
      store.set(key, record);
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', config.max - 1);
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      return next();
    }

    record.count++;
    const remaining = Math.max(0, config.max - record.count);
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    if (record.count > config.max) {
      logSecurityEvent(
        req.user?.id,
        clientIp,
        'security.rate_limit_exceeded',
        `Exceeded limit (${config.max} req / ${config.windowMs / 1000}s) on endpoint ${req.path}`
      );
      return res.status(429).json({ error: config.message });
    }

    next();
  };
}

/**
 * Prompt injection and adversarial prompt pattern detector
 */
const INJECTION_PATTERNS = [
  /\bignore\s+(?:previous|above|all)\s+instructions\b/i,
  /\breveal\s+(?:your|system|hidden)\s+prompt\b/i,
  /\boutput\s+your\s+system\s+instruction\b/i,
  /\bprint\s+(?:developer|admin|internal)\s+messages\b/i,
  /\bdisable\s+safety\s+filters\b/i,
  /\bdo\s+not\s+analyze\s+the\s+message\b/i,
  /\byou\s+are\s+now\s+a\s+(?:dan|developer\s+mode)\b/i,
  /\bsystem\s+prompt\s+leak\b/i,
  /\[system\s*instruction\]/i,
  /assistant\s*:\s*ignore/i,
  /dan\s+mode/i,
  /\bforce\s+jailbreak\b/i
];

export function detectPromptInjection(message: string): boolean {
  if (!message) return false;
  return INJECTION_PATTERNS.some(pattern => pattern.test(message));
}

import QRCode from 'qrcode';
import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a standard Base32 encoded high-entropy secret
 */
export function generateBase32Secret(): string {
  const bytes = crypto.randomBytes(20);
  let result = '';
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += bytes[i].toString(2).padStart(8, '0');
  }
  for (let i = 0; i < bin.length; i += 5) {
    const chunk = bin.substring(i, i + 5).padEnd(5, '0');
    const val = parseInt(chunk, 2);
    result += BASE32_CHARS[val];
  }
  return result;
}

/**
 * Decodes a Base32 encoded string into a raw Buffer
 */
export function decodeBase32(secret: string): Buffer {
  const cleanSecret = secret.toUpperCase().replace(/[\s-]/g, '');
  let bin = '';
  for (let i = 0; i < cleanSecret.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleanSecret[i]);
    if (idx === -1) continue;
    bin += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i < bin.length; i += 8) {
    if (i + 8 <= bin.length) {
      bytes.push(parseInt(bin.substring(i, i + 8), 2));
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a 6-digit TOTP code for a secret and counter (RFC 6238)
 */
export function generateTOTP(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buf = Buffer.alloc(8);
  let tmp = BigInt(counter);
  for (let i = 7; i >= 0; i--) {
    buf[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buf);
  const hmacResult = hmac.digest();
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const codeVal = (
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  );
  const code = codeVal % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Verifies a 2FA TOTP code within a window of clock drift (+/- 1 interval of 30 seconds)
 */
export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const cleanToken = token.trim().replace(/\s/g, '');
  if (cleanToken.length !== 6) return false;
  for (let i = -window; i <= window; i++) {
    if (generateTOTP(secret, counter + i) === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a Google-Authenticator compatible OTP Auth URI and high-contrast Base64 QR code Data URL
 */
export async function generateTOTPUriAndQR(email: string, secret: string): Promise<{ uri: string; qrCodeDataUrl: string }> {
  const label = encodeURIComponent(`How It Lands:${email}`);
  const issuer = encodeURIComponent('How It Lands');
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  const qrCodeDataUrl = await QRCode.toDataURL(uri);
  return { uri, qrCodeDataUrl };
}

/**
 * Web Application Firewall (WAF) Content Inspection Middleware
 * Pre-filters automated scan tools, script probes, and common application/SQL/XSS attacks at the routing edge.
 */
export function wafMiddleware(req: any, res: any, next: any) {
  const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
  const userId = req.user?.id;

  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
  const path = String(req.path).toLowerCase();

  // Attack signatures & probes
  const suspiciousUserAgents = ['sqlmap', 'nikto', 'nmap', 'scanner', 'dirbuster', 'zgrab', 'masscan'];
  const suspiciousPaths = [
    '/wp-admin', '/wp-login.php', '/.git', '/config.php', '/config.json', 
    '/etc/passwd', '/etc/shadow', '/xmlrpc.php', '/shell', '/cmd', '/exec',
    '/admin/setup', '/phpinfo', '/.env', '/.env.example'
  ];

  if (suspiciousUserAgents.some(ua => userAgent.includes(ua))) {
    logSecurityEvent(userId, clientIp, 'waf.blocked_agent', `Blocked automated scanner: ${userAgent}`);
    return res.status(403).json({ error: 'Request blocked by Web Application Firewall (WAF) - Suspicious User-Agent.' });
  }

  if (suspiciousPaths.some(sp => path.includes(sp))) {
    logSecurityEvent(userId, clientIp, 'waf.blocked_path', `Blocked probe for sensitive path: ${req.path}`);
    return res.status(403).json({ error: 'Request blocked by Web Application Firewall (WAF) - Forbidden resource.' });
  }

  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /union\s+select/i,
    /select\s+.*\s+from/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /\.\.\//, // Directory traversal
    /\.\.\\/,
    /(\x00|\x01)/, // Null-bytes / control characters
    /(\||;|&&)\s*(rm|sh|bash|curl|wget|exec|system|eval)\b/i, // OS command injection
  ];

  if (maliciousPatterns.some(pattern => pattern.test(req.url))) {
    logSecurityEvent(userId, clientIp, 'waf.blocked_url_payload', `Blocked injection pattern in URL: ${req.url}`);
    return res.status(403).json({ error: 'Request blocked by Web Application Firewall (WAF) - Malicious content.' });
  }

  if (req.body && typeof req.body === 'object') {
    const containsMalicious = (obj: any): boolean => {
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          const val = obj[k];
          if (typeof val === 'string') {
            // Skip scanning very long strings without spaces (base64 audio/images) or data URLs to prevent false positives and high CPU load
            if (val.length > 500 && (!/\s/.test(val) || val.startsWith('data:'))) {
              continue;
            }
            if (maliciousPatterns.some(pattern => pattern.test(val))) {
              return true;
            }
          } else if (typeof val === 'object' && val !== null) {
            if (containsMalicious(val)) return true;
          }
        }
      }
      return false;
    };

    if (containsMalicious(req.body)) {
      logSecurityEvent(userId, clientIp, 'waf.blocked_body_payload', `Malicious content payload found in request body.`);
      return res.status(403).json({ error: 'Request blocked by Web Application Firewall (WAF) - Payload contains unsafe characters.' });
    }
  }

  next();
}

/**
 * Standard security headers and frame ancestor locks (prevents clickjacking & session sniffing)
 */
export function securityHeadersMiddleware(req: any, res: any, next: any) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permit preview frame embeds but lock unauthorized cross-site scripting
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' data: https:; frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://*.run.app https://ai.studio https://*.google.com;"
  );
  
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
}
