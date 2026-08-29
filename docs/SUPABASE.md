# Supabase — staging e produção

O Supabase fornece o PostgreSQL. O navegador não acessa suas tabelas: toda regra
do jogo continua passando pelas APIs Next.js.

## Ambientes

| Ambiente | Banco | Uso |
|---|---|---|
| local/CI | PostgreSQL descartável | desenvolvimento e testes |
| staging | projeto Supabase separado | Preview e validação |
| produção | projeto Supabase separado | usuários reais |

Nunca aponte Preview ou testes para produção.

## Duas conexões, duas finalidades

### `DATABASE_URL` — runtime

Na Vercel, use o **Session Pooler**, porta **5432**. Ele oferece IPv4 e reutiliza
conexões sem as limitações do Transaction Pooler. O pool local do app fica
limitado a três conexões por instância em produção.

Formato exibido pelo painel (pode variar por região):

```text
postgresql://postgres.PROJECT_REF:SENHA@REGIAO.pooler.supabase.com:5432/postgres
```

### `DIRECT_DATABASE_URL` — migrations

Use a conexão direta exibida pelo Supabase, exclusivamente para
`drizzle-kit migrate` e administração:

```text
postgresql://postgres:SENHA@db.PROJECT_REF.supabase.co:5432/postgres
```

A conexão direta pode exigir IPv6. Se o ambiente que executa migrations não
tiver IPv6, use temporariamente o Session Pooler 5432 também para a migration;
nunca use o Transaction Pooler 6543 neste projeto.

## Regras de segurança

- Nunca colocar URLs reais em Git, issue, log ou chat.
- Nunca usar prefixo `NEXT_PUBLIC_` em segredo.
- Nunca expor senha do banco ou chave `service_role` no navegador.
- TLS e validação de certificado permanecem habilitados.
- A CA de cada projeto é armazenada como segredo `DATABASE_CA_CERT` na Vercel;
  nunca é necessário definir `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- Staging e produção usam senhas diferentes.
- Aplicar somente migrations versionadas: `npm run db:migrate`.
- O runtime deve usar papel de privilégio mínimo quando essa etapa for criada.
- Data API/RLS deve permanecer fechada para acesso anônimo às tabelas do jogo.

## Variáveis da Vercel

```text
DATABASE_URL=<Session Pooler 5432>
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
DATABASE_CA_CERT=<conteúdo PEM da CA do projeto>
DATABASE_POOL_MAX=3
DATABASE_CONNECTION_TIMEOUT_MS=10000
DATABASE_IDLE_TIMEOUT_MS=30000
RATE_LIMIT_STORE=postgres
COOKIE_SAME_SITE=lax
SESSION_BEARER_ENABLED=false
```

`DIRECT_DATABASE_URL` não é necessária para servir o jogo. Cadastre-a somente
no ambiente controlado que executará migrations; se for cadastrada na Vercel,
nunca deve ser pública.

## Aplicar e validar

No primeiro staging vazio, execute `docs/supabase-staging-bootstrap.sql` pelo
SQL Editor. O script é transacional, recusa sobrescrever tabelas existentes,
habilita RLS sem policies públicas e registra as quatro migrations no journal
do Drizzle. O resultado esperado é `game_tables = 11` e `migrations = 4`.

Nas migrations futuras, use a conexão direta no ambiente administrativo:

```bash
DIRECT_DATABASE_URL="..." npm run db:migrate
```

Depois, o endpoint `/api/health` deve responder `200` com `{ "ok": true }`.
Cadastro, login, mapa, batalha e PvP precisam ser testados no staging antes de
qualquer projeto de produção.

## Credencial antiga

Uma connection string foi enviada em chat em 2026-08-27. A senha correspondente
é considerada comprometida e não pode ser reutilizada. Como não há dados a
preservar, o staging novo deve nascer com senha nova e exclusiva.
