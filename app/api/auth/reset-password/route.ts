import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { OTP_CONFIG } from '@/lib/config';
import { apiSuccess, apiError, withErrorHandling, requireEmail } from '@/lib/api-helpers';

/**
 * POST /api/auth/reset-password
 * Verify OTP + update password (forgot password flow)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email: rawEmail, code, newPassword } = await request.json();
  const email = requireEmail(rawEmail);

  if (!code || typeof code !== 'string' || code.length !== OTP_CONFIG.length) {
    return apiError(`OTP must be ${OTP_CONFIG.length} digits`, 400);
  }
  if (!newPassword || newPassword.length < 6) {
    return apiError('Password must be at least 6 characters', 400);
  }

  const supabase = await createAdminClient();

  // ── Verify OTP ───────────────────────────────────────────────
  const { data: otpRecord, error: lookupError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lookupError || !otpRecord) {
    return apiError('Invalid or expired OTP. Request a new one.', 401);
  }

  // Mark all OTPs as used
  await supabase.from('otp_codes').update({ used: true }).eq('email', email).eq('used', false);

  // ── Find user ────────────────────────────────────────────────
  const { data: userList } = await supabase.auth.admin.listUsers();
  const user = userList?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!user) {
    return apiError('No account found with this email.', 404);
  }

  // ── Update password ──────────────────────────────────────────
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error('[reset-password] Update failed:', updateError);
    return apiError('Failed to reset password. Try again.', 500);
  }

  return apiSuccess({ message: 'Password reset successful. Sign in with your new password.' });
});
