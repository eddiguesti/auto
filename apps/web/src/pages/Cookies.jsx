import { Link } from 'react-router-dom'

export default function Cookies() {
  const openCookieSettings = () => {
    // Clear existing consent to show banner again
    localStorage.removeItem('cookie-consent')
    window.location.reload()
  }

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
        <h1 className="font-display text-4xl text-ink mb-2">Cookie Policy</h1>
        <p className="text-warmgray mb-8">Last updated: January 29, 2026</p>

        <div className="prose prose-sepia max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">What Are Cookies?</h2>
            <p className="text-warmgray leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember your preferences and improve your experience. Some cookies are essential
              for the website to function, while others help us understand how you use our service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">How We Use Cookies</h2>
            <p className="text-warmgray leading-relaxed">
              Easy Memoir uses cookies to provide a secure, personalized experience. Below is a detailed
              breakdown of the cookies we use:
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Essential Cookies</h2>
            <p className="text-warmgray leading-relaxed mb-4">
              These cookies are necessary for the website to function and cannot be disabled.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sepia/20">
                    <th className="text-left py-2 pr-4 font-medium text-ink">Cookie Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-ink">Purpose</th>
                    <th className="text-left py-2 font-medium text-ink">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-warmgray">
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">token</td>
                    <td className="py-2 pr-4">Authentication - keeps you logged in</td>
                    <td className="py-2">7 days</td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">cookie-consent</td>
                    <td className="py-2 pr-4">Remembers your cookie preferences</td>
                    <td className="py-2">1 year</td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">cookie-consent-date</td>
                    <td className="py-2 pr-4">Records when consent was given</td>
                    <td className="py-2">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Analytics Cookies</h2>
            <p className="text-warmgray leading-relaxed mb-4">
              These cookies help us understand how visitors interact with our website. All data is
              anonymized and used only to improve our service.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sepia/20">
                    <th className="text-left py-2 pr-4 font-medium text-ink">Cookie Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-ink">Purpose</th>
                    <th className="text-left py-2 font-medium text-ink">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-warmgray">
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">_ga</td>
                    <td className="py-2 pr-4">Google Analytics - distinguishes users</td>
                    <td className="py-2">2 years</td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">_gid</td>
                    <td className="py-2 pr-4">Google Analytics - distinguishes users</td>
                    <td className="py-2">24 hours</td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">_gat</td>
                    <td className="py-2 pr-4">Google Analytics - throttles request rate</td>
                    <td className="py-2">1 minute</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Marketing Cookies</h2>
            <p className="text-warmgray leading-relaxed mb-4">
              These cookies may be set by our advertising partners to build a profile of your interests
              and show relevant ads on other sites.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sepia/20">
                    <th className="text-left py-2 pr-4 font-medium text-ink">Cookie Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-ink">Purpose</th>
                    <th className="text-left py-2 font-medium text-ink">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-warmgray">
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">_fbp</td>
                    <td className="py-2 pr-4">Facebook - tracks visits across websites</td>
                    <td className="py-2">3 months</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Third-Party Cookies</h2>
            <p className="text-warmgray leading-relaxed">
              Some features use third-party services that may set their own cookies:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li><strong>Google Sign-In:</strong> Authentication cookies if you use Google to log in</li>
              <li><strong>Google Fonts:</strong> May set cookies when loading fonts</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Managing Cookies</h2>
            <p className="text-warmgray leading-relaxed">
              You can manage your cookie preferences in several ways:
            </p>

            <h3 className="font-display text-lg text-ink mb-2 mt-4">Our Cookie Settings</h3>
            <p className="text-warmgray mb-4">
              Click the button below to update your cookie preferences:
            </p>
            <button
              onClick={openCookieSettings}
              className="px-6 py-2.5 bg-ink text-white rounded-full text-sm font-medium hover:bg-sepia transition"
            >
              Manage Cookie Settings
            </button>

            <h3 className="font-display text-lg text-ink mb-2 mt-6">Browser Settings</h3>
            <p className="text-warmgray">
              Most browsers allow you to control cookies through their settings. Common options include:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Block all cookies</li>
              <li>Block third-party cookies only</li>
              <li>Clear cookies when you close the browser</li>
              <li>Accept all cookies</li>
            </ul>

            <h3 className="font-display text-lg text-ink mb-2 mt-4">Browser-Specific Instructions</h3>
            <ul className="list-disc list-inside text-warmgray space-y-1">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-sepia underline" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-sepia underline" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" className="text-sepia underline" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-sepia underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Impact of Disabling Cookies</h2>
            <p className="text-warmgray leading-relaxed">
              If you disable essential cookies, you may not be able to:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Log in to your account</li>
              <li>Save your stories</li>
              <li>Use certain features of the service</li>
            </ul>
            <p className="text-warmgray mt-4">
              Disabling analytics and marketing cookies will not affect your ability to use Easy Memoir.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Updates to This Policy</h2>
            <p className="text-warmgray leading-relaxed">
              We may update this Cookie Policy from time to time. Changes will be posted on this page
              with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Contact Us</h2>
            <p className="text-warmgray leading-relaxed">
              If you have questions about our use of cookies, please contact us at:
            </p>
            <p className="text-warmgray mt-2">
              Email: privacy@easymemoir.co.uk
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-sepia/20 flex gap-6">
          <Link to="/" className="text-sepia hover:underline">← Back to Home</Link>
          <Link to="/privacy" className="text-sepia hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-sepia hover:underline">Terms and Conditions</Link>
        </div>
      </main>
    </div>
  )
}
