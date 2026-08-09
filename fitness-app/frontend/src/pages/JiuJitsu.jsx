import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate, FOCUS_LABELS, BELT_LABELS, BELT_COLORS } from '../lib/format.js';
import { Card } from '../components/Card.jsx';

const emptySession = {
  date: todayKey(),
  gi: true,
  focus: 'aula',
  duration_min: '',
  rounds: '',
  intensity: 3,
  notes: '',
};

export function JiuJitsu() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [belts, setBelts] = useState([]);
  const [form, setForm] = useState(emptySession);
  const [beltForm, setBeltForm] = useState({ belt: 'branca', stripes: 0, date_achieved: todayKey(), notes: '' });
  const [showBeltForm, setShowBeltForm] = useState(false);

  const load = useCallback(() => {
    api.jiujitsu.sessions(30).then(setSessions);
    api.jiujitsu.stats().then(setStats);
    api.jiujitsu.belt().then(setBelts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSession(e) {
    e.preventDefault();
    await api.jiujitsu.addSession({
      ...form,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      rounds: form.rounds ? Number(form.rounds) : null,
      intensity: Number(form.intensity),
    });
    setForm({ ...emptySession, date: form.date });
    load();
  }

  async function removeSession(id) {
    await api.jiujitsu.removeSession(id);
    load();
  }

  async function addBelt(e) {
    e.preventDefault();
    await api.jiujitsu.addBelt({ ...beltForm, stripes: Number(beltForm.stripes) });
    setShowBeltForm(false);
    load();
  }

  const currentBelt = belts[0];

  return (
    <div>
      <div className="page-header">
        <h1>Jiu-Jitsu</h1>
      </div>

      <Card title="Faixa">
        {currentBelt ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span
                className="badge"
                style={{
                  background: BELT_COLORS[currentBelt.belt],
                  color: currentBelt.belt === 'branca' ? '#0f172a' : '#fff',
                }}
              >
                {BELT_LABELS[currentBelt.belt]}
              </span>
              <span style={{ marginLeft: 8 }}>{currentBelt.stripes} graus</span>
              <div className="list-item-meta">desde {formatDate(currentBelt.date_achieved)}</div>
            </div>
            <button className="btn btn-sm" onClick={() => setShowBeltForm(!showBeltForm)}>Atualizar</button>
          </div>
        ) : (
          <button className="btn" onClick={() => setShowBeltForm(!showBeltForm)}>Registrar faixa atual</button>
        )}

        {showBeltForm && (
          <form onSubmit={addBelt} style={{ marginTop: 12 }}>
            <div className="field-row">
              <div className="field">
                <label>Faixa</label>
                <select value={beltForm.belt} onChange={(e) => setBeltForm({ ...beltForm, belt: e.target.value })}>
                  {Object.entries(BELT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Graus</label>
                <select value={beltForm.stripes} onChange={(e) => setBeltForm({ ...beltForm, stripes: e.target.value })}>
                  {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Data</label>
              <input type="date" value={beltForm.date_achieved} onChange={(e) => setBeltForm({ ...beltForm, date_achieved: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" type="submit">Salvar</button>
          </form>
        )}
      </Card>

      {stats && (
        <Card title="Estatísticas">
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-value">{stats.current_streak_days}</div>
              <div className="stat-label">Dias seguidos</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{stats.last_30_days}</div>
              <div className="stat-label">Últimos 30 dias</div>
            </div>
          </div>
        </Card>
      )}

      <Card title="Registrar treino">
        <form onSubmit={addSession}>
          <div className="field">
            <label>Data</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="chip-row">
            <button type="button" className={`chip${form.gi ? ' active' : ''}`} onClick={() => setForm({ ...form, gi: true })}>Gi</button>
            <button type="button" className={`chip${!form.gi ? ' active' : ''}`} onClick={() => setForm({ ...form, gi: false })}>No-Gi</button>
          </div>
          <div className="chip-row">
            {Object.entries(FOCUS_LABELS).map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={`chip${form.focus === key ? ' active' : ''}`}
                onClick={() => setForm({ ...form, focus: key })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="field-row">
            <div className="field">
              <label>Duração (min)</label>
              <input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
            </div>
            <div className="field">
              <label>Rounds de luta</label>
              <input type="number" value={form.rounds} onChange={(e) => setForm({ ...form, rounds: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Intensidade: {form.intensity}/5</label>
            <input
              type="range"
              min="1"
              max="5"
              value={form.intensity}
              onChange={(e) => setForm({ ...form, intensity: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Notas (técnicas, observações)</label>
            <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-block" type="submit">Salvar treino</button>
        </form>
      </Card>

      <Card title="Últimos treinos">
        {sessions.length === 0 ? (
          <p className="empty-hint">Nenhum treino registrado ainda.</p>
        ) : (
          <div className="list">
            {sessions.map((s) => (
              <div key={s.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{formatDate(s.date)}</strong>
                  <button className="remove-btn" onClick={() => removeSession(s.id)}>✕</button>
                </div>
                <div className="list-item-meta">
                  {s.gi ? 'Gi' : 'No-Gi'} · {FOCUS_LABELS[s.focus]}
                  {s.duration_min ? ` · ${s.duration_min}min` : ''}
                  {s.rounds ? ` · ${s.rounds} rounds` : ''}
                </div>
                {s.notes && <div className="list-item-meta">{s.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
