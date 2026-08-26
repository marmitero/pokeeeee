# CI — como ativar

O workflow está pronto em [`docs/ci.yml`](./ci.yml), mas **não está ativo**.

## Por quê

O GitHub rejeita a criação de arquivos em `.github/workflows/` por esta integração:

```
! [remote rejected] refusing to allow a GitHub App to create or update
  workflow `.github/workflows/ci.yml` without `workflows` permission

PUT .github/workflows/probe.yml → 403 "Resource not accessible by integration"
```

**Não dá para resolver pela tela de permissões do repositório.** O GitHub só
mostra a chave das permissões que a App *declara querer* no manifesto dela.
A App usada aqui (`arena-ai-coding-agent[bot]`) não declara `workflows`, então
não aparece toggle nenhum para ativar — só a dona da App poderia mudar isso.

## Como ativar

### Opção A — criar o arquivo manualmente (recomendada)

A restrição vale só para o bot; um humano com acesso de escrita cria o arquivo
normalmente.

1. Copie o conteúdo de [`docs/ci.yml`](./ci.yml)
2. No repositório, **na branch onde o código está**, *Add file* → *Create new file*
3. No campo de caminho, digite `.github/workflows/ci.yml`
4. Cole e faça o commit

> O caminho alternativo é *Actions → New workflow → set up a workflow yourself*
> e colar o conteúdo.

### Opção B — token com escopo `workflow`

Um Personal Access Token clássico com o escopo `workflow` consegue criar o
arquivo. Use por sua conta e risco; nada disso deve ser commitado.

### Opção C — não usar CI

É uma escolha legítima. O CI é **automação, não cobertura** — tudo o que ele
rodaria já roda localmente:

```bash
npm run check             # lint + typecheck + testes unitários + build
npm run test:integration  # testes de integração (sobe um banco de teste)
```

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
