import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const emptyForm = {
  model_id: '', registration: '', cell_serial_number: '', manufacture_date: '',
  cell_hours: 0, cell_cycles: 0,
};

function emptyEngine(role) {
  return { role, model: '', serial_number: '', hours: 0, cycles: 0 };
}
function emptyPropeller(role) {
  return { role, model: '', serial_number: '', hours: 0, cycles: '' };
}

export function Aircraft() {
  const [list, setList] = useState([]);
  const [models, setModels] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [engines, setEngines] = useState([emptyEngine('unico')]);
  const [propellers, setPropellers] = useState([]);
  const [error, setError] = useState('');

  function reload() {
    api.aircraft.list().then(setList).catch((e) => setError(e.message));
  }

  useEffect(() => {
    reload();
    api.models.list().then(setModels).catch((e) => setError(e.message));
  }, []);

  function onModelChange(modelId) {
    setForm((f) => ({ ...f, model_id: modelId }));
    const model = models.find((m) => m.id === Number(modelId));
    if (!model) return;
    const roles = model.engine_count === 2 ? ['lh', 'rh'] : ['unico'];
    setEngines(roles.map(emptyEngine));
    setPropellers(model.has_propellers ? roles.map(emptyPropeller) : []);
  }

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onEngineChange(idx, field, value) {
    setEngines((list) => list.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }
  function onPropellerChange(idx, field, value) {
    setPropellers((list) => list.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.aircraft.create({
        model_id: Number(form.model_id),
        registration: form.registration,
        cell_serial_number: form.cell_serial_number || null,
        manufacture_date: form.manufacture_date || null,
        cell_hours: Number(form.cell_hours) || 0,
        cell_cycles: Number(form.cell_cycles) || 0,
        engines: engines.map((eng) => ({ ...eng, hours: Number(eng.hours) || 0, cycles: Number(eng.cycles) || 0 })),
        propellers: propellers.map((p) => ({ ...p, hours: Number(p.hours) || 0, cycles: p.cycles === '' ? null : Number(p.cycles) })),
      });
      setForm(emptyForm);
      setEngines([emptyEngine('unico')]);
      setPropellers([]);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm('Remover esta aeronave e toda sua matriz de manutenção?')) return;
    try {
      await api.aircraft.remove(id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Aeronaves</h1>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Nova aeronave</h2>
        {models.length === 0 ? (
          <p className="hint">Cadastre um <Link to="/modelos">modelo</Link> antes de adicionar uma aeronave.</p>
        ) : (
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Modelo
              <select required value={form.model_id} onChange={(e) => onModelChange(e.target.value)}>
                <option value="" disabled>Selecione...</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label>
              Matrícula
              <input required value={form.registration} onChange={(e) => onChange('registration', e.target.value)} placeholder="PR-MED" />
            </label>
            <label>
              S/N da célula
              <input value={form.cell_serial_number} onChange={(e) => onChange('cell_serial_number', e.target.value)} />
            </label>
            <label>
              Data de fabricação
              <input type="date" value={form.manufacture_date} onChange={(e) => onChange('manufacture_date', e.target.value)} />
            </label>
            <label>
              Horas da célula
              <input type="number" step="0.1" value={form.cell_hours} onChange={(e) => onChange('cell_hours', e.target.value)} />
            </label>
            <label>
              Ciclos da célula
              <input type="number" value={form.cell_cycles} onChange={(e) => onChange('cell_cycles', e.target.value)} />
            </label>

            {engines.map((eng, idx) => (
              <fieldset key={idx} className="span-2 fieldset">
                <legend>Motor {eng.role !== 'unico' ? eng.role.toUpperCase() : ''}</legend>
                <div className="form-grid">
                  <label>Modelo do motor
                    <input value={eng.model} onChange={(e) => onEngineChange(idx, 'model', e.target.value)} placeholder="PT6A-42" />
                  </label>
                  <label>S/N
                    <input value={eng.serial_number} onChange={(e) => onEngineChange(idx, 'serial_number', e.target.value)} />
                  </label>
                  <label>Horas
                    <input type="number" step="0.1" value={eng.hours} onChange={(e) => onEngineChange(idx, 'hours', e.target.value)} />
                  </label>
                  <label>Ciclos
                    <input type="number" value={eng.cycles} onChange={(e) => onEngineChange(idx, 'cycles', e.target.value)} />
                  </label>
                </div>
              </fieldset>
            ))}

            {propellers.map((prop, idx) => (
              <fieldset key={idx} className="span-2 fieldset">
                <legend>Hélice {prop.role !== 'unico' ? prop.role.toUpperCase() : ''}</legend>
                <div className="form-grid">
                  <label>Modelo da hélice
                    <input value={prop.model} onChange={(e) => onPropellerChange(idx, 'model', e.target.value)} placeholder="MC Cauley MPC-26" />
                  </label>
                  <label>S/N
                    <input value={prop.serial_number} onChange={(e) => onPropellerChange(idx, 'serial_number', e.target.value)} />
                  </label>
                  <label>Horas
                    <input type="number" step="0.1" value={prop.hours} onChange={(e) => onPropellerChange(idx, 'hours', e.target.value)} />
                  </label>
                  <label>Ciclos (se controlado)
                    <input type="number" value={prop.cycles} onChange={(e) => onPropellerChange(idx, 'cycles', e.target.value)} />
                  </label>
                </div>
              </fieldset>
            ))}

            <div className="form-actions">
              <button type="submit">Cadastrar aeronave</button>
            </div>
          </form>
        )}
      </section>

      <section className="panel">
        <h2>Frota</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Modelo</th>
              <th>Horas célula</th>
              <th>Ciclos célula</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/aeronaves/${a.id}`}>{a.registration}</Link></td>
                <td>{a.model_name}</td>
                <td>{a.cell_hours}</td>
                <td>{a.cell_cycles}</td>
                <td>{a.status}</td>
                <td className="table-actions">
                  <Link to={`/aeronaves/${a.id}`}><button type="button">Abrir</button></Link>
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
