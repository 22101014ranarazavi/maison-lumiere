import { Link, NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Fragrances' },
  { to: '/admin/messages', label: 'Inbox' },
]

export default function AdminLayout({ onSignOut }) {
  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <Link to="/admin" className="admin__brand">
          <span className="admin__brand-mark" aria-hidden="true">ML</span>
          <span className="admin__brand-text">
            <strong>Maison Lumière</strong>
            <em>Atelier console</em>
          </span>
        </Link>

        <nav className="admin__nav" aria-label="Admin sections">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `admin__nav-link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin__foot">
          <Link to="/" className="admin__foot-link">← View storefront</Link>
          <button type="button" className="admin__foot-link" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin__main">
        <Outlet />
      </main>
    </div>
  )
}
