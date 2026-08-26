# CI — como ativar

O workflow está pronto em [`docs/ci.yml`](./ci.yml), mas **não está ativo**.

## Por quê

O push foi rejeitado pelo GitHub:

```
! [remote rejected] arena/01a03ad9-pokeeeee (refusing to allow a GitHub App to
  create or update workflow `.github/workflows/ci.yml` without `workflows` permission)
```

A integração do GitHub usada aqui não tem a permissão **`workflows`**, que é
obrigatória para criar ou alterar arquivos em `.github/workflows/`.

## Como ativar

**Opção A — conceder a permissão (recomendado).**
No repositório: *Settings → GitHub Apps / Installations → Configure → Repository
permissions → Workflows → Read and write*. Depois é só mover o arquivo:

```bash
mkdir -p .github/workflows
cp docs/ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: ativa o workflow"
git push
```

**Opção B — colar manualmente pela interface do GitHub.**
*Actions → New workflow → set up a workflow yourself* e colar o conteúdo de
`docs/ci.yml`.

## O que o workflow faz

5 jobs, um por etapa, para o log apontar direto o que quebrou:

| Job | Comando |
|---|---|
| `lint` | `npm run lint` |
| `typecheck` | `npm run typecheck` |
| `unit` | `npm run test` (77 testes) |
| `integration` | `npm run test:integration` (29 testes, com serviço Postgres 18) |
| `build` | `npm run build` — depende de lint, typecheck e unit |

> O YAML foi validado estruturalmente (jobs, serviços, sem tabs), mas **nunca
> rodou no GitHub**. A primeira execução real pode revelar divergência de
> versão de action — confira o log do primeiro run.
