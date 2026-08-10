import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate } from '../lib/format.js';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../components/LineChart.jsx';
import { RoutinePlan } from '../components/RoutinePlan.jsx';

export function Workouts() {
  const [exercises, setExercises] = useState([]);
  const [newExercise, setNewExercise] = useState({ name: '', muscle_group: '' });
  const [sessions, setSessions] = useState([]);
  const [sessionDate, setSessionDate] = useState(todayKey());
  const [pendingSets, setPendingSets] = useState([]);
  const [setForm, setSetForm] = useState({ exercise_id: '', reps: '', weight_kg: '' });
  const [progressExerciseId, setProgressExerciseId] = useState('');
  const [progressPoints, setProgressPoints] = useState([]);
  const registerRef = useRef(null);

  const load = useCallback(() => {
    api.workouts.exercises().then((list) => {
      setExercises(list);
      setSetForm((f) => ({ ...f, exercise_id: f.exercise_id || (list[0] ? String(list[0].id) : '') }));
      setProgressExerciseId((id) => id || (list[0] ? String(list[0].id) : ''));
    });
    api.workouts.sessions(15).then(setSessions);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!progressExerciseId) return;
    api.workouts.progress(progressExerciseId).then((rows) =>
      setProgressPoints(rows.map((r) => ({ y: r.max_weight_kg, label: r.date.slice(5) })))
    );
  }, [progressExerciseId]);

  async function addExercise(e) {
    e.preventDefault();
    if (!newExercise.name) return;
    await api.workouts.addExercise(newExercise);
    setNewExercise({ name: '', muscle_group: '' });
    load();
  }

  function addSet(e) {
    e.preventDefault();
    if (!setForm.exercise_id) return;
    const exercise = exercises.find((ex) => String(ex.id) === String(setForm.exercise_id));
    setPendingSets([
      ...pendingSets,
      {
        exercise_id: Number(setForm.exercise_id),
        exercise_name: exercise?.name,
        reps: setForm.reps ? Number(setForm.reps) : null,
        weight_kg: setForm.weight_kg ? Number(setForm.weight_kg) : null,
        set_number: pendingSets.filter((s) => s.exercise_id === Number(setForm.exercise_id)).length + 1,
      },
    ]);
    setSetForm({ ...setForm, reps: '', weight_kg: '' });
  }

  function removePendingSet(idx) {
    setPendingSets(pendingSets.filter((_, i) => i !== idx));
  }

  async function saveSession() {
    if (pendingSets.length === 0) return;
    await api.workouts.addSession({ date: sessionDate, sets: pendingSets });
    setPendingSets([]);
    load();
  }

  async function removeSession(id) {
    await api.workouts.removeSession(id);
    load();
  }

  async function useExerciseFromPlan(name) {
    let exercise = exercises.find((ex) => ex.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!exercise) {
      try {
        exercise = await api.workouts.addExercise({ name });
        setExercises((prev) => [...prev, exercise].sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        return;
      }
    }
    setSetForm((f) => ({ ...f, exercise_id: String(exercise.id) }));
    registerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Treino</h1>
      </div>

      <RoutinePlan onUseExercise={useExerciseFromPlan} />

      <Card title="Evolução de carga">
        {exercises.length > 0 && (
          <>
            <select value={progressExerciseId} onChange={(e) => setProgressExerciseId(e.target.value)}>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <div style={{ marginTop: 12 }}>
              <LineChart points={progressPoints} unit="kg" color="#22d3ee" />
            </div>
          </>
        )}
        {exercises.length === 0 && <p className="empty-hint">Cadastre um exercício para começar.</p>}
      </Card>

      <Card title="Novo exercício">
        <form onSubmit={addExercise} className="field-row">
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              placeholder="Nome (ex: Agachamento)"
              value={newExercise.name}
              onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <input
              placeholder="Grupo (opcional)"
              value={newExercise.muscle_group}
              onChange={(e) => setNewExercise({ ...newExercise, muscle_group: e.target.value })}
            />
          </div>
          <button className="btn" type="submit">+</button>
        </form>
      </Card>

      <div ref={registerRef}>
      <Card title="Registrar treino">
        <div className="field">
          <label>Data</label>
          <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
        </div>
        <form onSubmit={addSet}>
          <div className="field">
            <label>Exercício</label>
            <select value={setForm.exercise_id} onChange={(e) => setSetForm({ ...setForm, exercise_id: e.target.value })}>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Repetições</label>
              <input type="number" value={setForm.reps} onChange={(e) => setSetForm({ ...setForm, reps: e.target.value })} />
            </div>
            <div className="field">
              <label>Carga (kg)</label>
              <input type="number" step="0.5" value={setForm.weight_kg} onChange={(e) => setSetForm({ ...setForm, weight_kg: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-block" type="submit" disabled={exercises.length === 0}>Adicionar série</button>
        </form>

        {pendingSets.length > 0 && (
          <div className="list" style={{ marginTop: 12 }}>
            {pendingSets.map((s, idx) => (
              <div className="list-item" key={idx}>
                <span>{s.exercise_name} · série {s.set_number}</span>
                <span className="list-item-meta">{s.reps || '-'} reps × {s.weight_kg || '-'} kg</span>
                <button className="remove-btn" onClick={() => removePendingSet(idx)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={saveSession} disabled={pendingSets.length === 0}>
          Salvar treino ({pendingSets.length} séries)
        </button>
      </Card>
      </div>

      <Card title="Últimos treinos">
        {sessions.length === 0 ? (
          <p className="empty-hint">Nenhum treino registrado ainda.</p>
        ) : (
          <div className="list">
            {sessions.map((s) => (
              <div key={s.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{formatDate(s.date)}</strong>
                  <button className="remove-btn" onClick={() => removeSession(s.id)}>✕</button>
                </div>
                <div className="list-item-meta">
                  {s.sets.map((set) => `${set.exercise_name} ${set.weight_kg || '-'}kg×${set.reps || '-'}`).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
