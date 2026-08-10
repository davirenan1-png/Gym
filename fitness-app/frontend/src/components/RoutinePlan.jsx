import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { WEEKDAYS, WEEKDAY_SHORT_LABELS, todayWeekdayKey } from '../lib/format.js';
import { Card } from './Card.jsx';

const emptyNewExercise = { name: '', sets_reps: '', notes: '' };

export function RoutinePlan({ onUseExercise }) {
  const [days, setDays] = useState(null);
  const [generalNote, setGeneralNote] = useState('');
  const [selected, setSelected] = useState(todayWeekdayKey());
  const [editMode, setEditMode] = useState(false);
  const [newExercise, setNewExercise] = useState(emptyNewExercise);

  const load = useCallback(() => {
    api.routine.list().then((data) => {
      setDays(data.days);
      setGeneralNote(data.general_note || '');
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!days) return null;

  const day = days.find((d) => d.weekday === selected);
  const today = todayWeekdayKey();

  function updateLocalItem(id, patch) {
    setDays(days.map((d) => (d.weekday !== selected ? d : {
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
    setDays(days.map((d) => (d.weekday !== selected ? d : updated)));
    await api.routine.updateDay(selected, { title: updated.title, note: updated.note });
  }

  async function addExercise(e) {
    e.preventDefault();
    if (!newExercise.name) return;
    await api.routine.addExercise(selected, newExercise);
    setNewExercise(emptyNewExercise);
    load();
  }

  async function saveGeneralNote() {
    await api.routine.updateNote(generalNote);
  }

  return (
    <Card
      title="📅 Plano da semana"
      action={
        <button className="btn btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Concluir' : 'Editar'}
        </button>
      }
    >
      <div className="chip-row">
        {WEEKDAYS.map((w) => (
          <button
            key={w}
            className={`chip${selected === w ? ' active' : ''}`}
            onClick={() => setSelected(w)}
          >
            {WEEKDAY_SHORT_LABELS[w]}
            {w === today ? ' •' : ''}
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
          <h2 style={{ marginBottom: 4 }}>{day.title}</h2>
          {day.note && <p style={{ margin: '0 0 8px', fontSize: '0.85rem' }}>{day.note}</p>}
        </>
      )}

      {day.exercises.length === 0 && !editMode && (
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

      {editMode && (
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

      {editMode ? (
        <div className="field" style={{ marginTop: 12 }}>
          <label>Observação geral (todos os dias)</label>
          <input value={generalNote} onChange={(e) => setGeneralNote(e.target.value)} onBlur={saveGeneralNote} />
        </div>
      ) : (
        generalNote && <p style={{ marginTop: 12, fontSize: '0.78rem' }}>💡 {generalNote}</p>
      )}
    </Card>
  );
}
