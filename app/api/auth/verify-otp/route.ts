import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { OTP_CONFIG } from '@/lib/config';
import { apiSuccess, apiError, withErrorHandling, requireEmail } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email: rawEmail, code } = await request.json();
  const email = requireEmail(rawEmail);

  if (!code || typeof code !== 'string' || code.length !== OTP_CONFIG.length) {
    return apiError(`OTP must be ${OTP_CONFIG.length} digits`, 400);
  }

  // Validate code is all digits
  if (!/^\d+$/.test(code)) {
    return apiError('OTP must contain digits only', 400);
  }

  const supabase = await createAdminClient();

  // Look up valid OTP
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
    return apiError('Invalid or expired OTP. Please request a new one.', 401);
  }

  // Mark OTP as used immediately (before any other operations)
  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('id', otpRecord.id);

  // Cleanup: mark ALL other OTPs for this email as used
  await supabase
    .from('otp_codes')
    .update({ used: true })
    .eq('email', email)
    .eq('used', false);

  // Look up user by email via public.users table — avoids listUsers() full scan
  let userId: string;

  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (publicUser?.id) {
    userId = publicUser.id;
  } else {
    // Create new auth user (no password — OTP only)
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
      });

    if (createError || !newUser.user) {
      console.error('[verify-otp] User creation failed:', createError);
      return apiError('Failed to create account. Please try again.', 500);
    }
    userId = newUser.user.id;
  }

  // Generate a magic link to sign the user in
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

  if (linkError || !linkData) {
    console.error('[verify-otp] Link generation failed:', linkError);
    return apiError('Authentication failed. Please try again.', 500);
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    return apiError('Authentication failed. Please try again.', 500);
  }

  // Check profile for routing
  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', userId)
    .single();

  let redirectTo = '/onboarding';
  if (profile?.name) {
    if (profile.role === 'admin') redirectTo = '/admin';
    else if (profile.role === 'agent') redirectTo = '/agent/dashboard';
    else redirectTo = '/order';
  }

  return apiSuccess({
    tokenHash,
    email,
    redirectTo,
    userId,
  });
});
