import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <nav className="bg-cream border-b border-sepia/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link to="/" className="font-display text-2xl text-ink tracking-wide">
            Easy<span className="text-sepia">Memoir</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl text-ink mb-2">Privacy Policy</h1>
        <p className="text-warmgray mb-8">Last updated: January 29, 2026</p>

        <div className="prose prose-sepia max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">1. Introduction</h2>
            <p className="text-warmgray leading-relaxed">
              Easy Memoir ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, and safeguard your personal information when you use our
              autobiography writing service.
            </p>
            <p className="text-warmgray leading-relaxed mt-4">
              We understand that the stories you share are deeply personal. We treat your data with the
              utmost respect and security.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">2. Information We Collect</h2>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-warmgray space-y-1">
              <li><strong>Account Information:</strong> Name, email address, password</li>
              <li><strong>Profile Information:</strong> Birth year (optional)</li>
              <li><strong>Story Content:</strong> Your written stories, memories, and answers to prompts</li>
              <li><strong>Voice Recordings:</strong> Audio from voice interviews (processed in real-time, not stored)</li>
              <li><strong>Photos:</strong> Images you upload to accompany your stories</li>
              <li><strong>Payment Information:</strong> Processed securely by our payment partners</li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-warmgray space-y-1">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong>Cookies:</strong> See our Cookie Policy section below</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">3. How We Use Your Information</h2>
            <p className="text-warmgray leading-relaxed">We use your information to:</p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Process your stories with AI assistance</li>
              <li>Enable book printing and delivery</li>
              <li>Send service-related communications</li>
              <li>Improve and personalize your experience</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">4. AI Processing</h2>
            <p className="text-warmgray leading-relaxed">
              <strong>Important:</strong> Your stories are processed by AI solely to provide the Service to you.
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Your content is NOT used to train AI models</li>
              <li>AI processing happens in real-time and is not stored for training</li>
              <li>We use xAI's Grok API with strict data processing agreements</li>
              <li>Voice recordings are transcribed in real-time and not retained</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">5. Data Sharing</h2>
            <p className="text-warmgray leading-relaxed">We share your data only with:</p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li><strong>AI Service Providers:</strong> xAI (Grok) for story processing</li>
              <li><strong>Printing Partners:</strong> Lulu for book printing (only when you order)</li>
              <li><strong>Authentication:</strong> Google (if you use Google Sign-In)</li>
              <li><strong>Hosting:</strong> Railway/secure cloud infrastructure</li>
              <li><strong>Legal Requirements:</strong> When required by law</li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              We do NOT sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">6. Data Security</h2>
            <p className="text-warmgray leading-relaxed">We protect your data through:</p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encrypted database storage</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>Secure cloud infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">7. Data Retention</h2>
            <p className="text-warmgray leading-relaxed">
              We retain your data for as long as your account is active. When you delete your account:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Personal data is deleted within 30 days</li>
              <li>Backups are purged within 90 days</li>
              <li>You can request your data before deletion</li>
              <li>Some data may be retained for legal compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">8. Your Rights (GDPR)</h2>
            <p className="text-warmgray leading-relaxed">Under GDPR, you have the right to:</p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Limit how we use your data</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@easymemoir.co.uk
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">9. Cookie Policy</h2>
            <p className="text-warmgray leading-relaxed">We use the following types of cookies:</p>

            <h3 className="font-display text-lg text-ink mb-2 mt-4">Essential Cookies</h3>
            <p className="text-warmgray">
              Required for the website to function. These include authentication tokens and session management.
            </p>

            <h3 className="font-display text-lg text-ink mb-2 mt-4">Analytics Cookies</h3>
            <p className="text-warmgray">
              Help us understand how visitors use our site. You can opt out of these.
            </p>

            <h3 className="font-display text-lg text-ink mb-2 mt-4">Marketing Cookies</h3>
            <p className="text-warmgray">
              Used for relevant advertising. You can opt out of these.
            </p>

            <p className="text-warmgray mt-4">
              You can manage your cookie preferences at any time through our cookie settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">10. Children's Privacy</h2>
            <p className="text-warmgray leading-relaxed">
              Easy Memoir is not intended for children under 16. We do not knowingly collect data from
              children. If you believe a child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">11. International Transfers</h2>
            <p className="text-warmgray leading-relaxed">
              Your data may be processed in countries outside the UK/EEA. We ensure appropriate safeguards
              are in place, including Standard Contractual Clauses where required.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">12. Changes to This Policy</h2>
            <p className="text-warmgray leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes via email or through the Service. The date at the top indicates the last update.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">13. Contact Us</h2>
            <p className="text-warmgray leading-relaxed">
              For privacy-related questions or to exercise your rights:
            </p>
            <p className="text-warmgray mt-2">
              Email: privacy@easymemoir.co.uk<br />
              Data Protection Officer: dpo@easymemoir.co.uk<br />
              Easy Memoir Ltd<br />
              United Kingdom
            </p>
            <p className="text-warmgray mt-4">
              You also have the right to lodge a complaint with the Information Commissioner's Office (ICO)
              if you believe your rights have been violated.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-sepia/20 flex gap-6">
          <Link to="/" className="text-sepia hover:underline">← Back to Home</Link>
          <Link to="/terms" className="text-sepia hover:underline">Terms and Conditions</Link>
          <Link to="/cookies" className="text-sepia hover:underline">Cookie Policy</Link>
        </div>
      </main>
    </div>
  )
}
