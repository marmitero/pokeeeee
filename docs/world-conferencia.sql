-- ─────────────────────────────────────────────────────────────────────────────
-- CONFERÊNCIA DO MUNDO 7.1 (40 mapas / 649 espécies) — 100% online
--
-- Como usar (Supabase → SQL Editor → novo query → colar → Run):
--   1. abra este arquivo no GitHub e copie tudo (botão "Copy" no bloco de código);
--   2. cole no SQL Editor do projeto de produção e rode;
--   3. o resultado é UMA única tabela (o Editor só mostra o último result set);
--      toda linha deve estar com `valor = alvo`.
--
-- É a mesma checagem que `world-expansion.test.ts` faz no CI, mas rodando contra
-- o banco de verdade — depois do `World activation` com apply=true, é o que prova
-- que os 40 mapas e as 649 espécies chegaram lá. Validado em 2026-09-07 contra
-- um banco semeado pelo caminho da aplicação (11/11 linhas batendo).
--
-- Não escreve nada: é só SELECT.
-- ─────────────────────────────────────────────────────────────────────────────
with entradas as (
  select
    g.slug,
    g.is_published,
    coalesce(nullif(substring(g.name from 'Mapa (\d+)'), '')::int, 0) as numero,
    (e->>'pokedexId')::int as pid,
    (e->>'weight')::int    as peso,
    (e->>'minLevel')::int  as nv_min,
    (e->>'maxLevel')::int  as nv_max
  from game_maps g, jsonb_array_elements(g.encounter_table) e
),
lendarios(pid) as (values
  (144),(145),(146),(150),(151),(243),(244),(245),(249),(250),(251),
  (377),(378),(379),(380),(381),(382),(383),(384),(385),(386),
  (480),(481),(482),(483),(484),(485),(486),(487),(488),(490),(491),(492),(493),(494),
  (638),(639),(640),(641),(642),(643),(644),(645),(646),(647),(648),(649)
),
por_mapa as (
  select slug, numero, count(*) as n, sum(peso) as soma from entradas group by slug, numero
)
select '1 mapas' as checagem, count(*)::text as valor, '40' as alvo from por_mapa
union all select '2 mapas publicados', count(*)::text, '40' from game_maps where is_published
union all select '3 entradas de encontro', count(*)::text, '649' from entradas
union all select '4 espécies distintas', count(distinct pid)::text, '649' from entradas
union all select '5 mapas com soma de peso <> 100', count(*)::text, '0' from por_mapa where soma <> 100
union all select '6 mapas 2-40 com < 14 espécies', count(*)::text, '0' from por_mapa where n < 14 and numero <> 1
union all select '7 lendário antes do mapa 10', count(*)::text, '0' from entradas e join lendarios l using (pid) where e.numero < 10
union all select '8 lendário com peso > 20', count(*)::text, '0' from entradas e join lendarios l using (pid) where e.peso > 20
union all select '9 nível fora de 1..100 ou invertido', count(*)::text, '0' from entradas where nv_min < 1 or nv_max > 100 or nv_min > nv_max
union all select '10 mapa 1: pesos (ordem dos ids)', string_agg(peso::text, '/' order by pid), '22/22/22/18/16' from entradas where slug = 'vale-pallet'
union all select '11 mapa 1: faixas de nível', string_agg(nv_min || '-' || nv_max, '/' order by pid), '3-8/3-8/3-8/4-9/4-10' from entradas where slug = 'vale-pallet'
order by 1;

-- Se alguma linha estiver fora do alvo, copie o resultado e mande para o agente:
-- o `world:seed` é idempotente por slug, então o reparo quase sempre é regerar a
-- tabela (`world:distribute --write` no sandbox do agente) + repassar a ativação.
