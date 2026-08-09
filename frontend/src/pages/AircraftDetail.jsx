import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatRemaining } from '../lib/format';

const emptyItemForm = {
  zona: '', nomenclatura: '', referencia_mm: '', ref: 'celula',
  interval_hours: '', interval_days: '', interval_cycles: '', tolerance_percent: '',
  last_done_hours: '', last_done_cycles: '', last_done_date: '',
};

const PENDING_REASON_LABEL = {
  peca: 'Aguardando peça',
  compra: 'Aguardando compra',
  mao_de_obra: 'Aguardando mão de obra',
  outro: 'Outro motivo',
};

const WORK_COLUMNS = [
  { key: 'pendente', title: 'Pendente' },
  { key: 'em_andamento', title: 'Em andamento' },
  { key: 'entregue', title: 'Entregue' },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function AircraftDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aircraft, setAircraft] = useState(null);
  const [items, setItems] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [counters, setCounters] = useState(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [editingItemId, setEditingItemId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [newEventForm, setNewEventForm] = useState({ name: '', predicted_delivery_date: '' });
  const [pendingEditId, setPendingEditId] = useState(null);
  const [pendingForm, setPendingForm] = useState({ pending_reason: 'peca', pending_notes: '' });
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
      if (a.current_event) {
        api.events.get(a.current_event.id).then(setCurrentEvent).catch((e) => setError(e.message));
      } else {
        setCurrentEvent(null);
      }
    }).catch((e) => setError(e.message));
    api.items.list(id).then(setItems).catch((e) => setError(e.message));
    api.serviceOrders.list(id).then(setServiceOrders).catch((e) => setError(e.message));
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

  function toggleSelected(itemId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }

  async function onCreateEvent(e) {
    e.preventDefault();
    setError('');
    try {
      await api.events.create(id, {
        name: newEventForm.name,
        predicted_delivery_date: newEventForm.predicted_delivery_date || null,
      });
      setNewEventForm({ name: '', predicted_delivery_date: '' });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onConcludeEvent() {
    if (!currentEvent) return;
    if (!confirm(`Concluir o pacote "${currentEvent.name}"?`)) return;
    try {
      await api.events.update(currentEvent.id, { status: 'concluido' });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onUpdateDeliveryDate() {
    if (!currentEvent) return;
    const value = prompt('Nova previsão de entrega (AAAA-MM-DD):', currentEvent.predicted_delivery_date ?? '');
    if (value === null) return;
    try {
      await api.events.update(currentEvent.id, { predicted_delivery_date: value || null });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onAddSelectedToEvent() {
    if (!currentEvent || selectedIds.size === 0) return;
    try {
      await api.events.addItems(currentEvent.id, Array.from(selectedIds));
      setSelectedIds(new Set());
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onGenerateServiceOrder() {
    if (selectedIds.size === 0) return;
    try {
      const order = await api.serviceOrders.create(id, {
        aircraft_item_ids: Array.from(selectedIds),
        event_id: currentEvent?.id ?? null,
      });
      navigate(`/aeronaves/${id}/os/${order.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function onMoveWorkStatus(eventItemId, work_status) {
    try {
      await api.events.updateItem(eventItemId, { work_status, pending_reason: null, pending_notes: null });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function onStartPendingEdit(eventItem) {
    setPendingEditId(eventItem.event_item_id);
    setPendingForm({ pending_reason: eventItem.pending_reason ?? 'peca', pending_notes: eventItem.pending_notes ?? '' });
  }

  async function onSavePending() {
    try {
      await api.events.updateItem(pendingEditId, {
        work_status: 'pendente',
        pending_reason: pendingForm.pending_reason,
        pending_notes: pendingForm.pending_notes || null,
      });
      setPendingEditId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onRemoveFromEvent(eventItemId) {
    if (!confirm('Remover este item do pacote?')) return;
    try {
      await api.events.removeItem(eventItemId);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!aircraft || !counters) return error ? <p className="error">{error}</p> : <p>Carregando...</p>;

  const visibleItems = statusFilter === 'todos' ? items : items.filter((i) => i.status === statusFilter);
  const deliveryRemaining = daysUntil(currentEvent?.predicted_delivery_date);

  return (
    <div>
      <p className="hint"><Link to="/aeronaves">← Aeronaves</Link></p>
      <h1>{aircraft.registration} <span className="hint">· {aircraft.model.name}</span></h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="hint">{notice}</p>}

      <section className="panel">
        <h2>Operacional</h2>
        {currentEvent ? (
          <>
            <div className="event-card">
              <div>
                <div className="event-card-name">📦 {currentEvent.name}</div>
                <div className="hint">Iniciado em {currentEvent.started_at}</div>
                {currentEvent.predicted_delivery_date && (
                  <div className={deliveryRemaining !== null && deliveryRemaining < 0 ? 'error' : 'hint'} style={{ margin: 0 }}>
                    Previsão de entrega: {currentEvent.predicted_delivery_date}
                    {deliveryRemaining !== null && ` (${formatRemaining(deliveryRemaining, 'dias', deliveryRemaining < 0 ? 'vencido' : 'ok')})`}
                  </div>
                )}
              </div>
              <div className="table-actions">
                <button type="button" onClick={onUpdateDeliveryDate}>Editar previsão</button>
                <button type="button" className="btn-secondary" onClick={onConcludeEvent}>Concluir pacote</button>
              </div>
            </div>

            <div className="kanban">
              {WORK_COLUMNS.map((col) => (
                <div key={col.key} className="kanban-col">
                  <h3>{col.title} ({currentEvent.items.filter((i) => i.work_status === col.key).length})</h3>
                  {currentEvent.items.filter((i) => i.work_status === col.key).map((i) => (
                    <div key={i.event_item_id} className="kanban-card">
                      <div className="kanban-card-title">{i.nomenclatura}</div>
                      <div className="hint">{i.ref_label}</div>
                      <StatusBadge status={i.status} />
                      {col.key === 'pendente' && pendingEditId !== i.event_item_id && i.pending_reason && (
                        <div className="hint">
                          {PENDING_REASON_LABEL[i.pending_reason]}{i.pending_notes ? `: ${i.pending_notes}` : ''}
                        </div>
                      )}
                      {pendingEditId === i.event_item_id ? (
                        <div className="kanban-pending-form">
                          <select value={pendingForm.pending_reason} onChange={(e) => setPendingForm((f) => ({ ...f, pending_reason: e.target.value }))}>
                            {Object.entries(PENDING_REASON_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                          <textarea
                            rows={2}
                            value={pendingForm.pending_notes}
                            onChange={(e) => setPendingForm((f) => ({ ...f, pending_notes: e.target.value }))}
                            placeholder="Detalhes (ex: peça em trânsito, previsão do fornecedor...)"
                          />
                          <div className="table-actions">
                            <button type="button" onClick={onSavePending}>Salvar</button>
                            <button type="button" className="btn-secondary" onClick={() => setPendingEditId(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="table-actions">
                          {col.key !== 'em_andamento' && (
                            <button type="button" onClick={() => onMoveWorkStatus(i.event_item_id, 'em_andamento')}>Em andamento</button>
                          )}
                          {col.key !== 'pendente' && (
                            <button type="button" onClick={() => onStartPendingEdit(i)}>Marcar pendente</button>
                          )}
                          <button type="button" className="btn-danger" onClick={() => onRemoveFromEvent(i.event_item_id)}>Remover</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {currentEvent.items.filter((i) => i.work_status === col.key).length === 0 && (
                    <p className="empty-state">Nenhum item.</p>
                  )}
                </div>
              ))}
            </div>
            <p className="hint">
              Selecione itens na matriz abaixo e use "Adicionar ao pacote" para incluí-los aqui, ou "Gerar Ordem de
              Serviço" para já entregá-los com assinatura.
            </p>
          </>
        ) : (
          <>
            <p className="hint">Nenhum pacote de manutenção ativo no momento.</p>
            <form className="form-grid" onSubmit={onCreateEvent}>
              <label>
                Nome do pacote
                <input required value={newEventForm.name} onChange={(e) => setNewEventForm((f) => ({ ...f, name: e.target.value }))} placeholder="Revisão 200h - Ago/2026" />
              </label>
              <label>
                Previsão de entrega
                <input type="date" value={newEventForm.predicted_delivery_date} onChange={(e) => setNewEventForm((f) => ({ ...f, predicted_delivery_date: e.target.value }))} />
              </label>
              <div className="form-actions">
                <button type="submit">Iniciar pacote de manutenção</button>
              </div>
            </form>
          </>
        )}
      </section>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
          <h2 style={{ margin: 0 }}>Componentes e itens de manutenção ({items.length})</h2>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="vencido">Vencidos</option>
            <option value="proximo">Próximos</option>
            <option value="ok">Em dia</option>
          </select>
        </div>

        <div className="table-actions" style={{ marginBottom: '0.8rem' }}>
          <span className="hint">{selectedIds.size} selecionado(s)</span>
          <button type="button" disabled={!currentEvent || selectedIds.size === 0} onClick={onAddSelectedToEvent}>
            Adicionar ao pacote atual
          </button>
          <button type="button" disabled={selectedIds.size === 0} onClick={onGenerateServiceOrder}>
            Gerar Ordem de Serviço
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th></th>
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
                <td><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} /></td>
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
                <td colSpan={8} className="empty-state">Nenhum item nesta situação.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Ordens de Serviço</h2>
        <table className="table">
          <thead>
            <tr>
              <th>OS</th>
              <th>Data</th>
              <th>Mecânico</th>
              <th>Itens</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {serviceOrders.map((os) => (
              <tr key={os.id}>
                <td>#{os.id}</td>
                <td>{os.performed_at_date ?? '—'}</td>
                <td>{os.performed_by ?? '—'}</td>
                <td>{os.items.length}</td>
                <td><span className={`badge badge-${os.status === 'assinada' ? 'ok' : 'proximo'}`}>{os.status === 'assinada' ? 'Assinada' : 'Rascunho'}</span></td>
                <td className="table-actions">
                  <Link to={`/aeronaves/${id}/os/${os.id}`}><button type="button">Abrir</button></Link>
                </td>
              </tr>
            ))}
            {serviceOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">Nenhuma ordem de serviço gerada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
