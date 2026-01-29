import { Link } from 'react-router-dom'

export default function Terms() {
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
        <h1 className="font-display text-4xl text-ink mb-2">Terms and Conditions</h1>
        <p className="text-warmgray mb-8">Last updated: January 29, 2026</p>

        <div className="prose prose-sepia max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">1. Agreement to Terms</h2>
            <p className="text-warmgray leading-relaxed">
              By accessing or using Easy Memoir ("the Service"), you agree to be bound by these Terms and Conditions.
              If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">2. Description of Service</h2>
            <p className="text-warmgray leading-relaxed">
              Easy Memoir is an AI-powered autobiography and memoir writing platform that helps users capture,
              write, and preserve their life stories. The Service includes:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>AI-assisted voice and text interviews</li>
              <li>Automated story writing and editing</li>
              <li>Photo upload and integration</li>
              <li>PDF export functionality</li>
              <li>Professional book printing through third-party services</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">3. User Accounts</h2>
            <p className="text-warmgray leading-relaxed">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your password</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">4. User Content</h2>
            <p className="text-warmgray leading-relaxed">
              You retain full ownership of all content you create, upload, or share through the Service,
              including your stories, photos, and personal information ("User Content").
            </p>
            <p className="text-warmgray leading-relaxed mt-4">
              By using the Service, you grant us a limited license to process your User Content solely
              for the purpose of providing the Service to you. We will not use your content for any
              other purpose, including training AI models.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">5. Acceptable Use</h2>
            <p className="text-warmgray leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Use the Service for any illegal purpose</li>
              <li>Upload content that infringes on others' intellectual property rights</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload malicious code or viruses</li>
              <li>Impersonate any person or entity</li>
              <li>Use the Service to generate harmful, abusive, or illegal content</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">6. AI-Generated Content</h2>
            <p className="text-warmgray leading-relaxed">
              The Service uses artificial intelligence to help write and polish your stories. You understand that:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>AI-generated content is based on your input and may require review</li>
              <li>You are responsible for reviewing and approving all final content</li>
              <li>AI outputs may occasionally contain errors or inaccuracies</li>
              <li>You own the final written content created through the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">7. Book Printing Services</h2>
            <p className="text-warmgray leading-relaxed">
              Book printing is provided through third-party print-on-demand services. By ordering printed books:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>You agree to the third party's terms of service</li>
              <li>Payment is processed securely through the printing partner</li>
              <li>Delivery times and costs vary by location</li>
              <li>Returns and refunds are subject to the printing partner's policies</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">8. Pricing and Payment</h2>
            <p className="text-warmgray leading-relaxed">
              Easy Memoir offers free access to core features. Paid services (such as book printing)
              are clearly marked with their prices before purchase. We reserve the right to change
              pricing with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">9. Intellectual Property</h2>
            <p className="text-warmgray leading-relaxed">
              The Service and its original content (excluding User Content), features, and functionality
              are owned by Easy Memoir and are protected by international copyright, trademark, and
              other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-warmgray leading-relaxed">
              The Service is provided "as is" without warranties of any kind, either express or implied.
              We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">11. Limitation of Liability</h2>
            <p className="text-warmgray leading-relaxed">
              To the maximum extent permitted by law, Easy Memoir shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">12. Termination</h2>
            <p className="text-warmgray leading-relaxed">
              We may terminate or suspend your account at any time for violations of these Terms.
              You may delete your account at any time. Upon termination, your right to use the
              Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">13. Data Retention</h2>
            <p className="text-warmgray leading-relaxed">
              Upon account deletion, we will delete your personal data within 30 days, except where
              we are required to retain it for legal purposes. You may request a copy of your data
              before deletion.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">14. Governing Law</h2>
            <p className="text-warmgray leading-relaxed">
              These Terms are governed by the laws of England and Wales. Any disputes shall be
              resolved in the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">15. Changes to Terms</h2>
            <p className="text-warmgray leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of
              significant changes via email or through the Service. Continued use after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">16. Contact Us</h2>
            <p className="text-warmgray leading-relaxed">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-warmgray mt-2">
              Email: legal@easymemoir.co.uk<br />
              Easy Memoir Ltd<br />
              United Kingdom
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-sepia/20">
          <Link to="/" className="text-sepia hover:underline">← Back to Home</Link>
        </div>
      </main>
    </div>
  )
}
