export function ProgressBar({ value, max, color = 'var(--accent)', label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="progress-wrap">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: over ? 'var(--warn)' : color }}
        />
      </div>
    </div>
  );
}
