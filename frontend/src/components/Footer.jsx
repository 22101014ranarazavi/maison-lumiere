import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const { push } = useToast()

  const handleSubscribe = async (event) => {
    event.preventDefault()
    if (busy || !email.trim()) return

    setBusy(true)
    try {
      const response = await api.subscribe(email.trim())
      push(response.message || 'Welcome to the circle.')
      setEmail('')
    } catch (error) {
      push(error.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            Maison <em>Lumière</em>
          </Link>
          <p>
            Artisanal fragrance composed in small batches in Grasse, on the Côte d’Azur,
            since 1998.
          </p>
          <div className="footer__social">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              Instagram
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" aria-label="Pinterest">
              Pinterest
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
              YouTube
            </a>
          </div>
        </div>

        <div>
          <h4>Shop</h4>
          <ul>
            <li><Link to="/shop">All fragrances</Link></li>
            <li><Link to="/shop?family=floral">Floral</Link></li>
            <li><Link to="/shop?family=woody">Woody</Link></li>
            <li><Link to="/shop?family=oriental">Oriental</Link></li>
          </ul>
        </div>

        <div>
          <h4>Maison</h4>
          <ul>
            <li><Link to="/about">Our story</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/cart">Your bag</Link></li>
            <li><Link to="/checkout">Checkout</Link></li>
          </ul>
        </div>

        <div className="footer__newsletter">
          <h4>The letter</h4>
          <p>New compositions, atelier notes and private previews — once a month.</p>
          <form onSubmit={handleSubscribe} className="newsletter-form">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              aria-label="Email address"
              required
            />
            <button type="submit" className="btn btn--gold" disabled={busy}>
              {busy ? '…' : 'Join'}
            </button>
          </form>
        </div>
      </div>

      <div className="footer__bottom container">
        <span>© {new Date().getFullYear()} Maison Lumière. All rights reserved.</span>
        <span>Composed in Grasse · Shipped worldwide</span>
      </div>
    </footer>
  )
}
