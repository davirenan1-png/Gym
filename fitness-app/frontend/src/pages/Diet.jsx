import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../components/LineChart.jsx';
import { DietPlan } from '../components/DietPlan.jsx';

export function Diet() {
  const [weights, setWeights] = useState([]);
  const [weightForm, setWeightForm] = useState({ weight_kg: '', note: '' });
  const date = todayKey();

  const load = useCallback(() => {
    api.weight.list(60).then(setWeights);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

      <DietPlan />

      <Card title="Evolução do peso">
        <LineChart points={chartPoints} unit="kg" color="#f59e0b" />
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
    </div>
  );
}
