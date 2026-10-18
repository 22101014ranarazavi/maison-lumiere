/** Quick health check: node scripts/check-services.mjs */
const checks = [
  ['Vite dev server', 'http://localhost:5173/'],
  ['PHP API', 'http://127.0.0.1:8000/api/categories'],
]

for (const [label, url] of checks) {
  try {
    const res = await fetch(url)
    console.log(`${label}: ${res.status} ${res.ok ? 'OK' : ''}`)
  } catch (error) {
    console.log(`${label}: DOWN (${error.message})`)
  }
}
