import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { OTP_CONFIG } from '@/lib/config';
import { apiSuccess, apiError, withErrorHandling, requireEmail } from '@/lib/api-helpers';

/**
 * POST /api/auth/signup
 * Verify OTP + create/update user with password
 *
 * Handles the case where a user exists in auth.users but was deleted
 * from public.users — we just update their password and re-onboard.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email: rawEmail, code, password } = await request.json();
  const email = requireEmail(rawEmail);

  if (!code || typeof code !== 'string' || code.length !== OTP_CONFIG.length) {
    return apiError(`OTP must be ${OTP_CONFIG.length} digits`, 400);
  }

  // Validate code is all digits
  if (!/^\d+$/.test(code)) {
    return apiError('OTP must contain digits only', 400);
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return apiError('Password must be at least 8 characters', 400);
  }

  const supabase = await createAdminClient();

  // Verify OTP
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

  // Mark all OTPs for this email as used immediately
  await supabase.from('otp_codes').update({ used: true }).eq('email', email).eq('used', false);

  // Look up user by email via public.users table — avoids listUsers() full scan
  let userId: string;

  const { data: publicUser } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', email)
    .single();

  if (publicUser?.id) {
    if (publicUser.name) {
      // Fully registered user — they should sign in instead
      return apiError('Account already exists. Sign in with your password.', 409);
    }
    // Ghost user (in auth but no profile) — update password and proceed
    await supabase.auth.admin.updateUserById(publicUser.id, { password });
    userId = publicUser.id;
  } else {
    // Brand new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      console.error('[signup] User creation failed:', createError);
      return apiError('Failed to create account. Try again.', 500);
    }
    userId = newUser.user.id;
  }

  // Sign them in via magic link token
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  if (linkError || !linkData) {
    return apiError('Account created but sign-in failed. Use your password to sign in.', 500);
  }

  const tokenHash = linkData.properties?.hashed_token;

  return apiSuccess({
    tokenHash,
    email,
    redirectTo: '/onboarding',
    userId,
  });
});
