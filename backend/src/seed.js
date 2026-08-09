import { db } from './db.js';

const countModels = db.prepare('SELECT COUNT(*) AS n FROM aircraft_models').get().n;
if (countModels > 0) {
  console.log('Banco já possui dados, seed ignorado.');
  process.exit(0);
}

const modelInfo = db
  .prepare('INSERT INTO aircraft_models (name, manufacturer, engine_count, has_propellers) VALUES (?, ?, ?, ?)')
  .run('King Air B200', 'Beechcraft', 2, 1);
const modelId = modelInfo.lastInsertRowid;

const insertModelItem = db.prepare(
  `INSERT INTO model_items (model_id, zona, nomenclatura, referencia_mm, applies_to, interval_hours, interval_days, interval_cycles, tolerance_percent, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// Itens curados a partir da matriz real MICCA (MAPA DE CONTROLE DE MANUTENÇÃO) do modelo B200
const templateItems = [
  // Célula
  { zona: 'REG', nomenclatura: 'Certificado de Verificação de Aeronavegabilidade (CVA)', referencia_mm: 'RBAC 91.409(a)', applies_to: 'celula', interval_days: 365, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'Licença de Estação', referencia_mm: 'RBAC 91.203(a)(4)(ii)', applies_to: 'celula', interval_days: 7173, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'Peso e Balanceamento', referencia_mm: 'RBAC 91.423', applies_to: 'celula', interval_days: 1095, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'Seguro RETA', referencia_mm: 'RBAC 91.203(a)(4)(i)', applies_to: 'celula', interval_days: 365, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'Taxa Fistel', referencia_mm: 'RBAC 91.203(a)(4)(ii)', applies_to: 'celula', interval_days: 365, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'VOR / IFR Teste', referencia_mm: 'RBAC 91.171', applies_to: 'celula', interval_days: 30, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'Inspeção Anual do ELT', referencia_mm: 'RBAC 91.207', applies_to: 'celula', interval_days: 365, tolerance_percent: 0 },
  { zona: 'REG', nomenclatura: 'Kit de Primeiros Socorros', referencia_mm: 'RBAC 91.513 e RBAC 91.409', applies_to: 'celula', interval_days: 365, tolerance_percent: 0 },
  { zona: 'CEL.05', nomenclatura: 'Alternate Phase Inspection 1 e 2', referencia_mm: '05-20-01 / 05-20-02', applies_to: 'celula', interval_hours: 400, interval_days: 730, tolerance_percent: 0 },
  { zona: 'CEL.12', nomenclatura: 'Lubrificação 200h', referencia_mm: '12-20-53', applies_to: 'celula', interval_hours: 200, tolerance_percent: 20 },

  // Motor (gera um item por motor: LH e RH)
  { zona: 'ENG', nomenclatura: 'Minor Inspection', referencia_mm: '72-00-00 Table 601', applies_to: 'motor', interval_hours: 200, tolerance_percent: 20 },
  { zona: 'ENG', nomenclatura: 'Oil System - Replace Filter Element', referencia_mm: '72-00-00 Table 601', applies_to: 'motor', interval_hours: 1000 },
  { zona: 'ENG', nomenclatura: 'Hot Section - Borescope Inspection', referencia_mm: '73-10-05', applies_to: 'motor', interval_hours: 400 },
  { zona: 'ENG', nomenclatura: 'Engine Overhaul (TBO)', referencia_mm: 'SB 3003', applies_to: 'motor', interval_hours: 3600 },
  { zona: 'ENG', nomenclatura: 'P3 Air Filter', referencia_mm: '73-10-07', applies_to: 'motor', interval_hours: 1000 },
  { zona: 'ENG', nomenclatura: 'Propeller Governor - Overhaul/Replace', referencia_mm: 'SB 3003', applies_to: 'motor', interval_hours: 3600 },

  // Hélice (gera um item por hélice: LH e RH)
  { zona: 'CEL.05', nomenclatura: 'Inspeção / Overhaul da Hélice', referencia_mm: '61-11-01, 001', applies_to: 'helice', interval_hours: 5000, interval_days: 2190 },
  { zona: 'CEL.05', nomenclatura: 'Overspeed Governor', referencia_mm: 'SB33580', applies_to: 'helice', interval_hours: 6500 },
];

templateItems.forEach((item, idx) => {
  insertModelItem.run(
    modelId, item.zona, item.nomenclatura, item.referencia_mm ?? null, item.applies_to,
    item.interval_hours ?? null, item.interval_days ?? null, item.interval_cycles ?? null,
    item.tolerance_percent ?? null, idx + 1
  );
});

const aircraftInfo = db
  .prepare(
    `INSERT INTO aircraft (model_id, registration, cell_serial_number, manufacture_date, cell_hours, cell_cycles)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  .run(modelId, 'PR-MED', 'BB1124', '1983-01-01', 10070.2, 9516);
const aircraftId = aircraftInfo.lastInsertRowid;

const insertEngine = db.prepare(
  'INSERT INTO aircraft_engines (aircraft_id, role, model, serial_number, hours, cycles) VALUES (?, ?, ?, ?, ?, ?)'
);
const engineLh = insertEngine.run(aircraftId, 'lh', 'PT6A-42', 'PCE-93613', 10014.3, 10469);
const engineRh = insertEngine.run(aircraftId, 'rh', 'PT6A-42', 'PCE-93614', 10014.3, 10469);

const insertPropeller = db.prepare(
  'INSERT INTO aircraft_propellers (aircraft_id, role, model, serial_number, hours, cycles) VALUES (?, ?, ?, ?, ?, ?)'
);
const propLh = insertPropeller.run(aircraftId, 'lh', 'MC Cauley MPC-26', '160570', 849.2, null);
const propRh = insertPropeller.run(aircraftId, 'rh', 'MC Cauley MPC-26', '160562', 849.2, null);

const engineIds = { lh: engineLh.lastInsertRowid, rh: engineRh.lastInsertRowid };
const propellerIds = { lh: propLh.lastInsertRowid, rh: propRh.lastInsertRowid };

const insertAircraftItem = db.prepare(
  `INSERT INTO aircraft_items
    (aircraft_id, source_model_item_id, zona, nomenclatura, referencia_mm, ref_type, ref_id, interval_hours, interval_days, interval_cycles, tolerance_percent, last_done_hours, last_done_cycles, last_done_date)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// Dados reais de "última inspeção realizada" extraídos do MICCA, para demonstrar os três status (ok / próximo / vencido)
const lastDone = {
  'Certificado de Verificação de Aeronavegabilidade (CVA)': { date: '2026-07-16' },
  'Licença de Estação': { date: '2015-01-02' },
  'Peso e Balanceamento': { date: '2026-02-06' },
  'Seguro RETA': { date: '2025-11-05' },
  'Taxa Fistel': { date: '2026-03-30' },
  'VOR / IFR Teste': { date: '2026-07-01' },
  'Inspeção Anual do ELT': { date: '2026-07-16' },
  'Kit de Primeiros Socorros': { date: '2026-02-01' },
  'Alternate Phase Inspection 1 e 2': { hours: 10070.2, date: '2026-07-16' },
  'Lubrificação 200h': { hours: 10070.2 },
  'Minor Inspection': { hours: 9850 },
  'Oil System - Replace Filter Element': { hours: 9565.1 },
  'Hot Section - Borescope Inspection': { hours: 10014.3 },
  'Engine Overhaul (TBO)': { hours: 7166.0 },
  'P3 Air Filter': { hours: 9174.8 },
  'Propeller Governor - Overhaul/Replace': { hours: 7166.0 },
  'Inspeção / Overhaul da Hélice': { hours: 509.9, date: '2024-04-29' },
  'Overspeed Governor': { hours: 7472.1 },
};

const roles = ['lh', 'rh'];

for (const item of templateItems) {
  const done = lastDone[item.nomenclatura] ?? {};
  if (item.applies_to === 'celula') {
    insertAircraftItem.run(
      aircraftId, null, item.zona, item.nomenclatura, item.referencia_mm ?? null, 'celula', null,
      item.interval_hours ?? null, item.interval_days ?? null, item.interval_cycles ?? null, item.tolerance_percent ?? null,
      done.hours ?? null, done.cycles ?? null, done.date ?? null
    );
  } else if (item.applies_to === 'motor') {
    for (const role of roles) {
      insertAircraftItem.run(
        aircraftId, null, item.zona, item.nomenclatura, item.referencia_mm ?? null, 'motor', engineIds[role],
        item.interval_hours ?? null, item.interval_days ?? null, item.interval_cycles ?? null, item.tolerance_percent ?? null,
        done.hours ?? null, done.cycles ?? null, done.date ?? null
      );
    }
  } else if (item.applies_to === 'helice') {
    for (const role of roles) {
      insertAircraftItem.run(
        aircraftId, null, item.zona, item.nomenclatura, item.referencia_mm ?? null, 'helice', propellerIds[role],
        item.interval_hours ?? null, item.interval_days ?? null, item.interval_cycles ?? null, item.tolerance_percent ?? null,
        done.hours ?? null, done.cycles ?? null, done.date ?? null
      );
    }
  }
}

console.log('Seed concluído com sucesso.');
