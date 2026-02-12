import { Link } from 'react-router-dom'

export default function RefundPolicy() {
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
        <h1 className="font-display text-4xl text-ink mb-2">
          Refund Policy &amp; Money-Back Guarantee
        </h1>
        <p className="text-warmgray mb-8">Last updated: February 12, 2026</p>

        {/* Guarantee Summary Banner */}
        <div className="bg-sepia/5 border border-sepia/20 rounded-xl p-6 mb-10">
          <h2 className="font-display text-2xl text-ink mb-3">Our 30-Day Money-Back Guarantee</h2>
          <p className="text-warmgray leading-relaxed">
            We are confident that Easy Memoir will help you preserve your life stories beautifully.
            If you are not completely satisfied with your purchase, we offer a
            <strong> 30-day money-back guarantee</strong> on eligible products, subject to the
            conditions below. This guarantee is in addition to — and does not affect — your
            statutory rights under UK consumer law.
          </p>
        </div>

        <div className="prose prose-sepia max-w-none space-y-8">
          {/* 1. Your Statutory Rights */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              1. Your Statutory Rights Under UK Law
            </h2>
            <p className="text-warmgray leading-relaxed">
              As a consumer in the United Kingdom, you have statutory rights under the
              <strong> Consumer Rights Act 2015</strong> and the
              <strong>
                {' '}
                Consumer Contracts (Information, Cancellation and Additional Charges) Regulations
                2013
              </strong>
              . Nothing in this policy affects, limits, or overrides your statutory rights. In
              particular:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Digital content</strong> must be of satisfactory quality, fit for a
                particular purpose, and as described.
              </li>
              <li>
                <strong>Services</strong> must be performed with reasonable care and skill.
              </li>
              <li>
                <strong>Goods</strong> (printed books) must be of satisfactory quality, fit for
                purpose, and as described.
              </li>
              <li>
                If digital content or services are faulty or not as described, you are entitled to a
                repair, replacement, or refund regardless of this policy.
              </li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              For further information about your statutory rights, visit{' '}
              <a
                href="https://www.citizensadvice.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sepia hover:underline"
              >
                Citizens Advice
              </a>{' '}
              or contact your local Trading Standards office.
            </p>
          </section>

          {/* 2. Cooling-Off Period */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              2. 14-Day Cooling-Off Period (Distance Selling)
            </h2>
            <p className="text-warmgray leading-relaxed">
              Under the Consumer Contracts Regulations 2013, when you purchase online (a "distance
              contract"), you have a statutory right to cancel within <strong>14 days</strong> of
              purchase without giving any reason. This is your "cooling-off period."
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              2.1 Digital Content &amp; Subscriptions
            </h3>
            <p className="text-warmgray leading-relaxed">
              For digital content (eBook exports, audiobook exports, style packs, and subscription
              services), please note:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                If you request <strong>immediate access</strong> to digital content during the
                cooling-off period and acknowledge that you will lose your right to cancel, the
                14-day cancellation right will not apply once delivery of the digital content has
                begun.
              </li>
              <li>
                We will always ask for your explicit consent before providing immediate access to
                digital content.
              </li>
              <li>
                If you have not given consent for immediate access, you may cancel within 14 days
                for a full refund.
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">2.2 Printed Books</h3>
            <p className="text-warmgray leading-relaxed">
              For printed books (physical goods), the 14-day cooling-off period begins the day after
              you receive the book. You may cancel and return the book within this period for a full
              refund, provided the book is in its original, unused condition.
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              2.3 How to Exercise Your Cooling-Off Rights
            </h3>
            <p className="text-warmgray leading-relaxed">
              To cancel within the cooling-off period, contact us at{' '}
              <a href="mailto:refunds@easymemoir.co.uk" className="text-sepia hover:underline">
                refunds@easymemoir.co.uk
              </a>{' '}
              with your order details. You may also use the model cancellation form at the end of
              this policy. We will process your refund within <strong>14 days</strong> of receiving
              your cancellation notice.
            </p>
          </section>

          {/* 3. 30-Day Money-Back Guarantee */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">3. 30-Day Money-Back Guarantee</h2>
            <p className="text-warmgray leading-relaxed">
              In addition to your statutory rights, Easy Memoir offers a voluntary
              <strong> 30-day money-back guarantee</strong> on the following products:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-1">
              <li>Premium Monthly Subscription (£9.99/month)</li>
              <li>Premium Yearly Subscription (£99.99/year)</li>
              <li>Premium Bundle — Full Memoir + Printed Book + Audiobook (£299.00)</li>
              <li>Welcome Bundle — Full Memoir + Printed Book + Audiobook (£299.00)</li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              If you are not satisfied with the Service for any reason, you may request a full
              refund within <strong>30 days from the date of purchase</strong>, provided the
              eligibility conditions in Section 4 are met.
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              3.1 What the Guarantee Covers
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Subscription plans:</strong> Full refund of the subscription fee paid.
              </li>
              <li>
                <strong>Bundle purchases:</strong> Full refund of the purchase price, provided any
                printed book has not yet been dispatched. If the book has been dispatched, the
                refund will be the purchase price less the printing and delivery costs.
              </li>
              <li>The guarantee period begins on the date of successful payment.</li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">3.2 How to Claim</h3>
            <p className="text-warmgray leading-relaxed">
              To request a refund under the guarantee:
            </p>
            <ol className="list-decimal list-inside text-warmgray mt-2 space-y-2">
              <li>
                Email{' '}
                <a href="mailto:refunds@easymemoir.co.uk" className="text-sepia hover:underline">
                  refunds@easymemoir.co.uk
                </a>{' '}
                within 30 days of your purchase.
              </li>
              <li>Include your registered email address and order/payment reference.</li>
              <li>
                Briefly tell us why you are requesting a refund (this helps us improve, but is not a
                condition of the refund).
              </li>
              <li>
                We will review your request and confirm eligibility within{' '}
                <strong>5 working days</strong>.
              </li>
              <li>
                Approved refunds will be returned to your original payment method within{' '}
                <strong>14 days</strong> of approval.
              </li>
            </ol>
          </section>

          {/* 4. Usage Threshold / Eligibility */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              4. Guarantee Eligibility &amp; Usage Threshold
            </h2>
            <p className="text-warmgray leading-relaxed">
              To ensure the guarantee is used fairly, the following conditions apply. The money-back
              guarantee is <strong>void</strong> if:
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">4.1 The 25% Usage Threshold</h3>
            <p className="text-warmgray leading-relaxed">
              The guarantee is no longer available if you have used{' '}
              <strong>more than 25% of the Service's core features</strong>. Usage is measured
              objectively by the following criteria:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Chapters completed:</strong> You have written content in more than 3 of the
                12 available chapters (i.e., more than 25%).
              </li>
              <li>
                <strong>AI voice sessions:</strong> You have conducted more than 3 AI voice
                interview sessions.
              </li>
              <li>
                <strong>Exports generated:</strong> You have generated or downloaded any export
                (PDF, EPUB, audiobook).
              </li>
              <li>
                <strong>Photos uploaded:</strong> You have uploaded more than 10 photos to the
                platform.
              </li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              Usage is determined at the time we receive your refund request. If{' '}
              <strong>any one</strong> of the above thresholds has been exceeded, the guarantee is
              considered void. You can check your current usage in your account settings at any
              time.
            </p>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              4.2 Other Conditions That Void the Guarantee
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                The refund request is made <strong>after 30 days</strong> from the date of purchase.
              </li>
              <li>
                A printed book has already been <strong>delivered to you</strong> (though you may
                still return it under the separate returns policy in Section 6).
              </li>
              <li>
                You have previously claimed a money-back guarantee refund from Easy Memoir (the
                guarantee is available <strong>once per customer</strong>).
              </li>
              <li>
                Your account has been suspended or terminated for breach of our{' '}
                <Link to="/terms" className="text-sepia hover:underline">
                  Terms and Conditions
                </Link>
                .
              </li>
              <li>
                There is evidence of abuse, fraud, or manipulation of the Service (including
                creating multiple accounts to circumvent the one-per-customer limitation).
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">4.3 Partial Refunds</h3>
            <p className="text-warmgray leading-relaxed">
              Even if the money-back guarantee is void due to exceeding the usage threshold, we may
              at our discretion offer a <strong>partial refund</strong> or{' '}
              <strong>service credit</strong> on a case-by-case basis, particularly where:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>The Service did not perform as described or was materially defective.</li>
              <li>Technical issues prevented you from using the Service as intended.</li>
              <li>
                Exceptional personal circumstances apply (e.g., bereavement, serious illness).
              </li>
            </ul>
            <p className="text-warmgray leading-relaxed mt-4">
              <strong>Important:</strong> Nothing in this section limits your statutory right to a
              full refund where digital content or services are faulty or not as described under the
              Consumer Rights Act 2015.
            </p>
          </section>

          {/* 5. Product-Specific Refund Terms */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              5. Product-Specific Refund Terms
            </h2>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              5.1 Subscriptions (Monthly &amp; Yearly)
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                You may cancel your subscription at any time from your account settings or by
                emailing us.
              </li>
              <li>
                Upon cancellation, you will retain access until the end of your current billing
                period. No further charges will be taken.
              </li>
              <li>
                <strong>Monthly subscriptions:</strong> No pro-rata refund is offered for the
                remaining days of a billing period after cancellation, unless you are within the
                30-day guarantee period or cooling-off period.
              </li>
              <li>
                <strong>Yearly subscriptions:</strong> If you cancel after the 30-day guarantee
                period but within the first 3 months, we will offer a pro-rata refund for the
                remaining unused months. After 3 months, no refund applies.
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              5.2 One-Off Digital Purchases
            </h3>
            <p className="text-warmgray leading-relaxed">
              Individual digital purchases (eBook export at £7.99, audiobook export at £14.99, style
              pack at £4.99) are generally <strong>non-refundable</strong> once the digital content
              has been delivered, as permitted under the Consumer Contracts Regulations 2013 where
              you have consented to immediate delivery and acknowledged loss of the right to cancel.
            </p>
            <p className="text-warmgray leading-relaxed mt-4">
              However, we will provide a full refund if:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>The digital content is faulty, corrupted, or unreadable.</li>
              <li>The product was not as described at the point of sale.</li>
              <li>A technical error prevented delivery of the content.</li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              5.3 Printed Books (Physical Goods)
            </h3>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Before dispatch:</strong> Full refund available if you cancel before the
                book enters production (typically within 24 hours of order).
              </li>
              <li>
                <strong>After dispatch but within 14 days of delivery:</strong> You may return the
                book for a full refund under the cooling-off period. The book must be in original,
                undamaged condition. You are responsible for return postage costs unless the book is
                faulty.
              </li>
              <li>
                <strong>Faulty or damaged books:</strong> If your book arrives damaged, misprinted,
                or with missing pages, we will arrange a free replacement or full refund at no cost
                to you. Please contact us within 30 days of delivery with photos of the damage.
              </li>
              <li>
                <strong>Personalised items:</strong> As printed books contain your personalised
                content, returns outside the cooling-off period are at our discretion, except where
                the book is faulty.
              </li>
            </ul>

            <h3 className="font-display text-xl text-ink mb-2 mt-6">
              5.4 Bundles (Premium Bundle &amp; Welcome Bundle)
            </h3>
            <p className="text-warmgray leading-relaxed">
              Bundle purchases (£299.00) include digital access plus a printed book and audiobook.
              Refund terms depend on which components have been used:
            </p>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>No components used:</strong> Full refund within the 30-day guarantee period
                (subject to Section 4).
              </li>
              <li>
                <strong>Digital access used, book not printed:</strong> Refund available less a
                reasonable deduction for the digital services consumed.
              </li>
              <li>
                <strong>Book printed and dispatched:</strong> Refund available for the digital
                component only, less printing and delivery costs.
              </li>
              <li>
                <strong>Audiobook generated:</strong> Audiobook generation costs (£14.99) will be
                deducted from any refund where the audiobook has been created and delivered.
              </li>
            </ul>
          </section>

          {/* 6. Returns Process for Physical Goods */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              6. Returns Process for Printed Books
            </h2>
            <p className="text-warmgray leading-relaxed">To return a printed book:</p>
            <ol className="list-decimal list-inside text-warmgray mt-2 space-y-2">
              <li>
                Email{' '}
                <a href="mailto:refunds@easymemoir.co.uk" className="text-sepia hover:underline">
                  refunds@easymemoir.co.uk
                </a>{' '}
                within 14 days of receiving the book (or 30 days if the book is faulty).
              </li>
              <li>We will provide you with a returns reference number and return address.</li>
              <li>
                Package the book securely and send it via a tracked delivery service. We recommend
                keeping proof of postage.
              </li>
              <li>For faulty books, we will provide a prepaid return label at no cost to you.</li>
              <li>
                Refunds will be processed within <strong>14 days</strong> of receiving the returned
                book, or within <strong>14 days</strong> of you providing evidence of posting
                (whichever is earlier).
              </li>
            </ol>
          </section>

          {/* 7. How Refunds Are Processed */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">7. How Refunds Are Processed</h2>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                Refunds are returned to the <strong>original payment method</strong> used at
                checkout (via Stripe).
              </li>
              <li>
                We will initiate the refund within <strong>14 days</strong> of approving your
                request.
              </li>
              <li>
                Your bank or card issuer may take an additional <strong>5–10 working days</strong>{' '}
                to reflect the refund in your account.
              </li>
              <li>
                If the original payment method is no longer available, we will work with you to find
                an alternative refund method.
              </li>
              <li>You will receive email confirmation when the refund has been processed.</li>
            </ul>
          </section>

          {/* 8. Account Status After Refund */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">
              8. What Happens to Your Account After a Refund
            </h2>
            <ul className="list-disc list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Subscription refund:</strong> Your premium access will be revoked
                immediately upon refund approval. You will retain access to free features and any
                content you created.
              </li>
              <li>
                <strong>Bundle refund:</strong> Premium access is revoked. Any content you created
                remains accessible under free-tier features.
              </li>
              <li>
                <strong>Your stories and content remain yours.</strong> We will never delete your
                personal stories or data as a consequence of a refund. You can continue to access,
                edit, and export your content using free features.
              </li>
              <li>
                You may download or export your data at any time. See our{' '}
                <Link to="/privacy" className="text-sepia hover:underline">
                  Privacy Policy
                </Link>{' '}
                for data portability rights.
              </li>
            </ul>
          </section>

          {/* 9. Disputes and Complaints */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">9. Disputes and Complaints</h2>
            <p className="text-warmgray leading-relaxed">
              If you are unhappy with our decision regarding a refund request:
            </p>
            <ol className="list-decimal list-inside text-warmgray mt-2 space-y-2">
              <li>
                <strong>Contact us first:</strong> Email{' '}
                <a href="mailto:legal@easymemoir.co.uk" className="text-sepia hover:underline">
                  legal@easymemoir.co.uk
                </a>{' '}
                and we will review your case at a senior level within 10 working days.
              </li>
              <li>
                <strong>Alternative Dispute Resolution (ADR):</strong> If we cannot resolve your
                complaint, you may use an ADR service. The European Commission's Online Dispute
                Resolution platform is available at{' '}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sepia hover:underline"
                >
                  ec.europa.eu/consumers/odr
                </a>
                .
              </li>
              <li>
                <strong>Trading Standards:</strong> You may contact your local Trading Standards
                office for advice and assistance.
              </li>
              <li>
                <strong>Small Claims Court:</strong> You have the right to take legal action through
                the courts of England and Wales.
              </li>
            </ol>
          </section>

          {/* 10. Chargeback Policy */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">10. Chargeback Policy</h2>
            <p className="text-warmgray leading-relaxed">
              We kindly ask that you contact us before initiating a chargeback with your bank or
              card issuer. Chargebacks are costly and time-consuming for both parties. We are
              committed to resolving refund requests quickly and fairly. If you initiate a
              chargeback without first contacting us, we reserve the right to suspend your account
              pending resolution and to contest the chargeback.
            </p>
          </section>

          {/* 11. Model Cancellation Form */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">11. Model Cancellation Form</h2>
            <p className="text-warmgray leading-relaxed">
              As required by the Consumer Contracts Regulations 2013, you may use the following
              model form to cancel your contract within the cooling-off period. This form is
              optional — you may also contact us by email.
            </p>
            <div className="bg-sepia/5 border border-sepia/20 rounded-lg p-6 mt-4">
              <p className="text-warmgray leading-relaxed">
                <strong>To:</strong> Easy Memoir Ltd, refunds@easymemoir.co.uk
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                I hereby give notice that I cancel my contract for the supply of the following
                service/digital content:
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                <em>[Description of product/service purchased]</em>
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                Ordered on: <em>[Date]</em>
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                Name: <em>[Your name]</em>
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                Email address: <em>[Your registered email]</em>
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                Date: <em>[Today's date]</em>
              </p>
              <p className="text-warmgray leading-relaxed mt-2">
                Signature (if sent by post): <em>[Your signature]</em>
              </p>
            </div>
          </section>

          {/* 12. Changes to This Policy */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">12. Changes to This Policy</h2>
            <p className="text-warmgray leading-relaxed">
              We may update this Refund Policy from time to time. Any changes will be posted on this
              page with an updated "Last updated" date. If we make significant changes that affect
              your rights, we will notify you by email. Changes do not apply retrospectively — if
              you made a purchase under a previous version of this policy, that version applies to
              your purchase.
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="font-display text-2xl text-ink mb-4">13. Contact Us</h2>
            <p className="text-warmgray leading-relaxed">
              For refund requests, guarantee claims, or questions about this policy:
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
          <Link to="/cancellation" className="text-sepia hover:underline">
            Cancellation Policy
          </Link>
          <Link to="/privacy" className="text-sepia hover:underline">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  )
}
