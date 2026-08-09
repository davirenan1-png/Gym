# Treino, Dieta & Jiu-Jitsu — app pessoal

App de uso pessoal (single-user, sem login) para acompanhar treino de
musculação, dieta, consumo de água e jiu-jitsu, pensado para ser instalado
como PWA no celular ("Adicionar à tela de início").

## Stack

- **Backend**: Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend**: React + Vite, mobile-first, PWA (manifest + service worker)

## Funcionalidades

- **Hoje**: painel do dia — água consumida vs. meta, calorias/macros do dia,
  se já treinou musculação/jiu-jitsu, último peso registrado e faixa atual.
- **Água**: botões rápidos (+200/250/500/1L ml) ou valor customizado, meta
  diária configurável, histórico dos últimos 14 dias.
- **Dieta**: registro de refeições (café/almoço/jantar/lanche/outro) com
  calorias e macros, e evolução do peso corporal com gráfico.
- **Treino**: catálogo de exercícios, registro de sessão com séries
  (repetições × carga) e gráfico de evolução de carga por exercício
  (progressive overload).
- **Jiu-Jitsu**: registro de sessão (gi/no-gi, foco: aula/drilling/
  sparring/competição, duração, rounds, intensidade, notas de técnica),
  estatísticas (dias seguidos treinando, sessões nos últimos 30 dias) e
  histórico de faixa/graus.
- **Configurações**: metas diárias de água, calorias, macros e peso.

## Como rodar localmente

### 1. Backend (API + banco de dados)

```bash
cd fitness-app/backend
npm install
npm start      # inicia a API em http://localhost:3002
```

### 2. Frontend

Em outro terminal:

```bash
cd fitness-app/frontend
npm install
npm run dev    # inicia em http://localhost:5173
```

O frontend usa um proxy do Vite (`/api` → `http://localhost:3002`), então
basta abrir `http://localhost:5173` com o backend rodando.

### Instalar no celular (PWA)

Com o app publicado em produção (HTTPS), abra a URL no navegador do celular
e use "Adicionar à tela de início" (Android/Chrome) ou "Adicionar à Tela de
Início" no menu de compartilhamento (iOS/Safari). O app abre em tela cheia,
como um app nativo.

### Build de produção do frontend

```bash
cd fitness-app/frontend
npm run build
```

## Estrutura

```
fitness-app/
  backend/
    src/
      db.js              # schema SQLite (settings, water_logs,
                          #   body_weight_logs, food_logs, exercises,
                          #   workout_sessions, workout_sets,
                          #   jiujitsu_sessions, belt_history)
      routes/
        settings.js        # metas diárias (água, calorias, macros, peso)
        water.js             # log de água + histórico
        weight.js              # log de peso corporal
        nutrition.js             # log de refeições
        workouts.js                # exercícios, sessões, séries, progressão
        jiujitsu.js                  # sessões, estatísticas, faixa
        dashboard.js                  # resumo consolidado do dia
      index.js              # servidor Express
  frontend/
    src/
      pages/
        Today.jsx           # painel "Hoje"
        Water.jsx             # água
        Diet.jsx                # dieta + peso
        Workouts.jsx              # musculação
        JiuJitsu.jsx                # jiu-jitsu
        Settings.jsx                 # metas
      components/            # Card, ProgressBar, LineChart, BottomNav
      lib/                    # cliente de API e formatação
    public/
      manifest.webmanifest    # instalação como PWA
      sw.js                     # service worker (cache do app shell)
```
