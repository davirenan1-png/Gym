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
  dashboard: (date) => request(`/dashboard${date ? `?date=${date}` : ''}`),

  settings: {
    get: () => request('/settings'),
    update: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  water: {
    today: (date) => request(`/water${date ? `?date=${date}` : ''}`),
    history: (days = 14) => request(`/water/history?days=${days}`),
    add: (amount_ml, date) => request('/water', { method: 'POST', body: JSON.stringify({ amount_ml, date }) }),
    remove: (id) => request(`/water/${id}`, { method: 'DELETE' }),
  },

  weight: {
    list: (limit) => request(`/weight${limit ? `?limit=${limit}` : ''}`),
    add: (data) => request('/weight', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/weight/${id}`, { method: 'DELETE' }),
  },

  food: {
    today: (date) => request(`/food${date ? `?date=${date}` : ''}`),
    add: (data) => request('/food', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id) => request(`/food/${id}`, { method: 'DELETE' }),
  },

  workouts: {
    exercises: () => request('/workouts/exercises'),
    addExercise: (data) => request('/workouts/exercises', { method: 'POST', body: JSON.stringify(data) }),
    removeExercise: (id) => request(`/workouts/exercises/${id}`, { method: 'DELETE' }),
    progress: (exerciseId) => request(`/workouts/exercises/${exerciseId}/progress`),
    sessions: (limit) => request(`/workouts/sessions${limit ? `?limit=${limit}` : ''}`),
    addSession: (data) => request('/workouts/sessions', { method: 'POST', body: JSON.stringify(data) }),
    removeSession: (id) => request(`/workouts/sessions/${id}`, { method: 'DELETE' }),
  },

  routine: {
    list: () => request('/routine'),
    updateDay: (weekday, data) => request(`/routine/${weekday}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateNote: (note) => request('/routine/note', { method: 'PUT', body: JSON.stringify({ note }) }),
    addExercise: (weekday, data) => request(`/routine/${weekday}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
    updateExercise: (id, data) => request(`/routine/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeExercise: (id) => request(`/routine/exercises/${id}`, { method: 'DELETE' }),
  },

  jiujitsu: {
    sessions: (limit) => request(`/jiujitsu/sessions${limit ? `?limit=${limit}` : ''}`),
    addSession: (data) => request('/jiujitsu/sessions', { method: 'POST', body: JSON.stringify(data) }),
    removeSession: (id) => request(`/jiujitsu/sessions/${id}`, { method: 'DELETE' }),
    stats: () => request('/jiujitsu/stats'),
    belt: () => request('/jiujitsu/belt'),
    addBelt: (data) => request('/jiujitsu/belt', { method: 'POST', body: JSON.stringify(data) }),
    removeBelt: (id) => request(`/jiujitsu/belt/${id}`, { method: 'DELETE' }),
  },
};
