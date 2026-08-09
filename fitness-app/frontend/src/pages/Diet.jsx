import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate, MEAL_LABELS } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../components/LineChart.jsx';

const emptyMeal = { meal_type: 'cafe', description: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' };

export function Diet() {
  const [food, setFood] = useState(null);
  const [meal, setMeal] = useState(emptyMeal);
  const [weights, setWeights] = useState([]);
  const [weightForm, setWeightForm] = useState({ weight_kg: '', note: '' });
  const date = todayKey();

  const load = useCallback(() => {
    api.food.today(date).then(setFood);
    api.weight.list(60).then(setWeights);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMeal(e) {
    e.preventDefault();
    if (!meal.description) return;
    await api.food.add({
      date,
      meal_type: meal.meal_type,
      description: meal.description,
      calories: meal.calories ? Number(meal.calories) : null,
      protein_g: meal.protein_g ? Number(meal.protein_g) : null,
      carbs_g: meal.carbs_g ? Number(meal.carbs_g) : null,
      fat_g: meal.fat_g ? Number(meal.fat_g) : null,
    });
    setMeal(emptyMeal);
    load();
  }

  async function removeMeal(id) {
    await api.food.remove(id);
    load();
  }

  async function addWeight(e) {
    e.preventDefault();
    if (!weightForm.weight_kg) return;
    await api.weight.add({ date, weight_kg: Number(weightForm.weight_kg), note: weightForm.note || null });
    setWeightForm({ weight_kg: '', note: '' });
    load();
  }

  async function removeWeight(id) {
    await api.weight.remove(id);
    load();
  }

  const chartPoints = weights.map((w) => ({ y: w.weight_kg, label: w.date.slice(5) }));

  return (
    <div>
      <div className="page-header">
        <h1>Dieta</h1>
        <span className="page-date">{formatDate(date)}</span>
      </div>

      <Card title="Evolução do peso">
        <LineChart points={chartPoints} unit="kg" color="#34d399" />
        <form onSubmit={addWeight} style={{ marginTop: 12 }}>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 0, flex: '0 0 110px' }}>
              <input
                type="number"
                step="0.1"
                placeholder="Peso (kg)"
                value={weightForm.weight_kg}
                onChange={(e) => setWeightForm({ ...weightForm, weight_kg: e.target.value })}
              />
            </div>
            <input
              placeholder="Observação (opcional)"
              value={weightForm.note}
              onChange={(e) => setWeightForm({ ...weightForm, note: e.target.value })}
            />
            <button className="btn btn-primary" type="submit">Salvar</button>
          </div>
        </form>
        {weights.length > 0 && (
          <div className="list" style={{ marginTop: 12 }}>
            {[...weights].reverse().slice(0, 5).map((w) => (
              <div className="list-item" key={w.id}>
                <span>{formatDate(w.date)}</span>
                <span>{w.weight_kg} kg</span>
                <button className="remove-btn" onClick={() => removeWeight(w.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Registrar refeição">
        <form onSubmit={addMeal}>
          <div className="chip-row">
            {Object.entries(MEAL_LABELS).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`chip${meal.meal_type === key ? ' active' : ''}`}
                onClick={() => setMeal({ ...meal, meal_type: key })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Descrição</label>
            <input
              placeholder="Ex: Arroz, frango e salada"
              value={meal.description}
              onChange={(e) => setMeal({ ...meal, description: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Calorias</label>
              <input type="number" value={meal.calories} onChange={(e) => setMeal({ ...meal, calories: e.target.value })} />
            </div>
            <div className="field">
              <label>Proteína (g)</label>
              <input type="number" value={meal.protein_g} onChange={(e) => setMeal({ ...meal, protein_g: e.target.value })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Carboidrato (g)</label>
              <input type="number" value={meal.carbs_g} onChange={(e) => setMeal({ ...meal, carbs_g: e.target.value })} />
            </div>
            <div className="field">
              <label>Gordura (g)</label>
              <input type="number" value={meal.fat_g} onChange={(e) => setMeal({ ...meal, fat_g: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary btn-block" type="submit">Adicionar refeição</button>
        </form>
      </Card>

      <Card title="Refeições de hoje">
        {!food?.logs?.length ? (
          <p className="empty-hint">Nenhuma refeição registrada hoje.</p>
        ) : (
          <>
            <div className="stat-grid" style={{ marginBottom: 12 }}>
              <div className="stat-tile">
                <div className="stat-value">{Math.round(food.totals.calories)}</div>
                <div className="stat-label">kcal</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{Math.round(food.totals.protein_g)}g</div>
                <div className="stat-label">Proteína</div>
              </div>
            </div>
            <div className="list">
              {food.logs.map((log) => (
                <div className="list-item" key={log.id}>
                  <div>
                    <div>{log.description}</div>
                    <div className="list-item-meta">
                      {MEAL_LABELS[log.meal_type]}
                      {log.calories ? ` · ${log.calories} kcal` : ''}
                    </div>
                  </div>
                  <button className="remove-btn" onClick={() => removeMeal(log.id)}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
