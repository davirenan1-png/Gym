import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatRemaining } from '../lib/format';

const emptyForm = {
  aircraft_id: '',
  name: '',
  description: '',
  interval_type: 'horas',
  interval_hours: '',
  interval_cycles: '',
  interval_days: '',
  last_done_hours: '',
  last_done_cycles: '',
  last_done_date: '',
};

export function Maintenances() {
  const [list, setList] = useState([]);
  const [aircraftList, setAircraftList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function reload() {
    api.maintenances.list().then(setList).catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
    api.aircraft.list().then(setAircraftList).catch((e) => setError(e.message));
  }, []);

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toNumberOrNull(v) {
    return v === '' || v === null || v === undefined ? null : Number(v);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        aircraft_id: Number(form.aircraft_id),
        name: form.name,
        description: form.description || null,
        interval_type: form.interval_type,
        interval_hours: toNumberOrNull(form.interval_hours),
        interval_cycles: toNumberOrNull(form.interval_cycles),
        interval_days: toNumberOrNull(form.interval_days),
        last_done_hours: toNumberOrNull(form.last_done_hours),
        last_done_cycles: toNumberOrNull(form.last_done_cycles),
        last_done_date: form.last_done_date || null,
      };
      if (editingId) {
        await api.maintenances.update(editingId, payload);
      } else {
        await api.maintenances.create(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onEdit(m) {
    setEditingId(m.id);
    setForm({
      aircraft_id: String(m.aircraft_id),
      name: m.name,
      description: m.description ?? '',
      interval_type: m.interval_type,
      interval_hours: m.interval_hours ?? '',
      interval_cycles: m.interval_cycles ?? '',
      interval_days: m.interval_days ?? '',
      last_done_hours: m.last_done_hours ?? '',
      last_done_cycles: m.last_done_cycles ?? '',
      last_done_date: m.last_done_date ?? '',
    });
  }

  async function onDelete(id) {
    if (!confirm('Remover esta manutenção programada?')) return;
    try {
      await api.maintenances.remove(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onExecutar(id) {
    const performed_by = prompt('Executado por (nome / OS do mecânico):') ?? '';
    try {
      await api.maintenances.executar(id, { performed_by });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onCancel() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function aircraftLabel(id) {
    const a = aircraftList.find((x) => x.id === id);
    return a ? `${a.registration} · ${a.model}` : '—';
  }

  return (
    <div>
      <h1>Manutenções Programadas</h1>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>{editingId ? 'Editar manutenção' : 'Nova manutenção programada'}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Aeronave
            <select required value={form.aircraft_id} onChange={(e) => onChange('aircraft_id', e.target.value)}>
              <option value="" disabled>Selecione...</option>
              {aircraftList.map((a) => (
                <option key={a.id} value={a.id}>{a.registration} · {a.model}</option>
              ))}
            </select>
          </label>
          <label>
            Nome
            <input required value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Inspeção 100h" />
          </label>
          <label className="span-2">
            Descrição
            <input value={form.description} onChange={(e) => onChange('description', e.target.value)} />
          </label>
          <label>
            Tipo de intervalo
            <select value={form.interval_type} onChange={(e) => onChange('interval_type', e.target.value)}>
              <option value="horas">Horas de voo</option>
              <option value="ciclos">Ciclos (pousos)</option>
              <option value="calendario">Calendário</option>
            </select>
          </label>

          {form.interval_type === 'horas' && (
            <>
              <label>
                Intervalo (horas)
                <input type="number" step="0.1" value={form.interval_hours} onChange={(e) => onChange('interval_hours', e.target.value)} />
              </label>
              <label>
                Última execução (horas da aeronave)
                <input type="number" step="0.1" value={form.last_done_hours} onChange={(e) => onChange('last_done_hours', e.target.value)} />
              </label>
            </>
          )}

          {form.interval_type === 'ciclos' && (
            <>
              <label>
                Intervalo (ciclos)
                <input type="number" value={form.interval_cycles} onChange={(e) => onChange('interval_cycles', e.target.value)} />
              </label>
              <label>
                Última execução (ciclos da aeronave)
                <input type="number" value={form.last_done_cycles} onChange={(e) => onChange('last_done_cycles', e.target.value)} />
              </label>
            </>
          )}

          {form.interval_type === 'calendario' && (
            <>
              <label>
                Intervalo (dias)
                <input type="number" value={form.interval_days} onChange={(e) => onChange('interval_days', e.target.value)} />
              </label>
              <label>
                Última execução (data)
                <input type="date" value={form.last_done_date} onChange={(e) => onChange('last_done_date', e.target.value)} />
              </label>
            </>
          )}

          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar manutenção'}</button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Manutenções cadastradas</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Aeronave</th>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Situação</th>
              <th>Restante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>{aircraftLabel(m.aircraft_id)}</td>
                <td>{m.name}</td>
                <td>{m.interval_type}</td>
                <td><StatusBadge status={m.status} /></td>
                <td>
                  {m.remaining_hours !== undefined && formatRemaining(m.remaining_hours, 'h', m.status)}
                  {m.remaining_cycles !== undefined && formatRemaining(m.remaining_cycles, 'ciclos', m.status)}
                  {m.remaining_days !== undefined && formatRemaining(m.remaining_days, 'dias', m.status)}
                </td>
                <td className="table-actions">
                  <button type="button" onClick={() => onExecutar(m.id)}>Registrar execução</button>
                  <button type="button" onClick={() => onEdit(m)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => onDelete(m.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nenhuma manutenção cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
