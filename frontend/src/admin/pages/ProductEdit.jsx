import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import PerfumeBottle from '../../components/PerfumeBottle'
import Spinner from '../../components/Spinner'
import { useToast } from '../../context/ToastContext'
import { formatPrice, initials } from '../../lib/format'
import useAsync from '../useAsync'

const EMPTY = {
  name: '',
  sku: '',
  house: 'Maison Lumière',
  description: '',
  category_id: '',
  gender: 'unisex',
  size_ml: '50',
  price: '',
  compare_at_price: '',
  stock: '0',
  rating: '4.5',
  top_notes: '',
  heart_notes: '',
  base_notes: '',
  color_a: '#e3d2b8',
  color_b: '#8a6f4d',
  shape: 'round',
  featured: false,
  tagline: '',
  story: '',
  craft_notes: '',
  longevity: '',
  sillage: '',
  best_season: '',
  occasion: '',
}

const SHAPES = [
  { value: 'round', label: 'Round shoulder' },
  { value: 'square', label: 'Square' },
  { value: 'tall', label: 'Tall column' },
  { value: 'faceted', label: 'Faceted' },
]

const GENDERS = [
  { value: 'unisex', label: 'Unisex' },
  { value: 'women', label: 'For women' },
  { value: 'men', label: 'For men' },
]

function Field({ label, htmlFor, error, wide = false, children }) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}

function fromProduct(product) {
  return {
    name: product.name,
    sku: product.sku || '',
    house: product.house || '',
    description: product.description,
    category_id: String(product.category_id ?? ''),
    gender: product.gender,
    size_ml: String(product.size_ml),
    price: String(product.price),
    compare_at_price: product.compare_at_price === null ? '' : String(product.compare_at_price),
    stock: String(product.stock),
    rating: String(product.rating),
    top_notes: product.notes.top.join(', '),
    heart_notes: product.notes.heart.join(', '),
    base_notes: product.notes.base.join(', '),
    color_a: product.colors.a,
    color_b: product.colors.b,
    shape: product.colors.shape,
    featured: product.featured,
    tagline: product.guide?.tagline || '',
    story: product.guide?.story || '',
    craft_notes: product.guide?.craft_notes || '',
    longevity: product.guide?.longevity || '',
    sillage: product.guide?.sillage || '',
    best_season: product.guide?.best_season || '',
    occasion: product.guide?.occasion || '',
  }
}

export default function ProductEdit() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { push } = useToast()

  const categories = useAsync(() => api.listCategories(), [])
  const productState = useAsync(
    () => (isEdit ? api.adminProduct(id) : Promise.resolve({ data: null })),
    [id],
  )

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) {
      setForm(EMPTY)
      return
    }

    const product = productState.data?.data
    if (product) setForm(fromProduct(product))
  }, [isEdit, productState.data])

  const set = (key) => (event) => {
    const { type, checked, value } = event.target
    setForm((current) => ({ ...current, [key]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const local = {}
    if (form.name.trim().length < 2) local.name = 'Give the fragrance a name.'
    if (form.description.trim().length < 10) local.description = 'Add at least a sentence of description.'
    if (!form.category_id) local.category_id = 'Choose a fragrance family.'
    if (form.price === '' || Number(form.price) < 0) local.price = 'A price is required.'

    setErrors(local)

    if (Object.keys(local).length > 0) {
      push('Please check the highlighted fields.', 'error')
      return
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      house: form.house.trim(),
      description: form.description.trim(),
      category_id: Number(form.category_id),
      gender: form.gender,
      size_ml: Number(form.size_ml),
      price: Number(form.price),
      compare_at_price: form.compare_at_price === '' ? null : Number(form.compare_at_price),
      stock: Number(form.stock),
      rating: Number(form.rating),
      top_notes: form.top_notes.trim(),
      heart_notes: form.heart_notes.trim(),
      base_notes: form.base_notes.trim(),
      color_a: form.color_a,
      color_b: form.color_b,
      shape: form.shape,
      featured: Boolean(form.featured),
      tagline: form.tagline.trim(),
      story: form.story.trim(),
      craft_notes: form.craft_notes.trim(),
      longevity: form.longevity.trim(),
      sillage: form.sillage.trim(),
      best_season: form.best_season.trim(),
      occasion: form.occasion.trim(),
    }

    setSaving(true)

    try {
      const response = isEdit
        ? await api.adminUpdateProduct(id, payload)
        : await api.adminCreateProduct(payload)

      push(isEdit ? `${response.data.name} updated.` : `${response.data.name} added to the catalogue.`)
      navigate('/admin/products')
    } catch (error) {
      if (error.errors) setErrors(error.errors)
      push(error.message || 'Could not save this fragrance.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${form.name}”? Past orders keep their record of it.`)) return

    try {
      const response = await api.adminDeleteProduct(id)
      push(response.data.message || 'Fragrance deleted.', 'info')
      navigate('/admin/products')
    } catch (error) {
      push(error.message || 'Could not delete that fragrance.', 'error')
    }
  }

  if (isEdit && productState.status === 'loading') {
    return <Spinner label="Uncorking the fragrance" />
  }

  if (isEdit && productState.status === 'error') {
    return <ErrorState message={productState.message} onRetry={productState.reload} />
  }

  return (
    <>
      <Link to="/admin/products" className="admin-back">← All fragrances</Link>

      <header className="admin-head">
        <div>
          <span className="eyebrow">{isEdit ? 'Edit fragrance' : 'New fragrance'}</span>
          <h1>{form.name || 'Untitled composition'}</h1>
        </div>
        {isEdit && (
          <Link to={`/products/${id}`} className="btn btn--ghost btn--small" target="_blank" rel="noreferrer">
            View in shop ↗
          </Link>
        )}
      </header>

      <form className="admin-split" onSubmit={handleSubmit}>
        <div className="admin-stack">
          <section className="panel panel--pad">
            <h2>Identity</h2>
            <div className="form-grid">
              <Field label="Name" htmlFor="p-name" error={errors.name}>
                <input id="p-name" className={errors.name ? 'has-error' : ''} value={form.name} onChange={set('name')} />
              </Field>

              <Field label="SKU" htmlFor="p-sku" error={errors.sku}>
                <input
                  id="p-sku"
                  className={errors.sku ? 'has-error' : ''}
                  value={form.sku}
                  onChange={set('sku')}
                  placeholder="Leave blank to generate"
                />
              </Field>

              <Field label="House" htmlFor="p-house" error={errors.house}>
                <input id="p-house" value={form.house} onChange={set('house')} />
              </Field>

              <Field label="Family" htmlFor="p-category" error={errors.category_id}>
                <select
                  id="p-category"
                  className={errors.category_id ? 'has-error' : ''}
                  value={form.category_id}
                  onChange={set('category_id')}
                >
                  <option value="">Choose…</option>
                  {(categories.data?.data ?? []).map((category) => (
                    <option key={category.slug} value={category.id ?? ''}>{category.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Worn by" htmlFor="p-gender" error={errors.gender}>
                <select id="p-gender" value={form.gender} onChange={set('gender')}>
                  {GENDERS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Size (ml)" htmlFor="p-size" error={errors.size_ml}>
                <input id="p-size" type="number" min="10" max="500" value={form.size_ml} onChange={set('size_ml')} />
              </Field>

              <Field label="Price (USD)" htmlFor="p-price" error={errors.price}>
                <input
                  id="p-price"
                  className={errors.price ? 'has-error' : ''}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={set('price')}
                />
              </Field>

              <Field label="Compare-at price" htmlFor="p-compare" error={errors.compare_at_price}>
                <input
                  id="p-compare"
                  className={errors.compare_at_price ? 'has-error' : ''}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compare_at_price}
                  onChange={set('compare_at_price')}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Stock" htmlFor="p-stock" error={errors.stock}>
                <input id="p-stock" type="number" min="0" value={form.stock} onChange={set('stock')} />
              </Field>

              <Field label="Rating" htmlFor="p-rating" error={errors.rating}>
                <input id="p-rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={set('rating')} />
              </Field>

              <Field label="Bottle shape" htmlFor="p-shape" error={errors.shape}>
                <select id="p-shape" value={form.shape} onChange={set('shape')}>
                  {SHAPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>

              <div className="field">
                <label htmlFor="p-featured">House signature</label>
                <label className="switch" htmlFor="p-featured">
                  <input id="p-featured" type="checkbox" checked={form.featured} onChange={set('featured')} />
                  <span>{form.featured ? 'Featured on the home page' : 'Not featured'}</span>
                </label>
              </div>

              <Field label="Bottle colour — light" htmlFor="p-color-a" error={errors.color_a}>
                <span className="color-field">
                  <input id="p-color-a" type="color" value={form.color_a} onChange={set('color_a')} />
                  <code>{form.color_a}</code>
                </span>
              </Field>

              <Field label="Bottle colour — deep" htmlFor="p-color-b" error={errors.color_b}>
                <span className="color-field">
                  <input id="p-color-b" type="color" value={form.color_b} onChange={set('color_b')} />
                  <code>{form.color_b}</code>
                </span>
              </Field>
            </div>
          </section>

          <section className="panel panel--pad">
            <h2>The pyramid</h2>
            <p className="panel__hint">Separate notes with commas — each one is explained on the guide page.</p>
            <div className="form-grid">
              <Field label="Top notes" htmlFor="p-top" error={errors.top_notes}>
                <input id="p-top" value={form.top_notes} onChange={set('top_notes')} placeholder="Bergamot, Saffron" />
              </Field>
              <Field label="Heart notes" htmlFor="p-heart" error={errors.heart_notes}>
                <input id="p-heart" value={form.heart_notes} onChange={set('heart_notes')} placeholder="Rose Absolute, Oud" />
              </Field>
              <Field label="Base notes" htmlFor="p-base" error={errors.base_notes}>
                <input id="p-base" value={form.base_notes} onChange={set('base_notes')} placeholder="Amber, Vanilla, Musk" />
              </Field>
            </div>
          </section>

          <section className="panel panel--pad">
            <h2>Description</h2>
            <div className="form-grid">
              <Field label="Short description" htmlFor="p-description" error={errors.description} wide>
                <textarea
                  id="p-description"
                  className={errors.description ? 'has-error' : ''}
                  value={form.description}
                  onChange={set('description')}
                  rows={4}
                />
              </Field>
            </div>
          </section>

          <section className="panel panel--pad">
            <h2>Guide &amp; editorial</h2>
            <p className="panel__hint">
              These power the “full story” page. Leave them blank and the guide writes itself from the notes.
            </p>

            <div className="form-grid">
              <Field label="Tagline" htmlFor="p-tagline" error={errors.tagline} wide>
                <input id="p-tagline" value={form.tagline} onChange={set('tagline')} placeholder="Candlelight caught in amber and rose." />
              </Field>

              <Field label="Story" htmlFor="p-story" error={errors.story} wide>
                <textarea
                  id="p-story"
                  value={form.story}
                  onChange={set('story')}
                  rows={6}
                  placeholder="Separate paragraphs with a blank line."
                />
              </Field>

              <Field label="Craft notes" htmlFor="p-craft" error={errors.craft_notes} wide>
                <textarea id="p-craft" value={form.craft_notes} onChange={set('craft_notes')} rows={3} />
              </Field>

              <Field label="Longevity" htmlFor="p-longevity" error={errors.longevity}>
                <input id="p-longevity" value={form.longevity} onChange={set('longevity')} placeholder="9–11 hours" />
              </Field>

              <Field label="Sillage" htmlFor="p-sillage" error={errors.sillage}>
                <input id="p-sillage" value={form.sillage} onChange={set('sillage')} placeholder="Strong — it fills a doorway" />
              </Field>

              <Field label="Best season" htmlFor="p-season" error={errors.best_season}>
                <input id="p-season" value={form.best_season} onChange={set('best_season')} placeholder="Autumn and winter" />
              </Field>

              <Field label="Occasion" htmlFor="p-occasion" error={errors.occasion}>
                <input id="p-occasion" value={form.occasion} onChange={set('occasion')} placeholder="Evenings, celebrations" />
              </Field>
            </div>
          </section>

          <div className="admin-actions-bar">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to catalogue'}
            </button>
            <Link to="/admin/products" className="btn btn--ghost">Cancel</Link>
            {isEdit && (
              <button type="button" className="btn btn--ghost btn--danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        </div>

        <aside className="panel panel--pad admin-sticky">
          <h2>Preview</h2>
          <div className="preview-art" style={{ '--tint': form.color_a }}>
            <PerfumeBottle
              colors={{ a: form.color_a, b: form.color_b, shape: form.shape }}
              label={initials(form.name || 'ML')}
            />
          </div>
          <p className="preview-name">{form.name || 'Untitled composition'}</p>
          <p className="preview-tagline">{form.tagline || 'A tagline appears here.'}</p>
          <p className="preview-price">{form.price === '' ? '—' : formatPrice(form.price)}</p>
          <dl className="detail-list detail-list--tight">
            <div>
              <dt>Stock</dt>
              <dd>{form.stock === '' ? '—' : `${form.stock} bottles`}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{form.size_ml} ml</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{form.sku || 'auto'}</dd>
            </div>
          </dl>
        </aside>
      </form>
    </>
  )
}
