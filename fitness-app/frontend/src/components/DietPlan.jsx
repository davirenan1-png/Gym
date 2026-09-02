import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey } from '../lib/format.js';
import { Card } from './Card.jsx';

export function DietPlan() {
  const [plan, setPlan] = useState(null);
  const [generalNotes, setGeneralNotes] = useState('');
  const [planType, setPlanType] = useState('treino');
  const [editMode, setEditMode] = useState(false);
  const [newItemText, setNewItemText] = useState({});
  const date = todayKey();

  const load = useCallback(() => {
    api.dietPlan.get(date).then((data) => {
      setPlan(data);
      setGeneralNotes(data.general_notes || '');
    });
    api.routine.list(date).then((r) => {
      const day = r.days.find((d) => d.position === r.cycle_position);
      if (day) setPlanType(day.is_training ? 'treino' : 'descanso');
    });
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  if (!plan) return null;

  const meals = plan[planType] || [];
  const doneCount = meals.filter((m) => m.done).length;

  async function toggleMeal(meal) {
    const updated = plan[planType].map((m) => (m.id === meal.id ? { ...m, done: !m.done } : m));
    setPlan({ ...plan, [planType]: updated });
    await api.dietPlan.toggleMeal(meal.id, date);
  }

  function updateLocalMeal(id, patch) {
    setPlan({
      ...plan,
      [planType]: plan[planType].map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  }

  function updateLocalItem(mealId, itemId, description) {
    setPlan({
      ...plan,
      [planType]: plan[planType].map((m) =>
        m.id !== mealId ? m : { ...m, items: m.items.map((it) => (it.id === itemId ? { ...it, description } : it)) }
      ),
    });
  }

  async function saveMeal(meal) {
    await api.dietPlan.updateMeal(meal.id, { label: meal.label, notes: meal.notes });
  }

  async function saveItem(item) {
    await api.dietPlan.updateItem(item.id, item.description);
  }

  async function removeItem(id) {
    await api.dietPlan.removeItem(id);
    load();
  }

  async function addItem(mealId) {
    const text = (newItemText[mealId] || '').trim();
    if (!text) return;
    await api.dietPlan.addItem(mealId, text);
    setNewItemText({ ...newItemText, [mealId]: '' });
    load();
  }

  async function saveGeneralNotes() {
    await api.dietPlan.updateNotes(generalNotes);
  }

  return (
    <Card
      title="🍱 Plano alimentar"
      action={
        <button className="btn btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Concluir' : 'Editar'}
        </button>
      }
    >
      <div className="chip-row">
        <button className={`chip${planType === 'treino' ? ' active' : ''}`} onClick={() => setPlanType('treino')}>
          Dias de treino
        </button>
        <button className={`chip${planType === 'descanso' ? ' active' : ''}`} onClick={() => setPlanType('descanso')}>
          Dias de descanso
        </button>
      </div>

      {!editMode && meals.length > 0 && (
        <p style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>
          {doneCount}/{meals.length} refeições feitas hoje
        </p>
      )}

      <div className="list">
        {meals.map((meal) => (
          <div key={meal.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
            {editMode ? (
              <input
                value={meal.label}
                onChange={(e) => updateLocalMeal(meal.id, { label: e.target.value })}
                onBlur={() => saveMeal(meal)}
                style={{ fontWeight: 600 }}
              />
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={!!meal.done}
                  onChange={() => toggleMeal(meal)}
                  style={{ width: 'auto', marginRight: 8 }}
                />
                {meal.label}
              </label>
            )}

            <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
              {meal.items.map((item) =>
                editMode ? (
                  <li key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'center', listStyle: 'none', marginLeft: -18 }}>
                    <input
                      value={item.description}
                      onChange={(e) => updateLocalItem(meal.id, item.id, e.target.value)}
                      onBlur={() => saveItem(item)}
                    />
                    <button className="remove-btn" onClick={() => removeItem(item.id)}>✕</button>
                  </li>
                ) : (
                  <li key={item.id} style={{ fontSize: '0.88rem' }}>{item.description}</li>
                )
              )}
            </ul>

            {editMode ? (
              <div className="field-row" style={{ marginTop: 4 }}>
                <input
                  placeholder="Novo item"
                  value={newItemText[meal.id] || ''}
                  onChange={(e) => setNewItemText({ ...newItemText, [meal.id]: e.target.value })}
                />
                <button className="btn btn-sm" onClick={() => addItem(meal.id)}>+</button>
              </div>
            ) : null}

            {editMode ? (
              <input
                value={meal.notes || ''}
                placeholder="Observação (opcional)"
                onChange={(e) => updateLocalMeal(meal.id, { notes: e.target.value })}
                onBlur={() => saveMeal(meal)}
                style={{ marginTop: 4 }}
              />
            ) : (
              meal.notes && <div className="list-item-meta">{meal.notes}</div>
            )}
          </div>
        ))}
      </div>

      {editMode ? (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Indicações gerais (uma linha por item)</label>
          <textarea rows="5" value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} onBlur={saveGeneralNotes} />
        </div>
      ) : (
        generalNotes && (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: '0.78rem' }}>
            {generalNotes.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} style={{ marginBottom: 2 }}>{line}</li>
            ))}
          </ul>
        )
      )}
    </Card>
  );
}
