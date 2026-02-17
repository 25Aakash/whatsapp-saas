import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - WhatsApp SaaS Platform",
  description: "Terms of Service for the WhatsApp SaaS Platform",
};

export default function TermsOfServicePage() {
  const lastUpdated = "February 14, 2026";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              W
            </div>
            <span className="text-xl font-bold text-gray-900">WA SaaS</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing or using the WA SaaS Platform (&quot;the Service&quot;), you agree to be
              bound by these Terms of Service. If you are using the Service on behalf of an
              organization, you represent that you have the authority to bind that organization to
              these terms. If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Description of Service</h2>
            <p className="mt-3">
              WA SaaS Platform is a multi-tenant messaging management platform that enables
              businesses to send, receive, and manage WhatsApp conversations using the official
              WhatsApp Cloud API provided by Meta Platforms, Inc. The Service includes:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>WhatsApp Business Account onboarding via Meta Embedded Signup</li>
              <li>Inbound and outbound message management</li>
              <li>Conversation tracking and organization</li>
              <li>Message template management</li>
              <li>Real-time message status updates</li>
              <li>Multi-user access with role-based permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Account Registration</h2>
            <div className="mt-3 space-y-3">
              <p>
                To use the Service, you must create an account with a valid email address and
                secure password. You are responsible for:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>Maintaining the confidentiality of your login credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Providing accurate and up-to-date account information</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. WhatsApp Cloud API Usage</h2>
            <div className="mt-3 space-y-3">
              <p>
                By using the Service, you acknowledge and agree to comply with:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <a
                    href="https://www.whatsapp.com/legal/business-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    WhatsApp Business Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.whatsapp.com/legal/commerce-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    WhatsApp Commerce Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://developers.facebook.com/terms/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    Meta Platform Terms
                  </a>
                </li>
              </ul>
              <p>
                You are solely responsible for the content of messages you send through the
                platform. You must not use the Service for spam, harassment, or any illegal
                activity.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Acceptable Use</h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Send unsolicited or bulk messages (spam)</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its infrastructure</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Share your account credentials with unauthorized parties</li>
              <li>Violate any applicable WhatsApp or Meta policies</li>
              <li>Send messages that contain malware, phishing links, or harmful content</li>
              <li>Exceed rate limits or attempt to circumvent usage restrictions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data and Privacy</h2>
            <p className="mt-3">
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-emerald-600 hover:underline">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your data. By using the Service,
              you consent to the data practices described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Service Availability</h2>
            <p className="mt-3">
              We strive to provide a reliable service, but we do not guarantee 100% uptime. The
              Service may be temporarily unavailable due to maintenance, updates, or factors beyond
              our control. We are not liable for any losses resulting from service interruptions.
              The availability of WhatsApp messaging features depends on Meta&apos;s WhatsApp Cloud
              API and is subject to their operational status.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Intellectual Property</h2>
            <p className="mt-3">
              The Service, including its design, code, features, and documentation, is owned by us
              and protected by intellectual property laws. You retain ownership of any content and
              data you submit through the Service. WhatsApp and Meta are trademarks of Meta
              Platforms, Inc. and are used in accordance with their brand guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Limitation of Liability</h2>
            <p className="mt-3">
              To the maximum extent permitted by law, the Service is provided &quot;as is&quot;
              without warranties of any kind. We shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including but not limited to loss of
              profits, data, or business opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Termination</h2>
            <p className="mt-3">
              We reserve the right to suspend or terminate your account at any time if you violate
              these Terms, WhatsApp Business Policy, or any applicable laws. You may also terminate
              your account at any time by contacting us. Upon termination, your right to use the
              Service ceases immediately, and we may delete your data in accordance with our
              retention policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">11. Changes to Terms</h2>
            <p className="mt-3">
              We may update these Terms from time to time. We will notify you of material changes
              by posting the updated Terms on this page. Your continued use of the Service after
              changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">12. Contact Us</h2>
            <p className="mt-3">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm">
              <p className="font-medium text-gray-900">WA SaaS Platform</p>
              <p className="mt-1 text-gray-600">Email: support@whatsapp-saas.com</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-6">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-emerald-600 font-medium">
              Terms of Service
            </Link>
          </div>
          <p className="mt-3">&copy; {new Date().getFullYear()} WA SaaS Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
