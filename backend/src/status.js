const DAY_MS = 24 * 60 * 60 * 1000;

function classify(remaining, warnThreshold) {
  if (remaining === null) return null;
  if (remaining <= 0) return 'vencido';
  if (remaining <= warnThreshold) return 'proximo';
  return 'ok';
}

export function computeMaintenanceStatus(schedule, aircraft) {
  if (schedule.interval_type === 'horas') {
    const base = schedule.last_done_hours ?? 0;
    const dueAt = base + (schedule.interval_hours ?? 0);
    const remaining = dueAt - aircraft.total_hours;
    const warn = Math.max((schedule.interval_hours ?? 0) * 0.1, 5);
    return {
      status: classify(remaining, warn),
      due_at_hours: dueAt,
      remaining_hours: remaining,
    };
  }

  if (schedule.interval_type === 'ciclos') {
    const base = schedule.last_done_cycles ?? 0;
    const dueAt = base + (schedule.interval_cycles ?? 0);
    const remaining = dueAt - aircraft.total_cycles;
    const warn = Math.max((schedule.interval_cycles ?? 0) * 0.1, 2);
    return {
      status: classify(remaining, warn),
      due_at_cycles: dueAt,
      remaining_cycles: remaining,
    };
  }

  if (schedule.interval_type === 'calendario') {
    if (!schedule.last_done_date || !schedule.interval_days) {
      return { status: null, due_date: null, remaining_days: null };
    }
    const dueDate = new Date(schedule.last_done_date).getTime() + schedule.interval_days * DAY_MS;
    const remainingDays = Math.ceil((dueDate - Date.now()) / DAY_MS);
    const warn = Math.max(schedule.interval_days * 0.1, 10);
    return {
      status: classify(remainingDays, warn),
      due_date: new Date(dueDate).toISOString().slice(0, 10),
      remaining_days: remainingDays,
    };
  }

  return { status: null };
}

export function computeComponentStatus(component, aircraft) {
  const results = {};
  let worst = null;
  const rank = { ok: 0, proximo: 1, vencido: 2 };

  const consider = (status) => {
    if (!status) return;
    if (worst === null || rank[status] > rank[worst]) worst = status;
  };

  if (component.life_limit_hours) {
    const used = aircraft.total_hours - component.install_hours;
    const remaining = component.life_limit_hours - used;
    const warn = Math.max(component.life_limit_hours * 0.1, 5);
    results.hours_status = classify(remaining, warn);
    results.remaining_hours = remaining;
    consider(results.hours_status);
  }

  if (component.life_limit_cycles) {
    const used = aircraft.total_cycles - component.install_cycles;
    const remaining = component.life_limit_cycles - used;
    const warn = Math.max(component.life_limit_cycles * 0.1, 2);
    results.cycles_status = classify(remaining, warn);
    results.remaining_cycles = remaining;
    consider(results.cycles_status);
  }

  if (component.life_limit_months && component.install_date) {
    const expiry = new Date(component.install_date);
    expiry.setMonth(expiry.getMonth() + component.life_limit_months);
    const remainingDays = Math.ceil((expiry.getTime() - Date.now()) / DAY_MS);
    const warn = Math.max(component.life_limit_months * 30 * 0.1, 30);
    results.calendar_status = classify(remainingDays, warn);
    results.expiry_date = expiry.toISOString().slice(0, 10);
    results.remaining_days = remainingDays;
    consider(results.calendar_status);
  }

  results.status = worst ?? 'ok';
  return results;
}
