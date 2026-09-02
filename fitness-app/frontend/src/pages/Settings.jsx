import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api.js';
import { Card } from '../components/Card.jsx';
import { NotificationsSection } from '../components/NotificationsSection.jsx';

export function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.settings.get().then(setForm);
  }, []);

  async function save(e) {
    e.preventDefault();
    const updated = await api.settings.update({
      water_goal_ml: form.water_goal_ml,
      calorie_goal: form.calorie_goal,
      protein_goal_g: form.protein_goal_g,
      carbs_goal_g: form.carbs_goal_g,
      fat_goal_g: form.fat_goal_g,
      weight_goal_kg: form.weight_goal_kg,
    });
    setForm({ ...form, ...updated });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function downloadBackup() {
    const backup = await api.backup.export();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-fitness-${backup.exported_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function restoreBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupStatus('Restaurando...');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      await api.backup.import(backup);
      setBackupStatus('Backup restaurado ✓ Recarregue as outras telas para ver os dados.');
    } catch {
      setBackupStatus('Não deu pra restaurar esse arquivo. Confira se é um backup válido.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!form) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
      </div>

      <Card title="Metas diárias">
        <form onSubmit={save}>
          <div className="field">
            <label>Meta de água (ml)</label>
            <input
              type="number"
              value={form.water_goal_ml}
              onChange={(e) => setForm({ ...form, water_goal_ml: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Meta de calorias (kcal)</label>
            <input
              type="number"
              value={form.calorie_goal}
              onChange={(e) => setForm({ ...form, calorie_goal: e.target.value })}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Proteína (g)</label>
              <input type="number" value={form.protein_goal_g} onChange={(e) => setForm({ ...form, protein_goal_g: e.target.value })} />
            </div>
            <div className="field">
              <label>Carboidrato (g)</label>
              <input type="number" value={form.carbs_goal_g} onChange={(e) => setForm({ ...form, carbs_goal_g: e.target.value })} />
            </div>
            <div className="field">
              <label>Gordura (g)</label>
              <input type="number" value={form.fat_goal_g} onChange={(e) => setForm({ ...form, fat_goal_g: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Meta de peso (kg)</label>
            <input type="number" step="0.1" value={form.weight_goal_kg} onChange={(e) => setForm({ ...form, weight_goal_kg: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-block" type="submit">
            {saved ? 'Salvo ✓' : 'Salvar metas'}
          </button>
        </form>
      </Card>

      <NotificationsSection />

      <Card title="Backup">
        <p style={{ marginTop: 0 }}>
          Baixe um arquivo com todos os seus dados de vez em quando — é sua rede de segurança
          caso algo dê errado na hospedagem.
        </p>
        <div className="quick-actions">
          <button className="btn" onClick={downloadBackup}>Baixar backup</button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>Restaurar backup</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={restoreBackup}
          />
        </div>
        {backupStatus && <p style={{ fontSize: '0.85rem' }}>{backupStatus}</p>}
      </Card>

      <Card title="Sobre">
        <p style={{ margin: 0 }}>
          App pessoal de treino, dieta e jiu-jitsu. Adicione à tela inicial do celular pelo
          menu do navegador (&quot;Adicionar à tela de início&quot;) para usar como app.
        </p>
      </Card>
    </div>
  );
}
