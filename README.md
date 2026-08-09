# CTM Aviação — Controle Técnico de Manutenção

Aplicação web para controle técnico de manutenção de aeronaves: cadastro de
aeronaves, manutenções programadas (por horas, ciclos ou calendário) e
componentes com vida útil controlada, com alertas de itens próximos do
vencimento ou já vencidos.

## Stack

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: React + Vite + React Router

## Funcionalidades

- Cadastro de aeronaves (matrícula, modelo, horas e ciclos totais)
- Manutenções programadas com intervalo por horas de voo, ciclos (pousos) ou
  calendário, com cálculo automático de status (`Em dia` / `Próximo` /
  `Vencido`) e registro de execução (gera ordem de serviço)
- Componentes com limite de vida útil (horas, ciclos e/ou meses), com cálculo
  automático de status e registro de substituição
- Painel com alertas consolidados de tudo que está vencido ou próximo do
  limite

## Como rodar localmente

### 1. Backend (API + banco de dados)

```bash
cd backend
npm install
npm run seed   # opcional: popula o banco com dados de exemplo
npm start      # inicia a API em http://localhost:3001
```

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev    # inicia em http://localhost:5173
```

O frontend usa um proxy do Vite (`/api` → `http://localhost:3001`), então
basta abrir `http://localhost:5173` com o backend rodando.

### Build de produção do frontend

```bash
cd frontend
npm run build
```

## Estrutura

```
backend/
  src/
    db.js            # schema SQLite (aircraft, maintenance_schedules, components, service_orders)
    status.js         # cálculo de status (ok / próximo / vencido)
    routes/            # rotas REST
    seed.js            # dados de exemplo
    index.js           # servidor Express
frontend/
  src/
    pages/             # Painel, Aeronaves, Manutenções, Componentes
    components/         # Layout, StatusBadge
    lib/                # cliente de API e formatação
```
