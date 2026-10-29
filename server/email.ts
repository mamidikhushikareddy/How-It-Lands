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
