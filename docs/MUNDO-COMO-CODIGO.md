# Mundo como código — export/import de mapas, ginásios e lojas (Fase 6.2-D)

```bash
DATABASE_URL="..." npm run world:export               # banco → content/world/
DATABASE_URL="..." npm run world:import -- --dry-run  # mostra o que mudaria e desfaz
DATABASE_URL="..." npm run world:import               # aplica
```

## Por que existe

O conteúdo do mundo vivia num banco só. Não dava para levar um mapa montado
em produção para o staging, revisar a mudança de um mapa num PR, nem
recuperá-lo num banco novo — o backup diário cobre desastre, não versionamento.
Cada atualização virava retrabalho manual no Editor.

Agora o diretório `content/world/` é a **cópia versionada** do mundo. O banco
continua sendo a **fonte da verdade em runtime** (o Editor grava direto nele);
o export tira a foto, o import aplica a foto em qualquer outro banco.

## Escopo

| Tabela | Arquivo | Chave natural |
|---|---|---|
| `game_maps` | `content/world/maps/<slug>.json` | `slug` |
| `gym_leaders` | dentro do arquivo do mapa, lista `gyms` | `(mapSlug, leaderName)` |
| `shop_items` | `content/world/shops/<shopId>.json` | `(shopId, itemKey)` |

Fora do escopo, de propósito: usuários, Pokémon capturados, insígnias, chat,
PvP. Isso é **estado de jogador**, não conteúdo — vai no backup, não no git.

## Nada é referenciado por id serial

Esse é o ponto que faz o recurso funcionar. Id de banco não atravessa banco:
o mapa que é `id: 2` aqui pode nascer como `id: 8` lá. Por isso, no arquivo:

| No banco | No arquivo |
|---|---|
| `portal.targetMapId: 2` | `portal.targetMapSlug: "floresta-viridian"` |
| `npc.gymId: 1` | `npc.gymLeaderName: "Brock"` |
| `gym_leaders.map_id` | o ginásio mora **dentro** do arquivo do mapa |
| `npc.shopId`, `gym.shopId`, `shop_items.shop_id` | **mantido** — `shopId` já é um id lógico estável, sem FK |
| `id`, `creator_id`, `created_at`, `updated_at` | **fora** |

`creatorUsername` e `isPublished` entram porque são conteúdo (quem assina o
mapa e se ele está visível), não identidade de linha.

Referência quebrada — portal para slug que não existe, NPC para líder que não
existe naquele mapa — **falha alto** tanto no export quanto no import. É melhor
um comando que aborta do que um mundo com portal para o nada.

## Estrutura dos arquivos

`maps/<slug>.json` (campos na ordem em que aparecem):

```
format, slug, name, description, width, height, creatorUsername, isPublished,
encounterRate, encounterTable[], portals[], npcs[], gyms[],
encounterGrid, collisionGrid, tileGrid
```

`tileGrid`, `encounterGrid` e `collisionGrid` saem com **uma fileira por
linha**. Com `JSON.stringify(…, null, 2)` uma grade 16×16 vira 256 linhas de
`"grass",` e mudar um tile aparece no diff como reescrita do arquivo inteiro;
assim o diff mostra a linha do mapa que mudou. As grades vazias (`[]`) são o
modo legado da 6.2-A e são preservadas como estão.

`shops/<shopId>.json`:

```
format, shopId, items[] (ordenados por itemKey)
```

`format` é `catchbound-world/1`. Se o formato mudar, o número sobe e o import
recusa o que não reconhece.

## Garantias do import

- **Idempotente.** Casa por chave natural: cria o que falta, atualiza o que
  difere, deixa em paz o que já está igual. Rodar duas vezes seguidas dá
  `0 criados, 0 atualizados, N iguais`.
- **Nunca apaga.** Mapa, ginásio ou item que só existe no banco continua lá.
  Remover conteúdo é decisão humana, feita no banco (e depois refletida pelo
  export, que aí sim apaga o arquivo órfão).
- **Transacional.** Tudo numa transação; qualquer erro — inclusive referência
  quebrada no último arquivo — desfaz tudo. `--dry-run` executa a transação
  inteira e dá `ROLLBACK` no fim, então o relatório é o real.
- **Resolve em dois passos.** Primeiro grava mapas (sem portais/NPCs) e
  ginásios, para que todo slug e todo líder tenham id no destino; depois
  traduz `targetMapSlug → targetMapId` e `gymLeaderName → gymId` e grava
  portais e NPCs. Mapas que só existem no destino também entram no dicionário,
  então um portal pode apontar para um mapa que não está nos arquivos.
- **`updated_at` só muda quando algo mudou.** Import repetido não mexe em
  timestamp.

## Fluxo recomendado

1. Montar/ajustar o mundo no Editor (ambiente que for — local, staging, produção).
2. `npm run world:export` apontando para esse banco.
3. `git diff content/world/` — revisar a mudança como código.
4. Commit + PR.
5. Nos outros ambientes: `npm run world:import -- --dry-run`, conferir, e
   `npm run world:import`.

Para produção, a `DATABASE_URL` é a do Session Pooler do Supabase (usuário no
formato `role.PROJECT_REF`), a mesma usada pelo `db:rebalance`. `DIRECT_DATABASE_URL`
tem precedência se estiver definida. Nunca cole essa URL em chat ou commit.

## Validação feita em 2026-09-02

Origem: banco local `app_db` (3 mapas, 3 ginásios, 11 itens semeados pelo
código). Destino: banco novo `app_db_world`, só com migrations, mais um mapa
`placeholder` inserido à mão e as sequências de `game_maps` e `gym_leaders`
adiantadas **de propósito**, para os ids não coincidirem com os da origem.

| Passo | Resultado |
|---|---|
| `world:export` da origem | 3 mapas, 3 ginásios, 11 itens → 6 arquivos |
| `world:import -- --dry-run` no destino | `3/3/11 criados`, depois `ROLLBACK`; contagem no banco continuou 1 mapa / 0 ginásios |
| `world:import` no destino | mapas nasceram como `#8 #9 #10`, ginásios `#7 #8 #9` |
| portais no destino | todos apontam para o id do slug certo (`p1-north-1 → #8 floresta-viridian`, …) |
| NPCs de ginásio no destino | `gym-brock → #9 Brock`, `gym-misty → #7 Misty`, `gym-lance → #8 Lance` |
| referências quebradas (SQL) | 0 |
| 2ª importação | `0 criados, 0 atualizados, 3/3/11 iguais` |
| reexport do destino vs. export da origem | `diff -r` **idêntico byte a byte** (fora o `placeholder`) |
| edição no arquivo (`rewardMoney` do Brock, `stock` da Pokébola) + import | `1 ginásio atualizado, 1 item atualizado`, valores conferidos no banco |
| portal apontando para slug inexistente + import | aborta com a mensagem do portal, `exit 1`, **nada gravado** (a outra alteração do mesmo arquivo não entrou) |
| export com mapa a menos no banco | arquivo órfão removido (`pruneStale`) |

Unitários: `src/lib/world-content.test.ts`, 19 testes (remapeamento nos dois
sentidos, ids deslocados, referências quebradas, formato dos arquivos,
round-trip da serialização).

## Limites conhecidos

- **Não apaga.** Se um mapa some do git, ele continua no banco até alguém
  removê-lo lá. É intencional: apagar mapa arrasta `gym_leaders` (FK
  `restrict`) e posição de jogadores.
- **Ginásio duplicado no mesmo mapa com o mesmo nome** (não deveria existir)
  gera aviso e o import usa o primeiro.
- **Um ginásio só pode ser referenciado por NPC do próprio mapa.** O export
  recusa NPC que aponte para ginásio de outro mapa; hoje nenhum faz isso.
- **`shopId` é responsabilidade humana.** Como não tem FK, um NPC pode apontar
  para uma loja sem itens; o import não valida isso (nem o jogo valida hoje).
- Os scripts não passam pela validação Zod das rotas (`mapUpdateSchema`).
  O que sai do banco já passou por ela; o que é editado à mão no JSON passa
  só pela checagem estrutural de `parseMapFile`. Editar à mão é possível, mas
  o caminho normal é Editor → export.
