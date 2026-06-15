import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgContext } from '@/lib/entitlements';

const BUCKET = 'attachments';

// GET /api/attachments?entity_type=invoice&entity_id=xxx
export async function GET(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entityType = req.nextUrl.searchParams.get('entity_type');
  const entityId   = req.nextUrl.searchParams.get('entity_id');
  if (!entityType || !entityId) return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('org_id', ctx.org.id)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URLs for each attachment
  const withUrls = await Promise.all((data ?? []).map(async (att) => {
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.storage_path, 3600);
    return { ...att, url: urlData?.signedUrl ?? null };
  }));

  return NextResponse.json(withUrls);
}

// POST /api/attachments — multipart form with file + entity_type + entity_id
export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx?.org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData   = await req.formData();
  const file       = formData.get('file') as File | null;
  const entityType = formData.get('entity_type') as string;
  const entityId   = formData.get('entity_id') as string;

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: 'file, entity_type, and entity_id are required' }, { status: 400 });
  }

  const supabase  = createClient();
  const ext       = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${ctx.org.id}/${entityType}/${entityId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: file.type || 'application/octet-stream', upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      org_id:       ctx.org.id,
      entity_type:  entityType,
      entity_id:    entityId,
      file_name:    file.name,
      storage_path: storagePath,
      mime_type:    file.type || 'application/octet-stream',
      size_bytes:   file.size,
      created_by:   ctx.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
