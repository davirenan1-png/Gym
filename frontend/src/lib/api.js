const BASE_URL = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  dashboard: () => request('/dashboard'),

  models: {
    list: () => request('/models'),
    get: (id) => request(`/models/${id}`),
    create: (data) => request('/models', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/models/${id}`, { method: 'DELETE' }),
    addItem: (modelId, data) => request(`/models/${modelId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (modelId, itemId, data) => request(`/models/${modelId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeItem: (modelId, itemId) => request(`/models/${modelId}/items/${itemId}`, { method: 'DELETE' }),
    bulkImport: (modelId, rows) => request(`/models/${modelId}/items/bulk`, { method: 'POST', body: JSON.stringify({ rows }) }),
  },

  aircraft: {
    list: () => request('/aircraft'),
    get: (id) => request(`/aircraft/${id}`),
    create: (data) => request('/aircraft', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/aircraft/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateCounters: (id, data) => request(`/aircraft/${id}/counters`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/aircraft/${id}`, { method: 'DELETE' }),
  },

  items: {
    list: (aircraftId) => request(`/aircraft/${aircraftId}/items`),
    create: (aircraftId, data) => request(`/aircraft/${aircraftId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/items/${id}`, { method: 'DELETE' }),
    executar: (id, data) => request(`/items/${id}/executar`, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  },
};
