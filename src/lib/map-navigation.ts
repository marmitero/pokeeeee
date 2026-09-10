export interface ConnectedMapLike {
  id: number;
  portals?: Array<{ targetMapId: number }>;
}

/**
 * Retorna o mapa atual e apenas os destinos dos portais que saem dele.
 * A função preserva a ordem recebida e não muta a lista do mundo.
 */
export function mapsConnectedTo<T extends ConnectedMapLike>(
  maps: T[],
  currentMapId: number
): T[] {
  const current = maps.find((map) => map.id === currentMapId);
  if (!current) return maps.slice(0, 1);

  const connectedIds = new Set(
    (current.portals ?? []).map((portal) => portal.targetMapId)
  );
  return [
    current,
    ...maps.filter((map) => map.id !== current.id && connectedIds.has(map.id)),
  ];
}
