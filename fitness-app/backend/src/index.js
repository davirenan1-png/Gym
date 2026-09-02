import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import './db.js';
import { router as settingsRouter } from './routes/settings.js';
import { router as waterRouter } from './routes/water.js';
import { router as weightRouter } from './routes/weight.js';
import { router as nutritionRouter } from './routes/nutrition.js';
import { router as workoutsRouter } from './routes/workouts.js';
import { router as routineRouter } from './routes/routine.js';
import { router as jiujitsuRouter } from './routes/jiujitsu.js';
import { router as dashboardRouter } from './routes/dashboard.js';
import { router as backupRouter } from './routes/backup.js';
import { router as dietplanRouter } from './routes/dietplan.js';
import { router as protocolRouter } from './routes/protocol.js';
import { router as checkinRouter } from './routes/checkin.js';
import { router as pushRouter } from './routes/push.js';
import { router as remindersRouter } from './routes/reminders.js';

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
app.use('/api/backup', backupRouter);
app.use('/api/dietplan', dietplanRouter);
app.use('/api/protocol', protocolRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/push', pushRouter);
app.use('/api/reminders', remindersRouter);

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Fitness API rodando em http://localhost:${PORT}`);
});
