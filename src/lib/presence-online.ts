/**
 * Janela de "online": heartbeat mais recente que isto = visível no mapa
 * e no painel de amigos. Extraído de `presence.ts` para testes unitários
 * não precisarem abrir o pool do banco.
 */
export const PRESENCE_ONLINE_MS = 30_000;

/** Heartbeat recente o bastante para contar como "online" no mapa/painel. */
export function isPresenceOnline(
  lastSeenAt: Date | string | null | undefined,
  now = Date.now()
): boolean {
  if (!lastSeenAt) return false;
  const at = lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime();
  if (Number.isNaN(at)) return false;
  return now - at <= PRESENCE_ONLINE_MS;
}
