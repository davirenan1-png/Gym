const DAY_MS = 24 * 60 * 60 * 1000;
const RANK = { ok: 0, proximo: 1, vencido: 2 };

function classify(remaining, interval, tolerancePercent, defaultPercent) {
  if (remaining <= 0) return 'vencido';
  const pct = tolerancePercent !== null && tolerancePercent !== undefined ? tolerancePercent / 100 : defaultPercent;
  if (remaining <= interval * pct) return 'proximo';
  return 'ok';
}

// counter: { hours, cycles } current values for the célula/motor/hélice this item is tied to
export function computeItemStatus(item, counter) {
  const dims = {};
  let worst = null;
  const consider = (status) => {
    if (!status) return;
    if (worst === null || RANK[status] > RANK[worst]) worst = status;
  };

  if (item.interval_hours && counter && counter.hours !== null && counter.hours !== undefined) {
    const base = item.last_done_hours ?? 0;
    const dueAt = base + item.interval_hours;
    const remaining = dueAt - counter.hours;
    const status = classify(remaining, item.interval_hours, item.tolerance_percent, 0.1);
    dims.hours_status = status;
    dims.due_at_hours = dueAt;
    dims.remaining_hours = remaining;
    consider(status);
  }

  if (item.interval_cycles && counter && counter.cycles !== null && counter.cycles !== undefined) {
    const base = item.last_done_cycles ?? 0;
    const dueAt = base + item.interval_cycles;
    const remaining = dueAt - counter.cycles;
    const status = classify(remaining, item.interval_cycles, item.tolerance_percent, 0.1);
    dims.cycles_status = status;
    dims.due_at_cycles = dueAt;
    dims.remaining_cycles = remaining;
    consider(status);
  }

  if (item.interval_days && item.last_done_date) {
    const dueDate = new Date(item.last_done_date).getTime() + item.interval_days * DAY_MS;
    const remainingDays = Math.ceil((dueDate - Date.now()) / DAY_MS);
    const status = classify(remainingDays, item.interval_days, item.tolerance_percent, 0.1);
    dims.days_status = status;
    dims.due_date = new Date(dueDate).toISOString().slice(0, 10);
    dims.remaining_days = remainingDays;
    consider(status);
  }

  dims.status = worst;
  return dims;
}
