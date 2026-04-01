import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendOtpEmail } from '@/lib/email';
import { OTP_CONFIG } from '@/lib/config';
import { apiSuccess, apiError, withErrorHandling, requireEmail } from '@/lib/api-helpers';
import crypto from 'crypto';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email: rawEmail } = await request.json();
  const email = requireEmail(rawEmail);

  const supabase = await createAdminClient();

  // ── Rate limiting: check recent OTPs for this email ──────────
  const windowStart = new Date(Date.now() - OTP_CONFIG.cooldownSeconds * 1000).toISOString();
  const { data: recent } = await supabase
    .from('otp_codes')
    .select('id, created_at')
    .eq('email', email)
    .eq('used', false)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false });

  if (recent && recent.length >= OTP_CONFIG.maxAttemptsPerWindow) {
    return apiError(
      `Too many attempts. Wait ${OTP_CONFIG.cooldownSeconds} seconds before requesting another OTP.`,
      429,
    );
  }

  // ── Generate OTP ─────────────────────────────────────────────
  const code = Array.from(
    crypto.getRandomValues(new Uint8Array(OTP_CONFIG.length)),
  )
    .map((b) => (b % 10).toString())
    .join('');

  const expiresAt = new Date(
    Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000,
  ).toISOString();

  // ── Store in DB ──────────────────────────────────────────────
  const { error: insertError } = await supabase.from('otp_codes').insert({
    email,
    code,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('[send-otp] DB insert failed:', insertError);
    return apiError('Failed to generate OTP. Please try again.', 500);
  }

  // ── Send email ───────────────────────────────────────────────
  const result = await sendOtpEmail(email, code);
  if (!result.ok) {
    return apiError(result.error || 'Failed to send email.', 500);
  }

  return apiSuccess({ message: `OTP sent to ${email}` });
});
