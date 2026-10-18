/**
 * Thin client for the PHP API.
 *
 * In development Vite proxies /api to http://127.0.0.1:8000 (see vite.config.js),
 * in production set VITE_API_BASE to wherever the PHP backend is hosted.
 */
const BASE = import.meta.env.VITE_API_BASE || '/api'

const ADMIN_TOKEN_KEY = 'maison_admin_token'

export function getAdminToken() {
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  } catch {
    /* storage unavailable */
  }
}

export function clearAdminToken() {
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}

  if (body) headers['Content-Type'] = 'application/json'

  const authToken = token !== undefined ? token : path.startsWith('/admin') ? getAdminToken() : null
  if (authToken) headers['X-Admin-Token'] = authToken

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    /* response was not JSON */
  }

  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/admin') && !path.endsWith('/login')) {
      clearAdminToken()
      window.dispatchEvent(new Event('admin:unauthorized'))
    }

    const error = new Error(payload?.message || `Request failed (${response.status})`)
    error.status = response.status
    error.errors = payload?.errors || null
    throw error
  }

  return payload
}

function toQuery(params) {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') return
    query.append(key, value)
  })

  const stringified = query.toString()
  return stringified ? `?${stringified}` : ''
}

export const api = {
  // storefront
  listProducts: (params = {}) => request(`/products${toQuery(params)}`),
  getProduct: (id) => request(`/products/${id}`),
  getGuide: (id) => request(`/products/${id}/guide`),
  listCategories: () => request('/categories'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  getOrder: (reference) => request(`/orders/${encodeURIComponent(reference)}`),
  sendContact: (payload) => request('/contact', { method: 'POST', body: payload }),
  subscribe: (email) => request('/newsletter', { method: 'POST', body: { email } }),
  chat: (message) => request('/chat', { method: 'POST', body: { message } }),

  // admin
  adminLogin: (key) => request('/admin/login', { method: 'POST', body: { key }, token: null }),
  adminSummary: () => request('/admin/summary'),
  adminOrders: (params = {}) => request(`/admin/orders${toQuery(params)}`),
  adminOrder: (id) => request(`/admin/orders/${id}`),
  adminUpdateOrder: (id, payload) => request(`/admin/orders/${id}`, { method: 'PATCH', body: payload }),
  adminProducts: (params = {}) => request(`/admin/products${toQuery(params)}`),
  adminProduct: (id) => request(`/admin/products/${id}`),
  adminCreateProduct: (payload) => request('/admin/products', { method: 'POST', body: payload }),
  adminUpdateProduct: (id, payload) => request(`/admin/products/${id}`, { method: 'PATCH', body: payload }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  adminMessages: (params = {}) => request(`/admin/messages${toQuery(params)}`),
  adminUpdateMessage: (id, payload) => request(`/admin/messages/${id}`, { method: 'PATCH', body: payload }),
  adminSubscribers: (params = {}) => request(`/admin/subscribers${toQuery(params)}`),
}

/** Shared helper for admin screens: "2026-10-09 11:24:00" -> Date */
export function parseDate(value) {
  if (!value) return null
  // MySQL DATETIME strings are not parsed consistently across browsers.
  return new Date(String(value).replace(' ', 'T'))
}

export function formatDateTime(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
