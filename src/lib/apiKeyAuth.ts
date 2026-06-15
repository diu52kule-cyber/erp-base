import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function authenticateApiKey(req: NextRequest): Promise<{ orgId: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer erpk_')) return null;
  const rawKey = authHeader.slice(7);
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const supabase = createAdminClient();
  const { data } = await supabase.from('api_keys').select('org_id').eq('key_hash', hash).eq('active', true).single();
  if (!data) return null;
  return { orgId: data.org_id };
}
