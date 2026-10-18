import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setAdminToken } from '../../api/client'

export default function Login({ onSignedIn }) {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const response = await api.adminLogin(key.trim())
      setAdminToken(response.data.token)
      onSignedIn()
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-gate">
      <form className="admin-gate__card admin-login" onSubmit={handleSubmit}>
        <span className="eyebrow">Maison Lumière</span>
        <h1>Atelier console</h1>
        <p className="admin-login__hint">
          Enter the admin key from <code>backend/.env</code> to track orders and edit the catalogue.
        </p>

        <div className="field">
          <label htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            autoFocus
          />
          {error && <span className="field__error">{error}</span>}
        </div>

        <button type="submit" className="btn btn--block" disabled={busy || key.trim() === ''}>
          {busy ? 'Checking…' : 'Enter console'}
        </button>

        <Link to="/" className="admin-login__back">← Back to the shop</Link>
      </form>
    </div>
  )
}
