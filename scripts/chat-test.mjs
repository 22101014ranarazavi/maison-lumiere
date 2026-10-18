/**
 * Chatbot API tests — hits POST /api/chat and asserts the intent engine
 * answers the way the widget expects.
 *
 *   node scripts/chat-test.mjs
 */

const BASE = process.env.API_BASE || 'http://127.0.0.1:8000'

let passed = 0
let failed = 0

function check(label, condition, detail = '') {
  if (condition) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`)
  }
}

async function chat(message) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

function describe(name, result) {
  const data = result.json?.data
  return `${name}: status=${result.status} intent=${data?.intent} products=${data?.products?.length}`
}

const cases = [
  { msg: 'hi', intent: 'greeting' },
  { msg: 'good morning', intent: 'greeting' },
  { msg: 'thanks so much', intent: 'thanks' },
  { msg: 'bye for now', intent: 'farewell' },
  { msg: 'what can you do?', intent: 'help' },
  { msg: "Where is my order LM-7C2F9A?", intent: 'order_status', contains: ['LM-7C2F9A'] },
  { msg: 'please track LM-000000', intent: 'order_status', contains: ["can't find"] },
  { msg: "What is Nuit d'Or like?", intent: 'product_detail', productName: "Nuit d'Or" },
  { msg: 'Tell me about oud', intent: 'note_detail' },
  { msg: 'what does bergamot smell like?', intent: 'note_detail' },
  { msg: 'something under $120', intent: 'budget', maxPrice: 120 },
  { msg: 'something for a summer wedding', intent: 'wearing_advice' },
  { msg: 'which lasts the longest?', intent: 'longevity' },
  { msg: "can I layer Nuit d'Or?", intent: 'layering' },
  { msg: 'what is extrait de parfum?', intent: 'format' },
  { msg: 'how long does shipping take?', intent: 'shipping' },
  { msg: 'what is your returns policy?', intent: 'returns' },
  { msg: 'do you take paypal?', intent: 'payment' },
  { msg: 'i need to speak to a human', intent: 'contact' },
  { msg: 'a perfume for my wife', intent: 'gender' },
  { msg: 'something floral please', intent: 'family' },
  { msg: 'what do you recommend?', intent: 'recommend', minProducts: 1 },
  { msg: "what's popular?", intent: 'bestsellers' },
  { msg: 'a gift for my girlfriend', intent: 'gift' },
  { msg: "Nuit d'Or or Cèdre Blanc?", intent: 'comparison' },
  { msg: 'asdf qwer zxcv', intent: 'fallback' },
]

console.log('Chatbot API tests\n')

for (const testCase of cases) {
  const result = await chat(testCase.msg)
  const data = result.json?.data

  check(`${describe(testCase.msg, result)} → ${testCase.intent}`, data?.intent === testCase.intent)

  if (data) {
    check(`   reply is prose`, typeof data.reply === 'string' && data.reply.length > 20)
    check(`   suggestions present`, Array.isArray(data.suggestions) && data.suggestions.length > 0)
    check(`   products is an array`, Array.isArray(data.products))
  }

  if (testCase.contains) {
    for (const fragment of testCase.contains) {
      check(`   reply contains "${fragment}"`, (data?.reply || '').includes(fragment))
    }
  }

  if (testCase.productName) {
    check(`   first product is ${testCase.productName}`, data?.products?.[0]?.name === testCase.productName)
  }

  if (testCase.maxPrice) {
    check(
      `   every product ≤ $${testCase.maxPrice}`,
      (data?.products || []).every((p) => p.price <= testCase.maxPrice)
    )
  }

  if (testCase.minProducts) {
    check(`   at least ${testCase.minProducts} product`, (data?.products?.length || 0) >= testCase.minProducts)
  }

  check(`   cards carry the fields the widget needs`, (data?.products || []).every(
    (p) => typeof p.id === 'number' && typeof p.name === 'string' && 'price' in p && 'colors' in p
  ))
}

// --- validation -------------------------------------------------------------
const empty = await chat('')
check(`empty message → 422 (got ${empty.status})`, empty.status === 422)

const blank = await chat('   ')
check(`blank message → 422 (got ${blank.status})`, blank.status === 422)

const long = await chat('x'.repeat(501))
check(`over-long message → 422 (got ${long.status})`, long.status === 422)

const wrongMethod = await fetch(`${BASE}/api/chat`)
check(`GET /api/chat → 405 (got ${wrongMethod.status})`, wrongMethod.status === 405)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
