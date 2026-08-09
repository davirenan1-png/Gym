import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const emptyItem = {
  zona: '', nomenclatura: '', referencia_mm: '', applies_to: 'celula',
  interval_hours: '', interval_days: '', interval_cycles: '', tolerance_percent: '',
};

const APPLIES_TO_LABEL = { celula: 'Célula', motor: 'Motor', helice: 'Hélice' };

export function ModelDetail() {
  const { id } = useParams();
  const [model, setModel] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState('');
  const [error, setError] = useState('');

  function reload() {
    api.models.get(id).then(setModel).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toNumberOrNull(v) {
    return v === '' || v === null || v === undefined ? null : Number(v);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      zona: form.zona || null,
      nomenclatura: form.nomenclatura,
      referencia_mm: form.referencia_mm || null,
      applies_to: form.applies_to,
      interval_hours: toNumberOrNull(form.interval_hours),
      interval_days: toNumberOrNull(form.interval_days),
      interval_cycles: toNumberOrNull(form.interval_cycles),
      tolerance_percent: toNumberOrNull(form.tolerance_percent),
    };
    try {
      if (editingId) {
        await api.models.updateItem(id, editingId, payload);
      } else {
        await api.models.addItem(id, payload);
      }
      setForm(emptyItem);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onEdit(item) {
    setEditingId(item.id);
    setForm({
      zona: item.zona ?? '',
      nomenclatura: item.nomenclatura,
      referencia_mm: item.referencia_mm ?? '',
      applies_to: item.applies_to,
      interval_hours: item.interval_hours ?? '',
      interval_days: item.interval_days ?? '',
      interval_cycles: item.interval_cycles ?? '',
      tolerance_percent: item.tolerance_percent ?? '',
    });
  }

  async function onDelete(itemId) {
    if (!confirm('Remover este item da matriz?')) return;
    try {
      await api.models.removeItem(id, itemId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onCancel() {
    setEditingId(null);
    setForm(emptyItem);
  }

  async function onBulkImport() {
    setError('');
    setBulkResult('');
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const rows = lines.map((line) => {
      const cols = line.split('\t');
      const [zona, nomenclatura, referencia_mm, applies_to, interval_hours, interval_days, interval_cycles, tolerance_percent] = cols;
      return {
        zona: zona || null,
        nomenclatura: (nomenclatura || '').trim(),
        referencia_mm: referencia_mm || null,
        applies_to: (applies_to || 'celula').trim().toLowerCase(),
        interval_hours: toNumberOrNull(interval_hours),
        interval_days: toNumberOrNull(interval_days),
        interval_cycles: toNumberOrNull(interval_cycles),
        tolerance_percent: toNumberOrNull(tolerance_percent),
      };
    });
    try {
      const result = await api.models.bulkImport(id, rows);
      setBulkResult(`${result.inserted} item(ns) importado(s) com sucesso.` + (result.errors ? ` ${result.errors.length} com erro.` : ''));
      setBulkText('');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!model) return error ? <p className="error">{error}</p> : <p>Carregando...</p>;

  return (
    <div>
      <p className="hint"><Link to="/modelos">← Modelos</Link></p>
      <h1>{model.name}</h1>
      <p className="hint">
        {model.manufacturer} · {model.engine_count === 2 ? 'Bimotor (LH/RH)' : 'Motor único'} ·{' '}
        {model.has_propellers ? 'Com hélice controlada' : 'Sem hélice controlada'}
      </p>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>{editingId ? 'Editar item da matriz' : 'Novo item da matriz'}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Zona / grupo
            <input value={form.zona} onChange={(e) => onChange('zona', e.target.value)} placeholder="REG, CEL.05, ENG..." />
          </label>
          <label className="span-2">
            Nomenclatura
            <input required value={form.nomenclatura} onChange={(e) => onChange('nomenclatura', e.target.value)} placeholder="Inspeção 100h" />
          </label>
          <label>
            Referência (manual)
            <input value={form.referencia_mm} onChange={(e) => onChange('referencia_mm', e.target.value)} placeholder="72-00-00" />
          </label>
          <label>
            Aplica-se a
            <select value={form.applies_to} onChange={(e) => onChange('applies_to', e.target.value)}>
              <option value="celula">Célula</option>
              <option value="motor">Motor {model.engine_count === 2 ? '(gera LH e RH)' : ''}</option>
              {model.has_propellers && <option value="helice">Hélice {model.engine_count === 2 ? '(gera LH e RH)' : ''}</option>}
            </select>
          </label>
          <label>
            Intervalo (horas)
            <input type="number" step="0.1" value={form.interval_hours} onChange={(e) => onChange('interval_hours', e.target.value)} />
          </label>
          <label>
            Intervalo (dias)
            <input type="number" value={form.interval_days} onChange={(e) => onChange('interval_days', e.target.value)} />
          </label>
          <label>
            Intervalo (ciclos)
            <input type="number" value={form.interval_cycles} onChange={(e) => onChange('interval_cycles', e.target.value)} />
          </label>
          <label>
            Tolerância de aviso (%)
            <input type="number" value={form.tolerance_percent} onChange={(e) => onChange('tolerance_percent', e.target.value)} placeholder="ex: 10" />
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Adicionar item'}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>}
          </div>
        </form>
        <p className="hint">
          Combine livremente: só horas (ex: 100h), só calendário (ex: 3 meses = 90 dias) ou horas + calendário
          juntos (ex: 200h / 6 meses) — o item vence pelo que chegar primeiro.
        </p>
      </section>

      <section className="panel">
        <h2>Importar matriz em massa (colar do Excel)</h2>
        <p className="hint">
          Cole linhas com colunas separadas por TAB, nesta ordem: zona, nomenclatura, referência, aplica_a
          (celula/motor/helice), intervalo horas, intervalo dias, intervalo ciclos, tolerância %. Deixe a coluna
          vazia quando não se aplicar.
        </p>
        <textarea
          rows={6}
          style={{ width: '100%', background: '#0c1420', color: 'inherit', border: '1px solid #263243', borderRadius: 6, padding: '0.6rem', fontFamily: 'monospace' }}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={'REG\tInspeção Anual\tRBAC 91.409\tcelula\t\t365\t\t0\nENG\tTroca de óleo\t72-00-00\tmotor\t100\t\t\t10'}
        />
        <div className="form-actions" style={{ marginTop: '0.7rem' }}>
          <button type="button" onClick={onBulkImport} disabled={!bulkText.trim()}>Importar linhas</button>
        </div>
        {bulkResult && <p className="hint">{bulkResult}</p>}
      </section>

      <section className="panel">
        <h2>Matriz de manutenção ({model.items.length} itens)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Nomenclatura</th>
              <th>Aplica-se a</th>
              <th>Intervalo</th>
              <th>Tolerância</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {model.items.map((item) => (
              <tr key={item.id}>
                <td>{item.zona ?? '—'}</td>
                <td>{item.nomenclatura}</td>
                <td>{APPLIES_TO_LABEL[item.applies_to]}</td>
                <td>
                  {[
                    item.interval_hours ? `${item.interval_hours}h` : null,
                    item.interval_days ? `${item.interval_days}d` : null,
                    item.interval_cycles ? `${item.interval_cycles}c` : null,
                  ].filter(Boolean).join(' / ') || '—'}
                </td>
                <td>{item.tolerance_percent ?? 0}%</td>
                <td className="table-actions">
                  <button type="button" onClick={() => onEdit(item)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => onDelete(item.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {model.items.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nenhum item na matriz ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
