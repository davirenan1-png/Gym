import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { todayKey, formatDate, BELT_LABELS, BELT_COLORS } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';

export function Today() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [todayPlan, setTodayPlan] = useState(null);
  const [dietMeals, setDietMeals] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [checkinDone, setCheckinDone] = useState(false);
  const date = todayKey();

  const load = useCallback(() => {
    api.dashboard(date).then(setData).catch(() => {});
    api.routine.list(date).then((r) => {
      const day = r.days.find((d) => d.position === r.cycle_position) || null;
      setTodayPlan(day);
      api.dietPlan.get(date).then((plan) => {
        setDietMeals(plan[day && day.is_training ? 'treino' : 'descanso'] || []);
      });
    });
    api.protocol.supplements(date).then((r) => setSupplements(r.supplements));
    api.checkin.today(date).then((r) => setCheckinDone(!!r.checkin));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addWater(ml) {
    setBusy(true);
    try {
      await api.water.add(ml, date);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSupplement(id) {
    await api.protocol.toggleSupplement(id, date);
    api.protocol.supplements(date).then((r) => setSupplements(r.supplements));
  }

  async function toggleMeal(meal) {
    setDietMeals(dietMeals.map((m) => (m.id === meal.id ? { ...m, done: !m.done } : m)));
    await api.dietPlan.toggleMeal(meal.id, date);
  }

  if (!data) return null;

  const waterGoal = Number(data.settings.water_goal_ml) || 3000;
  const mealsDone = dietMeals.filter((m) => m.done).length;

  return (
    <div>
      <div className="page-header">
        <h1>Hoje</h1>
        <span className="page-date">{formatDate(date)}</span>
      </div>

      <Card title="💧 Água">
        <ProgressBar
          value={data.water_ml}
          max={waterGoal}
          label={`${data.water_ml} ml / ${waterGoal} ml`}
          color="var(--accent)"
        />
        {data.water_ml < waterGoal && (
          <p style={{ margin: '8px 0 0', fontSize: '0.82rem' }}>
            Faltam {waterGoal - data.water_ml} ml para a meta de hoje.
          </p>
        )}
        <div className="quick-actions">
          <button className="btn" disabled={busy} onClick={() => addWater(250)}>+250 ml</button>
          <button className="btn" disabled={busy} onClick={() => addWater(500)}>+500 ml</button>
          <button className="btn" disabled={busy} onClick={() => addWater(750)}>+750 ml</button>
        </div>
      </Card>

      <Card title="🍽️ Dieta" action={<Link className="btn btn-sm" to="/dieta">Plano</Link>}>
        {dietMeals.length === 0 ? (
          <p className="empty-hint">Sem plano alimentar cadastrado.</p>
        ) : (
          <>
            <p style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>{mealsDone}/{dietMeals.length} refeições feitas hoje</p>
            <div className="list">
              {dietMeals.map((m) => (
                <label key={m.id} className="list-item" style={{ cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!m.done}
                      onChange={() => toggleMeal(m)}
                      style={{ width: 'auto', marginRight: 8 }}
                    />
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card title="🏋️ Treino & 🥋 Jiu-Jitsu">
        {todayPlan && (
          <p style={{ margin: '0 0 12px', fontSize: '0.85rem' }}>
            Plano de hoje: <strong>{todayPlan.title}</strong>
            {todayPlan.note ? ` — ${todayPlan.note}` : ''}
          </p>
        )}
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{data.workout_sessions_today > 0 ? '✅' : '—'}</div>
            <div className="stat-label">Musculação</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{data.jiujitsu_sessions_today > 0 ? '✅' : '—'}</div>
            <div className="stat-label">Jiu-Jitsu</div>
          </div>
        </div>
      </Card>

      <Card
        title="💊 Suplementos"
        action={<Link className="btn btn-sm" to="/protocolo">Protocolo</Link>}
      >
        {supplements.length === 0 ? (
          <p className="empty-hint">Nenhum suplemento cadastrado.</p>
        ) : (
          <div className="list">
            {supplements.map((s) => (
              <label key={s.id} className="list-item" style={{ cursor: 'pointer' }}>
                <span>
                  <input
                    type="checkbox"
                    checked={s.taken}
                    onChange={() => toggleSupplement(s.id)}
                    style={{ width: 'auto', marginRight: 8 }}
                  />
                  {s.name}
                </span>
                <span className="list-item-meta">{s.dose_note}</span>
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card title="📝 Diário do dia" action={<Link className="btn btn-sm" to="/diario">Abrir</Link>}>
        <p style={{ margin: 0 }}>
          {checkinDone
            ? '✅ Você já preencheu o check-in de hoje.'
            : 'Ainda não preencheu o check-in de hoje — leva menos de 1 minuto.'}
        </p>
      </Card>

      <Card title="⚖️ Peso & Faixa">
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">
              {data.latest_weight ? `${data.latest_weight.weight_kg} kg` : '—'}
            </div>
            <div className="stat-label">
              {data.latest_weight ? formatDate(data.latest_weight.date) : 'Sem registro'}
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">
              {data.belt ? (
                <span
                  className="badge"
                  style={{
                    background: BELT_COLORS[data.belt.belt],
                    color: data.belt.belt === 'branca' ? '#0f172a' : '#fff',
                  }}
                >
                  {BELT_LABELS[data.belt.belt]}
                </span>
              ) : (
                '—'
              )}
            </div>
            <div className="stat-label">
              {data.belt ? (data.belt.stripes > 0 ? `${data.belt.stripes} grau${data.belt.stripes > 1 ? 's' : ''}` : 'Sem grau') : 'Sem faixa'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
