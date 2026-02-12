import { Link } from 'react-router-dom'

export default function CancellationPolicy() {
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
        <h1 className="font-display text-4xl text-ink mb-2">Cancellation Policy</h1>
        <p className="text-warmgray mb-8">Last updated: February 12, 2026</p>

        <div className="prose prose-sepia max-w-none space-y-8">
          {/* 1. Overview */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">1. Overview</h2>
            <p className="text-warmgray leading-relaxed">
              This Cancellation Policy explains how you can cancel your Easy Memoir subscription,
              what happens when you cancel, and your rights under UK consumer law. This policy
              applies to all paid services offered by Easy Memoir Ltd.
            </p>
          </section>

          {/* 2. Your Right to Cancel */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              2. Your Right to Cancel Under UK Law
            </h2>
            <p className="text-warmgray leading-relaxed">
              Under the Consumer Contracts (Information, Cancellation and Additional Charges)
              Regulations 2013, you have the following cancellation rights:
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              2.1 14-Day Cooling-Off Period
            </h3>
            <p className="text-warmgray leading-relaxed">
              You have a statutory right to cancel any distance contract (online purchase) within
              <strong> 14 days</strong> without giving a reason. The cooling-off period starts:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>For services and digital content:</strong> The day after the contract is
                entered into (i.e., the day after purchase).
              </li>
              <li>
                <strong>For physical goods (printed books):</strong> The day after you receive the
                goods.
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              2.2 Waiver for Immediate Digital Access
            </h3>
            <p className="text-warmgray leading-relaxed">
              When you purchase digital content or a subscription, we will ask you to explicitly
              consent to receiving immediate access. By giving this consent, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>You wish to begin using the service/receiving digital content immediately.</li>
              <li>
                You understand that by consenting to immediate access, you will lose your 14-day
                right to cancel once the digital content begins to be supplied or the service
                performance begins.
              </li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              If you <strong>do not</strong> consent to immediate access, you retain your full
              14-day cancellation right, but access to premium features will be delayed until the
              cooling-off period expires.
            </p>
            <p className="text-warmgray leading-relaxed mt-4">
              <strong>Note:</strong> Even where you waive your cooling-off rights, our voluntary
              30-day money-back guarantee (detailed in our{' '}
              <Link to="/refund-policy" className="text-sepia hover:underline">
                Refund Policy
              </Link>
              ) may still apply, subject to its eligibility conditions.
            </p>
          </section>

          {/* 3. How to Cancel */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              3. How to Cancel Your Subscription
            </h2>
            <p className="text-warmgray leading-relaxed">
              You can cancel your Easy Memoir subscription at any time using any of the following
              methods:
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">3.1 Through Your Account</h3>
            <ol className="list-decimal list-inside text-warmgray mt-2 space-y-2">
              <li>Log in to your Easy Memoir account.</li>
              <li>
                Go to <strong>Settings</strong>.
              </li>
              <li>
                Under the <strong>Subscription</strong> section, click{' '}
                <strong>"Cancel Subscription"</strong>.
              </li>
              <li>Confirm your cancellation.</li>
              <li>You will receive an email confirmation of your cancellation.</li>
            </ol>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">3.2 By Email</h3>
            <p className="text-warmgray leading-relaxed">
              Email{' '}
              <a href="mailto:refunds@easymemoir.co.uk" className="text-sepia hover:underline">
                refunds@easymemoir.co.uk
              </a>{' '}
              with the subject line "Cancel Subscription". Include your registered email address. We
              will process your cancellation within <strong>2 working days</strong> and send
              confirmation.
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              3.3 Using the Model Cancellation Form
            </h3>
            <p className="text-warmgray leading-relaxed">
              You may use the model cancellation form provided in our{' '}
              <Link to="/refund-policy" className="text-sepia hover:underline">
                Refund Policy
              </Link>
              .
            </p>
          </section>

          {/* 4. What Happens When You Cancel */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">4. What Happens When You Cancel</h2>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              4.1 Monthly Subscription (£9.99/month)
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                Your premium access continues until the{' '}
                <strong>end of your current billing period</strong>.
              </li>
              <li>No further payments will be taken after cancellation.</li>
              <li>After your premium access expires, your account reverts to the free tier.</li>
              <li>
                All stories, photos, and content you created <strong>remain accessible</strong>{' '}
                under the free tier.
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              4.2 Yearly Subscription (£99.99/year)
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                Your premium access continues until the{' '}
                <strong>end of your annual billing period</strong>.
              </li>
              <li>Your subscription will not auto-renew.</li>
              <li>
                Pro-rata refunds may be available if you cancel within the first 3 months — see our{' '}
                <Link to="/refund-policy" className="text-sepia hover:underline">
                  Refund Policy
                </Link>{' '}
                for details.
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              4.3 Bundle Purchases (£299.00)
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                Bundles are one-time purchases and do not auto-renew, so no cancellation of
                recurring payments is needed.
              </li>
              <li>
                If you wish to request a refund of a bundle, see our{' '}
                <Link to="/refund-policy" className="text-sepia hover:underline">
                  Refund Policy
                </Link>
                .
              </li>
              <li>
                If a printed book has not yet entered production, the book component can be
                cancelled separately.
              </li>
            </ul>
          </section>

          {/* 5. Your Content After Cancellation */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              5. Your Content After Cancellation
            </h2>
            <p className="text-warmgray leading-relaxed">
              <strong>We will never delete your stories as a result of cancellation.</strong> Your
              content belongs to you. After cancellation:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>All stories, memories, and photos remain in your account and are accessible.</li>
              <li>You can continue to read, edit, and view your memoir at any time.</li>
              <li>Free-tier features remain available (limited chapter access, basic editing).</li>
              <li>
                Premium features (unlimited AI interviews, audiobook generation, advanced exports)
                become unavailable.
              </li>
              <li>You can reactivate your subscription at any time to regain premium access.</li>
              <li>
                You can request a full data export at any time under your GDPR rights — see our{' '}
                <Link to="/privacy" className="text-sepia hover:underline">
                  Privacy Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 6. Cancellation by Easy Memoir */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              6. Cancellation or Suspension by Easy Memoir
            </h2>
            <p className="text-warmgray leading-relaxed">
              We may cancel or suspend your subscription if:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                You breach our{' '}
                <Link to="/terms" className="text-sepia hover:underline">
                  Terms and Conditions
                </Link>
                .
              </li>
              <li>Your payment method fails repeatedly and cannot be resolved.</li>
              <li>We have reasonable grounds to believe the account is being used fraudulently.</li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">If we cancel your subscription:</p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>We will notify you by email with the reason for cancellation.</li>
              <li>
                You will receive a <strong>pro-rata refund</strong> for any unused premium time,
                unless the cancellation is due to a breach of our Terms.
              </li>
              <li>
                Your content remains accessible and exportable for a period of{' '}
                <strong>30 days</strong> after cancellation, after which it may be deleted in
                accordance with our{' '}
                <Link to="/privacy" className="text-sepia hover:underline">
                  Privacy Policy
                </Link>
                .
              </li>
            </ul>
          </section>

          {/* 7. Auto-Renewal */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              7. Auto-Renewal &amp; Payment Reminders
            </h2>
            <p className="text-warmgray leading-relaxed">
              In accordance with UK best practice and the Consumer Rights (Payment Surcharges)
              Regulations 2012:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>Subscriptions auto-renew at the end of each billing period unless you cancel.</li>
              <li>
                We will send you an <strong>email reminder 7 days before</strong> your subscription
                renews, giving you the opportunity to cancel.
              </li>
              <li>
                The renewal reminder will include the amount to be charged, the renewal date, and
                clear instructions for cancelling.
              </li>
              <li>
                We will never increase your subscription price without giving you at least{' '}
                <strong>30 days' notice</strong> and the option to cancel before the new price takes
                effect.
              </li>
              <li>
                No hidden fees or surcharges will be applied. The price shown at checkout is the
                price you pay.
              </li>
            </ul>
          </section>

          {/* 8. Account Deletion */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              8. Account Deletion (Different from Cancellation)
            </h2>
            <p className="text-warmgray leading-relaxed">
              Cancelling your subscription is different from deleting your account:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Cancellation</strong> stops future payments and reverts you to the free
                tier. Your data is preserved.
              </li>
              <li>
                <strong>Account deletion</strong> permanently removes your account and all
                associated data. This action is irreversible.
              </li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              If you wish to delete your account entirely, you can do so from{' '}
              <strong>Settings → Delete Account</strong> or by emailing{' '}
              <a href="mailto:privacy@easymemoir.co.uk" className="text-sepia hover:underline">
                privacy@easymemoir.co.uk
              </a>
              . We will process your deletion request within <strong>30 days</strong> in accordance
              with the UK GDPR.
            </p>
            <p className="text-warmgray leading-relaxed mt-4">
              <strong>
                We strongly recommend exporting your memoir before deleting your account.
              </strong>{' '}
              Once deleted, your stories cannot be recovered.
            </p>
          </section>

          {/* 9. Changes */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">9. Changes to This Policy</h2>
            <p className="text-warmgray leading-relaxed">
              We may update this Cancellation Policy from time to time. Changes will be posted on
              this page with an updated "Last updated" date. Significant changes that affect your
              rights will be communicated by email. Changes do not apply retrospectively.
            </p>
          </section>

          {/* 10. Contact */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">10. Contact Us</h2>
            <p className="text-warmgray leading-relaxed">
              For cancellation requests or questions about this policy:
            </p>
            <p className="text-warmgray mt-2">
              Email:{' '}
              <a href="mailto:refunds@easymemoir.co.uk" className="text-sepia hover:underline">
                refunds@easymemoir.co.uk
              </a>
              <br />
              General enquiries:{' '}
              <a href="mailto:legal@easymemoir.co.uk" className="text-sepia hover:underline">
                legal@easymemoir.co.uk
              </a>
              <br />
              Easy Memoir Ltd
              <br />
              United Kingdom
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-sepia/20 flex flex-wrap gap-6">
          <Link to="/" className="text-sepia hover:underline">
            ← Back to Home
          </Link>
          <Link to="/terms" className="text-sepia hover:underline">
            Terms and Conditions
          </Link>
          <Link to="/refund-policy" className="text-sepia hover:underline">
            Refund Policy
          </Link>
          <Link to="/privacy" className="text-sepia hover:underline">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  )
}
