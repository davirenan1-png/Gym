import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatRemaining } from '../lib/format';

const emptyItemForm = {
  zona: '', nomenclatura: '', referencia_mm: '', ref: 'celula',
  interval_hours: '', interval_days: '', interval_cycles: '', tolerance_percent: '',
  last_done_hours: '', last_done_cycles: '', last_done_date: '',
};

export function AircraftDetail() {
  const { id } = useParams();
  const [aircraft, setAircraft] = useState(null);
  const [items, setItems] = useState([]);
  const [counters, setCounters] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function reload() {
    api.aircraft.get(id).then((a) => {
      setAircraft(a);
      setCounters({
        cell_hours: a.cell_hours,
        cell_cycles: a.cell_cycles,
        engines: a.engines.map((e) => ({ id: e.id, hours: e.hours, cycles: e.cycles })),
        propellers: a.propellers.map((p) => ({ id: p.id, hours: p.hours, cycles: p.cycles ?? '' })),
      });
    }).catch((e) => setError(e.message));
    api.items.list(id).then(setItems).catch((e) => setError(e.message));
  }

  useEffect(reload, [id]);

  function toNumberOrNull(v) {
    return v === '' || v === null || v === undefined ? null : Number(v);
  }

  async function onSaveCounters(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api.aircraft.updateCounters(id, {
        cell_hours: Number(counters.cell_hours),
        cell_cycles: Number(counters.cell_cycles),
        engines: counters.engines.map((eng) => ({ id: eng.id, hours: Number(eng.hours), cycles: Number(eng.cycles) })),
        propellers: counters.propellers.map((p) => ({ id: p.id, hours: Number(p.hours), cycles: p.cycles === '' ? null : Number(p.cycles) })),
      });
      setNotice('Horas e ciclos atualizados — situação de todos os itens recalculada.');
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onExecutar(itemId) {
    try {
      await api.items.executar(itemId, {});
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDeleteItem(itemId) {
    if (!confirm('Remover este item da matriz da aeronave?')) return;
    try {
      await api.items.remove(itemId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onItemFormChange(field, value) {
    setItemForm((f) => ({ ...f, [field]: value }));
  }

  function refOptions() {
    if (!aircraft) return [];
    const opts = [{ value: 'celula', label: 'Célula' }];
    for (const e of aircraft.engines) opts.push({ value: `motor:${e.id}`, label: e.role === 'unico' ? 'Motor' : `Motor ${e.role.toUpperCase()}` });
    for (const p of aircraft.propellers) opts.push({ value: `helice:${p.id}`, label: p.role === 'unico' ? 'Hélice' : `Hélice ${p.role.toUpperCase()}` });
    return opts;
  }

  function onEditItem(item) {
    setEditingItemId(item.id);
    setItemForm({
      zona: item.zona ?? '',
      nomenclatura: item.nomenclatura,
      referencia_mm: item.referencia_mm ?? '',
      ref: item.ref_type === 'celula' ? 'celula' : `${item.ref_type}:${item.ref_id}`,
      interval_hours: item.interval_hours ?? '',
      interval_days: item.interval_days ?? '',
      interval_cycles: item.interval_cycles ?? '',
      tolerance_percent: item.tolerance_percent ?? '',
      last_done_hours: item.last_done_hours ?? '',
      last_done_cycles: item.last_done_cycles ?? '',
      last_done_date: item.last_done_date ?? '',
    });
  }

  function onCancelItem() {
    setEditingItemId(null);
    setItemForm(emptyItemForm);
  }

  async function onSubmitItem(e) {
    e.preventDefault();
    setError('');
    const [refType, refId] = itemForm.ref === 'celula' ? ['celula', null] : itemForm.ref.split(':');
    const payload = {
      zona: itemForm.zona || null,
      nomenclatura: itemForm.nomenclatura,
      referencia_mm: itemForm.referencia_mm || null,
      ref_type: refType,
      ref_id: refId ? Number(refId) : null,
      interval_hours: toNumberOrNull(itemForm.interval_hours),
      interval_days: toNumberOrNull(itemForm.interval_days),
      interval_cycles: toNumberOrNull(itemForm.interval_cycles),
      tolerance_percent: toNumberOrNull(itemForm.tolerance_percent),
      last_done_hours: toNumberOrNull(itemForm.last_done_hours),
      last_done_cycles: toNumberOrNull(itemForm.last_done_cycles),
      last_done_date: itemForm.last_done_date || null,
    };
    try {
      if (editingItemId) {
        await api.items.update(editingItemId, payload);
      } else {
        await api.items.create(id, payload);
      }
      onCancelItem();
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!aircraft || !counters) return error ? <p className="error">{error}</p> : <p>Carregando...</p>;

  const visibleItems = statusFilter === 'todos' ? items : items.filter((i) => i.status === statusFilter);

  return (
    <div>
      <p className="hint"><Link to="/aeronaves">← Aeronaves</Link></p>
      <h1>{aircraft.registration} <span className="hint">· {aircraft.model.name}</span></h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="hint">{notice}</p>}

      <section className="panel">
        <h2>Atualizar horas / ciclos</h2>
        <form className="form-grid form-grid-wide" onSubmit={onSaveCounters}>
          <label>
            Horas da célula
            <input type="number" step="0.1" value={counters.cell_hours} onChange={(e) => setCounters((c) => ({ ...c, cell_hours: e.target.value }))} />
          </label>
          <label>
            Ciclos da célula
            <input type="number" value={counters.cell_cycles} onChange={(e) => setCounters((c) => ({ ...c, cell_cycles: e.target.value }))} />
          </label>
          {counters.engines.map((eng, idx) => {
            const engineInfo = aircraft.engines.find((e) => e.id === eng.id);
            return (
              <label key={eng.id}>
                Motor {engineInfo?.role !== 'unico' ? engineInfo?.role.toUpperCase() : ''} — horas / ciclos
                <div className="counter-pair">
                  <input type="number" step="0.1" value={eng.hours} onChange={(e) => setCounters((c) => ({ ...c, engines: c.engines.map((x, i) => i === idx ? { ...x, hours: e.target.value } : x) }))} />
                  <input type="number" value={eng.cycles} onChange={(e) => setCounters((c) => ({ ...c, engines: c.engines.map((x, i) => i === idx ? { ...x, cycles: e.target.value } : x) }))} />
                </div>
              </label>
            );
          })}
          {counters.propellers.map((prop, idx) => {
            const propInfo = aircraft.propellers.find((p) => p.id === prop.id);
            return (
              <label key={prop.id}>
                Hélice {propInfo?.role !== 'unico' ? propInfo?.role.toUpperCase() : ''} — horas / ciclos
                <div className="counter-pair">
                  <input type="number" step="0.1" value={prop.hours} onChange={(e) => setCounters((c) => ({ ...c, propellers: c.propellers.map((x, i) => i === idx ? { ...x, hours: e.target.value } : x) }))} />
                  <input type="number" value={prop.cycles} onChange={(e) => setCounters((c) => ({ ...c, propellers: c.propellers.map((x, i) => i === idx ? { ...x, cycles: e.target.value } : x) }))} />
                </div>
              </label>
            );
          })}
          <div className="form-actions">
            <button type="submit">Salvar e recalcular</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>{editingItemId ? 'Editar item' : 'Adicionar item personalizado'}</h2>
        <form className="form-grid" onSubmit={onSubmitItem}>
          <label>
            Zona / grupo
            <input value={itemForm.zona} onChange={(e) => onItemFormChange('zona', e.target.value)} />
          </label>
          <label className="span-2">
            Nomenclatura
            <input required value={itemForm.nomenclatura} onChange={(e) => onItemFormChange('nomenclatura', e.target.value)} />
          </label>
          <label>
            Referência (manual)
            <input value={itemForm.referencia_mm} onChange={(e) => onItemFormChange('referencia_mm', e.target.value)} />
          </label>
          <label>
            Aplica-se a
            <select value={itemForm.ref} onChange={(e) => onItemFormChange('ref', e.target.value)}>
              {refOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label>
            Intervalo (horas)
            <input type="number" step="0.1" value={itemForm.interval_hours} onChange={(e) => onItemFormChange('interval_hours', e.target.value)} />
          </label>
          <label>
            Intervalo (dias)
            <input type="number" value={itemForm.interval_days} onChange={(e) => onItemFormChange('interval_days', e.target.value)} />
          </label>
          <label>
            Intervalo (ciclos)
            <input type="number" value={itemForm.interval_cycles} onChange={(e) => onItemFormChange('interval_cycles', e.target.value)} />
          </label>
          <label>
            Tolerância de aviso (%)
            <input type="number" value={itemForm.tolerance_percent} onChange={(e) => onItemFormChange('tolerance_percent', e.target.value)} />
          </label>
          <label>
            Última realização (horas)
            <input type="number" step="0.1" value={itemForm.last_done_hours} onChange={(e) => onItemFormChange('last_done_hours', e.target.value)} />
          </label>
          <label>
            Última realização (ciclos)
            <input type="number" value={itemForm.last_done_cycles} onChange={(e) => onItemFormChange('last_done_cycles', e.target.value)} />
          </label>
          <label>
            Última realização (data)
            <input type="date" value={itemForm.last_done_date} onChange={(e) => onItemFormChange('last_done_date', e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit">{editingItemId ? 'Salvar alterações' : 'Adicionar item'}</button>
            {editingItemId && <button type="button" className="btn-secondary" onClick={onCancelItem}>Cancelar</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Matriz de manutenção ({items.length} itens)</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="vencido">Vencidos</option>
            <option value="proximo">Próximos</option>
            <option value="ok">Em dia</option>
          </select>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Nomenclatura</th>
              <th>Aplica-se a</th>
              <th>Intervalo</th>
              <th>Situação</th>
              <th>Restante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td>{item.zona ?? '—'}</td>
                <td>{item.nomenclatura}</td>
                <td>{item.ref_label}</td>
                <td>
                  {[
                    item.interval_hours ? `${item.interval_hours}h` : null,
                    item.interval_days ? `${item.interval_days}d` : null,
                    item.interval_cycles ? `${item.interval_cycles}c` : null,
                  ].filter(Boolean).join(' / ') || '—'}
                </td>
                <td><StatusBadge status={item.status} /></td>
                <td>
                  {item.remaining_hours !== undefined && formatRemaining(item.remaining_hours, 'h', item.hours_status)}{' '}
                  {item.remaining_cycles !== undefined && formatRemaining(item.remaining_cycles, 'c', item.cycles_status)}{' '}
                  {item.remaining_days !== undefined && formatRemaining(item.remaining_days, 'd', item.days_status)}
                </td>
                <td className="table-actions">
                  <button type="button" onClick={() => onExecutar(item.id)}>Registrar execução</button>
                  <button type="button" onClick={() => onEditItem(item)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => onDeleteItem(item.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">Nenhum item nesta situação.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
