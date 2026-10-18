/**
 * Admin + guide API test — exercises the admin endpoints and the guide page
 * against a running backend.
 *
 *   node scripts/admin-api-test.mjs [baseUrl] [adminKey]
 *
 * Defaults: http://127.0.0.1:8000  and the ADMIN_KEY from backend/.env
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.argv[2] || 'http://127.0.0.1:8000'
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

function envValue(name, fallback) {
  try {
    const env = readFileSync(join(ROOT, 'backend', '.env'), 'utf8')
    const match = env.match(new RegExp(`^${name}=(.*)$`, 'm'))
    if (match) return match[1].trim()
  } catch {
    /* no .env */
  }
  return fallback
}

const ADMIN_KEY = process.argv[3] || envValue('ADMIN_KEY', 'lumiere-admin-2026')

let passed = 0
let failed = 0

function check(label, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function call(method, path, { body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['X-Admin-Token'] = token

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let json = null
  try {
    json = await res.json()
  } catch {
    /* not JSON */
  }

  return { status: res.status, json }
}

console.log(`\nAdmin + guide API test → ${BASE}\n`)

// --- auth -------------------------------------------------------------------
const noToken = await call('GET', '/api/admin/summary')
check('summary without token → 401', noToken.status === 401, `got ${noToken.status}`)

const badLogin = await call('POST', '/api/admin/login', { body: { key: 'wrong-key' } })
check('login with wrong key → 401', badLogin.status === 401, `got ${badLogin.status}`)

const login = await call('POST', '/api/admin/login', { body: { key: ADMIN_KEY } })
check('login with correct key → 200', login.status === 200, `got ${login.status}`)
check('login returns a token', typeof login.json?.data?.token === 'string')
const token = login.json?.data?.token || ''

const tampered = await call('GET', '/api/admin/summary', { token: `${token}x` })
check('tampered token → 401', tampered.status === 401, `got ${tampered.status}`)

// --- restore the demo records this test mutates ------------------------------
// Order LM-2D6F58 and the unread message are put back the way the seed file
// leaves them, so repeated runs behave the same without touching the database.
const seededMessages = await call('GET', '/api/admin/messages?limit=100', { token })

for (const message of seededMessages.json?.data ?? []) {
  const shouldBeHandled = message.email === 'tom@example.com'

  if (message.handled !== shouldBeHandled) {
    await call('PATCH', `/api/admin/messages/${message.id}`, {
      token,
      body: { handled: shouldBeHandled },
    })
  }
}

const allOrders = await call('GET', '/api/admin/orders?limit=100', { token })
const demoOrder = (allOrders.json?.data ?? []).find((order) => order.reference === 'LM-2D6F58')

if (demoOrder && demoOrder.status !== 'pending') {
  await call('PATCH', `/api/admin/orders/${demoOrder.id}`, {
    token,
    body: { status: 'pending', tracking_number: null, admin_note: null },
  })
}

const demoOrderId = demoOrder?.id ?? 4

// --- dashboard --------------------------------------------------------------
const summary = await call('GET', '/api/admin/summary', { token })
check('summary with token → 200', summary.status === 200, `got ${summary.status}`)
check('summary counts the orders', (summary.json?.data?.orders?.total ?? 0) >= 5,
  `total=${summary.json?.data?.orders?.total}`)
check('summary revenue excludes cancelled', (summary.json?.data?.orders?.revenue ?? 0) >= 330 + 157 + 160 + 107,
  `revenue=${summary.json?.data?.orders?.revenue}`)
check('summary flags low-stock products', Array.isArray(summary.json?.data?.products?.low_stock)
  && summary.json.data.products.low_stock.length > 0)
check('summary counts the unread inbox', (summary.json?.data?.inbox?.unread ?? 0) >= 1,
  `unread=${summary.json?.data?.inbox?.unread}`)
check('summary includes recent orders', (summary.json?.data?.recent_orders?.length ?? 0) >= 5,
  `recent=${summary.json?.data?.recent_orders?.length}`)

// --- orders -----------------------------------------------------------------
const orders = await call('GET', '/api/admin/orders', { token })
check('GET /api/admin/orders → 200', orders.status === 200, `got ${orders.status}`)
check('lists the orders', (orders.json?.meta?.total ?? 0) >= 5, `total=${orders.json?.meta?.total}`)
check('order rows carry an items preview', typeof orders.json?.data?.[0]?.items_preview === 'string')

const pending = await call('GET', '/api/admin/orders?status=pending', { token })
check('status filter returns only pending', (pending.json?.data ?? []).every((o) => o.status === 'pending')
  && (pending.json?.meta?.total ?? 0) >= 1, `total=${pending.json?.meta?.total}`)

const searched = await call('GET', '/api/admin/orders?search=camille', { token })
check('order search finds Camille', (searched.json?.data ?? []).some((o) => o.reference === 'LM-7C2F9A'))

const order1 = await call('GET', '/api/admin/orders/1', { token })
check('GET /api/admin/orders/1 → 200', order1.status === 200, `got ${order1.status}`)
check('order detail has 2 line items', order1.json?.data?.items?.length === 2,
  `items=${order1.json?.data?.items?.length}`)

const order404 = await call('GET', '/api/admin/orders/9999', { token })
check('unknown order → 404', order404.status === 404, `got ${order404.status}`)

const updated = await call('PATCH', `/api/admin/orders/${demoOrderId}`, {
  token,
  body: { status: 'paid', tracking_number: 'DHL-1122 3344 55', admin_note: 'Paid by bank transfer.' },
})
check('PATCH /api/admin/orders/{id} → 200', updated.status === 200, `got ${updated.status}`)
check('order status updated', updated.json?.data?.status === 'paid', `status=${updated.json?.data?.status}`)
check('tracking number stored', updated.json?.data?.tracking_number === 'DHL-1122 3344 55')

const badStatus = await call('PATCH', `/api/admin/orders/${demoOrderId}`, { token, body: { status: 'teleported' } })
check('invalid status → 422', badStatus.status === 422, `got ${badStatus.status}`)

const unauthPatch = await call('PATCH', `/api/admin/orders/${demoOrderId}`, { body: { status: 'shipped' } })
check('PATCH without token → 401', unauthPatch.status === 401, `got ${unauthPatch.status}`)

// Leave the demo order as the seed found it.
await call('PATCH', `/api/admin/orders/${demoOrderId}`, {
  token,
  body: { status: 'pending', tracking_number: null, admin_note: null },
})

const restored = await call('GET', `/api/admin/orders/${demoOrderId}`, { token })
check('demo order restored to pending', restored.json?.data?.status === 'pending')

// --- products CRUD ----------------------------------------------------------
const adminProducts = await call('GET', '/api/admin/products', { token })
check('GET /api/admin/products → 200', adminProducts.status === 200, `got ${adminProducts.status}`)
check('lists the products', (adminProducts.json?.meta?.total ?? 0) >= 14, `total=${adminProducts.json?.meta?.total}`)
check('admin rows include guide fields', typeof adminProducts.json?.data?.[0]?.guide?.story === 'string')

const created = await call('POST', '/api/admin/products', {
  token,
  body: {
    name: 'Test Éclat',
    description: 'A composition created by the automated admin product test.',
    category_id: 3,
    gender: 'unisex',
    size_ml: 50,
    price: 99.5,
    stock: 7,
    top_notes: 'Bergamot, Lime',
    heart_notes: 'Basil, Neroli',
    base_notes: 'Musk, Cedar',
    color_a: '#f2e07a',
    color_b: '#8a7a2a',
    shape: 'tall',
    featured: true,
    rating: 4.2,
    tagline: 'Automated test fragrance.',
    story: 'Written by the admin API test to verify the editorial fields are stored.',
    longevity: '6 hours',
    sillage: 'Moderate',
    best_season: 'Summer',
    occasion: 'Testing',
  },
})
check('POST /api/admin/products → 201', created.status === 201, `got ${created.status} ${JSON.stringify(created.json)}`)
const newId = created.json?.data?.id
check('created product has an id', typeof newId === 'number')
check('auto-generated SKU when blank', /^LM-\d{3}$/.test(created.json?.data?.sku || ''),
  `sku=${created.json?.data?.sku}`)
check('story stored', created.json?.data?.guide?.story?.includes('editorial fields'), 
  `story=${created.json?.data?.guide?.story}`)

const missingField = await call('POST', '/api/admin/products', {
  token,
  body: { name: 'X', description: '', category_id: 1, gender: 'other', size_ml: 5, price: -3, stock: -1 },
})
check('invalid product → 422', missingField.status === 422, `got ${missingField.status}`)
check('validation reports the gender', Boolean(missingField.json?.errors?.gender))
check('validation reports the price', Boolean(missingField.json?.errors?.price))

const badColour = await call('POST', '/api/admin/products', {
  token,
  body: {
    name: 'Bad Colour Test',
    description: 'Colour validation check for the admin API test.',
    category_id: 1,
    gender: 'unisex',
    size_ml: 50,
    price: 50,
    stock: 1,
    shape: 'round',
    featured: false,
    rating: 3,
    color_a: 'not-a-colour',
  },
})
check('invalid hex colour → 422', badColour.status === 422 && Boolean(badColour.json?.errors?.color_a),
  `got ${badColour.status}`)

const duplicateSku = await call('POST', '/api/admin/products', {
  token,
  body: {
    name: 'Duplicate SKU Test',
    description: 'SKU uniqueness check for the admin API test.',
    sku: 'LM-001',
    category_id: 1,
    gender: 'unisex',
    size_ml: 50,
    price: 50,
    stock: 1,
    shape: 'round',
    featured: false,
    rating: 3,
  },
})
check('duplicate SKU → 422', duplicateSku.status === 422 && Boolean(duplicateSku.json?.errors?.sku),
  `got ${duplicateSku.status}`)

if (newId) {
  const patched = await call('PATCH', `/api/admin/products/${newId}`, {
    token,
    body: {
      name: 'Test Éclat Renamed',
      description: 'A composition created by the automated admin product test.',
      category_id: 3,
      gender: 'unisex',
      size_ml: 50,
      price: 89.0,
      stock: 12,
      top_notes: 'Bergamot, Lime',
      heart_notes: 'Basil, Neroli',
      base_notes: 'Musk, Cedar',
      color_a: '#f2e07a',
      color_b: '#8a7a2a',
      shape: 'tall',
      featured: false,
      rating: 4.5,
    },
  })
  check('PATCH /api/admin/products/{id} → 200', patched.status === 200, `got ${patched.status}`)
  check('product rename applied', patched.json?.data?.name === 'Test Éclat Renamed')
  check('price updated', patched.json?.data?.price === 89, `price=${patched.json?.data?.price}`)
  check('blank guide fields stay null', patched.json?.data?.guide?.story === null)
  check('SKU preserved when blank', /^LM-\d{3}$/.test(patched.json?.data?.sku || ''),
    `sku=${patched.json?.data?.sku}`)

  const listed = await call('GET', '/api/admin/products?search=Renamed', { token })
  check('search finds the updated product', (listed.json?.data ?? []).some((p) => p.id === newId))

  const deleted = await call('DELETE', `/api/admin/products/${newId}`, { token })
  check('DELETE /api/admin/products/{id} → 200', deleted.status === 200, `got ${deleted.status}`)

  const gone = await call('GET', `/api/admin/products/${newId}`, { token })
  check('deleted product → 404', gone.status === 404, `got ${gone.status}`)
}

const lowStock = await call('GET', '/api/admin/products?stock=out', { token })
check('stock filter finds sold-out items', lowStock.json?.data?.every((p) => p.stock === 0)
  && lowStock.json?.data?.length > 0)

// --- inbox + subscribers ----------------------------------------------------
const messages = await call('GET', '/api/admin/messages', { token })
check('GET /api/admin/messages → 200', messages.status === 200, `got ${messages.status}`)
check('seeded messages are present', (messages.json?.meta?.total ?? 0) >= 2, `total=${messages.json?.meta?.total}`)
check('unread messages are counted', (messages.json?.meta?.unread ?? 0) >= 1, `unread=${messages.json?.meta?.unread}`)
check('messages carry the customer email', typeof messages.json?.data?.[0]?.email === 'string')

const messageId = messages.json?.data?.find((m) => m.handled === false)?.id
if (messageId) {
  const handled = await call('PATCH', `/api/admin/messages/${messageId}`, { token, body: { handled: true } })
  check('PATCH message → handled', handled.status === 200 && handled.json?.data?.handled === true,
    `got ${handled.status}`)
}

const subscribers = await call('GET', '/api/admin/subscribers', { token })
check('GET /api/admin/subscribers → 200', subscribers.status === 200, `got ${subscribers.status}`)
check('subscribers are listed', (subscribers.json?.meta?.total ?? 0) >= 3, `total=${subscribers.json?.meta?.total}`)

// --- public guide endpoint --------------------------------------------------
const guide = await call('GET', '/api/products/1/guide')
check('GET /api/products/1/guide → 200', guide.status === 200, `got ${guide.status}`)
check('guide includes the story', typeof guide.json?.data?.story === 'string'
  && guide.json.data.story.length > 100)
check('guide explains three note layers', ['top', 'heart', 'base'].every(
  (key) => Array.isArray(guide.json?.data?.layers?.[key]?.notes),
))
check('guide note entries describe themselves', typeof guide.json?.data?.layers?.top?.notes?.[0]?.description === 'string')
check('guide includes a wearing profile', typeof guide.json?.data?.profile?.longevity === 'string')
check('guide includes layering suggestions', guide.json?.data?.layering?.length === 2,
  `layering=${guide.json?.data?.layering?.length}`)
check('guide includes an FAQ', guide.json?.data?.faq?.length >= 5,
  `faq=${guide.json?.data?.faq?.length}`)
check('guide includes the scent curve', guide.json?.data?.curve?.length === 3)
check('guide includes related guides', Array.isArray(guide.json?.data?.related))

const guide404 = await call('GET', '/api/products/9999/guide')
check('unknown guide → 404', guide404.status === 404, `got ${guide404.status}`)

const wrongMethod = await call('POST', '/api/admin/summary', { token })
check('wrong method → 405', wrongMethod.status === 405, `got ${wrongMethod.status}`)

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)
