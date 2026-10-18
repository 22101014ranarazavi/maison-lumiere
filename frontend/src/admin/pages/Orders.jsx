import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, formatDateTime } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import Spinner from '../../components/Spinner'
import { formatPrice } from '../../lib/format'
import StatusBadge from '../StatusBadge'
import useAsync from '../useAsync'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
]

const LIMIT = 20

export default function Orders() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debounced, setDebounced] = useState(search)
  const [page, setPage] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search)
      setPage(0)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  const { status: load, data, message, reload } = useAsync(
    () => api.adminOrders({ status, search: debounced, limit: LIMIT, offset: page * LIMIT }),
    [status, debounced, page],
  )

  const orders = data?.data ?? []
  const meta = data?.meta
  const counts = meta?.by_status ?? {}
  const first = meta ? Math.min(meta.offset + 1, meta.total) : 0
  const last = meta ? Math.min(meta.offset + orders.length, meta.total) : 0

  return (
    <>
      <header className="admin-head">
        <div>
          <span className="eyebrow">Order tracking</span>
          <h1>Orders</h1>
        </div>
        <span className="admin-head__meta">
          {meta ? `${meta.total} ${meta.total === 1 ? 'order' : 'orders'}` : '—'}
        </span>
      </header>

      <div className="toolbar">
        <div className="chip-row">
          {FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              className={`chip${status === filter.value ? ' is-active' : ''}`}
              onClick={() => {
                setStatus(filter.value)
                setPage(0)
              }}
            >
              {filter.label}
              {filter.value && <em>{counts[filter.value] ?? 0}</em>}
            </button>
          ))}
        </div>

        <label className="toolbar__search">
          <span className="visually-hidden">Search orders</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Reference, name, email or city…"
          />
        </label>
      </div>

      {load === 'loading' ? (
        <Spinner label="Fetching orders" />
      ) : load === 'error' ? (
        <ErrorState message={message} onRetry={reload} />
      ) : orders.length === 0 ? (
        <p className="admin-empty panel">No orders match this view yet.</p>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Placed</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="admin-link" to={`/admin/orders/${order.id}`}>{order.reference}</Link>
                      {order.tracking_number && <span className="admin-sub">{order.tracking_number}</span>}
                    </td>
                    <td>
                      {order.customer_name}
                      <span className="admin-sub">{order.email}</span>
                    </td>
                    <td className="admin-items">
                      {order.items_preview || '—'}
                      <span className="admin-sub">
                        {order.item_count} {order.item_count === 1 ? 'line' : 'lines'}
                      </span>
                    </td>
                    <td className="admin-nowrap">{formatDateTime(order.created_at)}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span className="pager__meta">
              {first}–{last} of {meta.total}
            </span>
            <div className="pager__buttons">
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                ← Newer
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setPage((p) => p + 1)}
                disabled={last >= meta.total}
              >
                Older →
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
