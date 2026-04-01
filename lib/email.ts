/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — Email Transport (Gmail SMTP via Nodemailer)
 * ═══════════════════════════════════════════════════════════════
 * Reusable email helper. Swap transport for any provider later
 * by changing `createTransport(...)` config — zero consumer changes.
 */

import nodemailer from 'nodemailer';
import { EMAIL_CONFIG, OTP_CONFIG } from '@/lib/config';

// ── TRANSPORT (lazy singleton) ────────────────────────────────
let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transport;
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────
// Add new templates here as the app grows

function otpEmailHtml(code: string): string {
  return `
    <div style="font-family: 'Courier New', monospace; background: #0f0f0f; color: #f0f0f0; padding: 2rem; max-width: 480px; margin: 0 auto;">
      <div style="border: 3px solid #e9b50b; padding: 2rem;">
        <div style="font-size: 2rem; font-weight: 900; color: #e9b50b; letter-spacing: 0.06em; margin-bottom: 0.5rem;">
          DASHR<sup style="font-size: 0.5rem; background: #e9b50b; color: #000; padding: 0.1em 0.4em; border: 2px solid #000; vertical-align: super; margin-left: 4px;">SRM</sup>
        </div>
        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 2rem;">
          Email Verification
        </div>
        <div style="font-size: 0.85rem; color: #ccc; margin-bottom: 1.5rem;">
          Your one-time password for DASHR:
        </div>
        <div style="background: #1a1a1a; border: 2px solid #e9b50b; padding: 1.2rem; text-align: center; margin-bottom: 1.5rem;">
          <span style="font-size: 2.5rem; font-weight: 700; color: #e9b50b; letter-spacing: 0.3em;">${code}</span>
        </div>
        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.1em;">
          Expires in ${OTP_CONFIG.expiryMinutes} minutes · Do not share this code
        </div>
        <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #333; font-size: 0.65rem; color: #555; text-transform: uppercase; letter-spacing: 0.1em;">
          Built by SRM students. For SRM students.
        </div>
      </div>
    </div>
  `;
}

// ── PUBLIC API ─────────────────────────────────────────────────

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendOtpEmail(to: string, code: string): Promise<SendEmailResult> {
  try {
    await getTransport().sendMail({
      from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.address}>`,
      to,
      subject: `${code} — Your DASHR verification code`,
      html: otpEmailHtml(code),
    });
    return { ok: true };
  } catch (err) {
    console.error('[email] Failed to send OTP:', err);
    return { ok: false, error: 'Failed to send email. Please try again.' };
  }
}

/**
 * Generic email sender for future use (notifications, etc.)
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  try {
    await getTransport().sendMail({
      from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.address}>`,
      ...params,
    });
    return { ok: true };
  } catch (err) {
    console.error('[email] Failed to send:', err);
    return { ok: false, error: 'Failed to send email.' };
  }
}
