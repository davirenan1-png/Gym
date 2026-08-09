const LABELS = {
  ok: 'Em dia',
  proximo: 'Próximo',
  vencido: 'Vencido',
};

export function StatusBadge({ status }) {
  if (!status) return <span className="badge badge-muted">—</span>;
  return <span className={`badge badge-${status}`}>{LABELS[status] ?? status}</span>;
}
