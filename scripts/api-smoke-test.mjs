/**
 * API smoke test — exercises every endpoint against a running backend.
 *
 *   node scripts/api-smoke-test.mjs [baseUrl]
 *
 * Default base URL: http://127.0.0.1:8000
 */

const BASE = process.argv[2] || 'http://127.0.0.1:8000';

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non JSON response */
  }
  return { status: res.status, json };
}

console.log(`\nAPI smoke test → ${BASE}\n`);

// --- products ---------------------------------------------------------------
const list = await call('GET', '/api/products');
check('GET /api/products → 200', list.status === 200, `got ${list.status}`);
check('returns 14 products', list.json?.meta?.total === 14, `total=${list.json?.meta?.total}`);
check('product has notes pyramid', Array.isArray(list.json?.data?.[0]?.notes?.top));
check('product has colour palette', typeof list.json?.data?.[0]?.colors?.a === 'string');

const filtered = await call('GET', '/api/products?family=floral&sort=price_desc&limit=3');
check('family filter works', filtered.status === 200 && filtered.json.data.length <= 3);
check('family filter only returns florals', (filtered.json?.data ?? []).every((p) => p.category.slug === 'floral'));
check('sort=price_desc is ordered', (() => {
  const prices = (filtered.json?.data ?? []).map((p) => p.price);
  return prices.every((p, i) => i === 0 || prices[i - 1] >= p);
})());

const searched = await call('GET', '/api/products?search=oud');
check('search finds Oud Impérial', (searched.json?.data ?? []).some((p) => p.name === 'Oud Impérial'));

const featured = await call('GET', '/api/products?featured=1&limit=6');
check('featured filter returns only featured', (featured.json?.data ?? []).every((p) => p.featured === true));

const detail = await call('GET', '/api/products/1');
check('GET /api/products/1 → 200', detail.status === 200);
check('detail includes reviews', Array.isArray(detail.json?.data?.reviews) && detail.json.data.reviews.length > 0);
check('detail includes related', Array.isArray(detail.json?.data?.related));

const missing = await call('GET', '/api/products/9999');
check('unknown product → 404', missing.status === 404, `got ${missing.status}`);

// --- categories -------------------------------------------------------------
const categories = await call('GET', '/api/categories');
check('GET /api/categories → 200', categories.status === 200);
check('6 fragrance families with counts', categories.json?.data?.length === 6
  && categories.json.data.every((c) => typeof c.product_count === 'number'));

// --- orders -----------------------------------------------------------------
const order = await call('POST', '/api/orders', {
  customer_name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+44 20 7946 0958',
  address: '12 Analytical Engine Way',
  city: 'London',
  postal_code: 'SW1A 1AA',
  country: 'United Kingdom',
  notes: 'Please include a gift note.',
  items: [
    { product_id: 1, quantity: 1 },
    { product_id: 4, quantity: 2 },
  ],
});
check('POST /api/orders → 201', order.status === 201, `got ${order.status} ${JSON.stringify(order.json)}`);
check('order has reference', typeof order.json?.data?.reference === 'string');
check('subtotal calculated server-side', order.json?.data?.subtotal === 185 + 2 * 120, `subtotal=${order.json?.data?.subtotal}`);
check('free shipping above $150', order.json?.data?.shipping === 0, `shipping=${order.json?.data?.shipping}`);

const reference = order.json?.data?.reference;
if (reference) {
  const found = await call('GET', `/api/orders/${reference}`);
  check('GET /api/orders/{reference} → 200', found.status === 200);
  check('order lookup returns line items', found.json?.data?.items?.length === 2);
}

const invalidOrder = await call('POST', '/api/orders', {
  customer_name: 'A',
  email: 'not-an-email',
  address: '',
  city: '',
  postal_code: '',
  country: '',
  items: [],
});
check('invalid order → 422', invalidOrder.status === 422, `got ${invalidOrder.status}`);
check('validation lists field errors', typeof invalidOrder.json?.errors === 'object');
check('validation flags the email', Boolean(invalidOrder.json?.errors?.email));

const noItems = await call('POST', '/api/orders', {
  customer_name: 'Ada Lovelace',
  email: 'ada@example.com',
  address: '12 Analytical Engine Way',
  city: 'London',
  postal_code: 'SW1A 1AA',
  country: 'United Kingdom',
  items: [],
});
check('empty cart → 422', noItems.status === 422, `got ${noItems.status}`);

const outOfStock = await call('POST', '/api/orders', {
  customer_name: 'Ada Lovelace',
  email: 'ada@example.com',
  address: '12 Analytical Engine Way',
  city: 'London',
  postal_code: 'SW1A 1AA',
  country: 'United Kingdom',
  items: [{ product_id: 13, quantity: 1 }],
});
check('out-of-stock item → 409', outOfStock.status === 409, `got ${outOfStock.status}`);

// --- contact + newsletter ---------------------------------------------------
const contact = await call('POST', '/api/contact', {
  name: 'Grace Hopper',
  email: 'grace@example.com',
  subject: 'Fragrance consultation',
  message: 'I would love a recommendation for a summer wedding.',
});
check('POST /api/contact → 201', contact.status === 201, `got ${contact.status}`);

const badContact = await call('POST', '/api/contact', {
  name: 'G',
  email: 'nope',
  subject: 'x',
  message: 'short',
});
check('invalid contact → 422', badContact.status === 422, `got ${badContact.status}`);

const newsletter = await call('POST', '/api/newsletter', { email: 'ada@example.com' });
check('POST /api/newsletter → 2xx', [200, 201].includes(newsletter.status), `got ${newsletter.status}`);
const newsletterAgain = await call('POST', '/api/newsletter', { email: 'ada@example.com' });
check('duplicate newsletter subscribe is graceful', newsletterAgain.status === 200, `got ${newsletterAgain.status}`);

const badNewsletter = await call('POST', '/api/newsletter', { email: 'nope' });
check('invalid newsletter email → 422', badNewsletter.status === 422, `got ${badNewsletter.status}`);

// --- routing ----------------------------------------------------------------
const notFound = await call('GET', '/api/nope');
check('unknown endpoint → 404', notFound.status === 404, `got ${notFound.status}`);

const wrongMethod = await call('POST', '/api/products');
check('wrong method → 405', wrongMethod.status === 405, `got ${wrongMethod.status}`);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
