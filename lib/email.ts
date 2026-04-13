/**
 * DASHR — Email Transport (Brevo Transactional API)
 * Centralized provider integration for OTP and high-value notifications.
 */

import { EMAIL_CONFIG, OTP_CONFIG } from '@/lib/config';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDERS_ENDPOINT = 'https://api.brevo.com/v3/senders';

let senderValidationCache:
  | { checkedAt: number; validSenders: Set<string> }
  | null = null;

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

interface BrevoResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

interface BrevoSender {
  email?: string;
  active?: boolean;
}

async function hasActiveBrevoSender(apiKey: string, senderEmail: string) {
  const now = Date.now();
  if (senderValidationCache && now - senderValidationCache.checkedAt < 10 * 60 * 1000) {
    return senderValidationCache.validSenders.has(senderEmail.toLowerCase());
  }

  const res = await fetch(BREVO_SENDERS_ENDPOINT, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'api-key': apiKey,
    },
  });

  if (!res.ok) {
    return true;
  }

  const payload = (await res.json()) as { senders?: BrevoSender[] };
  const validSenders = new Set(
    (payload.senders || [])
      .filter((s) => s.active && s.email)
      .map((s) => String(s.email).toLowerCase()),
  );

  senderValidationCache = { checkedAt: now, validSenders };
  return validSenders.has(senderEmail.toLowerCase());
}

async function sendViaBrevo(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !EMAIL_CONFIG.from.address) {
    return {
      ok: false,
      error: 'Email service is not configured. Contact support.',
    } as const;
  }

  try {
    const senderActive = await hasActiveBrevoSender(apiKey, EMAIL_CONFIG.from.address);
    if (!senderActive) {
      return {
        ok: false,
        error: `Sender ${EMAIL_CONFIG.from.address} is not active in Brevo. Validate sender or domain first.`,
      } as const;
    }
  } catch (err) {
    console.warn('[email] Sender validation check failed, continuing with send attempt:', err);
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: EMAIL_CONFIG.from.name,
        email: EMAIL_CONFIG.from.address,
      },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
      textContent: params.text,
    }),
  });

  const raw = await res.text();
  let payload: BrevoResponse | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as BrevoResponse) : null;
  } catch {
    payload = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      error: payload?.message || `Brevo error (${res.status})`,
    } as const;
  }

  return {
    ok: true,
    providerMessageId: payload?.messageId,
  } as const;
}

// ── PUBLIC API ─────────────────────────────────────────────────

export interface SendEmailResult {
  ok: boolean;
  error?: string;
  providerMessageId?: string;
}

export async function sendOtpEmail(to: string, code: string): Promise<SendEmailResult> {
  const result = await sendViaBrevo({
    to,
    subject: `${code} — Your DASHR verification code`,
    html: otpEmailHtml(code),
    text: `Your DASHR OTP is ${code}. It expires in ${OTP_CONFIG.expiryMinutes} minutes.`,
  });

  if (!result.ok) {
    console.error('[email] Failed to send OTP:', result.error);
    return { ok: false, error: result.error || 'Failed to send email. Please try again.' };
  }

  return { ok: true, providerMessageId: result.providerMessageId };
}

/**
 * Generic email sender for future use (notifications, etc.)
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const result = await sendViaBrevo(params);
  if (!result.ok) {
    console.error('[email] Failed to send:', result.error);
    return { ok: false, error: result.error || 'Failed to send email.' };
  }

  return { ok: true, providerMessageId: result.providerMessageId };
}
