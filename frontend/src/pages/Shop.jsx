import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'

const SORT_OPTIONS = [
  { value: 'latest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
  { value: 'name', label: 'Alphabetical' },
]

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()

  const family = searchParams.get('family') || 'all'
  const gender = searchParams.get('gender') || 'all'
  const sort = searchParams.get('sort') || 'latest'
  const query = searchParams.get('search') || ''

  const [searchDraft, setSearchDraft] = useState(query)
  const [products, setProducts] = useState({ status: 'loading', items: [], total: 0 })
  const [categories, setCategories] = useState([])

  useEffect(() => {
    setSearchDraft(query)
  }, [query])

  useEffect(() => {
    api
      .listCategories()
      .then((response) => setCategories(response.data))
      .catch(() => setCategories([]))
  }, [])

  // Debounce the search box into the URL so typing stays smooth.
  useEffect(() => {
    if (searchDraft === query) return undefined

    const timer = window.setTimeout(() => {
      updateParams({ search: searchDraft })
    }, 350)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  useEffect(() => {
    let active = true
    setProducts((current) => ({ ...current, status: 'loading' }))

    api
      .listProducts({ family, gender, sort, search: query, limit: 24 })
      .then((response) => {
        if (!active) return
        setProducts({ status: 'ready', items: response.data, total: response.meta.total })
      })
      .catch(() => {
        if (active) setProducts({ status: 'error', items: [], total: 0 })
      })

    return () => {
      active = false
    }
  }, [family, gender, sort, query])

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams)

    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === 'all') {
        next.delete(key)
      } else {
        next.set(key, value)
      }
    })

    setSearchParams(next, { replace: true })
  }

  const activeFilters = [
    family !== 'all' && { key: 'family', label: categories.find((c) => c.slug === family)?.name || family },
    gender !== 'all' && { key: 'gender', label: gender },
    query && { key: 'search', label: `“${query}”` },
  ].filter(Boolean)

  return (
    <div className="page">
      <div className="page-head">
        <div className="container">
          <span className="eyebrow">The collection</span>
          <h1>Fine fragrance</h1>
          <p>
            Fourteen compositions across six families. Filter by mood, family or price —
            or search a note you already love.
          </p>
        </div>
      </div>

      <div className="container shop">
        <aside className="shop__filters">
          <div className="field">
            <label htmlFor="shop-search">Search</label>
            <input
              id="shop-search"
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Rose, oud, vetiver…"
            />
          </div>

          <div className="field">
            <label>Family</label>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${family === 'all' ? 'is-active' : ''}`}
                onClick={() => updateParams({ family: 'all' })}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  className={`chip ${family === category.slug ? 'is-active' : ''}`}
                  onClick={() => updateParams({ family: category.slug })}
                >
                  {category.name}
                  <em>{category.product_count}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="shop-gender">Worn by</label>
            <select
              id="shop-gender"
              value={gender}
              onChange={(event) => updateParams({ gender: event.target.value })}
            >
              <option value="all">Everyone</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="shop-sort">Sort by</label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {(activeFilters.length > 0 || sort !== 'latest') && (
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => {
                setSearchDraft('')
                setSearchParams(new URLSearchParams(), { replace: true })
              }}
            >
              Clear filters
            </button>
          )}
        </aside>

        <section className="shop__results">
          <div className="shop__bar">
            <p>
              {products.status === 'loading' && 'Searching the shelves…'}
              {products.status === 'ready' && (
                <>
                  <strong>{products.total}</strong> {products.total === 1 ? 'fragrance' : 'fragrances'}
                </>
              )}
              {products.status === 'error' && 'Something went wrong.'}
            </p>

            {activeFilters.length > 0 && (
              <div className="active-filters">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className="pill"
                    onClick={() => {
                      if (filter.key === 'search') setSearchDraft('')
                      updateParams({ [filter.key]: 'all' })
                    }}
                  >
                    {filter.label}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {products.status === 'loading' && (
            <div className="product-grid product-grid--shop">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="product-card skeleton-card">
                  <div className="skeleton skeleton--art" />
                  <div className="skeleton skeleton--line" />
                  <div className="skeleton skeleton--line skeleton--short" />
                </div>
              ))}
            </div>
          )}

          {products.status === 'error' && (
            <div className="state-block">
              <h3>The boutique is unreachable</h3>
              <p>
                Start the PHP API from the project root:
                <br />
                <code>cd backend &amp;&amp; php -S 127.0.0.1:8000 router.php</code>
              </p>
              <button type="button" className="btn btn--ghost" onClick={() => updateParams({})}>
                Retry
              </button>
            </div>
          )}

          {products.status === 'ready' && products.items.length === 0 && (
            <div className="state-block">
              <h3>No fragrance matches that</h3>
              <p>Try a broader note, or clear the filters to see the full collection.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setSearchDraft('')
                  setSearchParams(new URLSearchParams(), { replace: true })
                }}
              >
                Clear everything
              </button>
            </div>
          )}

          {products.status === 'ready' && products.items.length > 0 && (
            <div className="product-grid product-grid--shop">
              {products.items.map((product, index) => (
                <Reveal key={product.id} delay={Math.min(index, 5) * 50}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
