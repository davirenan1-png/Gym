import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { todayKey, formatDate, mondayOfWeek, weekdayKeyForDate, WEEKDAY_LABELS, WEEKDAY_SHORT_LABELS } from '../lib/format.js';
import { Card } from '../components/Card.jsx';

const emptyForm = {
  adherence_score: 8,
  adherence_note: '',
  sleep_hours: '',
  mood: '',
  workout_performance: 8,
  digestion_notes: '',
  steps: '',
  bathroom_quality: 7,
  comments: '',
  weight_kg: '',
};

function buildSummaryText(week) {
  if (!week || week.length === 0) return '';
  let text = `Feedback semanal (${formatDate(week[0].date)} a ${formatDate(week[6].date)})\n\n`;
  for (const day of week) {
    const c = day.checkin;
    const label = WEEKDAY_LABELS[weekdayKeyForDate(day.date)].toUpperCase();
    text += `${label} (${formatDate(day.date)})\n`;
    if (!c && !day.weight_kg && !day.water_ml) {
      text += '- Sem dados\n\n';
      continue;
    }
    text += `- Adesão ao plano: ${c?.adherence_score ?? '-'}/10${c?.adherence_note ? ' — ' + c.adherence_note : ''}\n`;
    text += `- Peso em jejum: ${day.weight_kg ?? '-'} kg\n`;
    text += `- Sono: ${c?.sleep_hours ?? '-'}h\n`;
    text += `- Humor: ${c?.mood ?? '-'}\n`;
    text += `- Performance no treino: ${c?.workout_performance ?? '-'}/10\n`;
    text += `- Digestão: ${c?.digestion_notes ?? '-'}\n`;
    text += `- Passos: ${c?.steps ?? '-'}\n`;
    text += `- Água: ${day.water_ml ? (day.water_ml / 1000).toFixed(1) + 'L' : '-'}\n`;
    text += `- Fezes (0-10): ${c?.bathroom_quality ?? '-'}\n`;
    if (c?.comments) text += `- Comentário: ${c.comments}\n`;
    text += '\n';
  }
  return text;
}

export function Checkin() {
  const [form, setForm] = useState(emptyForm);
  const [waterMl, setWaterMl] = useState(0);
  const [saved, setSaved] = useState(false);
  const [week, setWeek] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const date = todayKey();
  const weekStart = mondayOfWeek(date);

  const load = useCallback(() => {
    api.checkin.today(date).then((r) => {
      setWaterMl(r.water_ml);
      setForm({
        adherence_score: r.checkin?.adherence_score ?? 8,
        adherence_note: r.checkin?.adherence_note || '',
        sleep_hours: r.checkin?.sleep_hours ?? '',
        mood: r.checkin?.mood || '',
        workout_performance: r.checkin?.workout_performance ?? 8,
        digestion_notes: r.checkin?.digestion_notes || '',
        steps: r.checkin?.steps ?? '',
        bathroom_quality: r.checkin?.bathroom_quality ?? 7,
        comments: r.checkin?.comments || '',
        weight_kg: r.weight_kg ?? '',
      });
    });
    api.checkin.week(weekStart).then(setWeek);
  }, [date, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    await api.checkin.save({
      date,
      adherence_score: Number(form.adherence_score),
      adherence_note: form.adherence_note || null,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      mood: form.mood || null,
      workout_performance: Number(form.workout_performance),
      digestion_notes: form.digestion_notes || null,
      steps: form.steps ? Number(form.steps) : null,
      bathroom_quality: Number(form.bathroom_quality),
      comments: form.comments || null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    load();
  }

  const summaryText = buildSummaryText(week);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyStatus('Copiado ✓');
    } catch {
      setCopyStatus('Não deu pra copiar automático — selecione o texto abaixo.');
    }
    setTimeout(() => setCopyStatus(''), 2000);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Diário</h1>
        <span className="page-date">{formatDate(date)}</span>
      </div>

      <Card title="Check-in de hoje">
        <form onSubmit={save}>
          <div className="field">
            <label>Quanto seguiu o plano hoje: {form.adherence_score}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={form.adherence_score}
              onChange={(e) => setForm({ ...form, adherence_score: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Explique caso não foi um 10 (opcional)</label>
            <input value={form.adherence_note} onChange={(e) => setForm({ ...form, adherence_note: e.target.value })} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Peso em jejum (kg)</label>
              <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
            </div>
            <div className="field">
              <label>Horas de sono</label>
              <input type="number" step="0.5" value={form.sleep_hours} onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Água hoje (automático)</label>
            <input value={`${waterMl} ml`} disabled />
          </div>
          <div className="field">
            <label>Humor</label>
            <input placeholder="Ex: Bom, cansado, ansioso..." value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} />
          </div>
          <div className="field">
            <label>Performance no treino (pump, energia): {form.workout_performance}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={form.workout_performance}
              onChange={(e) => setForm({ ...form, workout_performance: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Problemas de digestão com alguma refeição</label>
            <input value={form.digestion_notes} onChange={(e) => setForm({ ...form, digestion_notes: e.target.value })} />
          </div>
          <div className="field">
            <label>Contagem de passos</label>
            <input type="number" value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} />
          </div>
          <div className="field">
            <label>Idas ao banheiro / qualidade das fezes: {form.bathroom_quality}/10</label>
            <input
              type="range"
              min="0"
              max="10"
              value={form.bathroom_quality}
              onChange={(e) => setForm({ ...form, bathroom_quality: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Comentário/sugestão adicional</label>
            <textarea rows="2" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-block" type="submit">
            {saved ? 'Salvo ✓' : 'Salvar check-in de hoje'}
          </button>
        </form>
      </Card>

      {week && (
        <Card title="Resumo da semana">
          <div style={{ overflowX: 'auto' }}>
            <div className="list">
              {week.map((day) => (
                <div key={day.date} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{WEEKDAY_SHORT_LABELS[weekdayKeyForDate(day.date)]} · {formatDate(day.date)}</strong>
                    {day.checkin ? <span className="badge" style={{ background: 'var(--accent-2)', color: 'var(--on-accent)' }}>preenchido</span> : null}
                  </div>
                  <div className="list-item-meta">
                    {day.checkin
                      ? `Adesão ${day.checkin.adherence_score ?? '-'}/10 · Peso ${day.weight_kg ?? '-'}kg · Sono ${day.checkin.sleep_hours ?? '-'}h · Água ${(day.water_ml / 1000).toFixed(1)}L`
                      : 'Sem check-in'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-block" style={{ marginTop: 12 }} onClick={copySummary}>
            Copiar resumo da semana
          </button>
          {copyStatus && <p style={{ fontSize: '0.8rem', textAlign: 'center' }}>{copyStatus}</p>}
          <textarea readOnly rows="8" value={summaryText} style={{ marginTop: 8, fontSize: '0.78rem' }} />
        </Card>
      )}
    </div>
  );
}
