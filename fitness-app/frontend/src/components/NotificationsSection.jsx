import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { WEEKDAYS, WEEKDAY_SHORT_LABELS } from '../lib/format.js';
import { pushSupported, getExistingSubscription, subscribeToPush, unsubscribeFromPush } from '../lib/push.js';
import { Card } from './Card.jsx';

const emptyReminder = { title: '', body: '', time: '08:00', days: 'all' };

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function PushCard() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setSupported(pushSupported());
    setStandalone(isStandalone());
    getExistingSubscription().then((sub) => setSubscribed(!!sub)).catch(() => {});
  }, []);

  async function activate() {
    setBusy(true);
    setMessage('');
    try {
      await subscribeToPush();
      setSubscribed(true);
      setMessage('Notificações ativadas ✓');
    } catch (err) {
      setMessage(err.message || 'Não deu pra ativar. Verifique as permissões do navegador.');
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
      setMessage('Notificações desativadas.');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage('Enviando...');
    try {
      const res = await api.push.test();
      setMessage(res.sent > 0 ? `Teste enviado ✓ (${res.sent})` : 'Nenhuma assinatura ativa para enviar.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="🔔 Notificações">
      {!supported && (
        <p className="empty-hint">
          Este navegador não suporta notificações push. No iPhone, use o Safari e adicione o
          app à Tela de Início primeiro.
        </p>
      )}
      {supported && !standalone && (
        <p style={{ fontSize: '0.8rem', marginTop: 0 }}>
          ⚠️ No iPhone, notificações só funcionam depois de adicionar o app à Tela de Início
          (Safari → Compartilhar → Adicionar à Tela de Início) e abrir por esse ícone.
        </p>
      )}
      {supported && (
        <>
          <div className="quick-actions">
            {subscribed ? (
              <button className="btn" disabled={busy} onClick={deactivate}>Desativar</button>
            ) : (
              <button className="btn btn-primary" disabled={busy} onClick={activate}>Ativar notificações</button>
            )}
            {subscribed && (
              <button className="btn" disabled={busy} onClick={sendTest}>Enviar teste</button>
            )}
          </div>
          {message && <p style={{ fontSize: '0.82rem' }}>{message}</p>}
        </>
      )}
    </Card>
  );
}

function dayList(days) {
  return days === 'all' ? [] : days.split(',');
}

function RemindersCard() {
  const [reminders, setReminders] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [newReminder, setNewReminder] = useState(emptyReminder);

  const load = useCallback(() => {
    api.reminders.list().then(setReminders);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(reminder) {
    await api.reminders.update(reminder.id, { active: !reminder.active });
    load();
  }

  async function saveReminder(reminder) {
    await api.reminders.update(reminder.id, {
      title: reminder.title,
      body: reminder.body,
      time: reminder.time,
    });
  }

  function updateLocal(id, patch) {
    setReminders(reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function toggleDay(reminder, weekday) {
    const current = dayList(reminder.days);
    const next = current.includes(weekday) ? current.filter((d) => d !== weekday) : [...current, weekday];
    const days = next.length === 0 ? 'all' : next.join(',');
    await api.reminders.update(reminder.id, { days });
    load();
  }

  async function removeReminder(id) {
    await api.reminders.remove(id);
    load();
  }

  async function addReminder(e) {
    e.preventDefault();
    if (!newReminder.title) return;
    await api.reminders.add(newReminder);
    setNewReminder(emptyReminder);
    load();
  }

  return (
    <Card
      title="⏰ Lembretes"
      action={
        <button className="btn btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Concluir' : 'Editar'}
        </button>
      }
    >
      {reminders.length === 0 ? (
        <p className="empty-hint">Nenhum lembrete cadastrado.</p>
      ) : (
        <div className="list">
          {reminders.map((r) => (
            <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!r.active}
                    onChange={() => toggleActive(r)}
                    style={{ width: 'auto' }}
                  />
                  {editMode ? (
                    <input value={r.title} onChange={(e) => updateLocal(r.id, { title: e.target.value })} onBlur={() => saveReminder(r)} />
                  ) : (
                    <strong>{r.title}</strong>
                  )}
                </label>
                {editMode && <button className="remove-btn" onClick={() => removeReminder(r.id)}>✕</button>}
              </div>
              {editMode ? (
                <div className="field-row">
                  <input type="time" value={r.time} onChange={(e) => updateLocal(r.id, { time: e.target.value })} onBlur={() => saveReminder(r)} />
                  <input value={r.body || ''} placeholder="Mensagem" onChange={(e) => updateLocal(r.id, { body: e.target.value })} onBlur={() => saveReminder(r)} />
                </div>
              ) : (
                <div className="list-item-meta">{r.time} · {r.body}</div>
              )}
              {editMode && (
                <div className="chip-row" style={{ marginBottom: 0 }}>
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`chip${dayList(r.days).includes(w) ? ' active' : ''}`}
                      onClick={() => toggleDay(r, w)}
                    >
                      {WEEKDAY_SHORT_LABELS[w]}
                    </button>
                  ))}
                  {r.days === 'all' && <span className="list-item-meta">Todos os dias</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editMode && (
        <form onSubmit={addReminder} style={{ marginTop: 12 }}>
          <div className="field-row">
            <input
              placeholder="Título (ex: 💧 Água)"
              value={newReminder.title}
              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
            />
            <input
              type="time"
              value={newReminder.time}
              onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
            />
          </div>
          <div className="field-row">
            <input
              placeholder="Mensagem (opcional)"
              value={newReminder.body}
              onChange={(e) => setNewReminder({ ...newReminder, body: e.target.value })}
            />
            <button className="btn" type="submit">+</button>
          </div>
        </form>
      )}
    </Card>
  );
}

export function NotificationsSection() {
  return (
    <>
      <PushCard />
      <RemindersCard />
    </>
  );
}
