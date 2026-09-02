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

  backup: {
    export: () => request('/backup'),
    import: (backup) => request('/backup', { method: 'POST', body: JSON.stringify(backup) }),
  },

  routine: {
    list: () => request('/routine'),
    advance: () => request('/routine/advance', { method: 'PUT' }),
    setPosition: (position) => request('/routine/position', { method: 'PUT', body: JSON.stringify({ position }) }),
    updateNotes: (data) => request('/routine/notes', { method: 'PUT', body: JSON.stringify(data) }),
    updateDay: (id, data) => request(`/routine/days/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addExercise: (dayId, data) => request(`/routine/days/${dayId}/exercises`, { method: 'POST', body: JSON.stringify(data) }),
    updateExercise: (id, data) => request(`/routine/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeExercise: (id) => request(`/routine/exercises/${id}`, { method: 'DELETE' }),
  },

  dietPlan: {
    get: () => request('/dietplan'),
    updateNotes: (general_notes) => request('/dietplan/notes', { method: 'PUT', body: JSON.stringify({ general_notes }) }),
    updateMeal: (id, data) => request(`/dietplan/meals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addItem: (mealId, description) => request(`/dietplan/meals/${mealId}/items`, { method: 'POST', body: JSON.stringify({ description }) }),
    updateItem: (id, description) => request(`/dietplan/items/${id}`, { method: 'PUT', body: JSON.stringify({ description }) }),
    removeItem: (id) => request(`/dietplan/items/${id}`, { method: 'DELETE' }),
  },

  protocol: {
    supplements: (date) => request(`/protocol/supplements${date ? `?date=${date}` : ''}`),
    addSupplement: (data) => request('/protocol/supplements', { method: 'POST', body: JSON.stringify(data) }),
    updateSupplement: (id, data) => request(`/protocol/supplements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeSupplement: (id) => request(`/protocol/supplements/${id}`, { method: 'DELETE' }),
    toggleSupplement: (id, date) => request(`/protocol/supplements/${id}/toggle`, { method: 'POST', body: JSON.stringify({ date }) }),
    ergogenics: () => request('/protocol/ergogenics'),
    addErgogenic: (data) => request('/protocol/ergogenics', { method: 'POST', body: JSON.stringify(data) }),
    updateErgogenic: (id, data) => request(`/protocol/ergogenics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeErgogenic: (id) => request(`/protocol/ergogenics/${id}`, { method: 'DELETE' }),
    ergogenicLogs: (limit) => request(`/protocol/ergogenics/logs${limit ? `?limit=${limit}` : ''}`),
    addErgogenicLog: (id, data) => request(`/protocol/ergogenics/${id}/logs`, { method: 'POST', body: JSON.stringify(data) }),
    removeErgogenicLog: (id) => request(`/protocol/ergogenics/logs/${id}`, { method: 'DELETE' }),
  },

  checkin: {
    today: (date) => request(`/checkin/today${date ? `?date=${date}` : ''}`),
    save: (data) => request('/checkin', { method: 'POST', body: JSON.stringify(data) }),
    week: (start) => request(`/checkin/week${start ? `?start=${start}` : ''}`),
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
