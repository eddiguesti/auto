import { Link } from 'react-router-dom'
import { resetCookieConsent } from '../../utils/cookieConsent'

export default function Cookies() {
  const openCookieSettings = resetCookieConsent

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
        <p className="text-warmgray mb-8">Technical storage inventory updated: 9 October 2026</p>

        <div className="prose prose-sepia max-w-none space-y-8">
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">What Are Cookies?</h2>
            <p className="text-warmgray leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help
              websites remember your preferences and improve your experience. Some cookies are
              essential for the website to function, while others help us understand how you use our
              service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">How We Use Cookies</h2>
            <p className="text-warmgray leading-relaxed">
              Easy Memoir uses cookies and browser storage for sign-in, preferences and optional
              analytics. Cookies, local storage and session storage have different lifetimes:
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Essential browser storage</h2>
            <p className="text-warmgray leading-relaxed mb-4">
              This storage supports sign-in and remembers your choices. Local storage has no
              automatic expiry in the app; you can clear it in your browser.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sepia/20">
                    <th scope="col" className="text-left py-2 pr-4 font-medium text-ink">
                      Name
                    </th>
                    <th scope="col" className="text-left py-2 pr-4 font-medium text-ink">
                      Storage
                    </th>
                    <th scope="col" className="text-left py-2 pr-4 font-medium text-ink">
                      Purpose and lifetime
                    </th>
                  </tr>
                </thead>
                <tbody className="text-warmgray">
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">token</td>
                    <td className="py-2 pr-4">Session storage</td>
                    <td className="py-2">
                      Sign-in credential for the browser tab's session, subject to server token
                      expiry. Removed on sign-out; older local-storage credentials are migrated and
                      cleared.
                    </td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">cookie-consent</td>
                    <td className="py-2 pr-4">Local storage</td>
                    <td className="py-2">
                      Your optional analytics choice, until changed or cleared. If storage is
                      blocked, your choice is remembered only in the current tab.
                    </td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">cookie-consent-date</td>
                    <td className="py-2 pr-4">Local storage</td>
                    <td className="py-2">Time your preference was saved; no automatic expiry.</td>
                  </tr>
                  <tr className="border-b border-sepia/10">
                    <td className="py-2 pr-4">speakingPace, voiceGender</td>
                    <td className="py-2 pr-4">Local storage</td>
                    <td className="py-2">Your interview voice preferences; no automatic expiry.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Optional analytics</h2>
            <p className="text-warmgray leading-relaxed mb-4">
              Analytics starts only after you accept it. When configured, PostHog records usage
              events and stores a browser identifier using cookies and local storage. The SDK
              storage names include a project-specific prefix such as ph_[project]_posthog; expiry
              depends on the SDK configuration, and local storage has no automatic browser expiry.
            </p>
            <p className="text-warmgray leading-relaxed mb-4">
              If PostHog is unavailable or not configured, accepted usage events may be sent to Easy
              Memoir's own analytics endpoint. These events can include the page path, referring
              page, time and event properties. We do not describe this data as fully anonymous.
            </p>
            <p className="text-warmgray leading-relaxed">
              Choosing Essential only stops new analytics events and clears the SDK's stored
              identifiers and queued events. Already transmitted events cannot be recalled by your
              browser. Session recording is disabled.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Advertising trackers</h2>
            <p className="text-warmgray leading-relaxed">
              The current application does not configure Google Analytics or Facebook advertising
              pixels. These providers are not part of the analytics choice offered here.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Other external services</h2>
            <p className="text-warmgray leading-relaxed">
              Google Sign-In opens Google's authentication service when you choose to use it. That
              service manages its own browser storage. Fonts are served with this website rather
              than requested from Google Fonts.
            </p>
            <p className="text-warmgray leading-relaxed mt-3">
              When error reporting is configured, Sentry receives application error reports.
              Performance sampling and session replay are disabled in the current app configuration.
            </p>
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
              className="min-h-11 px-6 py-2.5 bg-ink text-white rounded-full text-sm font-medium hover:bg-sepia transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Manage Cookie Settings
            </button>

            <h3 className="font-display text-lg text-ink mb-2 mt-6">Browser Settings</h3>
            <p className="text-warmgray">
              Most browsers allow you to control cookies through their settings. Common options
              include:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Block all cookies</li>
              <li>Block third-party cookies only</li>
              <li>Clear cookies when you close the browser</li>
              <li>Accept all cookies</li>
            </ul>

            <h3 className="font-display text-lg text-ink mb-2 mt-4">
              Browser-Specific Instructions
            </h3>
            <ul className="list-disc list-inside text-warmgray space-y-1">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  className="text-sepia underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                  className="text-sepia underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac"
                  className="text-sepia underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  className="text-sepia underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Microsoft Edge
                </a>
              </li>
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
              Rejecting optional analytics does not prevent you from using Easy Memoir.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Updates to This Policy</h2>
            <p className="text-warmgray leading-relaxed">
              We may update this Cookie Policy from time to time. Changes will be posted on this
              page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-ink mb-4">Contact Us</h2>
            <p className="text-warmgray leading-relaxed">
              If you have questions about our use of cookies, please contact us at:
            </p>
            <p className="text-warmgray mt-2">Email: privacy@easymemoir.co.uk</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-sepia/20 flex gap-6">
          <Link to="/" className="text-sepia hover:underline">
            ← Back to Home
          </Link>
          <Link to="/privacy" className="text-sepia hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-sepia hover:underline">
            Terms and Conditions
          </Link>
        </div>
      </main>
    </div>
  )
}
