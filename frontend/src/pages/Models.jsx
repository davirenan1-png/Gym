import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const emptyForm = { name: '', manufacturer: '', engine_count: 1, has_propellers: false };

export function Models() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function reload() {
    api.models.list().then(setList).catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.models.create({ ...form, engine_count: Number(form.engine_count) });
      setForm(emptyForm);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm('Remover este modelo? A matriz de manutenção associada também será removida.')) return;
    try {
      await api.models.remove(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Modelos de Aeronave</h1>
      <p className="hint">
        Cadastre aqui a matriz de manutenção de cada modelo (a "matriz" que você já usa) — depois, ao criar uma
        aeronave desse modelo, todos os itens são gerados automaticamente.
      </p>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Novo modelo</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Nome do modelo
            <input required value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="King Air B200" />
          </label>
          <label>
            Fabricante
            <input value={form.manufacturer} onChange={(e) => onChange('manufacturer', e.target.value)} placeholder="Beechcraft" />
          </label>
          <label>
            Número de motores
            <select value={form.engine_count} onChange={(e) => onChange('engine_count', e.target.value)}>
              <option value={1}>1 (motor único)</option>
              <option value={2}>2 (LH / RH)</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={form.has_propellers} onChange={(e) => onChange('has_propellers', e.target.checked)} />
            Possui hélice(s) controlada(s)
          </label>
          <div className="form-actions">
            <button type="submit">Cadastrar modelo</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Modelos cadastrados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Fabricante</th>
              <th>Motores</th>
              <th>Hélice</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/modelos/${m.id}`}>{m.name}</Link></td>
                <td>{m.manufacturer ?? '—'}</td>
                <td>{m.engine_count === 2 ? 'LH / RH' : 'Único'}</td>
                <td>{m.has_propellers ? 'Sim' : 'Não'}</td>
                <td className="table-actions">
                  <Link to={`/modelos/${m.id}`}><button type="button">Matriz</button></Link>
                  <button type="button" className="btn-danger" onClick={() => onDelete(m.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">Nenhum modelo cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
