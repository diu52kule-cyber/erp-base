import { NextRequest, NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';

const VALID_EMOJIS = ['👍', '✅', '👀', '❤️', '🎉'];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('comment_reactions')
      .select('emoji, user_id')
      .eq('comment_id', params.id)
      .eq('org_id', ctx.org.id);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { emoji } = await req.json();
  if (!VALID_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
  }

  const supabase = createClient();
  try {
    // Toggle: try insert; if conflict (already reacted), delete
    const { error } = await supabase
      .from('comment_reactions')
      .insert({ org_id: ctx.org.id, comment_id: params.id, user_id: ctx.user.id, emoji });

    if (error?.code === '23505') {
      // Already reacted — remove reaction (toggle off)
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', params.id)
        .eq('user_id', ctx.user.id)
        .eq('emoji', emoji)
        .eq('org_id', ctx.org.id);
      return NextResponse.json({ toggled: false });
    }
    if (error) throw error;
    return NextResponse.json({ toggled: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
