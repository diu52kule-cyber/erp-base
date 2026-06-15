'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Attachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url: string | null;
};

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
  return '📎';
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentPanel({
  entityType,
  entityId,
}: {
  entityType: 'invoice' | 'employee' | 'purchase_order';
  entityId: string;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/attachments?entity_type=${entityType}&entity_id=${entityId}`);
    const data = await res.json();
    setAttachments(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB'); return; }
    setUploading(true); setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('entity_type', entityType);
    fd.append('entity_id', entityId);
    const res  = await fetch('/api/attachments', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.error) setError(data.error);
    else load();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Attachments</h3>
        <label className={`cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? 'Uploading…' : '+ Attach File'}
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-xs text-neutral-400">Loading…</p>
      ) : attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 py-6 text-center">
          <p className="text-xs text-neutral-400">No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <span className="text-lg">{fileIcon(att.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{att.file_name}</p>
                <p className="text-xs text-neutral-400">{fmtSize(att.size_bytes)} · {new Date(att.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {att.url && (
                  <a href={att.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline">
                    View
                  </a>
                )}
                <button onClick={() => handleDelete(att.id, att.file_name)}
                  className="text-xs text-red-500 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
