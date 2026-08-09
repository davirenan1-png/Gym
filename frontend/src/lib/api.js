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

  aircraft: {
    list: () => request('/aircraft'),
    get: (id) => request(`/aircraft/${id}`),
    create: (data) => request('/aircraft', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/aircraft/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/aircraft/${id}`, { method: 'DELETE' }),
  },

  maintenances: {
    list: (aircraftId) => request(`/maintenances${aircraftId ? `?aircraft_id=${aircraftId}` : ''}`),
    create: (data) => request('/maintenances', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/maintenances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/maintenances/${id}`, { method: 'DELETE' }),
    executar: (id, data) => request(`/maintenances/${id}/executar`, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  },

  components: {
    list: (aircraftId) => request(`/components${aircraftId ? `?aircraft_id=${aircraftId}` : ''}`),
    create: (data) => request('/components', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/components/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/components/${id}`, { method: 'DELETE' }),
    substituir: (id, data) => request(`/components/${id}/substituir`, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  },

  serviceOrders: {
    list: (aircraftId) => request(`/service-orders${aircraftId ? `?aircraft_id=${aircraftId}` : ''}`),
  },
};
