export function formatRemaining(value, unit, status) {
  if (value === null || value === undefined) return '';
  const abs = Math.round(Math.abs(value) * 10) / 10;
  if (status === 'vencido') return `${abs} ${unit} em atraso`;
  return `${abs} ${unit}`;
}
