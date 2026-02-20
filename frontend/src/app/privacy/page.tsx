import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Karssoft Connect",
  description: "Privacy Policy for Karssoft Connect",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 14, 2026";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              K
            </div>
            <span className="text-xl font-bold text-gray-900">Karssoft Connect</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="mt-3">
              Karssoft Connect (&quot;we&quot;, &quot;our&quot;, or &quot;the Platform&quot;) provides a
              multi-tenant WhatsApp Business messaging management service built on the WhatsApp Cloud
              API. This Privacy Policy describes how we collect, use, store, and protect your
              information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>
            <div className="mt-3 space-y-3">
              <div>
                <h3 className="font-medium text-gray-900">2.1 Account Information</h3>
                <p className="mt-1">
                  When you create an account, we collect your name, email address, and password
                  (stored in hashed form using bcrypt). If you are a tenant administrator, we also
                  collect your WhatsApp Business Account information through the Meta Embedded Signup
                  process.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">2.2 WhatsApp Business Data</h3>
                <p className="mt-1">
                  Through the Meta Embedded Signup flow, we receive and securely store your WhatsApp
                  Business Account ID, Phone Number ID, display phone number, and access tokens. Access
                  tokens are encrypted using AES-256-CBC encryption before storage.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">2.3 Messaging Data</h3>
                <p className="mt-1">
                  We process and store messages sent and received through the WhatsApp Cloud API on
                  your behalf. This includes text messages, template messages, message status updates
                  (sent, delivered, read), and associated metadata such as timestamps, phone numbers,
                  and contact names.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">2.4 Usage Data</h3>
                <p className="mt-1">
                  We collect server logs that may include IP addresses, browser type, access times,
                  and pages viewed. This data is used for security monitoring and service improvement.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>To provide and maintain the messaging management service</li>
              <li>To process and deliver WhatsApp messages on your behalf via the WhatsApp Cloud API</li>
              <li>To authenticate your identity and manage account access</li>
              <li>To display conversation history and message status in your dashboard</li>
              <li>To send real-time updates about message delivery and read receipts</li>
              <li>To sync and manage your WhatsApp message templates</li>
              <li>To monitor and improve the security and reliability of our platform</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Data Security</h2>
            <p className="mt-3">We implement industry-standard security measures to protect your data:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>Encryption at rest:</strong> WhatsApp access tokens and webhook secrets are
                encrypted using AES-256-CBC before database storage
              </li>
              <li>
                <strong>Webhook verification:</strong> All incoming webhook events are verified using
                HMAC-SHA256 signature validation
              </li>
              <li>
                <strong>Authentication:</strong> JWT-based authentication with secure password hashing
                (bcrypt)
              </li>
              <li>
                <strong>Access control:</strong> Role-based access control (RBAC) ensures users only
                access data they are authorized to view
              </li>
              <li>
                <strong>Rate limiting:</strong> API rate limiting protects against abuse
              </li>
              <li>
                <strong>Security headers:</strong> Helmet.js security headers on all responses
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Data Sharing</h2>
            <p className="mt-3">
              We do not sell your personal information. We share data only in the following cases:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong>WhatsApp / Meta:</strong> Messages and related data are transmitted through
                the WhatsApp Cloud API as required to provide the messaging service
              </li>
              <li>
                <strong>Service providers:</strong> We may use cloud infrastructure providers
                (e.g., AWS, MongoDB Atlas) that process data on our behalf under strict
                confidentiality obligations
              </li>
              <li>
                <strong>Legal requirements:</strong> We may disclose information if required by law
                or to protect rights, safety, or property
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Data Retention</h2>
            <p className="mt-3">
              We retain your data for as long as your account is active or as needed to provide
              services. Message data is retained in accordance with your subscription and applicable
              data retention policies. You may request deletion of your account and associated data
              at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Your Rights</h2>
            <p className="mt-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Request data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Third-Party Services</h2>
            <p className="mt-3">
              Our platform integrates with Meta&apos;s WhatsApp Cloud API and Facebook Login SDK. Your
              use of these services is also governed by{" "}
              <a
                href="https://www.whatsapp.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                WhatsApp&apos;s Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="https://www.facebook.com/privacy/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline"
              >
                Meta&apos;s Privacy Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the new Privacy Policy on this page and updating the
              &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Contact Us</h2>
            <p className="mt-3">
              If you have any questions about this Privacy Policy or our data practices, please
              contact us at:
            </p>
            <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm">
              <p className="font-medium text-gray-900">Karssoft Connect</p>
              <p className="mt-1 text-gray-600">
                Email: karssoft1@gmail.com
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-6 py-6 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-6">
            <Link href="/privacy" className="text-emerald-600 font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="mt-3">&copy; {new Date().getFullYear()} Karssoft Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
