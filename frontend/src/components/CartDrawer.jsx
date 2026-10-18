import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PerfumeBottle from './PerfumeBottle'
import { useCart } from '../context/CartContext'
import { formatPrice, initials } from '../lib/format'

export default function CartDrawer() {
  const { items, count, subtotal, shipping, total, isDrawerOpen, closeDrawer, updateQuantity, removeItem } = useCart()
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeDrawer])

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen])

  const goTo = (path) => {
    closeDrawer()
    navigate(path)
  }

  return (
    <>
      <div
        className={`drawer-overlay ${isDrawerOpen ? 'is-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside className={`drawer ${isDrawerOpen ? 'is-open' : ''}`} aria-hidden={!isDrawerOpen}>
        <header className="drawer__header">
          <h2>Your bag {count > 0 && <span>({count})</span>}</h2>
          <button type="button" className="drawer__close" onClick={closeDrawer} aria-label="Close bag">
            ×
          </button>
        </header>

        <div className="drawer__body">
          {items.length === 0 ? (
            <div className="drawer__empty">
              <p>Your bag is empty.</p>
              <button type="button" className="btn btn--ghost" onClick={() => goTo('/shop')}>
                Browse the collection
              </button>
            </div>
          ) : (
            <ul className="drawer__items">
              {items.map((item) => (
                <li key={item.id} className="drawer-item">
                  <Link to={`/products/${item.id}`} className="drawer-item__art" onClick={closeDrawer}>
                    <PerfumeBottle colors={item.colors} label={initials(item.name)} />
                  </Link>

                  <div className="drawer-item__info">
                    <Link to={`/products/${item.id}`} onClick={closeDrawer} className="drawer-item__name">
                      {item.name}
                    </Link>
                    <span className="drawer-item__meta">
                      {item.size_ml} ml · {formatPrice(item.price)}
                    </span>

                    <div className="qty qty--small">
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

                  <div className="drawer-item__side">
                    <span className="drawer-item__total">{formatPrice(item.price * item.quantity)}</span>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="drawer__footer">
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

            <button type="button" className="btn btn--block" onClick={() => goTo('/checkout')}>
              Proceed to checkout
            </button>
            <button type="button" className="btn btn--ghost btn--block" onClick={() => goTo('/cart')}>
              View bag
            </button>
          </footer>
        )}
      </aside>
    </>
  )
}
