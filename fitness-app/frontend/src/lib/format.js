export function todayKey() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

export const MEAL_LABELS = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  jantar: 'Jantar',
  lanche: 'Lanche',
  outro: 'Outro',
};

export const FOCUS_LABELS = {
  aula: 'Aula',
  drilling: 'Drilling',
  sparring: 'Sparring',
  competicao: 'Competição',
};

export const BELT_LABELS = {
  branca: 'Branca',
  azul: 'Azul',
  roxa: 'Roxa',
  marrom: 'Marrom',
  preta: 'Preta',
};

export const BELT_COLORS = {
  branca: '#f8fafc',
  azul: '#3b82f6',
  roxa: '#a855f7',
  marrom: '#78350f',
  preta: '#0f172a',
};
