import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import PerfumeBottle from '../../components/PerfumeBottle'
import Spinner from '../../components/Spinner'
import { useToast } from '../../context/ToastContext'
import { formatPrice, initials } from '../../lib/format'
import useAsync from '../useAsync'

const STOCK_FILTERS = [
  { value: '', label: 'All stock' },
  { value: 'in', label: 'Healthy' },
  { value: 'low', label: 'Low (≤ 5)' },
  { value: 'out', label: 'Sold out' },
]

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price_desc', label: 'Price, high to low' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'stock_asc', label: 'Stock, lowest first' },
  { value: 'rating', label: 'Best rated' },
]

export default function Products() {
  const [searchParams] = useSearchParams()
  const { push } = useToast()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debounced, setDebounced] = useState(search)
  const [family, setFamily] = useState(searchParams.get('family') || '')
  const [stock, setStock] = useState(searchParams.get('stock') || '')
  const [sort, setSort] = useState('newest')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const categories = useAsync(() => api.listCategories(), [])
  const { status, data, message, reload } = useAsync(
    () => api.adminProducts({ search: debounced, family, stock, sort, limit: 100 }),
    [debounced, family, stock, sort],
  )

  const products = data?.data ?? []

  async function handleDelete(product) {
    if (!window.confirm(`Delete “${product.name}”? Past orders keep their record of it.`)) return

    setBusyId(product.id)

    try {
      const response = await api.adminDeleteProduct(product.id)
      push(response.data.message || `${product.name} was removed.`, 'info')
      reload()
    } catch (error) {
      push(error.message || 'Could not delete that fragrance.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <header className="admin-head">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h1>Fragrances</h1>
        </div>
        <Link to="/admin/products/new" className="btn btn--gold btn--small">New fragrance</Link>
      </header>

      <div className="toolbar">
        <label className="toolbar__search">
          <span className="visually-hidden">Search the catalogue</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, SKU or description…"
          />
        </label>

        <select value={family} onChange={(event) => setFamily(event.target.value)} aria-label="Filter by family">
          <option value="">All families</option>
          {(categories.data?.data ?? []).map((category) => (
            <option key={category.slug} value={category.slug}>{category.name}</option>
          ))}
        </select>

        <select value={stock} onChange={(event) => setStock(event.target.value)} aria-label="Filter by stock">
          {STOCK_FILTERS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {(search || family || stock) && (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              setSearch('')
              setFamily('')
              setStock('')
            }}
          >
            Clear
          </button>
        )}
      </div>

      {status === 'loading' ? (
        <Spinner label="Opening the catalogue" />
      ) : status === 'error' ? (
        <ErrorState message={message} onRetry={reload} />
      ) : products.length === 0 ? (
        <p className="admin-empty panel">No fragrances match these filters.</p>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table className="admin-table admin-table--products">
              <thead>
                <tr>
                  <th>Fragrance</th>
                  <th>Family</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <span className="product-cell__art">
                          <PerfumeBottle colors={product.colors} label={initials(product.name)} />
                        </span>
                        <span>
                          <strong>
                            {product.name}
                            {product.featured && <span className="tag">Signature</span>}
                          </strong>
                          <span className="admin-sub">Réf. {product.sku} · {product.size_ml} ml · {product.gender}</span>
                        </span>
                      </div>
                    </td>
                    <td>{product.category.name}</td>
                    <td>
                      {formatPrice(product.price)}
                      {product.compare_at_price && (
                        <span className="admin-sub"><s>{formatPrice(product.compare_at_price)}</s></span>
                      )}
                    </td>
                    <td>
                      {product.stock === 0 ? (
                        <span className="stock-pill is-out">Sold out</span>
                      ) : product.stock <= 5 ? (
                        <span className="stock-pill is-low">{product.stock} left</span>
                      ) : (
                        <span className="stock-pill">{product.stock}</span>
                      )}
                    </td>
                    <td>{product.rating.toFixed(1)} ★</td>
                    <td className="admin-actions">
                      <Link className="btn btn--ghost btn--small" to={`/admin/products/${product.id}/edit`}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn--ghost btn--small btn--danger"
                        onClick={() => handleDelete(product)}
                        disabled={busyId === product.id}
                      >
                        {busyId === product.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="admin-count">
        {data?.meta ? `${products.length} of ${data.meta.total} fragrances` : ''}
      </p>
    </>
  )
}
