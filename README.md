# CTM Aviação — Controle Técnico de Manutenção

Sistema web para controle do programa de manutenção de aeronaves, com matrizes
específicas por modelo, controle independente de célula/motor(es)/hélice(s),
atualização rápida de horas e ciclos, e alertas de vencimento com intervalos
livres (horas, calendário ou os dois combinados).

## Stack

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: React + Vite + React Router

## Conceitos

- **Modelo de aeronave**: a matriz de manutenção reutilizável (ex: "King Air
  B200"). Define quantos motores a aeronave tem (1 ou 2, LH/RH) e se possui
  hélice(s) controlada(s), e a lista de itens obrigatórios (zona, nomenclatura,
  referência do manual, a quem o item se aplica — célula, motor ou hélice — e
  o intervalo).
- **Intervalo livre por item**: cada item pode ter intervalo em horas, em dias
  (calendário) e/ou em ciclos, em qualquer combinação — por exemplo só "100h",
  só "3 meses" (90 dias), ou "200h / 6 meses" (o que vencer primeiro). Um
  percentual de tolerância opcional define quando o item entra em alerta
  "próximo do vencimento" antes de vencer.
- **Aeronave**: criada a partir de um modelo. Ao cadastrar, todos os itens da
  matriz do modelo são automaticamente gerados para essa aeronave — um item
  por célula, e um item por motor/hélice existente (ex: em um bimotor, um
  item "aplica-se a motor" vira dois itens, um para o motor LH e outro para o
  RH).
- **Atualização de horas/ciclos**: uma única tela por aeronave atualiza horas
  e ciclos da célula e de cada motor/hélice; a situação de todos os itens da
  matriz é recalculada automaticamente a partir daí.
- **Importação em massa**: na página de um modelo é possível colar linhas
  (formato TAB-separado, como copiado do Excel) para importar dezenas de
  itens da matriz de uma vez.

## Funcionalidades

- Cadastro de modelos de aeronave com matriz de manutenção própria (itens
  obrigatórios e controlados)
- Cadastro de aeronaves a partir de um modelo, com célula, motor(es) e
  hélice(s) como contadores independentes de horas/ciclos
- Itens de manutenção com intervalo livre (horas e/ou dias e/ou ciclos) e
  tolerância de aviso configurável, com cálculo automático de status
  (`Em dia` / `Próximo` / `Vencido`)
- Registro de execução de item (atualiza a última realização com os
  contadores atuais) e itens personalizados por aeronave
- Painel consolidando alertas de vencidos e próximos de todas as aeronaves

## Como rodar localmente

### 1. Backend (API + banco de dados)

```bash
cd backend
npm install
npm run seed   # opcional: popula com um modelo King Air B200 de exemplo
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
    db.js              # schema SQLite (aircraft_models, model_items, aircraft,
                        #   aircraft_engines, aircraft_propellers, aircraft_items)
    status.js           # cálculo de status multi-dimensional (horas/dias/ciclos)
    routes/
      models.js          # CRUD de modelos e itens de matriz + importação em massa
      aircraft.js         # CRUD de aeronaves + atualização de contadores
      items.js             # CRUD de itens de manutenção por aeronave + execução
      dashboard.js          # alertas consolidados de todas as aeronaves
    seed.js              # modelo King Air B200 de exemplo
    index.js             # servidor Express
frontend/
  src/
    pages/
      Dashboard.jsx        # painel de alertas
      Models.jsx            # lista/criação de modelos
      ModelDetail.jsx        # matriz do modelo + importação em massa
      Aircraft.jsx             # lista/criação de aeronaves
      AircraftDetail.jsx        # atualização de contadores + matriz da aeronave
    components/            # Layout, StatusBadge
    lib/                    # cliente de API e formatação
```
