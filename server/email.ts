import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn(
      '[EMAIL SERVICE] Missing SMTP credentials (SMTP_USER/SMTP_PASS). Transactional emails will be simulated.'
    );
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
    console.log(`[EMAIL SERVICE] Nodemailer SMTP Transporter initialized successfully for: ${host}`);
    return transporter;
  } catch (error) {
    console.error('[EMAIL SERVICE] Failed to initialize SMTP Transporter:', error);
    return null;
  }
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getTransporter();
  const fromAddress = process.env.SMTP_USER || 'no-reply@howitlands.com';

  if (!client) {
    console.log(
      `\n=======================================================\n` +
      `[SIMULATED EMAIL SENDER]\n` +
      `To: ${options.to}\n` +
      `Subject: ${options.subject}\n` +
      `Text:\n${options.text}\n` +
      `=======================================================\n`
    );
    return false;
  }

  try {
    await client.sendMail({
      from: `"How It Lands" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[EMAIL SERVICE] Email successfully dispatched to: ${options.to}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL SERVICE] Failed to dispatch email to: ${options.to}`, error);
    return false;
  }
}

/**
 * Sends a premium verification code email
 */
export async function sendEmailVerificationCode(toEmail: string, name: string, code: string): Promise<boolean> {
  const subject = `${code} is your How It Lands Verification Code`;
  
  const text = `Hi ${name},\n\nThank you for signing up for How It Lands. Your email verification code is: ${code}\n\nThis code will expire in 1 hour. If you did not request this, you can safely ignore this email.\n\nBest regards,\nThe How It Lands Team`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify your Email - How It Lands</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
          color: #1f2937;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .header {
          background-color: #0f172a;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.05em;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .instructions {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 30px;
        }
        .code-container {
          background-color: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          margin: 30px 0;
        }
        .code-value {
          font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 36px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.25em;
          margin: 0;
        }
        .expiry-warning {
          font-size: 14px;
          color: #94a3b8;
          text-align: center;
          margin-top: 8px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #64748b;
        }
        .footer p {
          margin: 0;
        }
        .footer-logo {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>How It Lands</h1>
        </div>
        <div class="content">
          <p class="greeting">Hi ${name},</p>
          <p class="instructions">Thank you for registering with How It Lands. To complete your account verification and activate your communication intelligence tools, please enter the single-use code below on the verification screen:</p>
          
          <div class="code-container">
            <h2 class="code-value">${code}</h2>
            <div class="expiry-warning">This verification code is valid for 1 hour</div>
          </div>
          
          <p class="instructions">If you did not initiate this request, you can safely disregard this message. Your account remains secure.</p>
        </div>
        <div class="footer">
          <div class="footer-logo">How It Lands</div>
          <p>The premium message analyst and communication strategist workspace.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
}

/**
 * Sends a beautiful password reset email
 */
export async function sendEmailPasswordReset(toEmail: string, name: string, resetLink: string): Promise<boolean> {
  const subject = `Reset Your How It Lands Password`;
  
  const text = `Hi ${name},\n\nWe received a request to reset your password for How It Lands. You can complete the reset by clicking the link below:\n\n${resetLink}\n\nThis link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nThe How It Lands Team`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password - How It Lands</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
          color: #1f2937;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .header {
          background-color: #0f172a;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.05em;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .instructions {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 30px;
        }
        .button-container {
          text-align: center;
          margin: 35px 0;
        }
        .reset-button {
          background-color: #2563eb;
          color: #ffffff !important;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .expiry-warning {
          font-size: 14px;
          color: #94a3b8;
          text-align: center;
          margin-top: 20px;
        }
        .trouble-link {
          font-size: 13px;
          color: #64748b;
          word-break: break-all;
          margin-top: 30px;
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #64748b;
        }
        .footer p {
          margin: 0;
        }
        .footer-logo {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>How It Lands</h1>
        </div>
        <div class="content">
          <p class="greeting">Hi ${name},</p>
          <p class="instructions">We received a request to reset the password for your account. Click the secure button below to choose a new password:</p>
          
          <div class="button-container">
            <a href="${resetLink}" class="reset-button" target="_blank">Reset Your Password</a>
            <div class="expiry-warning">This secure reset link is valid for 15 minutes</div>
          </div>
          
          <p class="instructions">If you did not make this request, you can safely disregard this message. Your password will remain unchanged.</p>
          
          <div class="trouble-link">
            <strong>Having trouble with the button?</strong> Copy and paste this URL into your browser:<br>
            <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
          </div>
        </div>
        <div class="footer">
          <div class="footer-logo">How It Lands</div>
          <p>The premium message analyst and communication strategist workspace.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: toEmail, subject, text, html });
}

/**
 * Shared lightweight card layout for the three notification emails
 * below (analysis reports, security alerts, monthly reports) — same
 * visual language as the verification/reset emails above, without
 * duplicating the full stylesheet three more times.
 */
function renderNotificationEmail(opts: {
  headerColor: string;
  title: string;
  name: string;
  bodyHtml: string;
  footerNote: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${opts.title} - How It Lands</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
          color: #1f2937;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .header {
          background-color: ${opts.headerColor};
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .content {
          padding: 32px 30px;
          line-height: 1.6;
        }
        .greeting {
          font-size: 17px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 14px;
        }
        .card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px 20px;
          margin: 16px 0;
        }
        .card-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin: 0 0 6px 0;
        }
        .card-value {
          font-size: 15px;
          color: #0f172a;
          margin: 0;
        }
        .footer {
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
        }
        .footer-logo {
          font-weight: 700;
          color: #4b5563;
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${opts.title}</h1>
        </div>
        <div class="content">
          <p class="greeting">Hi ${opts.name},</p>
          ${opts.bodyHtml}
        </div>
        <div class="footer">
          <div class="footer-logo">How It Lands</div>
          <p>${opts.footerNote}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * "Analysis Reports & Diagnostics Log summaries" notification —
 * fired after a successful analysis, gated on
 * user_profiles.email_notifications_enabled. Summarizes the read and
 * top risk/strength so the person can see it at a glance in their
 * inbox without opening the app.
 */
export async function sendAnalysisReportEmail(
  toEmail: string,
  name: string,
  analysis: {
    original_message: string;
    landing_status?: string;
    overall_read?: string;
    recommended_move?: string;
    top_risk?: string;
    top_strength?: string;
  }
): Promise<boolean> {
  const preview = analysis.original_message.length > 140
    ? analysis.original_message.slice(0, 140) + '…'
    : analysis.original_message;

  const subject = `Your analysis is ready: ${analysis.landing_status || 'New diagnostic report'}`;
  const text = `Hi ${name},\n\nYour message draft has been processed.\n\nDraft: "${preview}"\nLanding status: ${analysis.landing_status || 'N/A'}\nOverall read: ${analysis.overall_read || 'N/A'}\nRecommended move: ${analysis.recommended_move || 'N/A'}\n${analysis.top_risk ? `Top risk: ${analysis.top_risk}\n` : ''}${analysis.top_strength ? `Top strength: ${analysis.top_strength}\n` : ''}\nOpen How It Lands to see the full diagnostic breakdown and suggested rewrites.\n\nYou're receiving this because Analysis Report notifications are enabled in your profile settings — you can turn these off anytime.\n\nBest,\nThe How It Lands Team`;

  const bodyHtml = `
    <p style="color:#4b5563; font-size:15px;">Your draft has been processed. Here's the summary:</p>
    <div class="card">
      <p class="card-label">Draft preview</p>
      <p class="card-value" style="font-style:italic;">"${preview}"</p>
    </div>
    ${analysis.landing_status ? `<div class="card"><p class="card-label">Landing Status</p><p class="card-value">${analysis.landing_status}</p></div>` : ''}
    ${analysis.overall_read ? `<div class="card"><p class="card-label">Overall Read</p><p class="card-value">${analysis.overall_read}</p></div>` : ''}
    ${analysis.recommended_move ? `<div class="card"><p class="card-label">Recommended Move</p><p class="card-value">${analysis.recommended_move}</p></div>` : ''}
    ${analysis.top_risk ? `<div class="card"><p class="card-label">Top Risk</p><p class="card-value">${analysis.top_risk}</p></div>` : ''}
    ${analysis.top_strength ? `<div class="card"><p class="card-label">Top Strength</p><p class="card-value">${analysis.top_strength}</p></div>` : ''}
    <p style="color:#6b7280; font-size:13px; margin-top:24px;">Open How It Lands to see the full breakdown, risk heatmap, and suggested rewrites for this draft.</p>
  `;

  const html = renderNotificationEmail({
    headerColor: '#0f172a',
    title: 'Your Analysis Report',
    name,
    bodyHtml,
    footerNote: 'You received this because Analysis Report notifications are enabled in your profile settings.'
  });

  return sendEmail({ to: toEmail, subject, text, html });
}

/**
 * "Strict Compliance Security Alerts" notification — fired
 * immediately on new-device sign-in, 2FA changes, or credential
 * updates, gated on user_profiles.security_alerts_enabled. These
 * fire regardless of whether the person is currently using the app,
 * which is the whole point of a security alert.
 */
export type SecurityAlertType =
  | 'new_device_login'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'password_changed'
  | 'email_changed';

const SECURITY_ALERT_COPY: Record<SecurityAlertType, { subject: string; headline: string }> = {
  new_device_login: {
    subject: 'New sign-in to your How It Lands account',
    headline: 'We noticed a sign-in from a device we haven\'t seen on your account before.'
  },
  '2fa_enabled': {
    subject: 'Two-factor authentication was enabled on your account',
    headline: 'Two-factor authentication (2FA) was just turned on for your account.'
  },
  '2fa_disabled': {
    subject: 'Two-factor authentication was disabled on your account',
    headline: 'Two-factor authentication (2FA) was just turned off for your account.'
  },
  password_changed: {
    subject: 'Your password was changed',
    headline: 'Your account password was just changed.'
  },
  email_changed: {
    subject: 'Your account email was changed',
    headline: 'The email address on your account was just changed.'
  }
};

export async function sendSecurityAlertEmail(
  toEmail: string,
  name: string,
  alertType: SecurityAlertType,
  details: { ipAddress?: string | null; userAgent?: string | null; timestamp?: Date }
): Promise<boolean> {
  const copy = SECURITY_ALERT_COPY[alertType];
  const when = (details.timestamp || new Date()).toUTCString();

  const text = `Hi ${name},\n\n${copy.headline}\n\nTime: ${when}\n${details.ipAddress ? `IP address: ${details.ipAddress}\n` : ''}${details.userAgent ? `Device: ${details.userAgent}\n` : ''}\nIf this was you, no action is needed. If you don't recognize this activity, secure your account immediately by changing your password and reviewing your active sessions.\n\nYou're receiving this because Security Alert notifications are enabled in your profile settings.\n\nBest,\nThe How It Lands Team`;

  const bodyHtml = `
    <p style="color:#4b5563; font-size:15px;">${copy.headline}</p>
    <div class="card">
      <p class="card-label">Time</p>
      <p class="card-value">${when}</p>
    </div>
    ${details.ipAddress ? `<div class="card"><p class="card-label">IP Address</p><p class="card-value">${details.ipAddress}</p></div>` : ''}
    ${details.userAgent ? `<div class="card"><p class="card-label">Device</p><p class="card-value" style="word-break:break-all;">${details.userAgent}</p></div>` : ''}
    <p style="color:#4b5563; font-size:14px; margin-top:20px;">If this was you, no action is needed. If you don't recognize this activity, change your password immediately and review your active sessions from Security settings.</p>
  `;

  const html = renderNotificationEmail({
    headerColor: '#7f1d1d',
    title: 'Security Alert',
    name,
    bodyHtml,
    footerNote: 'You received this because Security Alert notifications are enabled in your profile settings.'
  });

  return sendEmail({ to: toEmail, subject: copy.subject, text, html });
}

/**
 * "Monthly Conversation alignment reports" notification — sent by the
 * scheduled monthly job (see /api/internal/notifications/monthly-report
 * in server.ts), gated on user_profiles.monthly_reports_enabled.
 */
export async function sendMonthlyReportEmail(
  toEmail: string,
  name: string,
  stats: {
    periodLabel: string;
    analysesCount: number;
    avgScore: number | null;
    mostCommonLandingStatus: string | null;
    analysesSavedCount: number;
  }
): Promise<boolean> {
  const subject = `Your ${stats.periodLabel} conversation trends`;
  const text = `Hi ${name},\n\nHere's your conversation alignment summary for ${stats.periodLabel}:\n\nAnalyses run: ${stats.analysesCount}\n${stats.avgScore !== null ? `Average score: ${stats.avgScore}/100\n` : ''}${stats.mostCommonLandingStatus ? `Most common landing status: ${stats.mostCommonLandingStatus}\n` : ''}Analyses saved for reference: ${stats.analysesSavedCount}\n\nOpen How It Lands to see your full trend history.\n\nYou're receiving this because Monthly Report notifications are enabled in your profile settings.\n\nBest,\nThe How It Lands Team`;

  const bodyHtml = `
    <p style="color:#4b5563; font-size:15px;">Here's your conversation alignment summary for <strong>${stats.periodLabel}</strong>:</p>
    <div class="card">
      <p class="card-label">Analyses Run</p>
      <p class="card-value">${stats.analysesCount}</p>
    </div>
    ${stats.avgScore !== null ? `<div class="card"><p class="card-label">Average Score</p><p class="card-value">${stats.avgScore}/100</p></div>` : ''}
    ${stats.mostCommonLandingStatus ? `<div class="card"><p class="card-label">Most Common Landing Status</p><p class="card-value">${stats.mostCommonLandingStatus}</p></div>` : ''}
    <div class="card">
      <p class="card-label">Analyses Saved for Reference</p>
      <p class="card-value">${stats.analysesSavedCount}</p>
    </div>
    <p style="color:#6b7280; font-size:13px; margin-top:24px;">Open How It Lands to see your full trend history and voice-alignment progress over time.</p>
  `;

  const html = renderNotificationEmail({
    headerColor: '#1e4636',
    title: `${stats.periodLabel} Trends Report`,
    name,
    bodyHtml,
    footerNote: 'You received this because Monthly Report notifications are enabled in your profile settings.'
  });

  return sendEmail({ to: toEmail, subject, text, html });
}
