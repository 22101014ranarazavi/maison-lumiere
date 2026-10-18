import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, formatDateTime } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import Spinner from '../../components/Spinner'
import { useToast } from '../../context/ToastContext'
import { formatPrice } from '../../lib/format'
import StatusBadge from '../StatusBadge'
import useAsync from '../useAsync'

const STATUSES = [
  { value: 'pending', label: 'Pending — awaiting payment' },
  { value: 'paid', label: 'Paid — ready to pack' },
  { value: 'shipped', label: 'Shipped — on its way' },
  { value: 'cancelled', label: 'Cancelled — refunded' },
]

export default function OrderDetail() {
  const { id } = useParams()
  const { push } = useToast()
  const { status, data, message, reload } = useAsync(() => api.adminOrder(id), [id])

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!data?.data) return

    setForm({
      status: data.data.status,
      tracking_number: data.data.tracking_number || '',
      admin_note: data.data.admin_note || '',
    })
  }, [data])

  if (status === 'error') {
    return (
      <>
        <BackLink />
        <ErrorState message={message} onRetry={reload} />
      </>
    )
  }

  if (!form || !data?.data) {
    return <Spinner label="Fetching order" />
  }

  const order = data.data

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await api.adminUpdateOrder(order.id, {
        status: form.status,
        tracking_number: form.tracking_number.trim() || null,
        admin_note: form.admin_note.trim() || null,
      })

      push(`Order ${response.data.reference} saved as “${response.data.status}”.`)
      reload()
    } catch (err) {
      setError(err.message || 'Could not save the order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <BackLink />

      <header className="admin-head">
        <div>
          <span className="eyebrow">Order {formatDateTime(order.created_at)}</span>
          <h1>{order.reference}</h1>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <div className="admin-split">
        <div className="admin-stack">
          <section className="panel">
            <div className="panel__head">
              <h2>Items</h2>
              <span className="panel__meta">
                {order.units ?? order.items.length} {order.units === 1 ? 'bottle' : 'bottles'}
              </span>
            </div>

            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Fragrance</th>
                    <th>Unit</th>
                    <th>Qty</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.product_id ? (
                          <Link className="admin-link" to={`/admin/products/${item.product_id}/edit`}>
                            {item.product_name}
                          </Link>
                        ) : (
                          item.product_name
                        )}
                        <span className="admin-sub">{item.size_ml} ml · extrait</span>
                      </td>
                      <td>{formatPrice(item.unit_price)}</td>
                      <td>×{item.quantity}</td>
                      <td>{formatPrice(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{order.shipping === 0 ? 'Complimentary' : formatPrice(order.shipping)}</dd>
              </div>
              <div className="totals__grand">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <div className="card-grid">
            <section className="panel panel--pad">
              <h2>Customer</h2>
              <dl className="detail-list">
                <div>
                  <dt>Name</dt>
                  <dd>{order.customer_name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd><a className="admin-link" href={`mailto:${order.email}`}>{order.email}</a></dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{order.phone || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="panel panel--pad">
              <h2>Shipping address</h2>
              <address className="address">
                {order.address}<br />
                {order.city}, {order.postal_code}<br />
                {order.country}
              </address>
            </section>
          </div>

          {order.notes && (
            <section className="panel panel--pad">
              <h2>Customer note</h2>
              <p className="admin-quote">{order.notes}</p>
            </section>
          )}
        </div>

        <form className="panel panel--pad admin-sticky" onSubmit={handleSave}>
          <h2>Fulfilment</h2>

          <div className="field">
            <label htmlFor="order-status">Status</label>
            <select
              id="order-status"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="order-tracking">Tracking number</label>
            <input
              id="order-tracking"
              value={form.tracking_number}
              onChange={(event) => setForm((current) => ({ ...current, tracking_number: event.target.value }))}
              placeholder="DHL-0000 0000 00"
            />
          </div>

          <div className="field">
            <label htmlFor="order-note">Internal note</label>
            <textarea
              id="order-note"
              value={form.admin_note}
              onChange={(event) => setForm((current) => ({ ...current, admin_note: event.target.value }))}
              placeholder="Not visible to the customer"
            />
          </div>

          {error && <p className="field__error">{error}</p>}

          <button type="submit" className="btn btn--block" disabled={saving}>
            {saving ? 'Saving…' : 'Save order'}
          </button>

          <p className="admin-updated">Last update: {formatDateTime(order.updated_at)}</p>
        </form>
      </div>
    </>
  )
}

function BackLink() {
  return <Link to="/admin/orders" className="admin-back">← All orders</Link>
}
