import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'Our story' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const { count, openDrawer } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="navbar">
      <div className="navbar__promo">
        Complimentary shipping on orders over $150 · Two samples with every bottle
      </div>

      <div className="navbar__main container">
        <button
          type="button"
          className={`navbar__burger ${menuOpen ? 'is-open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <Link to="/" className="navbar__logo">
          Maison <em>Lumière</em>
        </Link>

        <nav className={`navbar__links ${menuOpen ? 'is-open' : ''}`}>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <button
            type="button"
            className="navbar__concierge"
            onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}
          >
            Concierge
          </button>

          <button type="button" className="navbar__cart" onClick={openDrawer} aria-label={`Open bag, ${count} items`}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" strokeLinecap="round" />
            </svg>
            {count > 0 && <span className="navbar__cart-count">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  )
}
