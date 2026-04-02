import { Route } from 'react-router-dom'
import { lazy } from 'react'

// Production landing page: LandingDesign1 is the canonical "/" route.
// Landing (original design) is preserved at /landing-original for reference only.
// FacebookLanding is a paid-ad variant served at /welcome.
// Both experiment pages should be deleted once analytics confirm zero organic traffic.

const LandingDesign1 = lazy(() => import('../pages/marketing/LandingDesign1'))
const Landing = lazy(() => import('../pages/marketing/Landing'))
const FacebookLanding = lazy(() => import('../pages/marketing/FacebookLanding'))
const HowItWorks = lazy(() => import('../pages/marketing/HowItWorks'))
const Pricing = lazy(() => import('../pages/marketing/Pricing'))
const FAQ = lazy(() => import('../pages/marketing/FAQ'))
const About = lazy(() => import('../pages/marketing/About'))
const Gift = lazy(() => import('../pages/marketing/Gift'))
const SampleMemoir = lazy(() => import('../pages/marketing/SampleMemoir'))
const Blog = lazy(() => import('../pages/marketing/Blog'))
const BlogPost = lazy(() => import('../pages/marketing/BlogPost'))
const Compare = lazy(() => import('../pages/marketing/Compare'))
const Terms = lazy(() => import('../pages/legal/Terms'))
const Privacy = lazy(() => import('../pages/legal/Privacy'))
const Cookies = lazy(() => import('../pages/legal/Cookies'))
const RefundPolicy = lazy(() => import('../pages/legal/RefundPolicy'))
const CancellationPolicy = lazy(() => import('../pages/legal/CancellationPolicy'))

/**
 * Marketing and legal route subtree — all public-facing pages.
 * Called as a function inside <Routes> so React Router can see the Route elements.
 */
export function marketingRoutes() {
  return (
    <>
      {/* Canonical home page */}
      <Route path="/" element={<LandingDesign1 />} />

      {/* Experiment / variant pages — archive or delete once traffic is confirmed zero */}
      <Route path="/landing-original" element={<Landing />} />
      <Route path="/welcome" element={<FacebookLanding />} />

      {/* Marketing pages */}
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/about" element={<About />} />
      <Route path="/gift" element={<Gift />} />
      <Route path="/sample" element={<SampleMemoir />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/compare" element={<Compare />} />

      {/* Legal pages */}
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/cancellation" element={<CancellationPolicy />} />
    </>
  )
}
