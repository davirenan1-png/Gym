import express from 'express';
import cors from 'cors';
import './db.js';
import { router as settingsRouter } from './routes/settings.js';
import { router as waterRouter } from './routes/water.js';
import { router as weightRouter } from './routes/weight.js';
import { router as nutritionRouter } from './routes/nutrition.js';
import { router as workoutsRouter } from './routes/workouts.js';
import { router as routineRouter } from './routes/routine.js';
import { router as jiujitsuRouter } from './routes/jiujitsu.js';
import { router as dashboardRouter } from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/settings', settingsRouter);
app.use('/api/water', waterRouter);
app.use('/api/weight', weightRouter);
app.use('/api/food', nutritionRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/routine', routineRouter);
app.use('/api/jiujitsu', jiujitsuRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Fitness API rodando em http://localhost:${PORT}`);
});
