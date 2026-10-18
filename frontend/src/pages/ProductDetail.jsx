import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ErrorState from '../components/ErrorState'
import PerfumeBottle from '../components/PerfumeBottle'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import Spinner from '../components/Spinner'
import Stars from '../components/Stars'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatDate, formatPrice, initials } from '../lib/format'

const NOTE_LAYERS = [
  { key: 'top', title: 'Top notes', hint: 'The first fifteen minutes' },
  { key: 'heart', title: 'Heart notes', hint: 'The character, three hours in' },
  { key: 'base', title: 'Base notes', hint: 'What stays on your scarf' },
]

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { push } = useToast()

  const [state, setState] = useState({ status: 'loading', product: null })
  const [quantity, setQuantity] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading', product: null })
    setQuantity(1)

    api
      .getProduct(id)
      .then((response) => {
        if (active) setState({ status: 'ready', product: response.data })
      })
      .catch((error) => {
        if (active) setState({ status: 'error', product: null, message: error.message })
      })

    return () => {
      active = false
    }
  }, [id, reloadKey])

  if (state.status === 'loading') {
    return (
      <div className="page">
        <div className="container section">
          <Spinner label="Uncorking" />
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="page">
        <div className="container section">
          <ErrorState message={state.message} onRetry={() => setReloadKey((key) => key + 1)} />
        </div>
      </div>
    )
  }

  const product = state.product
  const soldOut = product.stock <= 0
  const onSale = product.compare_at_price && product.compare_at_price > product.price
  const lowStock = !soldOut && product.stock <= 5

  const handleAdd = () => {
    addItem(product, quantity)
    push(`${quantity} × ${product.name} added to your bag.`)
  }

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <Link to={`/shop?family=${product.category.slug}`}>{product.category.name}</Link>
          <span>/</span>
          <span className="breadcrumb__current">{product.name}</span>
        </nav>

        <div className="pdp">
          <div className="pdp__art" style={{ '--tint': product.colors.a }}>
            {product.featured && <span className="badge badge--featured">House signature</span>}
            {onSale && <span className="badge badge--sale">Sale</span>}
            <PerfumeBottle colors={product.colors} label={initials(product.name)} animate />
          </div>

          <div className="pdp__info">
            <span className="eyebrow">{product.category.name} · {product.house}</span>
            <h1>{product.name}</h1>

            <div className="pdp__rating">
              <Stars rating={product.rating} count={product.review_count} />
              <span className="pdp__sku">Réf. {product.sku}</span>
            </div>

            <p className="pdp__price">
              {formatPrice(product.price)}
              {onSale && (
                <>
                  <s>{formatPrice(product.compare_at_price)}</s>
                  <span className="pdp__save">
                    Save {formatPrice(product.compare_at_price - product.price)}
                  </span>
                </>
              )}
            </p>

            <p className="pdp__description">{product.description}</p>

            <p className="pdp__guide-link">
              <Link to={`/fragrances/${product.id}/guide`} className="link-arrow">
                Read the full guide — note by note ↗
              </Link>
            </p>

            <dl className="pdp__specs">
              <div>
                <dt>Concentration</dt>
                <dd>Extrait de parfum</dd>
              </div>
              <div>
                <dt>Volume</dt>
                <dd>{product.size_ml} ml</dd>
              </div>
              <div>
                <dt>Worn by</dt>
                <dd className="capitalize">{product.gender === 'unisex' ? 'Everyone' : product.gender}</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>
                  {soldOut ? (
                    <span className="text-wine">Sold out</span>
                  ) : lowStock ? (
                    <span className="text-gold">Only {product.stock} left</span>
                  ) : (
                    <span className="text-gold">In stock</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="pdp__buy">
              <div className="qty">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(10, product.stock, value + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button type="button" className="btn btn--block" onClick={handleAdd} disabled={soldOut}>
                {soldOut ? 'Currently unavailable' : `Add to bag · ${formatPrice(product.price * quantity)}`}
              </button>
            </div>

            <ul className="pdp__reassurance">
              <li>Complimentary shipping over $150</li>
              <li>Two 2 ml samples with every order</li>
              <li>30-day returns, even if opened</li>
            </ul>
          </div>
        </div>

        <section className="notes">
          <Reveal className="section-head section-head--left">
            <span className="eyebrow">The pyramid</span>
            <h2>How it unfolds</h2>
          </Reveal>

          <div className="notes__grid">
            {NOTE_LAYERS.map((layer, index) => (
              <Reveal key={layer.key} className="notes__layer" delay={index * 70}>
                <span className="notes__index">0{index + 1}</span>
                <h3>{layer.title}</h3>
                <p className="notes__hint">{layer.hint}</p>
                <ul>
                  {product.notes[layer.key].map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="reviews">
          <Reveal className="section-head section-head--left">
            <span className="eyebrow">Client impressions</span>
            <h2>
              {product.review_count > 0
                ? `${product.review_count} ${product.review_count === 1 ? 'review' : 'reviews'}`
                : 'No reviews yet'}
            </h2>
          </Reveal>

          {product.reviews.length === 0 ? (
            <p className="inline-note">Be the first to write about this composition.</p>
          ) : (
            <ul className="review-list">
              {product.reviews.map((review, index) => (
                <Reveal as="li" key={`${review.author}-${index}`} className="review" delay={index * 50}>
                  <header>
                    <strong>{review.author}</strong>
                    <Stars rating={review.rating} />
                  </header>
                  <p>{review.comment}</p>
                  <time dateTime={review.created_at}>{formatDate(review.created_at)}</time>
                </Reveal>
              ))}
            </ul>
          )}
        </section>

        {product.related.length > 0 && (
          <section className="section">
            <Reveal className="section-head section-head--left">
              <span className="eyebrow">You may also like</span>
              <h2>More {product.category.name.toLowerCase()}</h2>
            </Reveal>

            <div className="product-grid product-grid--shop">
              {product.related.map((related, index) => (
                <Reveal key={related.id} delay={index * 50}>
                  <ProductCard product={related} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
