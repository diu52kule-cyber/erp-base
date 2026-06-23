import { createAdminClient } from '@/lib/supabase/admin';

// DB-backed rate limiter — works across all serverless instances.
// Uses the rate_limits table (created in migration 0059).
// Returns true if the request is allowed, false if it exceeds the limit.
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

    // Read current window
    const { data } = await admin
      .from('rate_limits')
      .select('count, window_start')
      .eq('key', key)
      .maybeSingle();

    if (!data || data.window_start < windowStart) {
      // First request or window expired — reset
      await admin.from('rate_limits').upsert(
        { key, count: 1, window_start: new Date().toISOString() },
        { onConflict: 'key' },
      );
      return true;
    }

    if (data.count >= maxRequests) return false;

    await admin.from('rate_limits').update({ count: data.count + 1 }).eq('key', key);
    return true;
  } catch {
    // If rate limit check fails, allow the request (fail open)
    return true;
  }
}

export function rateLimitKey(prefix: string, ip: string): string {
  return `${prefix}:${ip}`;
}
