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

export const WEEKDAYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

export const WEEKDAY_LABELS = {
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const WEEKDAY_SHORT_LABELS = {
  segunda: 'Seg',
  terca: 'Ter',
  quarta: 'Qua',
  quinta: 'Qui',
  sexta: 'Sex',
  sabado: 'Sáb',
  domingo: 'Dom',
};

const BY_JS_DAY = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

export function todayWeekdayKey() {
  return BY_JS_DAY[new Date(todayKey()).getUTCDay()];
}

export function weekdayKeyForDate(dateStr) {
  return BY_JS_DAY[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

export function mondayOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const jsDay = d.getUTCDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
