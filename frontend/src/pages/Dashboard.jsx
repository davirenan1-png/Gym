import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Erro ao carregar painel: {error}</p>;
  if (!data) return <p>Carregando...</p>;

  const totalAlerts =
    data.maintenances_overdue.length +
    data.maintenances_upcoming.length +
    data.components_overdue.length +
    data.components_upcoming.length;

  return (
    <div>
      <h1>Painel de Controle</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{data.total_aircraft}</div>
          <div className="stat-label">Aeronaves cadastradas</div>
        </div>
        <div className="stat-card stat-card-vencido">
          <div className="stat-value">{data.maintenances_overdue.length + data.components_overdue.length}</div>
          <div className="stat-label">Itens vencidos</div>
        </div>
        <div className="stat-card stat-card-proximo">
          <div className="stat-value">{data.maintenances_upcoming.length + data.components_upcoming.length}</div>
          <div className="stat-label">Itens próximos do limite</div>
        </div>
      </div>

      {totalAlerts === 0 && (
        <p className="empty-state">Nenhum alerta no momento. Tudo em dia! 👍</p>
      )}

      {data.maintenances_overdue.length > 0 && (
        <AlertSection
          title="Manutenções vencidas"
          items={data.maintenances_overdue}
          renderItem={(m) => (
            <li key={m.id}>
              <StatusBadge status={m.status} />
              <span className="alert-title">{m.name}</span>
              <span className="alert-meta">
                {m.aircraft_registration}
                {m.remaining_hours !== undefined && ` · ${Math.abs(Math.round(m.remaining_hours))}h em atraso`}
                {m.remaining_days !== undefined && ` · ${Math.abs(m.remaining_days)} dias em atraso`}
              </span>
            </li>
          )}
        />
      )}

      {data.components_overdue.length > 0 && (
        <AlertSection
          title="Componentes com vida útil vencida"
          items={data.components_overdue}
          renderItem={(c) => (
            <li key={c.id}>
              <StatusBadge status={c.status} />
              <span className="alert-title">{c.name}</span>
              <span className="alert-meta">{c.aircraft_registration}</span>
            </li>
          )}
        />
      )}

      {data.maintenances_upcoming.length > 0 && (
        <AlertSection
          title="Manutenções próximas do vencimento"
          items={data.maintenances_upcoming}
          renderItem={(m) => (
            <li key={m.id}>
              <StatusBadge status={m.status} />
              <span className="alert-title">{m.name}</span>
              <span className="alert-meta">
                {m.aircraft_registration}
                {m.remaining_hours !== undefined && ` · faltam ${Math.round(m.remaining_hours)}h`}
                {m.remaining_days !== undefined && ` · faltam ${m.remaining_days} dias`}
              </span>
            </li>
          )}
        />
      )}

      {data.components_upcoming.length > 0 && (
        <AlertSection
          title="Componentes próximos do limite de vida útil"
          items={data.components_upcoming}
          renderItem={(c) => (
            <li key={c.id}>
              <StatusBadge status={c.status} />
              <span className="alert-title">{c.name}</span>
              <span className="alert-meta">{c.aircraft_registration}</span>
            </li>
          )}
        />
      )}

      <p className="hint">
        <Link to="/aeronaves">Gerenciar aeronaves</Link> ·{' '}
        <Link to="/manutencoes">Gerenciar manutenções</Link> ·{' '}
        <Link to="/componentes">Gerenciar componentes</Link>
      </p>
    </div>
  );
}

function AlertSection({ title, items, renderItem }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="alert-list">{items.map(renderItem)}</ul>
    </section>
  );
}
