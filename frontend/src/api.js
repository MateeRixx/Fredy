const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* noop */
    }
    throw new Error(detail)
  }
  return res.json()
}

export const api = {
  health: () => request('/health'),

  generate: (body) => request('/data/generate', { method: 'POST', body: JSON.stringify(body) }),
  generateUlb: (body) => request('/data/generate-ulb', { method: 'POST', body: JSON.stringify(body) }),
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(BASE + '/data/upload', { method: 'POST', body: fd }).then(async (res) => {
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { detail = (await res.json()).detail || detail } catch { /* noop */ }
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