import type { SupabaseClient, User } from '@supabase/supabase-js';

type AuthErrorLike = {
  code?: string;
  message?: string;
};

function isRefreshTokenMissingError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const authError = error as AuthErrorLike;
  if (authError.code === 'refresh_token_not_found') return true;
  const msg = typeof authError.message === 'string' ? authError.message.toLowerCase() : '';
  return msg.includes('invalid refresh token') || msg.includes('refresh token not found');
}

async function clearBrokenClientSession(supabase: SupabaseClient) {
  if (typeof window === 'undefined') return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore cleanup failures and continue as signed-out.
  }
}

export async function getUserSafe(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      if (isRefreshTokenMissingError(error)) {
        await clearBrokenClientSession(supabase);
      }
      return null;
    }

    return data.user;
  } catch (error) {
    if (isRefreshTokenMissingError(error)) {
      await clearBrokenClientSession(supabase);
      return null;
    }
    return null;
  }
}