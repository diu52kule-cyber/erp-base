import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgContext } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get('entity_type');
  const entity_id   = searchParams.get('entity_id');
  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { entity_type, entity_id, body: text } = body;
  if (!entity_type || !entity_id || !text?.trim()) {
    return NextResponse.json({ error: 'entity_type, entity_id, and body required' }, { status: 400 });
  }

  // Extract @handle mentions from body (e.g. @alice → "alice")
  const handles = [...text.matchAll(/@(\w+)/g)].map((m: RegExpMatchArray) => m[1].toLowerCase());

  const supabase = createClient();
  const admin    = createAdminClient();

  // Insert comment
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      org_id:      ctx.org.id,
      entity_type,
      entity_id,
      body:        text.trim(),
      mentions:    handles,
      created_by:  ctx.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire notifications for @mentioned members (async, don't block response)
  if (handles.length > 0) {
    try {
      // Get all org member user_ids (excluding the commenter)
      const { data: members } = await admin
        .from('memberships')
        .select('user_id')
        .eq('org_id', ctx.org.id)
        .neq('user_id', ctx.user.id);

      if (members?.length) {
        // List users by IDs to match handles against email prefixes
        const memberIds = members.map((m: { user_id: string }) => m.user_id);
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 500 });

        const senderHandle = (ctx.user.email ?? '').split('@')[0];
        const matched = users.filter((u) =>
          memberIds.includes(u.id) &&
          handles.some((h) =>
            (u.email ?? '').toLowerCase().startsWith(h) ||
            (u.user_metadata?.full_name ?? '').toLowerCase().includes(h)
          )
        );

        if (matched.length > 0) {
          await admin.from('notifications').insert(
            matched.map((u) => ({
              org_id:      ctx.org!.id,
              user_id:     u.id,
              title:       `@${senderHandle} mentioned you`,
              body:        text.trim().slice(0, 120),
              entity_type,
              entity_id,
            }))
          );
        }
      }
    } catch {
      // Notification failure should not break comment creation
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
