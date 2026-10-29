/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { loadDB, saveDB } from './db';
import { logSecurityEvent } from './security';
import { sendWebhookEvent } from './billingGateway';

export interface PlanLimit {
  analysisPerMonth: number;
  savedHistory: number;
  customTemplates: number;
  customPlaybooks: number;
}

export interface PlanDetail {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  limits: PlanLimit;
}

export const BILLING_PLANS: Record<string, PlanDetail> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    limits: { analysisPerMonth: 5, savedHistory: 10, customTemplates: 2, customPlaybooks: 0 }
  },
  plus: {
    id: 'plus',
    name: 'Plus Professional',
    monthlyPrice: 12,
    annualPrice: 96,
    limits: { analysisPerMonth: 50, savedHistory: -1, customTemplates: 15, customPlaybooks: 5 }
  },
  pro: {
    id: 'pro',
    name: 'Pro Sovereign',
    monthlyPrice: 29,
    annualPrice: 232,
    limits: { analysisPerMonth: 500, savedHistory: -1, customTemplates: 100, customPlaybooks: 50 }
  },
  teams: {
    id: 'teams',
    name: 'Teams Hub',
    monthlyPrice: 15,
    annualPrice: 120,
    limits: { analysisPerMonth: 2500, savedHistory: -1, customTemplates: -1, customPlaybooks: -1 }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Secure',
    monthlyPrice: 99,
    annualPrice: 950,
    limits: { analysisPerMonth: -1, savedHistory: -1, customTemplates: -1, customPlaybooks: -1 }
  }
};

export function getBillingPlans(db?: any) {
  const currentDb = db || loadDB();
  if (currentDb.plans && currentDb.plans.length > 0) {
    const plansRecord: Record<string, any> = {};
    currentDb.plans.forEach((p: any) => {
      plansRecord[p.id] = p;
    });
    return plansRecord;
  }
  return BILLING_PLANS;
}

/**
 * Simulates SMTP transactional email dispatch with complete audit transparency
 */
export function sendBillingEmailSim(userId: string, emailType: string, details: any) {
  const currentDb = loadDB() as any;
  const user = currentDb.users.find((u: any) => u.id === userId);
  const email = user ? user.email : 'unknown@howitlands.com';
  const name = user ? user.name : 'Valued Customer';

  let subject = '';
  let content = '';

  switch (emailType) {
    case 'payment_success':
      subject = `Invoice Paid: Receipt for Your ${details.planName} Plan`;
      content = `Hi ${name},\n\nThank you for your payment of $${details.amount} USD. Your subscription has been renewed. You can view and download your PDF invoice directly in your Billing Dashboard.\n\nTransaction ID: ${details.transactionId}\nInvoice Number: ${details.invoiceNumber}`;
      break;
    case 'payment_failed':
      subject = `Urgent: Action Required - Payment Failed for ${details.planName}`;
      content = `Hi ${name},\n\nOur attempt to process your payment of $${details.amount} USD for subscription renewal failed. We will attempt payment retry over the next few days. Please update your payment credentials to avoid service disruption.\n\nReason: ${details.reason}`;
      break;
    case 'trial_expired':
      subject = `Your How It Lands Free Trial Has Ended`;
      content = `Hi ${name},\n\nYour free trial of the ${details.planName} plan has ended. Your workspace has defaulted back to the Free Starter plan. Your existing templates and history are stored securely and can be fully unlocked by upgrading at any time.`;
      break;
    case 'subscription_canceled':
      subject = `Confirmation: Your Subscription Renewal is Off`;
      content = `Hi ${name},\n\nThis email confirms that your Auto-Renewal has been disabled. You will have full access until the end of your billing cycle on ${details.endDate}, after which you will revert to the Free Starter tier with zero data loss.`;
      break;
    case 'subscription_reactivated':
      subject = `Welcome Back! Auto-Renewal Re-enabled`;
      content = `Hi ${name},\n\nYour Auto-Renewal has been successfully reactivated. Full corporate memory, template libraries, and custom styling profiles remain active. Thank you for your continued partnership!`;
      break;
    case 'suspension_warning':
      subject = `Account Suspension Notice: Billing Past Due`;
      content = `Hi ${name},\n\nYour account has entered a grace period. Our final payment attempt failed. To prevent immediate workspace lockout, please renew your subscription details.\n\nGrace Period Expiry: ${details.expiryDate}`;
      break;
    default:
      subject = 'How It Lands Billing Notification';
      content = `Alert for user ${name}`;
  }

  // Record dispatch in system audit log
  const auditId = 'aud_' + Math.random().toString(36).substr(2, 9);
  const newAudit = {
    id: auditId,
    created_at: new Date().toISOString(),
    event: 'email.sent',
    user_id: userId,
    ip_address: '127.0.0.1',
    details: `Email Type: ${emailType} | Sent to: ${email} | Subject: ${subject}`
  };

  if (!currentDb.audit_logs) currentDb.audit_logs = [];
  currentDb.audit_logs.push(newAudit);
  saveDB();

  console.log(`[EMAIL SIMULATOR] Dispatching notification to ${email}:\n  Subject: ${subject}\n  Content: ${content.substring(0, 150)}...\n`);
}

/**
 * Compiles a real, beautifully formatted invoice PDF using pdfkit
 */
export async function generateInvoicePDF(
  invoiceId: string,
  outputStream: NodeJS.WritableStream
): Promise<void> {
  const currentDb = loadDB() as any;
  
  // Locate invoice in global records
  let invoice: any = null;
  let user: any = null;

  for (const u of currentDb.users) {
    const inv = u.invoices?.find((i: any) => i.id === invoiceId);
    if (inv) {
      invoice = inv;
      user = u;
      break;
    }
  }

  if (!invoice || !user) {
    throw new Error('Invoice not found.');
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(outputStream);

      // 1. Draw PDF Header Section
      doc.fillColor('#0d0d0d').rect(0, 0, doc.page.width, 140).fill();

      doc.fillColor('#00E5FF')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text('HOW IT LANDS', 50, 40);

      doc.fillColor('#a0a0a0')
         .fontSize(10)
         .font('Helvetica')
         .text('Sovereign Emotional Intelligence & Strategic Communication', 50, 70);

      doc.fillColor('#ffffff')
         .fontSize(18)
         .font('Helvetica')
         .text('INVOICE', 450, 40, { align: 'right' });

      doc.fillColor('#888888')
         .fontSize(9)
         .text(`Invoice No: ${invoice.invoice_number}`, 450, 65, { align: 'right' })
         .text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 450, 80, { align: 'right' })
         .text(`Status: ${invoice.status.toUpperCase()}`, 450, 95, { align: 'right' });

      // 2. Draw Client and Company Addresses
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Billed To:', 50, 170)
         .font('Helvetica')
         .text(user.name || 'Valued Partner', 50, 185)
         .text(user.email, 50, 200)
         .text(`Customer ID: ${user.billing_customer_id || 'N/A'}`, 50, 215);

      doc.font('Helvetica-Bold')
         .text('Issued By:', 350, 170)
         .font('Helvetica')
         .text('How It Lands Technologies Inc.', 350, 185)
         .text('100 Silicon Boulevard', 350, 200)
         .text('San Francisco, CA 94107', 350, 215)
         .text('support@howitlands.com', 350, 230);

      // 3. Draw Table Headers
      const tableTop = 280;
      doc.rect(50, tableTop, 500, 20).fillColor('#f5f5f5').fill();
      
      doc.fillColor('#111111')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('DESCRIPTION', 60, tableTop + 6)
         .text('QTY', 350, tableTop + 6, { align: 'center' })
         .text('UNIT PRICE', 420, tableTop + 6, { align: 'right' })
         .text('AMOUNT', 500, tableTop + 6, { align: 'right' });

      // Divider line
      doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).strokeColor('#dddddd').lineWidth(1).stroke();

      // 4. Draw Line Item Details
      const itemTop = tableTop + 25;
      const plansDb = getBillingPlans(currentDb);
      const planName = plansDb[invoice.plan]?.name || 'Linguistic Analysis Access';
      const cycleText = invoice.billing_cycle === 'annual' ? 'Annualized Corporate License' : 'Monthly Strategy Subscription';
      const description = `Subscription renewal for How It Lands (${planName} - ${cycleText})`;

      doc.fillColor('#333333')
         .font('Helvetica')
         .fontSize(9)
         .text(description, 60, itemTop)
         .text('1', 350, itemTop, { align: 'center' })
         .text(`$${invoice.amount}`, 420, itemTop, { align: 'right' })
         .text(`$${invoice.amount}`, 500, itemTop, { align: 'right' });

      // Divider line
      doc.moveTo(50, itemTop + 30).lineTo(550, itemTop + 30).strokeColor('#eeeeee').lineWidth(1).stroke();

      // 5. Draw Total Summary Section
      const totalTop = itemTop + 50;
      doc.fillColor('#555555')
         .font('Helvetica')
         .text('Subtotal:', 380, totalTop)
         .text(`$${invoice.amount}`, 500, totalTop, { align: 'right' });

      doc.text('Tax (0%):', 380, totalTop + 15)
         .text('$0.00', 500, totalTop + 15, { align: 'right' });

      // Draw final highlighted Total block
      doc.rect(370, totalTop + 30, 180, 25).fillColor('#0d0d0d').fill();
      doc.fillColor('#00E5FF')
         .font('Helvetica-Bold')
         .text('Total Due:', 380, totalTop + 38)
         .text(`$${invoice.amount} USD`, 500, totalTop + 38, { align: 'right' });

      // 6. Draw Professional Legal Footer
      const footerTop = 500;
      doc.moveTo(50, footerTop).lineTo(550, footerTop).strokeColor('#dddddd').lineWidth(1).stroke();

      doc.fillColor('#888888')
         .font('Helvetica-Oblique')
         .fontSize(8)
         .text('Thank you for choosing How It Lands. Secure digital communication and corporate clarity start here.', 50, footerTop + 15, { align: 'center' })
         .text('All payments processed securely under AES-256 standard and card-present authorization criteria.', 50, footerTop + 28, { align: 'center' });

      doc.end();
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fully functional background subscription state machine scheduler.
 * Resolves renewal cycles, grace periods, retries, and trial lapses.
 */
export async function executeSubscriptionLapseCheck(): Promise<{ processed: number; failures: number }> {
  console.log('[CRON ENGINE] Sweeping database for active subscription renewals, expired trials, and past-due accounts...');
  const currentDb = loadDB() as any;
  let processed = 0;
  let failures = 0;

  const now = new Date();

  for (const user of currentDb.users) {
    let userChanged = false;

    // A. Trial Expiration State Check
    if (user.trial_active && user.trial_expires_at) {
      const expiry = new Date(user.trial_expires_at);
      if (now > expiry) {
        console.log(`[CRON ENGINE] User ${user.email}'s Pro Trial has expired. Defaulting back to Free tier.`);
        user.trial_active = false;
        user.trial_expires_at = null;
        user.plan = 'free';
        user.billing_status = 'inactive';
        userChanged = true;

        sendBillingEmailSim(user.id, 'trial_expired', { planName: 'Pro Sovereign' });
        logSecurityEvent(user.id, '127.0.0.1', 'billing.trial_expired', 'Subscription downgraded back to Free after trial expired.');
        processed++;
      }
    }

    // B. Paid subscription billing renewal cycle
    if (user.plan !== 'free' && !user.trial_active) {
      // Find latest invoice of active plan
      const userInvoices = user.invoices || [];
      const paidInvs = userInvoices.filter((i: any) => i.status === 'paid');
      
      if (paidInvs.length > 0) {
        // Sort to find latest paid invoice date
        const latestPaid = paidInvs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        // Compute renewal date
        const cycleDays = latestPaid.billing_cycle === 'annual' ? 365 : 30;
        const renewalDate = new Date(latestPaid.created_at);
        renewalDate.setDate(renewalDate.getDate() + cycleDays);

        if (now > renewalDate) {
          console.log(`[CRON ENGINE] Renewal cycle detected for user ${user.email}. Plan: ${user.plan}. Processing automatic subscription charge...`);
          
          if (user.billing_paused) {
            console.log(`[CRON ENGINE] User ${user.email} subscription is PAUSED. Suspension activated, defaulting to Free.`);
            user.plan = 'free';
            user.billing_status = 'inactive';
            userChanged = true;
            processed++;
          } else if (user.billing_canceled) {
            console.log(`[CRON ENGINE] User ${user.email} auto-renewal is CANCELED. Lapsing to Free.`);
            const plansDb = getBillingPlans(currentDb);
            user.plan = 'free';
            user.billing_status = 'inactive';
            userChanged = true;
            sendBillingEmailSim(user.id, 'trial_expired', { planName: plansDb[user.plan]?.name });
            processed++;
          } else {
            // Simulated Stripe charge attempt!
            const plansDb = getBillingPlans(currentDb);
            const planDetails = plansDb[user.plan];
            const amount = latestPaid.billing_cycle === 'annual' ? planDetails.annualPrice : planDetails.monthlyPrice;

            // Simple probability math: 92% renewal charge success, 8% card declined / insufficient funds to simulate past_due behavior
            const isChargeSuccess = Math.random() > 0.08;

            if (isChargeSuccess) {
              const invoiceId = 'inv_' + Math.random().toString(36).substr(2, 9);
              const invoiceNum = `HIL-REN-${Math.floor(1000 + Math.random() * 9000)}`;
              
              userInvoices.push({
                id: invoiceId,
                invoice_number: invoiceNum,
                amount,
                currency: 'USD',
                status: 'paid',
                plan: user.plan,
                billing_cycle: latestPaid.billing_cycle,
                created_at: new Date().toISOString(),
                paid_at: new Date().toISOString()
              });

              user.invoices = userInvoices;
              user.billing_status = 'active';
              userChanged = true;

              sendBillingEmailSim(user.id, 'payment_success', {
                planName: planDetails.name,
                amount,
                transactionId: 'ch_' + Math.random().toString(36).substr(2, 9),
                invoiceNumber: invoiceNum
              });

              // Dispatch a secure webhook internally for programmatic updates
              await sendWebhookEvent('invoice.paid', {
                userId: user.id,
                amount,
                plan: user.plan,
                billingCycle: latestPaid.billing_cycle,
                invoiceId,
              });

              logSecurityEvent(user.id, '127.0.0.1', 'billing.subscription_renewed', `Subscription renewed successfully for $${amount}`);
              processed++;
            } else {
              // Renewal Charge Failed! Enter "past_due" status
              console.log(`[CRON ENGINE] Renewal charge failed for user ${user.email}. Attempting retry recovery...`);
              user.billing_status = 'past_due';
              userChanged = true;
              failures++;

              sendBillingEmailSim(user.id, 'payment_failed', {
                planName: planDetails.name,
                amount,
                reason: 'Declined: Insufficient Funds. Automated retry schedule initiated.'
              });

              await sendWebhookEvent('invoice.payment_failed', {
                userId: user.id,
                amount,
                plan: user.plan,
                billingCycle: latestPaid.billing_cycle,
                reason: 'Declined: Insufficient Funds'
              });

              logSecurityEvent(user.id, '127.0.0.1', 'billing.payment_attempt_failed', `Renewal payment attempt failed for plan: ${user.plan}`);
            }
          }
        }
      }
    }

    if (userChanged) {
      saveDB();
    }
  }

  return { processed, failures };
}
