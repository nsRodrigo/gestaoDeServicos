# Barbearia Profissional — Gestão

Sistema de gestão para barbearia: atendimentos, tipos de corte, produtos/extras, dashboard,
relatórios com impressão/PDF e controle de estoque. Mobile-first, funciona também em desktop, e
pode ser instalado como app (PWA) no celular.

Stack: React + TypeScript + Vite + TailwindCSS no frontend, e Supabase (Postgres + Auth + Row
Level Security) como backend — sem servidor próprio para manter no ar. Os dados ficam acessíveis
tanto do celular quanto do desktop, de qualquer lugar com internet.

## 1. Criar o projeto no Supabase (uma vez só)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita (dá pra usar login do
   Google/GitHub).
2. Clique em **New project**. Escolha um nome (ex: `barbearia`), uma senha para o banco (guarde
   essa senha) e a região mais próxima de você.
3. Aguarde o projeto ser criado (leva 1–2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste projeto, copie **todo** o
   conteúdo, cole no SQL Editor e clique em **Run**. Isso cria todas as tabelas, as regras de
   segurança (RLS) e as funções que calculam totais e controlam estoque automaticamente.
6. Em seguida, rode também cada arquivo dentro de [`supabase/migrations/`](supabase/migrations)
   **na ordem numérica** (ex: `002_clientes_fidelidade_pagamento.sql`), do mesmo jeito: copiar,
   colar no SQL Editor, **Run**. Se você já tinha rodado o `schema.sql` antes de esses arquivos
   existirem, não precisa rodar de novo — só os arquivos novos de `migrations/`.
7. Vá em **Authentication** → **Users** → **Add user** → **Create new user** e crie o seu usuário
   (e-mail + senha) — é com ele que você vai logar no app. Marque a opção para já confirmar o
   e-mail automaticamente.
8. Vá em **Project Settings** → **API**. Copie a **Project URL** e a chave **anon public**
   (ou **Publishable key**, no painel novo do Supabase).
9. Depois de rodar a migração `005_admin_contas.sql`, torne a sua conta administradora rodando no
   SQL Editor (troque pelo seu e-mail):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'seuemail@exemplo.com');
   ```
   Só a conta marcada assim vê a tela **Administração** (aprovar/bloquear outras contas).

## 2. Configurar o app

1. Copie `.env.example` para `.env`:
   ```
   cp .env.example .env
   ```
2. Cole a URL e a chave copiadas no passo anterior:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```

## 3. Rodar o app

```bash
npm install
npm run dev
```

O terminal vai mostrar dois endereços: um `localhost` (para acessar no seu computador) e um
`Network` (algo como `http://192.168.0.x:5173`) — abra esse segundo endereço no navegador do
celular, desde que o celular esteja na mesma rede Wi-Fi do computador, para acessar o app dali
também.

Outros comandos úteis:

```bash
npm run build      # gera a versão de produção em dist/
npm run typecheck  # confere os tipos TypeScript
npm run lint       # confere o código com ESLint
```

## 4. Instalar como app no celular (PWA)

Com o app aberto no navegador do celular:

- **Android (Chrome)**: toque no menu (⋮) → "Adicionar à tela inicial" / "Instalar app".
- **iPhone (Safari)**: toque em Compartilhar → "Adicionar à Tela de Início".

O app passa a abrir em tela cheia, como um aplicativo nativo, com ícone próprio.

## 5. Backup dos dados

Em **Configurações** → **Backup dos dados**, o botão "Baixar backup" gera um arquivo `.json` com
todos os seus serviços, produtos e atendimentos. Salve esse arquivo periodicamente em um local
seguro — por exemplo, uma pasta do Google Drive sincronizada no computador ou celular.

## 6. Deploy público (opcional, para acessar de qualquer lugar sem depender do Wi-Fi de casa)

O banco de dados (Supabase) já fica acessível pela internet. Para o **frontend** também ficar
acessível de qualquer lugar (não só na sua rede Wi-Fi), publique a pasta gerada por `npm run
build` em um serviço gratuito como [Vercel](https://vercel.com) ou [Netlify](https://netlify.com)
— ambos suportam apps Vite diretamente a partir de um repositório Git. Configure lá as mesmas
variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Estrutura do projeto

```
src/
  components/    componentes reutilizáveis (ui/, layout/, reports/)
  hooks/         acesso a dados (Supabase) via @tanstack/react-query
  pages/         telas da aplicação
  lib/           formatação, períodos, cliente Supabase
  types/         tipos TypeScript do domínio
supabase/
  schema.sql       schema base do banco (tabelas, RLS, triggers, funções)
  migrations/      mudanças incrementais no schema, rodar em ordem após o schema.sql
```

## Notas de arquitetura

- **Sem backend próprio**: o frontend fala diretamente com o Supabase. Regras de negócio
  críticas (recálculo de totais, histórico de preços imutável, controle de estoque) rodam como
  triggers e funções dentro do Postgres — nunca dependem de cálculo feito no navegador.
- **Histórico de preços**: cada item de um atendimento guarda o nome e o preço do serviço/produto
  no momento em que foi adicionado. Alterar o preço de um serviço não afeta atendimentos antigos.
- **Estoque**: quando "Controlar estoque" está ativo em um produto, cada venda desconta o
  estoque automaticamente, e o sistema bloqueia a venda se não houver quantidade suficiente.
- **Preço personalizado**: ao adicionar um serviço/extra no atendimento, dá pra manter o valor
  cadastrado ou digitar um valor diferente só para aquele atendimento (ícone de lápis ao lado do
  preço no carrinho).
- **Numeração dos atendimentos**: todo atendimento recebe um número sequencial (`Atendimento 1`,
  `Atendimento 2`...), usado como nome padrão quando nenhum cliente é selecionado.
- **Fidelidade**: em Clientes, dá pra marcar um cliente como "fidelidade" com uma regra (ex: 5
  visitas por mês). Ao bater o número exato de visitas no período, um alerta aparece ao salvar o
  atendimento.
- **Nota por e-mail**: se o cliente selecionado tiver e-mail cadastrado, aparece um campo para
  escrever uma nota e um botão "Enviar nota" que abre o app de e-mail do dispositivo já
  preenchido — o app não envia e-mails sozinho, nem guarda a nota.
- **Contas e aprovação de acesso**: a tela "Criar conta" (link no login) cria uma conta que fica
  **pendente** até um administrador aprovar em **Administração** → "Aprovar". O administrador
  também pode bloquear qualquer conta (menos a própria) a qualquer momento — uma conta bloqueada
  ou pendente não consegue acessar nada, só vê uma tela avisando o status. Só existe administrador
  se a conta for marcada manualmente no banco (passo 9 da instalação) — não tem como promover
  outra conta a admin pelo próprio app, de propósito, por segurança.
- **Admin "entrando" em uma empresa**: ao logar, um administrador cai direto na tela **Empresas**
  — uma lista de todas as contas cadastradas. Ao escolher uma, o app inteiro (Dashboard,
  Atendimentos, Clientes, tudo) passa a mostrar os dados **daquela conta**, com edição completa,
  como se o admin fosse o dono dela. Uma faixa dourada no topo mostra "Visualizando como admin" e
  deixa trocar de empresa a qualquer momento. Um usuário comum nunca vê essa tela — continua
  indo direto pros próprios dados, como sempre.
