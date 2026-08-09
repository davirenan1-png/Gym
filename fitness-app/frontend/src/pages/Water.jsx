import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate, formatShortDate } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';

export function Water() {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [goal, setGoal] = useState(3000);
  const [custom, setCustom] = useState('');
  const date = todayKey();

  const load = useCallback(() => {
    api.water.today(date).then(setToday);
    api.water.history(14).then(setHistory);
    api.settings.get().then((s) => setGoal(Number(s.water_goal_ml) || 3000));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(ml) {
    if (!ml) return;
    await api.water.add(ml, date);
    setCustom('');
    load();
  }

  async function remove(id) {
    await api.water.remove(id);
    load();
  }

  const maxHistory = Math.max(goal, ...history.map((h) => h.total_ml || 0), 1);

  return (
    <div>
      <div className="page-header">
        <h1>Água</h1>
        <span className="page-date">{formatDate(date)}</span>
      </div>

      <Card>
        <ProgressBar
          value={today?.total_ml || 0}
          max={goal}
          label={`${today?.total_ml || 0} ml / ${goal} ml`}
        />
        <div className="quick-actions">
          <button className="btn" onClick={() => add(200)}>+200 ml</button>
          <button className="btn" onClick={() => add(250)}>+250 ml</button>
          <button className="btn" onClick={() => add(500)}>+500 ml</button>
          <button className="btn" onClick={() => add(1000)}>+1L</button>
        </div>
        <div className="field-row" style={{ marginTop: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              type="number"
              placeholder="ml personalizado"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => add(Number(custom))}>Adicionar</button>
        </div>
      </Card>

      <Card title="Registros de hoje">
        {!today?.logs?.length ? (
          <p className="empty-hint">Nenhum registro ainda hoje.</p>
        ) : (
          <div className="list">
            {today.logs.map((log) => (
              <div className="list-item" key={log.id}>
                <span>{log.amount_ml} ml</span>
                <span className="list-item-meta">{log.logged_at.slice(11, 16)}</span>
                <button className="remove-btn" onClick={() => remove(log.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Últimos 14 dias">
        <div className="list">
          {history.map((h) => (
            <div key={h.date} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{formatShortDate(h.date)}</span>
                <span className="list-item-meta">{h.total_ml || 0} ml</span>
              </div>
              <ProgressBar value={h.total_ml || 0} max={maxHistory} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
