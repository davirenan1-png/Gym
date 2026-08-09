import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const emptyForm = { registration: '', model: '', manufacturer: '', total_hours: 0, total_cycles: 0, status: 'ativa' };

export function Aircraft() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function reload() {
    api.aircraft.list().then(setList).catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        total_hours: Number(form.total_hours) || 0,
        total_cycles: Number(form.total_cycles) || 0,
      };
      if (editingId) {
        await api.aircraft.update(editingId, payload);
      } else {
        await api.aircraft.create(payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onEdit(a) {
    setEditingId(a.id);
    setForm({
      registration: a.registration,
      model: a.model,
      manufacturer: a.manufacturer ?? '',
      total_hours: a.total_hours,
      total_cycles: a.total_cycles,
      status: a.status,
    });
  }

  async function onDelete(id) {
    if (!confirm('Remover esta aeronave? Isso também remove suas manutenções e componentes.')) return;
    try {
      await api.aircraft.remove(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onCancel() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div>
      <h1>Aeronaves</h1>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>{editingId ? 'Editar aeronave' : 'Nova aeronave'}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Matrícula
            <input
              required
              value={form.registration}
              onChange={(e) => onChange('registration', e.target.value)}
              placeholder="PT-ABC"
            />
          </label>
          <label>
            Modelo
            <input
              required
              value={form.model}
              onChange={(e) => onChange('model', e.target.value)}
              placeholder="Cessna 172"
            />
          </label>
          <label>
            Fabricante
            <input value={form.manufacturer} onChange={(e) => onChange('manufacturer', e.target.value)} />
          </label>
          <label>
            Horas totais de voo
            <input
              type="number"
              step="0.1"
              value={form.total_hours}
              onChange={(e) => onChange('total_hours', e.target.value)}
            />
          </label>
          <label>
            Ciclos totais (pousos)
            <input
              type="number"
              value={form.total_cycles}
              onChange={(e) => onChange('total_cycles', e.target.value)}
            />
          </label>
          <label>
            Situação
            <select value={form.status} onChange={(e) => onChange('status', e.target.value)}>
              <option value="ativa">Ativa</option>
              <option value="em manutenção">Em manutenção</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Salvar alterações' : 'Cadastrar aeronave'}</button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Frota</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Modelo</th>
              <th>Horas</th>
              <th>Ciclos</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>{a.registration}</td>
                <td>{a.model}</td>
                <td>{a.total_hours}</td>
                <td>{a.total_cycles}</td>
                <td>{a.status}</td>
                <td className="table-actions">
                  <button type="button" onClick={() => onEdit(a)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => onDelete(a.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nenhuma aeronave cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
