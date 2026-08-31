# Fase 6 — Conteúdo e mundo

> Pré-requisito cumprido: **Fase 5.1 encerrada** (produção controlada online,
> backup criptografado com restore testado, `CRON_SECRET` validado).
> Ver `docs/PRODUCAO-5.1.md` e `AI_State.md`.

## Princípios da fase

1. **O servidor decide.** Nada de balanceamento, evolução ou status resolvido no
   cliente. O motor já vive em `src/lib/engine/*` e `src/lib/battle-service.ts`;
   toda regra nova entra lá, com teste unitário.
2. **Uma sub-fase por PR**, cada uma com CI verde e `AI_State.md` atualizado.
3. **Migrations aditivas.** Nenhum `DROP COLUMN` em produção; colunas novas com
   `DEFAULT` e backfill, para o deploy da Vercel não quebrar entre migrar e
   publicar.
4. **Sem monetização nesta fase.** `isPremium`/`premiumSkins` continuam
   dormentes até o rebranding e os documentos legais existirem.
5. **Rebranding continua pendente.** Nomes/sprites de Pokémon seguem via CDN
   apenas para fechar mecânicas. Toda estrutura nova (evolução, learnset,
   status) deve ser **agnóstica de IP** — dados em tabela/catálogo, não regras
   hardcoded com nomes próprios — para que a troca de criaturas depois seja
   só troca de dados.

---

## 6.1 — Balanceamento do início do jogo *(primeiro passo)*

### O diagnóstico, medido

Simulação executada neste repositório com o motor real
(`computeDamage` + `sideFromSpecies`, 500 rolls por matchup, nível 5, variante
Normal):

| Atacante → alvo | Golpe | Dano médio | HP do alvo | OHKO | Turnos p/ KO |
|---|---|---|---|---|---|
| Charmander → Bulbasaur | Lança-Chamas (90) | 23,9 | 20 | **100%** | 0,8 |
| Bulbasaur → Squirtle | Raio Solar (105) | 29,2 | 20 | **100%** | 0,7 |
| Squirtle → Charmander | Jato d'Água (110) | 24,2 | 19 | **80%** | 0,8 |
| Charmander → Squirtle | Lança-Chamas (90) | 5,7 | 20 | 0% | 3,5 |
| Squirtle → Bulbasaur | Jato d'Água (110) | 4,8 | 20 | 0% | 4,2 |
| Bulbasaur → Charmander | Raio Solar (105) | 8,1 | 19 | 0% | 2,4 |

Stats nível 5: `hp≈19-20`, `atk/def/spA/spD≈10-12`.

### A causa raiz (não é a fórmula de dano)

A fórmula em `src/lib/engine/damage.ts` é a clássica e está correta. O problema
é **conteúdo**, em três camadas que se somam:

1. **Não existe learnset.** `PokemonSpecies.moves` é uma lista fixa de 4 golpes
   de fim de jogo (`power` 80–110) que o Pokémon carrega desde o nível 1.
   Um inicial nível 5 ataca com Lança-Chamas.
2. **A curva de HP é a de Pokémon, a de poder não.** `hp = ((2*base+20)*lvl)/100
   + lvl + 10` dá ~20 HP no nível 5 (correto), mas o pool de golpes assume
   níveis 40+. Poder 90 com STAB 1,5 e tipo 2,0 gera 3,5× o HP total do alvo.
3. **Multiplicadores empilhados sem piso de duração.** STAB × tipo × crítico
   pode chegar a 4,5× num jogo onde a diferença entre "vantagem de tipo" e
   "vitória automática" ainda não existe.

O efeito prático é binário: quem tem vantagem de tipo vence em 1 turno, quem não
tem precisa de 3–4 turnos. Não há decisão de jogo no meio.

### O alvo de design

- Combate de nível 5 entre iniciais: **3 a 5 turnos** com vantagem de tipo,
  **6 a 9 turnos** sem ela.
- Nenhum OHKO garantido antes do nível ~25, exceto crítico + vantagem dupla.
- Vantagem de tipo deve **encurtar** a luta (~40%), não decidi-la sozinha.

### Implementação proposta

**6.1.1 — Learnset por nível (a correção principal)**

- Novo campo em `PokemonSpecies`: `learnset: { level: number; move: string }[]`,
  ordenado. `moves` continua existindo como derivado para compatibilidade, ou é
  substituído por `movesAtLevel(species, level)` retornando os **4 últimos**
  golpes aprendidos até aquele nível.
- Golpes iniciais de baixo poder para todo mundo (`Tackle` 40, `Ataque Rápido`
  45 já existem); adicionar ~8 golpes de poder 35–60 por tipo (Ember, Bolha,
  Folha Navalha, Faísca, Investida de Pedra etc.) para o começo não ser genérico.
- Aplicar em: criação do inicial, encontro selvagem (`sideFromSpecies`), líder
  de ginásio (`seed-gym`), time de PvP.
- **Migration + backfill**: Pokémon já existentes em `user_pokemon` têm
  `move1..move4` gravados; um script de migração reescreve os movesets de
  Pokémon com nível abaixo do desbloqueio, sem apagar Pokémon do jogador.

**6.1.2 — Amortecimento de dano em níveis baixos**

- Piso de duração: `damage = min(damage, ceil(defender.maxHp * MAX_HIT_FRACTION))`
  onde `MAX_HIT_FRACTION` sai de ~0,45 no nível 5 e chega a 1,0 por volta do
  nível 25 (interpolação linear). Preserva a fórmula clássica no meio/fim de
  jogo e só protege o começo.
- Alternativa (avaliar por teste, não por gosto): elevar o termo constante de HP
  de `+10` para `+18` nos níveis 1–15. Menos cirúrgico; a primeira opção é a
  preferida.

**6.1.3 — Curva de progressão**

- Revisar `src/lib/engine/xp.ts`: XP de vitória selvagem, `xpToNextLevel` e o
  número de batalhas por nível nos níveis 5→15 (alvo: 3–4 vitórias por nível no
  começo, aumentando depois).
- Revisar o nível dos líderes de ginásio em `seed-gym.ts` contra a nova curva
  (hoje Brock manda Geodude lvl 12 contra um time que pode estar no 6).

**6.1.4 — Testes**

- Testes de propriedade em `src/lib/engine/damage.test.ts`: para toda dupla de
  iniciais no nível 5, `turnos_para_KO >= 3`.
- Teste de regressão de curva: matriz de matchups com semente fixa
  (injetar o RNG em vez de usar `Math.random` direto — hoje o motor sorteia
  internamente; extrair um parâmetro `rng` opcional torna o balanceamento
  testável e é pré-requisito desta sub-fase).
- Script `scripts/balance-report.mts` que imprime a tabela acima, para comparar
  antes/depois em cada ajuste.

**Critério de aceite:** tabela de matchups dentro das faixas de turnos alvo,
zero OHKO no nível 5, CI verde, nenhuma regressão nos testes de integração.

---

## 6.2 — Evolução (servidor)

- Novo campo/tabela de evolução, dirigido por dados:
  `evolvesTo: { speciesId: number; trigger: "level" | "item" | "special";
  level?: number; itemId?: number }[]`.
- Gatilho avaliado **no servidor**, dentro do fluxo de level up já existente em
  `battle-service.ts` (onde `applyXp` roda), nunca por chamada do cliente.
- Ao evoluir: recalcular stats com a nova espécie preservando percentual de HP,
  manter apelido, registrar no log da batalha e persistir `pokedexId` novo.
- Aprendizado de golpes na evolução usa o learnset da 6.1.
- Antiabuso: o endpoint de evolução (se existir para item) valida posse do item,
  consome em transação e é idempotente.
- Testes: Charmander lvl 16 → Charmeleon → lvl 36 Charizard; stats recalculados;
  Pokémon no time e no PC evoluem igual; falha silenciosa impossível.

## 6.3 — Pokédex 21 → 50+

- Acrescentar espécies em lotes de ~10, cada lote com as linhas evolutivas
  completas (evita o buraco atual: Charmander sem Charmeleon).
- Cada espécie precisa de: tipos, 6 bases, `catchRate`, learnset, sprites CDN e
  descrição em pt-BR.
- Ampliar `ALL_MOVES` com golpes fracos/médios e cobrir tipos hoje ausentes.
- Validação: teste que garante que todo `move` citado num learnset existe em
  `ALL_MOVES`, que todo alvo de evolução existe na Pokédex e que os sprites
  seguem o padrão de URL.

## 6.4 — Sistema de status

- Estados: `poison`, `burn`, `paralysis`, `sleep`, `freeze` (escolher subconjunto
  inicial: veneno, queimadura, paralisia).
- Persistência: coluna `status` + `statusTurns` em `user_pokemon` (migration
  aditiva, `DEFAULT null`), e campo equivalente no `SideState` da batalha.
- Efeitos no motor: dano ao fim do turno (veneno/queimadura), queimadura reduz
  ataque físico, paralisia reduz velocidade e tem chance de perder o turno.
- Golpes de status ganham efeito real (hoje `computeDamage` devolve
  "Mas nada aconteceu...").
- Reintroduzir **Antídoto** e afins na loja, agora que há o que curar; centro
  de cura/`/api/pokemon/heal` limpa status.
- Testes: cada status aplica, expira, cura e é persistido entre batalhas.

## 6.5 — Arena PvP ranqueada

- `pvp_battles.mode` já aceita `"ranked"` e `users.elo` já existe — ambos
  dormentes.
- Implementar: fila/desafio ranqueado, cálculo de ELO no servidor ao concluir a
  batalha (K-factor fixo no começo), imunidade do amistoso (não altera ELO),
  proteção contra farm (mesmo par repetido com retorno decrescente, forfeit
  conta como derrota).
- Ranking global paginado + posição do jogador. Recompensas só depois de o
  ranking rodar estável.

## 6.6 — NPCs editáveis no Editor de Mundos

- Tipo de tile/entidade NPC com diálogo, posição e opcional batalha de treinador.
- Admin-only, como o resto do editor; validação de payload no servidor
  (`src/lib/validation.ts`) com limites de tamanho de diálogo.

## 6.7 — Premium *(bloqueado de propósito)*

Não implementar. Antes exige: IP própria, termos de uso, política de
privacidade, provedor de pagamento e antifraude.

---

## Ordem recomendada e por quê

```
6.1 balanceamento  →  6.2 evolução  →  6.3 pokédex  →  6.4 status  →  6.5 ranked  →  6.6 NPCs
```

6.1 vem primeiro porque é o defeito que o jogador sente no primeiro minuto, e
porque o **learnset** que ela cria é dependência direta da 6.2 (o que se aprende
ao evoluir) e da 6.3 (cada espécie nova já nasce com curva). Status (6.4) depois
da Pokédex para não migrar dados duas vezes. Ranked (6.5) por último entre as
mecânicas porque só faz sentido sobre um combate que já esteja balanceado.

## Riscos

| Risco | Mitigação |
|---|---|
| Rebalancear quebra Pokémon já capturados em produção | Migration aditiva + script de backfill de movesets; nada é apagado |
| Balanceamento vira achismo | `scripts/balance-report.mts` + testes com RNG injetado; toda mudança acompanha o antes/depois |
| Pokédex maior aumenta o bundle/payload | Catálogo continua server-side; cliente recebe só o necessário por batalha |
| Novas colunas + deploy Vercel fora de ordem | Colunas com `DEFAULT`, código tolerante a `null` antes do backfill |
| Escopo de IP | Toda estrutura nova é dirigida por dados, para o rebranding ser troca de conteúdo, não de código |
