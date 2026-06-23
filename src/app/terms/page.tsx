export const metadata = { title: 'Terms of Service — ERP Base' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-neutral-500 mb-10">Effective date: 1 June 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-neutral-700 dark:text-neutral-300">

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using ERP Base (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2. Description of Service</h2>
            <p>ERP Base is a cloud-based business management platform for Indian small and medium businesses. Features include invoicing, CRM, inventory, HR, accounting, and more. Features available to you depend on your subscription plan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must not share your account or allow unauthorised access.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must provide accurate information when registering.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">4. Acceptable Use</h2>
            <p>You must not use the Service to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Violate any applicable law or regulation, including Indian tax law</li>
              <li>Store or transmit malicious code</li>
              <li>Interfere with or disrupt the Service or its servers</li>
              <li>Attempt to gain unauthorised access to other accounts or systems</li>
              <li>Use the AI assistant for generating illegal or harmful content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">5. Subscription and Payment</h2>
            <p>After a 7-day free trial, continued access requires a paid subscription. Payments are processed via Razorpay. Subscriptions renew automatically unless cancelled. No refunds are provided for partial billing periods.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">6. Data Ownership</h2>
            <p>You retain ownership of all data you enter into the Service. You grant us a limited licence to store, process, and display your data solely to provide the Service. We do not claim any intellectual property rights over your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">7. Data Deletion</h2>
            <p>Organisation owners may delete their organisation and all associated data from the Settings page. Upon account deletion, your data will be permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">8. Disclaimer of Warranties</h2>
            <p>The Service is provided &quot;as is&quot; without warranty of any kind. We do not warrant that the Service will be error-free or uninterrupted. The tax calculations and compliance features are provided for convenience; you remain responsible for verifying accuracy with a qualified professional.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, our total liability to you for any claim arising from or related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">10. Termination</h2>
            <p>We may suspend or terminate your account for violation of these terms, non-payment, or conduct harmful to other users or the platform. You may cancel your account at any time from Settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">11. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Maharashtra, India.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">12. Changes to Terms</h2>
            <p>We may update these terms at any time. Material changes will be communicated by email or an in-app notice at least 7 days in advance. Continued use constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">13. Contact</h2>
            <p>For questions about these terms, contact us at <a href="mailto:vishweshcollege@gmail.com" className="underline">vishweshcollege@gmail.com</a>.</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <a href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">← Back to home</a>
        </div>
      </div>
    </div>
  );
}
