import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatRemaining } from '../lib/format';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Erro ao carregar painel: {error}</p>;
  if (!data) return <p>Carregando...</p>;

  const totalAlerts = data.vencidos.length + data.proximos.length;

  function remainingLabel(item) {
    if (item.remaining_hours !== undefined) return formatRemaining(item.remaining_hours, 'h', item.hours_status);
    if (item.remaining_cycles !== undefined) return formatRemaining(item.remaining_cycles, 'ciclos', item.cycles_status);
    if (item.remaining_days !== undefined) return formatRemaining(item.remaining_days, 'dias', item.days_status);
    return '';
  }

  return (
    <div>
      <h1>Painel de Controle</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{data.total_aircraft}</div>
          <div className="stat-label">Aeronaves cadastradas</div>
        </div>
        <div className="stat-card stat-card-vencido">
          <div className="stat-value">{data.vencidos.length}</div>
          <div className="stat-label">Itens vencidos</div>
        </div>
        <div className="stat-card stat-card-proximo">
          <div className="stat-value">{data.proximos.length}</div>
          <div className="stat-label">Itens próximos do limite</div>
        </div>
      </div>

      {totalAlerts === 0 && <p className="empty-state">Nenhum alerta no momento. Tudo em dia! 👍</p>}

      {data.vencidos.length > 0 && (
        <section className="panel">
          <h2>Itens vencidos</h2>
          <ul className="alert-list">
            {data.vencidos.map((i) => (
              <li key={i.id}>
                <StatusBadge status={i.status} />
                <Link to={`/aeronaves/${i.aircraft_id}`} className="alert-title">{i.nomenclatura}</Link>
                <span className="alert-meta">{i.aircraft_registration} · {remainingLabel(i)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.proximos.length > 0 && (
        <section className="panel">
          <h2>Itens próximos do vencimento</h2>
          <ul className="alert-list">
            {data.proximos.map((i) => (
              <li key={i.id}>
                <StatusBadge status={i.status} />
                <Link to={`/aeronaves/${i.aircraft_id}`} className="alert-title">{i.nomenclatura}</Link>
                <span className="alert-meta">{i.aircraft_registration} · {remainingLabel(i)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="hint">
        <Link to="/modelos">Gerenciar modelos</Link> · <Link to="/aeronaves">Gerenciar aeronaves</Link>
      </p>
    </div>
  );
}
