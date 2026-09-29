const BASE = '/api'

function errorMessage(detail, fallback) {
  if (typeof detail === 'string' && detail.trim()) return detail

  if (Array.isArray(detail)) {
    const messages = detail.map((issue) => {
      if (typeof issue === 'string') return issue
      if (!issue || typeof issue !== 'object') return ''

      const path = Array.isArray(issue.loc)
        ? issue.loc.filter((part) => part !== 'body').join(' → ')
        : ''
      const message = typeof issue.msg === 'string'
        ? issue.msg
        : typeof issue.message === 'string' ? issue.message : ''
      return path && message ? `${path}: ${message}` : message
    }).filter(Boolean)

    return messages.length ? messages.join('; ') : fallback
  }

  if (detail && typeof detail === 'object') {
    const message = detail.message || detail.error
    if (typeof message === 'string' && message.trim()) return message
    try {
      return JSON.stringify(detail)
    } catch {
      return fallback
    }
  }

  return fallback
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('fredy:unauthorized'))
    }
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = errorMessage(body.detail, detail)
    } catch {
      /* noop */
    }
    throw new Error(detail)
  }
  return res.json()
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  session: () => request('/auth/session'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  health: () => request('/health'),

  generate: (body) => request('/data/generate', { method: 'POST', body: JSON.stringify(body) }),
  generateUlb: (body) => request('/data/generate-ulb', { method: 'POST', body: JSON.stringify(body) }),
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(BASE + '/data/upload', { method: 'POST', body: fd, credentials: 'same-origin' }).then(async (res) => {
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try {
          const body = await res.json()
          detail = errorMessage(body.detail, detail)
        } catch { /* noop */ }
        throw new Error(detail)
      }
      return res.json()
    })
  },
  dataStatus: () => request('/data/status'),
  dataPreview: (limit = 30) => request(`/data/preview?limit=${limit}`),

  train: (body) => request('/model/train', { method: 'POST', body: JSON.stringify(body) }),
  modelStatus: () => request('/model/status'),

  scoreTransaction: (txn) => request('/score/transaction', { method: 'POST', body: JSON.stringify({ transaction: txn }) }),
  scoreBatch: (txns) => request('/score/batch', { method: 'POST', body: JSON.stringify({ transactions: txns }) }),
  scoreStats: () => request('/score/statistics'),
  scored: (params = '') => request(`/scored${params}`),

  alerts: (params = '') => request(`/alerts${params}`),
  updateAlert: (id, body) => request(`/alerts/${id}/update`, { method: 'POST', body: JSON.stringify(body) }),

  benchmark: (body) => request('/benchmark/run', { method: 'POST', body: JSON.stringify(body) }),
  appInfo: () => request('/app-info'),
}

export default api
