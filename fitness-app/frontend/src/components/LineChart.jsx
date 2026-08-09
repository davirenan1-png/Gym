export function LineChart({ points, color = '#22d3ee', height = 140, unit = '' }) {
  if (!points || points.length === 0) {
    return <div className="chart-empty">Sem dados suficientes ainda</div>;
  }
  if (points.length === 1) {
    return (
      <div className="chart-empty">
        {points[0].y}
        {unit} em {points[0].label}
      </div>
    );
  }

  const width = 320;
  const padding = 24;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.y - minY) / range) * (height - padding * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" preserveAspectRatio="xMidYMid meet">
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" fill={color} />
      ))}
      <text x={coords[0].x} y={height - 4} className="chart-axis-label" textAnchor="start">
        {coords[0].label}
      </text>
      <text x={coords[coords.length - 1].x} y={height - 4} className="chart-axis-label" textAnchor="end">
        {coords[coords.length - 1].label}
      </text>
      <text x={padding} y={12} className="chart-axis-label" textAnchor="start">
        {maxY}{unit}
      </text>
      <text x={padding} y={height - padding + 14} className="chart-axis-label" textAnchor="start">
        {minY}{unit}
      </text>
    </svg>
  );
}
