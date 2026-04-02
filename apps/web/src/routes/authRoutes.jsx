import { Route } from 'react-router-dom'
import { lazy } from 'react'

const Login = lazy(() => import('../pages/auth/Login'))
const Register = lazy(() => import('../pages/auth/Register'))
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'))
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail'))

/**
 * Auth route subtree — public pages for sign-in and account recovery.
 * Called as a function inside <Routes> so React Router can see the Route elements.
 */
export function authRoutes() {
  return (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
    </>
  )
}
