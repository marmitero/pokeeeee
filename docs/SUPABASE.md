# Migrar o banco para o Supabase

**Resumo:** Supabase **é** PostgreSQL. Não muda nada no código — só o
`DATABASE_URL`. O ganho real é que os dados **param de sumir** a cada reset do
ambiente de desenvolvimento.

---

## Por que vale

Hoje o banco roda num PostgreSQL local embutido, em `.pgdata/`. Esse diretório
é *gitignored*, e arquivos ignorados **não sobrevivem** ao reset do sandbox.
Resultado: a cada sessão é preciso recriar o cluster, reaplicar as migrations e
recriar as contas de teste.

Com Supabase, o banco fica fora do sandbox e persiste.

---

## Passo a passo

### 1. Criar o projeto

<https://supabase.com> → *New project*. Anote a senha do banco.

### 2. Pegar a connection string

*Project Settings → Database → Connection string → URI*.

```
postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

### 3. ⚠️ Usar a conexão DIRETA (porta 5432), não a pooled (6543)

A conexão pooled usa **transaction pooling**, que **não suporta prepared
statements** — e isso quebra parte do Drizzle e do `drizzle-kit`.

O app detecta a 6543 e **avisa no log**, mas não corrige sozinho.

### 4. Colocar no `.env`

```bash
DATABASE_URL="postgresql://postgres.SEU_REF:SUA_SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

**SSL é ligado automaticamente** quando o host contém `supabase.com`
(ver `src/db/index.ts`). Para forçar: `DATABASE_SSL=true|false`.

### 5. Aplicar o schema

```bash
npm run db:migrate     # aplica as migrations versionadas de drizzle/
```

Ou, se preferir começar do zero:

```bash
npm run db:push
```

---

## O que continua não persistindo

⚠️ **O `.env` também é gitignored**, então ele some junto. O banco persiste, mas
a *configuração que aponta para ele* não.

Duas saídas:

| Opção | Como | Risco |
|---|---|---|
| **A. Colar a URL a cada sessão** | Você me passa a connection string quando o ambiente resetar | Nenhum. Custa 10 segundos. |
| **B. Commitar a URL** | Tirar `.env` do `.gitignore` (ou criar `.env.defaults` rastreado) | A senha do banco fica no histórico do git. Se o repo um dia ficar público, é preciso rotacionar. |

**Recomendação:** opção A. Se o incômodo pesar, a opção B é aceitável num repo
privado de projeto pessoal — mas é uma decisão sua, não minha.

---

## O que **não** muda

- Nenhuma linha de código de negócio.
- As migrations em `drizzle/` funcionam iguais.
- Os testes de integração continuam usando um banco local descartável
  (`TEST_PG_URL`), para não poluir o banco real.

## ⚠️ Status: testado e BLOQUEADO no sandbox de desenvolvimento (2026-08-27)

A conexão foi tentada de verdade com a URL do projeto. **Não falhou por
credencial nem por configuração** — foi o proxy de saída do sandbox:

```
TLS github.com:443                            → ✅ OK
TLS aws-0-*.pooler.supabase.com:5432          → ❌ ECONNRESET
db.<ref>.supabase.co                          → só tem registro AAAA (IPv6);
                                                o sandbox não tem rota IPv6 global
```

O TCP chega a abrir, mas o TLS é derrubado para hosts fora da allowlist do
sandbox (só `github.com` e `registry.npmjs.org` passam). Foram varridas
17 regiões × 2 portas do pooler, todas com o mesmo erro.

**Consequência:** o suporte a Supabase está implementado e correto, mas não pôde
ser exercitado neste ambiente. Deve funcionar normalmente onde o app rodar com
saída irrestrita — máquina local, Vercel, etc.

### O que está implementado e é independente disso

- detecção de host e ativação automática de SSL (lógica pura, testável);
- aviso no log quando a URL aponta para a porta 6543 (transaction pooling);
- o restante do código não distingue Supabase de PostgreSQL local.

### Primeiro passo ao rodar fora do sandbox

```bash
npm run db:migrate     # aplica as migrations versionadas de drizzle/
```

## 🔒 A senha foi exposta

A connection string foi colada no chat durante a configuração, então a senha do
banco deve ser considerada exposta. **Rotacionar** em
*Project Settings → Database → Reset database password* e atualizar o `.env`.
