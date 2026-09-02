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
- **Dieta**: plano alimentar prescrito (dias de treino x dias de descanso,
  refeições e itens editáveis) + registro livre de refeições com calorias e
  macros, e evolução do peso corporal com gráfico.
- **Treino**: plano de treino em ciclo (ex: 3 dias de treino + 1 de
  descanso, repetindo — não fixo por dia da semana), com botão para marcar
  o treino do dia como concluído e avançar pro próximo; catálogo de
  exercícios, registro de sessão com séries (repetições × carga) e gráfico
  de evolução de carga por exercício (progressive overload).
- **Jiu-Jitsu**: registro de sessão (gi/no-gi, foco: aula/drilling/
  sparring/competição, duração, rounds, intensidade, notas de técnica),
  estatísticas (dias seguidos treinando, sessões nos últimos 30 dias) e
  histórico de faixa/graus.
- **Protocolo**: checklist diário de suplementos e registro de aplicações
  de ergogênicos (substância, dose, data), com histórico.
- **Diário**: check-in diário (adesão ao plano, peso em jejum, sono, humor,
  performance no treino, digestão, passos, qualidade das fezes,
  comentários) e resumo da semana com botão para copiar o texto pronto
  para enviar ao coach.
- **Configurações**: metas diárias de água, calorias, macros e peso;
  notificações push (ativar/testar) e lembretes configuráveis (água,
  refeições, suplementos, check-in com o coach); backup completo dos
  dados (exportar/restaurar).

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
   ⚠️ **Importante**: o código está na branch `claude/fitness-diet-tracking-app-igw5lu`
   (o repositório ainda não tem uma branch `main`). Confira/selecione essa
   branch na tela de criação do serviço, senão o Render pode tentar usar
   uma branch vazia ou errada.
4. Confirme a criação do serviço `fitness-tracker` (plano **Free**).
5. Aguarde o build (alguns minutos). A URL final aparece no painel, algo
   como `https://fitness-tracker-xxxx.onrender.com`.

Se o Render não conseguir importar o Blueprint por algum motivo, use a
Opção B abaixo (configuração manual, mesmos valores).

### Opção B — Serviço manual (se o Blueprint falhar)

1. **New +** → **Web Service** → selecione o repositório.
2. **Branch**: `claude/fitness-diet-tracking-app-igw5lu` · **Root Directory**: `fitness-app`
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

## Notificações push e lembretes

O app manda notificação push de verdade (água, refeições, suplementos,
check-in com o coach), configurável em **Configurações → Lembretes**. Duas
coisas precisam estar certas pra isso funcionar:

### 1. Ativar no celular

Em **Configurações → Notificações**, toque em "Ativar notificações". No
iPhone isso só funciona depois de instalado ("Adicionar à Tela de
Início") e abrindo o app por esse ícone — não pelo Safari direto. Use o
botão "Enviar teste" pra confirmar que chegou.

### 2. Manter os lembretes disparando mesmo com o servidor "dormindo"

O plano free do Render dorme sem uso — sozinho, o app não teria como
"acordar" no horário certo pra mandar a notificação. A solução é um
serviço externo grátis que acessa uma URL do app de tempos em tempos,
o que já acorda o servidor e dispara os lembretes que estiverem no horário:

1. Crie uma conta grátis em [cron-job.org](https://cron-job.org)
2. Crie um novo cronjob apontando para:
   `https://SEU-APP.onrender.com/api/push/tick`
   (troque pela URL real do seu serviço no Render)
3. Configure para rodar a cada 5-15 minutos
4. Salve e ative

Cada chamada verifica os lembretes cadastrados e manda notificação pra
quem já ativou (passo 1) e ainda não recebeu aquele lembrete hoje —
não importa se o cronjob atrasa alguns minutos, ele não manda duplicado.

Opcional: para evitar que outra pessoa dispare seus lembretes manualmente,
defina uma variável de ambiente `CRON_SECRET` no Render (Settings →
Environment) e adicione `?token=SEU_SECRET` no final da URL do cronjob.

### Alternativa sem depender do servidor: Atalhos do iPhone

Se preferir não configurar o cron-job.org, o app **Atalhos** do iPhone
cria alarmes 100% locais (não dependem do Render estar acordado) via
Automação Pessoal → Horário → Notificação. Menos "inteligente" (não sabe
se você já bebeu água ou não), mas nunca falha.

## Estrutura

```
fitness-app/
  backend/
    src/
      db.js               # schema SQLite + seeds de todo o app
      lib/
        push.js             # VAPID, envio de push
      routes/
        settings.js         # metas diárias
        water.js               # log de água + histórico
        weight.js                # log de peso corporal
        nutrition.js              # log de refeições
        workouts.js                 # exercícios, sessões, séries, progressão
        routine.js                    # plano de treino em ciclo
        dietplan.js                     # plano alimentar prescrito
        protocol.js                       # suplementos + ergogênicos
        checkin.js                          # diário / check-in semanal
        jiujitsu.js                           # sessões, estatísticas, faixa
        push.js                                 # assinatura + tick de notificações
        reminders.js                              # CRUD de lembretes
        dashboard.js                                # resumo do dia
        backup.js                                     # exportar/restaurar tudo
      index.js              # servidor Express (serve a API e o build do frontend)
  frontend/
    src/
      pages/                # Today, Water, Diet, Workouts, JiuJitsu, Protocol,
                             #   Checkin, Settings — uma por rota
      components/            # Card, ProgressBar, LineChart, BottomNav,
                              #   RoutinePlan, DietPlan, NotificationsSection
      lib/                    # cliente de API, formatação, push (frontend)
    public/
      manifest.webmanifest    # instalação como PWA
      sw.js                    # service worker (cache + push)
      sw.js                     # service worker (cache do app shell)
```
