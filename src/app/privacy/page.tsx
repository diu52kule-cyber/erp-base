export const metadata = { title: 'Privacy Policy — Gradia' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-neutral-500 mb-10">Effective date: 1 June 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">1. Information We Collect</h2>
            <p>We collect information you provide when you create an account, set up your organisation, or use our services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Account details: name, email address, password (hashed)</li>
              <li>Organisation data: business name, GSTIN, address, and the business data you enter (contacts, invoices, employees, etc.)</li>
              <li>Usage data: pages visited, actions taken, timestamps</li>
              <li>Device data: IP address, browser type, operating system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and improve the Gradia platform</li>
              <li>Send transactional emails (invoices, receipts, password resets)</li>
              <li>Detect and prevent fraud or unauthorised access</li>
              <li>Comply with legal obligations under Indian law (IT Act 2000, GST rules)</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your data to third parties or use it for advertising.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">3. Data Storage and Security</h2>
            <p>Your data is stored in Supabase (PostgreSQL) with Row-Level Security enforced so only members of your organisation can access your organisation&apos;s data.</p>
            <p className="mt-2">We encrypt sensitive credentials (OAuth tokens) using AES-256-GCM. All data in transit is encrypted via TLS 1.2+.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">4. Data Backups</h2>
            <p>If you enable Google Drive backup, your organisation&apos;s data is exported as a JSON file and stored in your own Google Drive account. We store the OAuth tokens encrypted on our servers solely to perform this service on your behalf.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">5. Third-Party Services</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Vercel</strong> — hosting and edge functions</li>
              <li><strong>Resend</strong> — transactional email delivery</li>
              <li><strong>Razorpay</strong> — payment processing (if enabled)</li>
              <li><strong>Google Drive</strong> — optional data backups (if enabled)</li>
              <li><strong>Anthropic Claude</strong> — AI assistant (if enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">6. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us. Organisation owners can delete their organisation and all associated data from the Settings page.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">7. Cookies</h2>
            <p>We use session cookies required for authentication (managed by Supabase). We do not use third-party tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of material changes by email or a notice on the dashboard. Continued use of the service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">9. Contact</h2>
            <p>For privacy-related questions, contact us at <a href="mailto:vishweshcollege@gmail.com" className="underline">vishweshcollege@gmail.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <a href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">← Back to home</a>
        </div>
      </div>
    </div>
  );
}
