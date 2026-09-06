# Relatório pós-ativação — mundo 1–20 no banco de PRODUÇÃO (2026-09-06)

> **Para a próxima conversa começar aqui.** O mundo (20 mapas + rebalance)
> está **ativo em produção** desde 2026-09-06, aplicado via GitHub Actions
> (workflow `World activation`), sem arquivos na máquina do mantenedor.
> Protocolo: ler `AI_State.md` primeiro (regra do handoff), depois este
> arquivo. Diagnósticos dos runs baseados no registro de sessão (§4.21–4.23)
> — os logs crus deixaram de ser baixáveis pela API na hora de escrever isto.

---

## 1. O que foi ativado

- **20 mapas** (`world:seed`) no banco de produção — idempotente por slug,
  preserva camadas pintadas no Editor, nunca apaga nada;
- **`db:rebalance`** — movesets legados + níveis de ginásio;
- **`world:export`** + verificação espelho git ↔ banco (artefato com patch só
  se divergir) e conferência da API pública (`/api/health` + `/api/maps` =
  20 mapas).

O conteúdo aplicado = o export de `content/world/maps/` (20 JSONs da 6.4-A,
catálogo de 156 espécies distribuído em bandas de nível) + rebalance.

## 2. Como (o workflow)

- Arquivo: `.github/workflows/world-activation.yml` (espelho em
  `docs/world-activation.yml` — manter idênticos; a integração do agente não
  tem permissão `workflows`, por isso o espelho vive em `docs/`).
- `workflow_dispatch` com inputs: `target` (staging|production), `apply`
  (bool), `confirm` (string). **Guarda de escrita:** `apply=true` só anda com
  `confirm=APLICAR-<target>` digitado no formulário.
- Papéis/segredos: papel mínimo `catchbound_maint` no Supabase
  (`docs/supabase-production-maint-role.sql`, aplicar no SQL Editor) + segredos
  `*_MAINT_DB_USER/PASSWORD` no GitHub. Conexão: Session Pooler porta **5432**
  (nunca 6543), TLS **verify-full** com a CA do projeto.
- Sequência de uso: `staging apply=false` → `production apply=false` →
  `production apply=true` (digitando `APLICAR-production`).

## 3. Os runs de 2026-09-06 (horários UTC)

| Run | Hora | Duração | Resultado | O que aconteceu |
|---|---|---|---|---|
| `34038129035` | 14:06 | 12 s | ❌ | **Tentativa 1 — `Invalid URL`**: o step consumia o `DATABASE_URL` definido por `$GITHUB_ENV` **no mesmo step** (só vale a partir do próximo step) |
| `34038223626` | 14:08 | 33 s | ❌ | **Tentativa 2 — TLS**: certificado self-signed do Supabase rejeitado (`sslmode=require`) |
| `34038675259` | 14:17 | 28 s | ❌ | TLS (mesma causa, antes do fix) |
| `34042183890` | 15:24 | 12 s | ❌ | 1ª execução pós-fix (causa não verificável na hora do registro) |
| `34042233626` | 15:25 | 38 s | ✅ | **No-op** (`apply=false`): só dry-runs, nada escrito |
| `34043394359` | 15:47 | 1 m 02 s | ✅ | **`APLICAR-production` — MUNDO ATIVADO** (seed + rebalance + export + conferência da API) |

**Fix do TLS** (commit `dca8645` no `main`): a política TLS inteira mora na
URL — `sslmode=verify-full&sslrootcert=$RUNNER_TEMP/supabase-ca.crt` (o `pg`
aplica os parâmetros da URL por cima do objeto `ssl`), CA gravada com `umask
077`, `export` no lugar de `$GITHUB_ENV`, e `DATABASE_SSL*` removidos.

## 4. Como conferir (reproduzível)

1. **Summary do run `34043394359`** no Actions: linha `APPLY:` + contagem de
   mapas aplicados;
2. **SQL Editor do Supabase (produção):** `SELECT count(*) FROM game_maps;`
   → **20** (verificado pelo mantenedor na hora);
3. **API pública:** `https://catchbound.vercel.app/api/maps` → 20 mapas;
   `/api/health` → ok;
4. Artefatos do run: `world-diff-*` **só existe** se produção divergiu do
   espelho git (e o agente versiona a divergência — nada pendente registrado).

## 5. Estado atual + próximos passos

- ✅ Produção ativada; deploy da Vercel acompanha o `main` automaticamente;
- ⬜ **Passada no navegador pelo mantenedor** (regra: sempre em produção,
  nunca em preview): evolução ao vivo, vitrine de sprites 156×6 e **caminhar
  do mapa 3 para o norte** até o 20 (temas, encontros coerentes — Chansey
  raríssima na Caverna do Monte Lua; lendários a partir do mapa 10). O painel
  `/admin` → **FERRAMENTAS GM** (admin-only) corta o grind (subir nível /
  dar Pokémon / teleportar);
- ⬜ (Opcional) mapa 1 montado à mão no Editor — o seed preserva o que estiver
  pintado;
- ️ **Novo neste ciclo (2026-09-06, merge de e-mail):** a confirmação por
  e-mail do cadastro exige em produção (a) a **migration 0006** aplicada no
  banco de produção (mantenedor fez, antes do merge) e (b) as envs `SMTP_*`
  na Vercel (mantenedor fez). Teste pós-merge: registrar com e-mail real e
  conferir a chegada (e o spam) — remetente visível: "Catchbound".
- 🚑 **Incidente 2026-09-06 (noite):** o cadastro em produção falhou
  ("Falha na autenticação") porque a tabela `email_verification_codes`
  ficou com RLS **sem policy** para `catchbound_runtime`. Correção: colar
  `docs/supabase-production-0006-runtime.sql` no SQL Editor + deploy do fix
  de código (cadastro atômico, reenvio p/ conta pendente,
  `/api/health.emailVerification`). Detalhes em `AI_State.md` §3/§4.27.
- Reexecução futura (ex.: depois de editar mapas no Editor): mesma sequência
  do §2 — é idempotente; `apply=false` primeiro.

## 6. Onde as coisas vivem

| Coisa | Lugar |
|---|---|
| Workflow (fonte) | `.github/workflows/world-activation.yml` |
| Espelho p/ interface web | `docs/world-activation.yml` |
| SQL do papel mínimo | `docs/supabase-production-maint-role.sql` |
| Espelho do mundo (git) | `content/world/maps/*.json` (20 arquivos) |
| Scripts de seed/rebalance/export | `scripts/world-*.mjs` (via `package.json`) |
| Registro de validação local pré-produção | `AI_State.md` §4.20 |
| Registro dos runs | `AI_State.md` §4.21–4.23 |
