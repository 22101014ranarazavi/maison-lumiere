import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PerfumeBottle from '../components/PerfumeBottle'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatPrice, initials } from '../lib/format'

const EMPTY_FORM = {
  customer_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
  country: '',
  notes: '',
}

const FIELDS = [
  { name: 'customer_name', label: 'Full name', autoComplete: 'name', required: true },
  { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email', required: true },
  { name: 'phone', label: 'Phone (optional)', type: 'tel', autoComplete: 'tel' },
  { name: 'address', label: 'Street address', autoComplete: 'street-address', required: true, wide: true },
  { name: 'city', label: 'City', autoComplete: 'address-level2', required: true },
  { name: 'postal_code', label: 'Postal code', autoComplete: 'postal-code', required: true },
  { name: 'country', label: 'Country', autoComplete: 'country-name', required: true },
]

export default function Checkout() {
  const { items, subtotal, shipping, total, clearCart } = useCart()
  const { push } = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [confirmation, setConfirmation] = useState(null)

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
  }

  const validate = () => {
    const next = {}

    if (form.customer_name.trim().length < 2) next.customer_name = 'Please tell us your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'A valid email is required for the receipt.'
    if (form.address.trim().length < 5) next.address = 'Please enter a full street address.'
    if (form.city.trim().length < 2) next.city = 'City is required.'
    if (form.postal_code.trim().length < 3) next.postal_code = 'Postal code is required.'
    if (form.country.trim().length < 2) next.country = 'Country is required.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validate()) {
      push('Please check the highlighted fields.', 'error')
      return
    }

    setStatus('submitting')

    try {
      const response = await api.createOrder({
        ...form,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      })

      setConfirmation(response.data)
      clearCart()
      setStatus('done')
      push('Order placed. A confirmation is on its way.')
    } catch (error) {
      setStatus('idle')
      if (error.errors) setErrors(error.errors)
      push(error.message, 'error')
    }
  }

  if (status === 'done' && confirmation) {
    return (
      <div className="page">
        <div className="container section">
          <div className="confirmation">
            <span className="confirmation__check" aria-hidden="true">
              ✓
            </span>
            <span className="eyebrow">Order confirmed</span>
            <h1>Thank you, {confirmation.name.split(' ')[0]}</h1>
            <p className="confirmation__lede">
              Your order is being wrapped in the atelier. We have emailed a receipt to{' '}
              <strong>{confirmation.email}</strong>.
            </p>

            <dl className="confirmation__details">
              <div>
                <dt>Reference</dt>
                <dd className="confirmation__ref">{confirmation.reference}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(confirmation.subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{confirmation.shipping === 0 ? 'Complimentary' : formatPrice(confirmation.shipping)}</dd>
              </div>
              <div>
                <dt>Total paid</dt>
                <dd>{formatPrice(confirmation.total)}</dd>
              </div>
            </dl>

            <p className="summary-note summary-note--muted">
              Keep the reference handy — quote it in any message to the concierge.
            </p>

            <div className="confirmation__actions">
              <Link to="/shop" className="btn">
                Continue shopping
              </Link>
              <Link to="/contact" className="btn btn--ghost">
                Contact the concierge
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <div className="container">
            <span className="eyebrow">Checkout</span>
            <h1>Your bag is empty</h1>
          </div>
        </div>
        <div className="container section">
          <div className="state-block">
            <h3>Nothing to check out yet</h3>
            <p>Add a fragrance to your bag and we will meet you back here.</p>
            <Link to="/shop" className="btn">
              Browse the collection
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="container">
          <span className="eyebrow">Checkout</span>
          <h1>Almost yours</h1>
          <p>Delivery details below — no payment is taken in this demo.</p>
        </div>
      </div>

      <div className="container checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          <h2>Delivery details</h2>

          <div className="field-grid">
            {FIELDS.map((field) => (
              <div key={field.name} className={`field ${field.wide ? 'field--wide' : ''}`}>
                <label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="field__required">*</span>}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || 'text'}
                  autoComplete={field.autoComplete}
                  value={form[field.name]}
                  onChange={(event) => update(field.name, event.target.value)}
                  className={errors[field.name] ? 'has-error' : undefined}
                  aria-invalid={Boolean(errors[field.name])}
                />
                {errors[field.name] && <span className="field__error">{errors[field.name]}</span>}
              </div>
            ))}

            <div className="field field--wide">
              <label htmlFor="notes">Gift note (optional)</label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder="We will hand-write this on the card."
              />
              {errors.notes && <span className="field__error">{errors.notes}</span>}
            </div>
          </div>

          <button type="submit" className="btn btn--block" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Placing your order…' : `Place order · ${formatPrice(total)}`}
          </button>

          <p className="summary-note summary-note--muted">
            By placing the order you accept our 30-day return policy. This demo store does
            not process real payments.
          </p>
        </form>

        <aside className="summary-card summary-card--sticky">
          <h2>In your bag</h2>

          <ul className="summary-items">
            {items.map((item) => (
              <li key={item.id}>
                <span className="summary-items__art" style={{ '--tint': item.colors.a }}>
                  <PerfumeBottle colors={item.colors} label={initials(item.name)} />
                </span>
                <span className="summary-items__info">
                  <strong>{item.name}</strong>
                  <em>
                    {item.size_ml} ml · ×{item.quantity}
                  </em>
                </span>
                <span className="summary-items__price">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

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

          <Link to="/cart" className="link-button">
            Edit your bag
          </Link>
        </aside>
      </div>
    </div>
  )
}
