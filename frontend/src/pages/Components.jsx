import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatRemaining } from '../lib/format';

const emptyForm = {
  aircraft_id: '',
  name: '',
  part_number: '',
  serial_number: '',
  install_date: '',
  install_hours: 0,
  install_cycles: 0,
  life_limit_hours: '',
  life_limit_cycles: '',
  life_limit_months: '',
};

export function Components() {
  const [list, setList] = useState([]);
  const [aircraftList, setAircraftList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function reload() {
    api.components.list().then(setList).catch((e) => setError(e.message));
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
        part_number: form.part_number || null,
        serial_number: form.serial_number || null,
        install_date: form.install_date || null,
        install_hours: Number(form.install_hours) || 0,
        install_cycles: Number(form.install_cycles) || 0,
        life_limit_hours: toNumberOrNull(form.life_limit_hours),
        life_limit_cycles: toNumberOrNull(form.life_limit_cycles),
        life_limit_months: toNumberOrNull(form.life_limit_months),
      };
      if (editingId) {
        await api.components.update(editingId, payload);
      } else {
        await api.components.create(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onEdit(c) {
    setEditingId(c.id);
    setForm({
      aircraft_id: String(c.aircraft_id),
      name: c.name,
      part_number: c.part_number ?? '',
      serial_number: c.serial_number ?? '',
      install_date: c.install_date ?? '',
      install_hours: c.install_hours,
      install_cycles: c.install_cycles,
      life_limit_hours: c.life_limit_hours ?? '',
      life_limit_cycles: c.life_limit_cycles ?? '',
      life_limit_months: c.life_limit_months ?? '',
    });
  }

  async function onDelete(id) {
    if (!confirm('Remover este componente?')) return;
    try {
      await api.components.remove(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSubstituir(id) {
    const serial_number = prompt('Novo número de série do componente instalado:') ?? '';
    try {
      await api.components.substituir(id, { serial_number });
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
      <h1>Componentes com Vida Útil</h1>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>{editingId ? 'Editar componente' : 'Novo componente'}</h2>
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
            Nome do componente
            <input required value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Motor, hélice, ELT..." />
          </label>
          <label>
            Part number
            <input value={form.part_number} onChange={(e) => onChange('part_number', e.target.value)} />
          </label>
          <label>
            Número de série
            <input value={form.serial_number} onChange={(e) => onChange('serial_number', e.target.value)} />
          </label>
          <label>
            Data de instalação
            <input type="date" value={form.install_date} onChange={(e) => onChange('install_date', e.target.value)} />
          </label>
          <label>
            Horas da aeronave na instalação
            <input type="number" step="0.1" value={form.install_hours} onChange={(e) => onChange('install_hours', e.target.value)} />
          </label>
          <label>
            Ciclos da aeronave na instalação
            <input type="number" value={form.install_cycles} onChange={(e) => onChange('install_cycles', e.target.value)} />
          </label>
          <label>
            Limite de vida (horas)
            <input type="number" step="0.1" value={form.life_limit_hours} onChange={(e) => onChange('life_limit_hours', e.target.value)} />
          </label>
          <label>
            Limite de vida (ciclos)
            <input type="number" value={form.life_limit_cycles} onChange={(e) => onChange('life_limit_cycles', e.target.value)} />
          </label>
          <label>
            Limite de vida (meses)
            <input type="number" value={form.life_limit_months} onChange={(e) => onChange('life_limit_months', e.target.value)} />
          </label>

          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar componente'}</button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Componentes cadastrados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Aeronave</th>
              <th>Componente</th>
              <th>Nº série</th>
              <th>Situação</th>
              <th>Restante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{aircraftLabel(c.aircraft_id)}</td>
                <td>{c.name}</td>
                <td>{c.serial_number ?? '—'}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  {c.remaining_hours !== undefined && formatRemaining(c.remaining_hours, 'h', c.hours_status)}{' '}
                  {c.remaining_cycles !== undefined && formatRemaining(c.remaining_cycles, 'ciclos', c.cycles_status)}{' '}
                  {c.remaining_days !== undefined && formatRemaining(c.remaining_days, 'dias', c.calendar_status)}
                </td>
                <td className="table-actions">
                  <button type="button" onClick={() => onSubstituir(c.id)}>Registrar troca</button>
                  <button type="button" onClick={() => onEdit(c)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => onDelete(c.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nenhum componente cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
