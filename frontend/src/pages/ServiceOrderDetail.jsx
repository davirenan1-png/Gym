import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { SignaturePad } from '../components/SignaturePad';

export function ServiceOrderDetail() {
  const { aircraftId, osId } = useParams();
  const [order, setOrder] = useState(null);
  const [performedBy, setPerformedBy] = useState('');
  const [performedAtDate, setPerformedAtDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const signatureRef = useRef(null);

  function reload() {
    api.serviceOrders.get(osId).then((os) => {
      setOrder(os);
      setPerformedBy(os.performed_by ?? '');
      setPerformedAtDate(os.performed_at_date ?? new Date().toISOString().slice(0, 10));
      setNotes(os.notes ?? '');
    }).catch((e) => setError(e.message));
  }

  useEffect(reload, [osId]);

  async function onSaveDraft() {
    setError('');
    try {
      await api.serviceOrders.update(osId, { performed_by: performedBy, performed_at_date: performedAtDate, notes });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onSign() {
    setError('');
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Desenhe a assinatura antes de concluir.');
      return;
    }
    if (!performedBy.trim()) {
      setError('Informe o nome de quem está assinando.');
      return;
    }
    try {
      await api.serviceOrders.assinar(osId, {
        signature: signatureRef.current.toDataURL(),
        performed_by: performedBy,
        performed_at_date: performedAtDate,
      });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDeleteDraft() {
    if (!confirm('Excluir esta ordem de serviço rascunho?')) return;
    try {
      await api.serviceOrders.remove(osId);
      window.location.href = `/aeronaves/${aircraftId}`;
    } catch (err) {
      setError(err.message);
    }
  }

  if (!order) return error ? <p className="error">{error}</p> : <p>Carregando...</p>;

  const isSigned = order.status === 'assinada';

  return (
    <div>
      <p className="hint"><Link to={`/aeronaves/${aircraftId}`}>← Aeronave</Link></p>
      <h1>Ordem de Serviço #{order.id}</h1>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>
          Dados da OS{' '}
          <span className={`badge badge-${isSigned ? 'ok' : 'proximo'}`} style={{ marginLeft: '0.5rem' }}>
            {isSigned ? 'Assinada' : 'Rascunho'}
          </span>
        </h2>
        <div className="form-grid">
          <label>
            Executado por
            <input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} disabled={isSigned} placeholder="Nome do mecânico" />
          </label>
          <label>
            Data
            <input type="date" value={performedAtDate} onChange={(e) => setPerformedAtDate(e.target.value)} disabled={isSigned} />
          </label>
          <label className="span-2">
            Observações
            <input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isSigned} />
          </label>
        </div>
        {!isSigned && (
          <div className="form-actions" style={{ marginTop: '0.8rem' }}>
            <button type="button" className="btn-secondary" onClick={onSaveDraft}>Salvar rascunho</button>
            <button type="button" className="btn-danger" onClick={onDeleteDraft}>Excluir OS</button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Itens desta OS ({order.items.length})</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Zona</th>
              <th>Nomenclatura</th>
              <th>Aplica-se a</th>
              {isSigned && <><th>Horas</th><th>Ciclos</th><th>Data</th></>}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.zona ?? '—'}</td>
                <td>{item.nomenclatura}</td>
                <td>{item.ref_label}</td>
                {isSigned && (
                  <>
                    <td>{item.done_hours ?? '—'}</td>
                    <td>{item.done_cycles ?? '—'}</td>
                    <td>{item.done_date ?? '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Assinatura</h2>
        {isSigned ? (
          <div>
            <p className="hint">Assinada por {order.performed_by} em {order.performed_at_date} ({order.signed_at})</p>
            <img src={order.signature} alt="Assinatura" style={{ background: '#fff', borderRadius: 8, maxWidth: 500 }} />
          </div>
        ) : (
          <div>
            <p className="hint">Desenhe a assinatura de quem está concluindo esta ordem de serviço.</p>
            <SignaturePad ref={signatureRef} />
            <div className="form-actions" style={{ marginTop: '0.8rem' }}>
              <button type="button" className="btn-secondary" onClick={() => signatureRef.current?.clear()}>Limpar assinatura</button>
              <button type="button" onClick={onSign}>Assinar e concluir OS</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
