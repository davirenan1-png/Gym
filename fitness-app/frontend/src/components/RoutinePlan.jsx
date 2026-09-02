import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { Card } from './Card.jsx';

const emptyNewExercise = { name: '', sets_reps: '', notes: '' };

function NoteList({ text }) {
  const lines = (text || '').split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: '0.78rem' }}>
      {lines.map((line, i) => (
        <li key={i} style={{ marginBottom: 2 }}>{line}</li>
      ))}
    </ul>
  );
}

export function RoutinePlan({ onUseExercise }) {
  const [days, setDays] = useState(null);
  const [cyclePosition, setCyclePosition] = useState(0);
  const [principlesNote, setPrinciplesNote] = useState('');
  const [extrasNote, setExtrasNote] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newExercise, setNewExercise] = useState(emptyNewExercise);

  const load = useCallback(() => {
    api.routine.list().then((data) => {
      setDays(data.days);
      setCyclePosition(data.cycle_position);
      setPrinciplesNote(data.principles_note || '');
      setExtrasNote(data.extras_note || '');
      setSelectedPosition((prev) => (prev === null ? data.cycle_position : prev));
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!days) return null;

  const day = days.find((d) => d.position === selectedPosition) || days[0];
  const isCurrent = day.position === cyclePosition;

  function updateLocalItem(id, patch) {
    setDays(days.map((d) => (d.id !== day.id ? d : {
      ...d,
      exercises: d.exercises.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    })));
  }

  async function saveItem(item) {
    await api.routine.updateExercise(item.id, {
      name: item.name,
      sets_reps: item.sets_reps,
      notes: item.notes,
    });
  }

  async function removeItem(id) {
    await api.routine.removeExercise(id);
    load();
  }

  async function saveDayInfo(patch) {
    const updated = { ...day, ...patch };
    setDays(days.map((d) => (d.id !== day.id ? d : updated)));
    await api.routine.updateDay(day.id, { title: updated.title, note: updated.note });
  }

  async function addExercise(e) {
    e.preventDefault();
    if (!newExercise.name) return;
    await api.routine.addExercise(day.id, newExercise);
    setNewExercise(emptyNewExercise);
    load();
  }

  async function advance() {
    const res = await api.routine.advance();
    setCyclePosition(res.cycle_position);
    setSelectedPosition(res.cycle_position);
  }

  async function markAsToday() {
    await api.routine.setPosition(day.position);
    setCyclePosition(day.position);
  }

  async function saveNotes() {
    await api.routine.updateNotes({ principles_note: principlesNote, extras_note: extrasNote });
  }

  return (
    <Card
      title="🔁 Plano do ciclo"
      action={
        <button className="btn btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Concluir' : 'Editar'}
        </button>
      }
    >
      <div className="chip-row">
        {days.map((d) => (
          <button
            key={d.id}
            className={`chip${selectedPosition === d.position ? ' active' : ''}`}
            onClick={() => setSelectedPosition(d.position)}
          >
            {d.title}
            {d.position === cyclePosition ? ' •' : ''}
          </button>
        ))}
      </div>

      {editMode ? (
        <div className="field">
          <label>Título do dia</label>
          <input value={day.title} onChange={(e) => saveDayInfo({ title: e.target.value })} />
          <label style={{ marginTop: 8 }}>Observação do dia</label>
          <input
            value={day.note || ''}
            onChange={(e) => saveDayInfo({ note: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      ) : (
        <>
          <h2 style={{ marginBottom: 4 }}>
            {day.title} {isCurrent && <span className="badge" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>hoje</span>}
          </h2>
          {day.note && <p style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>{day.note}</p>}
        </>
      )}

      {!day.is_training && !editMode && (
        <p className="empty-hint">Dia de descanso — sem exercícios de musculação.</p>
      )}
      {day.is_training === 1 && day.exercises.length === 0 && !editMode && (
        <p className="empty-hint">Sem exercícios planejados para este dia.</p>
      )}

      <div className="list">
        {day.exercises.map((item) =>
          editMode ? (
            <div key={item.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div className="field-row">
                <input
                  value={item.name}
                  onChange={(e) => updateLocalItem(item.id, { name: e.target.value })}
                  onBlur={() => saveItem(item)}
                  placeholder="Exercício"
                />
                <button className="remove-btn" onClick={() => removeItem(item.id)}>✕</button>
              </div>
              <div className="field-row">
                <input
                  value={item.sets_reps || ''}
                  onChange={(e) => updateLocalItem(item.id, { sets_reps: e.target.value })}
                  onBlur={() => saveItem(item)}
                  placeholder="Séries x reps"
                />
                <input
                  value={item.notes || ''}
                  onChange={(e) => updateLocalItem(item.id, { notes: e.target.value })}
                  onBlur={() => saveItem(item)}
                  placeholder="Observação (opcional)"
                />
              </div>
            </div>
          ) : (
            <div key={item.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{item.name}</strong>
                {onUseExercise && (
                  <button className="btn btn-sm" onClick={() => onUseExercise(item.name)}>Usar</button>
                )}
              </div>
              <div className="list-item-meta">
                {item.sets_reps}
                {item.notes ? ` · ${item.notes}` : ''}
              </div>
            </div>
          )
        )}
      </div>

      {editMode && day.is_training === 1 && (
        <form onSubmit={addExercise} style={{ marginTop: 12 }}>
          <div className="field-row">
            <input
              placeholder="Novo exercício"
              value={newExercise.name}
              onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
            />
            <input
              placeholder="Séries x reps"
              value={newExercise.sets_reps}
              onChange={(e) => setNewExercise({ ...newExercise, sets_reps: e.target.value })}
            />
            <button className="btn" type="submit">+</button>
          </div>
        </form>
      )}

      {!editMode && (
        <div className="quick-actions" style={{ marginTop: 12 }}>
          {isCurrent ? (
            <button className="btn btn-primary btn-block" onClick={advance}>
              ✅ Concluí — avançar pro próximo dia
            </button>
          ) : (
            <button className="btn btn-block" onClick={markAsToday}>
              Marcar &quot;{day.title}&quot; como hoje
            </button>
          )}
        </div>
      )}

      {editMode ? (
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <label>Princípios (uma linha por item)</label>
            <textarea rows="4" value={principlesNote} onChange={(e) => setPrinciplesNote(e.target.value)} onBlur={saveNotes} />
          </div>
          <div className="field">
            <label>Abs / panturrilha / cardio (uma linha por item)</label>
            <textarea rows="3" value={extrasNote} onChange={(e) => setExtrasNote(e.target.value)} onBlur={saveNotes} />
          </div>
        </div>
      ) : (
        <>
          <NoteList text={principlesNote} />
          <NoteList text={extrasNote} />
        </>
      )}
    </Card>
  );
}
