import { Route } from 'react-router-dom'
import { lazy } from 'react'
import AdminRoute from '../components/AdminRoute'

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('../pages/admin/Users'))
const AdminUserDetail = lazy(() => import('../pages/admin/UserDetail'))
const AdminPayments = lazy(() => import('../pages/admin/Payments'))

/**
 * Admin route subtree — all routes wrapped in <AdminRoute> which enforces
 * both authentication and the is_admin flag.
 * Called as a function inside <Routes> so React Router can see the Route elements.
 */
export function adminRoutes() {
  return (
    <>
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <AdminRoute>
            <AdminUserDetail />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <AdminRoute>
            <AdminPayments />
          </AdminRoute>
        }
      />
    </>
  )
}
