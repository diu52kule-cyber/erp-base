import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import ThemeToggle from '@/components/ThemeToggle';
import PaywallActions from './PaywallActions';

export const dynamic = 'force-dynamic';

export default async function LockedPage() {
  const ctx = await getOrgContext();
  if (!ctx) redirect('/login');
  if (!ctx.org) redirect('/onboarding');
  if (ctx.access !== 'locked') redirect('/dashboard');

  const supabase = createClient();
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('whatsapp_number, whatsapp_message, upi_id, contact_email')
    .eq('id', 1)
    .maybeSingle();

  const waNumber = (settings?.whatsapp_number ?? '').replace(/\D/g, '');
  const waMessage = `${settings?.whatsapp_message ?? 'Hi, I would like to continue my ERP subscription. My business is: '}${ctx.org.name}`;
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}` : null;
  const qrSrc = waLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(waLink)}`
    : null;

  const expiredReason =
    ctx.plan.status === 'cancelled' ? 'Your subscription was cancelled.'
    : ctx.plan.status === 'suspended' ? 'Your subscription is currently suspended.'
    : 'Your 7-day free trial has ended.';

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <span className="text-lg font-semibold">ERP Platform</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action="/api/auth/signout" method="POST">
              <button className="text-sm text-neutral-400 hover:text-neutral-600">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">🔒</div>
            <h1 className="text-3xl font-bold text-neutral-900">{expiredReason}</h1>
            <p className="mt-2 text-neutral-500 max-w-lg mx-auto">
              Your data for <strong>{ctx.org.name}</strong> is safe. Reactivate your subscription to pick up right where you left off.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Pay online */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col">
              <h2 className="font-semibold text-lg">Pay online</h2>
              <p className="mt-1 text-sm text-neutral-500">Instant reactivation after payment.</p>
              <div className="my-6 text-center">
                {ctx.plan.amount > 0 ? (
                  <>
                    <div className="text-4xl font-bold text-neutral-900">
                      ₹{ctx.plan.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-neutral-400">
                      per {ctx.plan.billing_period === 'yearly' ? 'year' : 'month'}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">
                    Your price hasn’t been set yet. Please contact us on WhatsApp and we’ll get you a quote.
                  </p>
                )}
              </div>
              <div className="mt-auto">
                <PaywallActions amount={ctx.plan.amount} period={ctx.plan.billing_period} />
              </div>
            </div>

            {/* Contact / WhatsApp + QR */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col">
              <h2 className="font-semibold text-lg">Talk to us</h2>
              <p className="mt-1 text-sm text-neutral-500">Questions, custom pricing, or pay another way.</p>

              {waLink ? (
                <div className="mt-4 flex flex-col items-center gap-4">
                  {qrSrc && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={qrSrc} alt="Scan to chat on WhatsApp" width={180} height={180}
                      className="rounded-xl border border-neutral-100" />
                  )}
                  <p className="text-xs text-neutral-400">Scan to chat on WhatsApp</p>
                  <a href={waLink} target="_blank" rel="noopener noreferrer"
                    className="w-full rounded-xl bg-[#25D366] py-3 text-center text-base font-semibold text-white hover:brightness-95 transition-all">
                    💬 Contact on WhatsApp
                  </a>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-neutral-50 border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400">
                  Contact details haven’t been configured yet.
                  {settings?.contact_email && (
                    <div className="mt-2 text-neutral-600">Email: <a className="underline" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></div>
                  )}
                </div>
              )}

              {settings?.upi_id && (
                <div className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-center text-sm text-neutral-600">
                  Or pay via UPI: <span className="font-mono font-medium">{settings.upi_id}</span>
                </div>
              )}
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-neutral-400">
            Signed in as {ctx.user.email}. Need to use a different account?{' '}
            <form action="/api/auth/signout" method="POST" className="inline">
              <button className="underline hover:text-neutral-600">Sign out</button>
            </form>
          </p>
        </div>
      </main>
    </div>
  );
}
