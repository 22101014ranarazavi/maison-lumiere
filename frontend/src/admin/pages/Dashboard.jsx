import { Link } from 'react-router-dom'
import { api, formatDateTime } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import Spinner from '../../components/Spinner'
import { formatPrice } from '../../lib/format'
import StatusBadge from '../StatusBadge'
import useAsync from '../useAsync'

export default function Dashboard() {
  const { status, data, message, reload } = useAsync(() => api.adminSummary(), [])

  if (status === 'loading') {
    return <Spinner label="Counting the cellar" />
  }

  if (status === 'error') {
    return <ErrorState message={message} onRetry={reload} />
  }

  const { orders, products, inbox, subscribers, reviews, recent_orders: recentOrders } = data.data

  return (
    <>
      <header className="admin-head">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Good day at the atelier</h1>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={reload} disabled={status === 'refreshing'}>
          {status === 'refreshing' ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="stat-grid">
        <article className="stat">
          <span className="stat__label">Revenue</span>
          <strong className="stat__value">{formatPrice(orders.revenue)}</strong>
          <span className="stat__meta">{orders.total} orders · cancelled excluded</span>
        </article>

        <article className="stat">
          <span className="stat__label">Awaiting payment</span>
          <strong className="stat__value">{orders.by_status.pending}</strong>
          <span className="stat__meta">
            {orders.by_status.paid} paid · {orders.by_status.shipped} shipped · {orders.by_status.cancelled} cancelled
          </span>
        </article>

        <article className="stat">
          <span className="stat__label">Unread enquiries</span>
          <strong className="stat__value">{inbox.unread}</strong>
          <span className="stat__meta">{inbox.total} in the inbox</span>
        </article>

        <article className="stat">
          <span className="stat__label">Catalogue</span>
          <strong className="stat__value">{products.total}</strong>
          <span className="stat__meta">{products.stock_units} bottles in stock · {reviews} reviews</span>
        </article>

        <article className="stat">
          <span className="stat__label">Letter subscribers</span>
          <strong className="stat__value">{subscribers}</strong>
          <span className="stat__meta">Signed up for the newsletter</span>
        </article>
      </div>

      <div className="admin-split">
        <section className="panel">
          <div className="panel__head">
            <h2>Recent orders</h2>
            <Link to="/admin/orders" className="panel__link">All orders →</Link>
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="admin-link" to={`/admin/orders/${order.id}`}>{order.reference}</Link>
                    </td>
                    <td>
                      {order.customer_name}
                      <span className="admin-sub">{order.email}</span>
                    </td>
                    <td className="admin-nowrap">{formatDateTime(order.created_at)}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Low stock</h2>
            <Link to="/admin/products?stock=low" className="panel__link">Manage →</Link>
          </div>

          {products.low_stock.length === 0 ? (
            <p className="admin-empty">Everything is comfortably in stock.</p>
          ) : (
            <ul className="stock-list">
              {products.low_stock.map((product) => (
                <li key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span className="admin-sub">Réf. {product.sku}</span>
                  </div>
                  <span className={`stock-pill ${product.stock === 0 ? 'is-out' : 'is-low'}`}>
                    {product.stock === 0 ? 'Sold out' : `${product.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
