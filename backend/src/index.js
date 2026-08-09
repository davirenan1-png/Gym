import express from 'express';
import cors from 'cors';
import './db.js';
import { router as aircraftRouter } from './routes/aircraft.js';
import { router as maintenancesRouter } from './routes/maintenances.js';
import { router as componentsRouter } from './routes/components.js';
import { router as serviceOrdersRouter } from './routes/serviceOrders.js';
import { router as dashboardRouter } from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/aircraft', aircraftRouter);
app.use('/api/maintenances', maintenancesRouter);
app.use('/api/components', componentsRouter);
app.use('/api/service-orders', serviceOrdersRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`CTM API rodando em http://localhost:${PORT}`);
});
