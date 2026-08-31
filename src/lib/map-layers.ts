/**
 * Utilidades puras das camadas de mapa no editor (Fase 6.2-B).
 *
 * Ficam fora do componente de propósito: dentro do `WorldMapEditor` elas só
 * seriam exercitadas por teste de interface, que este projeto não tem. Aqui
 * são funções comuns, testáveis em milissegundos, e o componente vira só
 * apresentação em cima delas.
 *
 * A decisão de modelagem que atravessa este arquivo: no editor, camada
 * **desligada** é `null`, não `[]` nem uma grade toda falsa. São coisas
 * diferentes — `null` deixa o tipo do tile decidir (modo legado), enquanto uma
 * grade ligada e vazia afirma "aqui não tem nada". Só na hora de salvar é que
 * `null` vira `[]`, que é como o banco representa o legado.
 */

/** Grade `height × width` preenchida com um valor só. */
export function blankLayer<T>(height: number, width: number, value: T): T[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

/**
 * Lê a camada vinda do banco para o estado do editor.
 *
 * Devolve `null` quando a camada não existe ou está vazia (mapa legado). Se as
 * dimensões divergirem — mapa redimensionado, dado antigo —, reenquadra em vez
 * de quebrar: célula faltante recebe `empty`, sobra é descartada.
 */
export function loadLayer<T>(
  raw: T[][] | undefined | null,
  height: number,
  width: number,
  empty: T
): T[][] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const cell = raw[y]?.[x];
      return cell === undefined ? empty : cell;
    })
  );
}

/** Quantas células a camada de encontro tem marcadas. */
export function countMarked(grid: boolean[][] | null): number {
  if (!grid) return 0;
  return grid.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
}

/** Quantas células fogem do padrão do tile na camada de colisão. */
export function countOverrides(grid: (string | null)[][] | null): number {
  if (!grid) return 0;
  return grid.reduce((acc, row) => acc + row.filter((cell) => cell !== null).length, 0);
}

/**
 * Chance real de uma espécie, em %, dado o peso das outras.
 *
 * O editor mostrava só o peso bruto, que não diz nada sozinho: peso 20 é 100%
 * num mapa com uma espécie e 5% num mapa com vinte. Uma casa decimal basta e
 * evita a falsa precisão de `33.333333%`.
 */
export function weightShare(entries: Array<{ weight: number }>, index: number): number {
  const total = entries.reduce((acc, entry) => acc + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return 0;
  const own = Math.max(0, Number(entries[index]?.weight) || 0);
  return Math.round((own / total) * 1000) / 10;
}

/** Faixa saneada: mínimo nunca acima do máximo, ambos dentro de 1–100. */
export function sanitizeLevelRange(min: number, max: number): { min: number; max: number } {
  const lo = Math.min(Math.max(1, Math.trunc(min) || 1), 100);
  const hi = Math.min(Math.max(1, Math.trunc(max) || 1), 100);
  return lo <= hi ? { min: lo, max: hi } : { min: hi, max: lo };
}

/**
 * Aplica uma faixa de nível a todas as espécies do mapa.
 *
 * É o "nível mínimo e máximo do mapa" pedido pelo mantenedor. A faixa continua
 * gravada por espécie (o motor sorteia por espécie), então isto é uma edição em
 * massa, não um campo novo — quem quiser um raro mais forte ajusta depois.
 */
export function applyLevelRange<T extends { minLevel: number; maxLevel: number }>(
  entries: T[],
  min: number,
  max: number
): T[] {
  const range = sanitizeLevelRange(min, max);
  return entries.map((entry) => ({ ...entry, minLevel: range.min, maxLevel: range.max }));
}
