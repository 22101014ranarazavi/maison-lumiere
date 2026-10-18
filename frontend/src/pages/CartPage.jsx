import { Link } from 'react-router-dom'
import PerfumeBottle from '../components/PerfumeBottle'
import { useCart } from '../context/CartContext'
import { formatPrice, initials } from '../lib/format'

export default function CartPage() {
  const { items, subtotal, shipping, total, count, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div className="container">
            <span className="eyebrow">Your bag</span>
            <h1>Nothing here yet</h1>
          </div>
        </div>

        <div className="container section">
          <div className="state-block">
            <h3>Your bag is empty</h3>
            <p>
              Fourteen compositions are waiting — start with the house signatures and we
              will send two samples along with them.
            </p>
            <Link to="/shop" className="btn">
              Browse the collection
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const freeShippingGap = subtotal < 150 ? 150 - subtotal : 0

  return (
    <div className="page">
      <div className="page-head">
        <div className="container">
          <span className="eyebrow">Your bag</span>
          <h1>
            {count} {count === 1 ? 'bottle' : 'bottles'}
          </h1>
        </div>
      </div>

      <div className="container cart-layout">
        <section className="cart-lines">
          <ul>
            {items.map((item) => (
              <li key={item.id} className="cart-line">
                <Link to={`/products/${item.id}`} className="cart-line__art" style={{ '--tint': item.colors.a }}>
                  <PerfumeBottle colors={item.colors} label={initials(item.name)} />
                </Link>

                <div className="cart-line__info">
                  <span className="eyebrow eyebrow--small">{item.house}</span>
                  <h3>
                    <Link to={`/products/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p className="cart-line__meta">
                    {item.size_ml} ml · Extrait de parfum · {formatPrice(item.price)} each
                  </p>
                  <button type="button" className="link-button" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>

                <div className="cart-line__qty">
                  <div className="qty">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>

                <p className="cart-line__total">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="cart-lines__actions">
            <Link to="/shop" className="btn btn--ghost">
              Continue shopping
            </Link>
            <button type="button" className="link-button" onClick={clearCart}>
              Empty the bag
            </button>
          </div>
        </section>

        <aside className="summary-card">
          <h2>Order summary</h2>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Complimentary' : formatPrice(shipping)}</span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          {freeShippingGap > 0 && (
            <p className="summary-note">
              Add {formatPrice(freeShippingGap)} more for complimentary shipping.
            </p>
          )}

          <Link to="/checkout" className="btn btn--block">
            Proceed to checkout
          </Link>

          <p className="summary-note summary-note--muted">
            Taxes calculated at checkout. 30-day returns on every bottle.
          </p>
        </aside>
      </div>
    </div>
  )
}
