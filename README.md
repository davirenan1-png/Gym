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
- **Pacote de manutenção (evento)**: representa a aeronave "em manutenção" —
  tem nome (ex: "Revisão 200h - Ago/2026"), data de início, previsão de
  entrega e status. Uma aeronave tem no máximo um pacote ativo por vez.
- **Quadro operacional**: dentro do pacote ativo, cada item selecionado da
  matriz fica em uma das três colunas — Pendente (com motivo: peça, compra,
  mão de obra ou outro + observação), Em andamento, ou Entregue (quando
  concluído por uma Ordem de Serviço assinada).
- **Ordem de Serviço (OS)**: gerada a partir de um ou mais itens selecionados
  na matriz da aeronave. Fica em rascunho até ser assinada — a assinatura é
  desenhada na tela (canvas) — e ao assinar, atualiza automaticamente a
  última realização dos itens (com os contadores do momento) e move-os para
  "Entregue" no pacote vinculado.

## Funcionalidades

- Grid de frota clicável: cada aeronave mostra matrícula, pacote de
  manutenção atual (se houver) com previsão de entrega, e contagem de itens
  vencidos/próximos — clicar abre a tela de manutenção da aeronave
- Cadastro de modelos de aeronave com matriz de manutenção própria (itens
  obrigatórios e controlados)
- Cadastro de aeronaves a partir de um modelo, com célula, motor(es) e
  hélice(s) como contadores independentes de horas/ciclos
- Itens de manutenção com intervalo livre (horas e/ou dias e/ou ciclos) e
  tolerância de aviso configurável, com cálculo automático de status
  (`Em dia` / `Próximo` / `Vencido`)
- Pacotes de manutenção com quadro Pendente / Em andamento / Entregue,
  motivo de pendência (peça, compra, mão de obra, outro) e previsão de
  entrega da aeronave
- Ordens de Serviço com assinatura digital (desenho em canvas), que ao
  assinar atualizam os itens realizados automaticamente
- Registro de execução avulsa de item (fora de uma OS) e itens
  personalizados por aeronave
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
                        #   aircraft_engines, aircraft_propellers, aircraft_items,
                        #   maintenance_events, event_items, service_orders,
                        #   service_order_items)
    status.js           # cálculo de status multi-dimensional (horas/dias/ciclos)
    counters.js          # resolução de contador (célula/motor/hélice) e rótulo
    routes/
      models.js          # CRUD de modelos e itens de matriz + importação em massa
      aircraft.js         # CRUD de aeronaves + atualização de contadores + resumo
      items.js             # CRUD de itens de manutenção por aeronave + execução
      events.js             # CRUD de pacotes de manutenção + itens do pacote
      serviceOrders.js       # criação de OS + assinatura
      dashboard.js            # alertas consolidados de todas as aeronaves
    seed.js              # modelo King Air B200 de exemplo
    index.js             # servidor Express
frontend/
  src/
    pages/
      Dashboard.jsx        # painel de alertas
      Models.jsx            # lista/criação de modelos
      ModelDetail.jsx        # matriz do modelo + importação em massa
      Aircraft.jsx             # grid de frota + criação de aeronaves
      AircraftDetail.jsx        # operacional (pacote + quadro), contadores, matriz, OS
      ServiceOrderDetail.jsx     # dados da OS + assinatura em canvas
    components/            # Layout, StatusBadge, SignaturePad
    lib/                    # cliente de API e formatação
```
