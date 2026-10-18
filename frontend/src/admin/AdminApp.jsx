import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, clearAdminToken, getAdminToken } from '../api/client'
import ToastStack from '../components/ToastStack'
import '../styles/admin.css'
import AdminLayout from './AdminLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Messages from './pages/Messages'
import OrderDetail from './pages/OrderDetail'
import Orders from './pages/Orders'
import ProductEdit from './pages/ProductEdit'
import Products from './pages/Products'

function Checking() {
  return (
    <div className="admin-gate">
      <div className="admin-gate__card">
        <span className="spinner__ring" aria-hidden="true" />
        <p>Opening the atelier console…</p>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(() => Boolean(getAdminToken()))
  const [checking, setChecking] = useState(() => Boolean(getAdminToken()))

  // Validate a stored token once on load.
  useEffect(() => {
    if (!getAdminToken()) {
      setChecking(false)
      return undefined
    }

    let active = true

    api
      .adminSummary()
      .then(() => {
        if (active) {
          setAuthed(true)
          setChecking(false)
        }
      })
      .catch((error) => {
        if (!active) return

        if (error.status === 401) {
          clearAdminToken()
          setAuthed(false)
        }

        setChecking(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Any 401 from an admin request drops the session.
  useEffect(() => {
    const onUnauthorized = () => setAuthed(false)
    window.addEventListener('admin:unauthorized', onUnauthorized)

    return () => window.removeEventListener('admin:unauthorized', onUnauthorized)
  }, [])

  const signOut = useCallback(() => {
    clearAdminToken()
    setAuthed(false)
    navigate('/admin/login', { replace: true })
  }, [navigate])

  if (checking) {
    return (
      <>
        <Checking />
        <ToastStack />
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route
          path="login"
          element={authed ? <Navigate to="/admin" replace /> : <Login onSignedIn={() => setAuthed(true)} />}
        />

        <Route
          element={authed ? <AdminLayout onSignOut={signOut} /> : <Navigate to="/admin/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductEdit />} />
          <Route path="products/:id/edit" element={<ProductEdit />} />
          <Route path="messages" element={<Messages />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>

      <ToastStack />
    </>
  )
}
