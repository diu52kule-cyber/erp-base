import { createAdminClient } from '@/lib/supabase/admin';

export type TriggerType =
  | 'deal_won'
  | 'invoice_overdue'
  | 'stock_low'
  | 'deal_stage_change';

export type ActionType =
  | 'create_invoice_draft'
  | 'create_task'
  | 'create_po'
  | 'send_notification';

export async function fireTrigger(
  orgId: string,
  triggerType: TriggerType,
  triggerData: Record<string, unknown>,
) {
  const admin = createAdminClient();

  let rules: any[] = [];
  try {
    const { data } = await admin
      .from('workflow_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('trigger_type', triggerType)
      .eq('enabled', true);
    rules = data ?? [];
  } catch {
    return;
  }

  for (const rule of rules) {
    try {
      await executeAction(admin, orgId, rule, triggerData);
      await admin.from('workflow_rules').update({
        run_count: (rule.run_count ?? 0) + 1,
        last_run_at: new Date().toISOString(),
      }).eq('id', rule.id);
      await admin.from('workflow_runs').insert({
        org_id: orgId,
        rule_id: rule.id,
        trigger_data: triggerData,
        result: 'success',
      });
    } catch (e: any) {
      try {
        await admin.from('workflow_runs').insert({
          org_id: orgId,
          rule_id: rule.id,
          trigger_data: triggerData,
          result: 'error',
          error_msg: e?.message ?? 'Unknown error',
        });
      } catch { /* best-effort */ }
    }
  }
}

async function executeAction(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  rule: any,
  triggerData: Record<string, unknown>,
) {
  const cfg = rule.action_config ?? {};

  switch (rule.action_type as ActionType) {
    case 'create_task': {
      const title = interpolate(cfg.title ?? 'Automated task', triggerData);
      await admin.from('tasks').insert({
        org_id: orgId,
        title,
        description: cfg.description ? interpolate(cfg.description, triggerData) : null,
        status: 'todo',
        priority: cfg.priority ?? 'medium',
        project_id: cfg.project_id ?? null,
        assignee_id: cfg.assignee_id ?? null,
      });
      break;
    }

    case 'send_notification': {
      const { data: members } = await admin
        .from('memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .in('role', cfg.roles ?? ['owner', 'admin']);

      const body = interpolate(cfg.message ?? rule.name, triggerData);
      const notifications = (members ?? []).map((m: any) => ({
        org_id: orgId,
        user_id: m.user_id,
        title: interpolate(cfg.title ?? rule.name, triggerData),
        body,
        type: 'automation',
      }));
      if (notifications.length > 0) {
        await admin.from('notifications').insert(notifications);
      }
      break;
    }

    case 'create_invoice_draft': {
      const contactId = (triggerData.contact_id as string) ?? cfg.contact_id ?? null;
      if (!contactId) break;
      // Get next invoice number
      const { data: lastInv } = await admin
        .from('invoices')
        .select('invoice_number')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const year = new Date().getFullYear();
      const num = lastInv?.invoice_number
        ? parseInt(lastInv.invoice_number.split('-').pop() ?? '0', 10) + 1
        : 1;
      const invoice_number = `INV-${year}-${String(num).padStart(4, '0')}`;
      await admin.from('invoices').insert({
        org_id: orgId,
        contact_id: contactId,
        invoice_number,
        doc_type: 'invoice',
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        notes: `Auto-created by workflow: ${rule.name}`,
      });
      break;
    }

    case 'create_po': {
      const vendorId = (triggerData.vendor_id as string) ?? cfg.vendor_id ?? null;
      if (!vendorId) break;
      const { data: lastPO } = await admin
        .from('purchase_orders')
        .select('po_number')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const year = new Date().getFullYear();
      const num = lastPO?.po_number
        ? parseInt(lastPO.po_number.split('-').pop() ?? '0', 10) + 1
        : 1;
      const po_number = `PO-${year}-${String(num).padStart(4, '0')}`;
      await admin.from('purchase_orders').insert({
        org_id: orgId,
        vendor_id: vendorId,
        po_number,
        status: 'draft',
        order_date: new Date().toISOString().split('T')[0],
        notes: `Auto-created by workflow: ${rule.name}`,
      });
      break;
    }
  }
}

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(data[k] ?? `{{${k}}}`));
}
