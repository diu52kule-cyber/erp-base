import { createAdminClient } from './supabase/admin';

type SMSSettings = {
  provider: 'msg91' | 'twilio';
  msg91_authkey?: string;
  msg91_sender?: string;
  twilio_sid?: string;
  twilio_token?: string;
  twilio_from?: string;
  is_active: boolean;
};

export async function getOrgSMSSettings(orgId: string): Promise<SMSSettings | null> {
  const admin = createAdminClient();
  try {
    const { data } = await admin
      .from('org_sms_settings')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();
    return (data as SMSSettings) ?? null;
  } catch {
    return null;
  }
}

export async function sendSMS(
  orgId: string,
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const settings = await getOrgSMSSettings(orgId);
  if (!settings?.is_active) return { ok: false, error: 'SMS not configured' };

  // Strip non-digits and ensure Indian format
  const mobile = to.replace(/\D/g, '');
  const msisdn = mobile.startsWith('91') ? mobile : `91${mobile}`;

  if (settings.provider === 'msg91' && settings.msg91_authkey) {
    return sendViaMSG91(settings.msg91_authkey, settings.msg91_sender ?? 'ERPHUB', msisdn, message);
  }
  if (settings.provider === 'twilio' && settings.twilio_sid && settings.twilio_token && settings.twilio_from) {
    return sendViaTwilio(settings.twilio_sid, settings.twilio_token, settings.twilio_from, `+${msisdn}`, message);
  }
  return { ok: false, error: 'SMS provider not configured' };
}

async function sendViaMSG91(authkey: string, sender: string, mobile: string, message: string) {
  try {
    const params = new URLSearchParams({ authkey, mobiles: mobile, message, sender, route: '4', country: '91' });
    const res = await fetch(`https://api.msg91.com/api/sendhttp.php?${params}`);
    const text = await res.text();
    if (text.startsWith('success')) return { ok: true };
    return { ok: false, error: text };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendViaTwilio(sid: string, token: string, from: string, to: string, body: string) {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    });
    const data = await res.json();
    if (data.sid) return { ok: true };
    return { ok: false, error: data.message ?? 'Twilio error' };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
