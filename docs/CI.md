# CI

**Status: ✅ ATIVO e verificado.**

Workflow em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
Primeiro run: [`#33020774659`](https://github.com/marmitero/pokeeeee/actions/runs/33020774659)
— **5/5 jobs `success`**.

| Job | Comando | Resultado |
|---|---|---|
| `Lint` | `npm run lint` | ✅ success |
| `Typecheck` | `npm run typecheck` | ✅ success |
| `Unit tests` | `npm run test` (77 testes) | ✅ success |
| `Integration tests` | `npm run test:integration` (29 testes, Postgres 18 em container) | ✅ success |
| `Build` | `npm run build` — depende de lint, typecheck e unit | ✅ success |

Roda em push para `main` e `arena/**`, e em todo pull request.

---

## Histórico: por que o arquivo viveu em `docs/` primeiro

A integração usada pelo agente (`arena-ai-coding-agent[bot]`) **não declara a
permissão `workflows`** no manifesto, então o GitHub rejeita qualquer escrita
em `.github/workflows/`:

```
! [remote rejected] refusing to allow a GitHub App to create or update
  workflow `.github/workflows/ci.yml` without `workflows` permission

PUT .github/workflows/probe.yml → 403 "Resource not Accessible by integration"
```

Não há toggle para habilitar isso na tela de permissões do repositório — o
GitHub só mostra a chave das permissões que a App declara querer. Por isso o
arquivo foi commitado primeiro em `docs/ci.yml` e **criado manualmente na
branch por um humano** (commit `e02bb30`), que não sofre a restrição.

`docs/ci.yml` é mantido como cópia de referência; o arquivo que o GitHub lê é
`.github/workflows/ci.yml`. Se um dia divergirem, vale o de `.github/`.
