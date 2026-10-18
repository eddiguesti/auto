import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SEO, { breadcrumbSchema } from '../../components/SEO'
import { EditorialNavigation, EditorialFooter } from '../../components/marketing/EditorialShell'
import {
  useProductCatalog,
  formatProductPrice
} from '../../features/payments/queries/catalogQueries'
import '../../styles/pricing-editorial.css'

export default function Pricing() {
  const { user, authFetch } = useAuth()
  const { data: products = [], isLoading, error, refetch, isFetching } = useProductCatalog()
  const [checkoutProduct, setCheckoutProduct] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const plans = products.filter(
    product => product.type === 'subscription' || product.id === 'premium_bundle'
  )
  const extras = products.filter(
    product => !['subscription', 'premium_bundle'].includes(product.type)
  )

  const checkout = async productId => {
    setCheckoutError('')
    setCheckoutProduct(productId)
    try {
      const response = await authFetch('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/home?premium_activated=true`,
          cancelUrl: `${window.location.origin}/pricing`
        })
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Checkout could not be opened. Please try again.'
        )
      const checkoutUrl = new URL(data.url)
      if (checkoutUrl.protocol !== 'https:')
        throw new Error('The checkout link is unavailable. Please try again.')
      window.location.assign(checkoutUrl.href)
    } catch (checkoutFailure) {
      setCheckoutError(checkoutFailure.message)
      setCheckoutProduct(null)
    }
  }

  const productAction = product =>
    product.checkoutAvailable === false ||
    (product.type === 'subscription' && product.checkoutAvailable !== true) ? (
      <p className="pricing-availability">
        {product.type === 'subscription'
          ? 'This membership is not available to purchase yet.'
          : 'Book printing is being set up. Purchases will open when it is ready.'}
      </p>
    ) : user ? (
      <button
        className="memoir-button"
        disabled={Boolean(checkoutProduct)}
        onClick={() => checkout(product.id)}
      >
        {checkoutProduct === product.id ? 'Opening checkout…' : 'Choose this option'}
        <span aria-hidden="true">→</span>
      </button>
    ) : (
      <Link className="memoir-button memoir-button-outline" to="/register">
        Create an account <span aria-hidden="true">↗</span>
      </Link>
    )

  return (
    <div className="memoir-editorial">
      <SEO
        title="Plans for your memoir"
        description="Explore the available Easy Memoir plans and book options. Prices come from the same product catalogue used at checkout."
        path="/pricing"
        jsonLd={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Pricing' }])]}
      />
      <a href="#pricing-content" className="memoir-skip-link">
        Skip to the plans
      </a>
      <EditorialNavigation />
      <main id="pricing-content" className="memoir-container pricing-main">
        <header className="pricing-introduction">
          <p className="memoir-eyebrow">MAKE ROOM FOR YOUR STORY</p>
          <h1>
            Your memoir.
            <br />
            <em>A plan that fits.</em>
          </h1>
          <p>
            Begin with your first memories, then choose how you would like to continue. Explore the
            available plans and options for your finished memoir.
          </p>
        </header>
        {!user && (
          <div className="pricing-start">
            <div>
              <h2>One memory is a good beginning.</h2>
              <p>
                Create an account to start your story and explore your chapters. You can choose a
                paid option when you are ready.
              </p>
            </div>
            <Link className="memoir-button" to="/register">
              Start my story <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
        {checkoutError && (
          <p className="pricing-error" role="alert">
            {checkoutError}
          </p>
        )}
        {isLoading ? (
          <div className="pricing-loading" role="status">
            Loading the available plans…
          </div>
        ) : error ? (
          <section className="pricing-load-error" role="alert">
            <h2>We could not load the current prices.</h2>
            <p>Please try again to see the available plans.</p>
            <button
              className="memoir-button memoir-button-outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Loading…' : 'Try again'}
            </button>
          </section>
        ) : !products.length ? (
          <section className="pricing-load-error">
            <h2>Plans are being updated.</h2>
            <p>
              Please check back for the available options. You can still sign in to work on your
              memoir.
            </p>
            <Link className="memoir-text-link" to={user ? '/home' : '/login'}>
              Return to your story <span aria-hidden="true">→</span>
            </Link>
          </section>
        ) : (
          <>
            <section className="pricing-plans" aria-label="Memoir plans">
              {plans.map(product => (
                <article
                  className={`pricing-plan ${product.id === 'premium_bundle' ? 'pricing-plan-bundle' : ''}`}
                  key={product.id}
                >
                  <p className="memoir-eyebrow">
                    {product.type === 'subscription' ? 'MEMOIR MEMBERSHIP' : 'THE COMPLETE PACKAGE'}
                  </p>
                  <h2>{product.name}</h2>
                  <p className="pricing-plan-description">{product.description}</p>
                  {product.id === 'premium_bundle' && (
                    <p className="memoir-eyebrow">10 HARDBACKS FOR THE PRICE OF 5</p>
                  )}
                  <p className="pricing-amount">
                    {formatProductPrice(product)}
                    <span>{product.interval ? ` / ${product.interval}` : ' one payment'}</span>
                  </p>
                  {productAction(product)}
                  {product.interval && (
                    <p className="pricing-renewal-note">
                      Recurring {product.interval === 'month' ? 'monthly' : 'yearly'} membership
                      price.
                    </p>
                  )}
                </article>
              ))}
            </section>
            {extras.length > 0 && (
              <section className="pricing-extras">
                <p className="memoir-eyebrow">FOR YOUR FINISHED MEMOIR</p>
                <h2>
                  More ways to <em>keep your words.</em>
                </h2>
                <div>
                  {extras.map(product => (
                    <article key={product.id}>
                      <div>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                      </div>
                      <span>{formatProductPrice(product)}</span>
                      {product.checkoutAvailable === false ? (
                        <p className="pricing-availability">Available soon</p>
                      ) : user ? (
                        <button
                          onClick={() => checkout(product.id)}
                          disabled={Boolean(checkoutProduct)}
                          className="memoir-text-link"
                          aria-label={`Choose ${product.name}`}
                        >
                          Choose <span aria-hidden="true">→</span>
                        </button>
                      ) : (
                        <Link className="memoir-text-link" to="/register">
                          Get started <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
            <p className="pricing-catalogue-note">
              Prices and package descriptions are loaded from the product catalogue used at
              checkout. Your final order details are shown before payment.
            </p>
          </>
        )}
        <section className="pricing-questions">
          <h2>
            A question about <em>your memoir?</em>
          </h2>
          <p>Visit our help page for details about writing, editing and sharing your story.</p>
          <Link className="memoir-text-link" to="/faq">
            Read the questions and answers <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
      <EditorialFooter />
    </div>
  )
}
