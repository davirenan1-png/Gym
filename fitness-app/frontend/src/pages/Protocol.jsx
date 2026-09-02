import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate } from '../lib/format.js';
import { Card } from '../components/Card.jsx';

const emptySupplement = { name: '', dose_note: '' };
const emptyErgogenic = { substance: '', dose_note: '', application_note: '', start_date: todayKey() };

export function Protocol() {
  const [supplements, setSupplements] = useState([]);
  const [ergogenics, setErgogenics] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [newSupplement, setNewSupplement] = useState(emptySupplement);
  const [newErgogenic, setNewErgogenic] = useState(emptyErgogenic);
  const date = todayKey();

  const load = useCallback(() => {
    api.protocol.supplements(date).then((r) => setSupplements(r.supplements));
    api.protocol.ergogenics().then(setErgogenics);
    api.protocol.ergogenicLogs(20).then(setLogs);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSupplement(id) {
    await api.protocol.toggleSupplement(id, date);
    load();
  }

  async function addSupplement(e) {
    e.preventDefault();
    if (!newSupplement.name) return;
    await api.protocol.addSupplement(newSupplement);
    setNewSupplement(emptySupplement);
    load();
  }

  async function removeSupplement(id) {
    await api.protocol.removeSupplement(id);
    load();
  }

  async function addErgogenic(e) {
    e.preventDefault();
    if (!newErgogenic.substance) return;
    await api.protocol.addErgogenic(newErgogenic);
    setNewErgogenic(emptyErgogenic);
    load();
  }

  async function removeErgogenic(id) {
    await api.protocol.removeErgogenic(id);
    load();
  }

  async function logApplication(id) {
    await api.protocol.addErgogenicLog(id, { date });
    load();
  }

  async function removeLog(id) {
    await api.protocol.removeErgogenicLog(id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Protocolo</h1>
        <button className="btn btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Concluir' : 'Editar'}
        </button>
      </div>

      <Card title="💊 Suplementação">
        {supplements.length === 0 ? (
          <p className="empty-hint">Nenhum suplemento cadastrado.</p>
        ) : (
          <div className="list">
            {supplements.map((s) => (
              <div key={s.id} className="list-item">
                {editMode ? (
                  <span style={{ flex: 1 }}>{s.name} — {s.dose_note}</span>
                ) : (
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={s.taken}
                      onChange={() => toggleSupplement(s.id)}
                      style={{ width: 'auto', marginRight: 8 }}
                    />
                    <span>{s.name}</span>
                  </label>
                )}
                {!editMode && <span className="list-item-meta">{s.dose_note}</span>}
                {editMode && <button className="remove-btn" onClick={() => removeSupplement(s.id)}>✕</button>}
              </div>
            ))}
          </div>
        )}

        {editMode && (
          <form onSubmit={addSupplement} className="field-row" style={{ marginTop: 12 }}>
            <input
              placeholder="Nome"
              value={newSupplement.name}
              onChange={(e) => setNewSupplement({ ...newSupplement, name: e.target.value })}
            />
            <input
              placeholder="Dose (ex: 5000ui/dia)"
              value={newSupplement.dose_note}
              onChange={(e) => setNewSupplement({ ...newSupplement, dose_note: e.target.value })}
            />
            <button className="btn" type="submit">+</button>
          </form>
        )}
      </Card>

      <Card title="🧪 Ergogênicos">
        {ergogenics.length === 0 ? (
          <p className="empty-hint">Nenhum item cadastrado.</p>
        ) : (
          <div className="list">
            {ergogenics.map((item) => (
              <div key={item.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{item.substance}</strong>
                  {editMode ? (
                    <button className="remove-btn" onClick={() => removeErgogenic(item.id)}>✕</button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => logApplication(item.id)}>Registrar hoje</button>
                  )}
                </div>
                <div className="list-item-meta">
                  {item.dose_note}{item.application_note ? ` · ${item.application_note}` : ''}
                  {item.start_date ? ` · desde ${formatDate(item.start_date)}` : ''}
                </div>
                <div className="list-item-meta">
                  Última aplicação: {item.last_application_date ? formatDate(item.last_application_date) : 'nenhuma registrada'}
                </div>
              </div>
            ))}
          </div>
        )}

        {editMode && (
          <form onSubmit={addErgogenic} style={{ marginTop: 12 }}>
            <div className="field-row">
              <input
                placeholder="Substância"
                value={newErgogenic.substance}
                onChange={(e) => setNewErgogenic({ ...newErgogenic, substance: e.target.value })}
              />
              <input
                placeholder="Dose (ex: 250mg)"
                value={newErgogenic.dose_note}
                onChange={(e) => setNewErgogenic({ ...newErgogenic, dose_note: e.target.value })}
              />
            </div>
            <div className="field-row">
              <input
                placeholder="Aplicação (ex: 1 ml)"
                value={newErgogenic.application_note}
                onChange={(e) => setNewErgogenic({ ...newErgogenic, application_note: e.target.value })}
              />
              <input
                type="date"
                value={newErgogenic.start_date}
                onChange={(e) => setNewErgogenic({ ...newErgogenic, start_date: e.target.value })}
              />
              <button className="btn" type="submit">+</button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Histórico de aplicações">
        {logs.length === 0 ? (
          <p className="empty-hint">Nenhuma aplicação registrada ainda.</p>
        ) : (
          <div className="list">
            {logs.map((log) => (
              <div className="list-item" key={log.id}>
                <span>{log.substance}</span>
                <span className="list-item-meta">{formatDate(log.date)}</span>
                <button className="remove-btn" onClick={() => removeLog(log.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
