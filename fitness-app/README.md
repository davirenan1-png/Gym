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

> No iPhone, notificações push só funcionam depois de instalado dessa forma
> (o Safari sozinho, sem instalar, não recebe push) e a partir do iOS 16.4.

### Build de produção do frontend

```bash
cd fitness-app/frontend
npm run build
```

Em produção, o backend serve automaticamente os arquivos de
`frontend/dist` (veja `backend/src/index.js`) — não precisa de um servidor
separado para o frontend.

## Publicar de graça no Render

O jeito mais simples de usar o app todo dia no celular é publicar num
serviço com HTTPS. O plano gratuito do Render serve bem para uso pessoal,
com uma ressalva: **o disco do plano free não é garantidamente
persistente** — uma atualização de código pode apagar os dados salvos.
Por isso o app tem a tela **Configurações → Backup**: baixe o backup de
vez em quando (ou sempre antes de eu atualizar algo) para nunca depender
só do disco do servidor.

### Opção A — Blueprint (mais rápido)

Este repositório já tem um `render.yaml` na raiz configurado para rodar o
`fitness-app` como um único serviço (API + frontend juntos).

1. Crie uma conta grátis em [render.com](https://render.com) e conecte sua
   conta do GitHub.
2. No painel, clique em **New +** → **Blueprint**.
3. Selecione este repositório (`davirenan1-png/Gym`). O Render deve
   detectar o `render.yaml` automaticamente.
4. Confirme a criação do serviço `fitness-tracker` (plano **Free**).
5. Aguarde o build (alguns minutos). A URL final aparece no painel, algo
   como `https://fitness-tracker-xxxx.onrender.com`.

Se o Render não conseguir importar o Blueprint por algum motivo, use a
Opção B abaixo (configuração manual, mesmos valores).

### Opção B — Serviço manual (se o Blueprint falhar)

1. **New +** → **Web Service** → selecione o repositório.
2. **Root Directory**: `fitness-app`
3. **Runtime**: Node
4. **Build Command**:
   ```
   npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend
   ```
5. **Start Command**:
   ```
   npm start --prefix backend
   ```
6. **Plan**: Free
7. Criar o serviço e aguardar o deploy.

### Depois de publicado

- Abra a URL do Render no Safari do iPhone e use **Compartilhar → Adicionar
  à Tela de Início**. O app passa a abrir em tela cheia, como um app nativo.
- O plano free do Render "dorme" depois de ~15 min sem uso — a primeira
  abertura do dia pode demorar uns 30-50 segundos para o servidor acordar.
  Isso é normal do plano gratuito.
- Sempre que eu (Claude) fizer uma atualização no app e você fizer o
  redeploy, **baixe um backup antes** em Configurações, e restaure depois
  se os dados sumirem.

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
