import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page">
      <div className="container section not-found">
        <span className="eyebrow">Erreur 404</span>
        <h1>This page has evaporated</h1>
        <p>
          Like a top note, it was here a moment ago. Let us point you back to something
          that lasts.
        </p>
        <div className="hero__actions">
          <Link to="/shop" className="btn">
            Shop fragrances
          </Link>
          <Link to="/" className="btn btn--ghost">
            Back home
          </Link>
        </div>
      </div>
    </div>
  )
}
