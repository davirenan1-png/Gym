import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Card } from '../components/Card.jsx';

export function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

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

      <Card title="Sobre">
        <p style={{ margin: 0 }}>
          App pessoal de treino, dieta e jiu-jitsu. Adicione à tela inicial do celular pelo
          menu do navegador (&quot;Adicionar à tela de início&quot;) para usar como app.
        </p>
      </Card>
    </div>
  );
}
