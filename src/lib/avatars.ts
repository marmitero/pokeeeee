/**
 * Avatares de treinador (8.9, compartilhado).
 *
 * Antes os 4 avatares (red/blue/leaf/gold) viviam só dentro do `AuthModal`.
 * A presença multiplayer (8.9) precisa desenhar o avatar do OUTRO jogador no
 * mapa, então a lista (id, emoji, cor) virou módulo compartilhado — mesma
 * fonte para o cadastro e para o marcador no mapa.
 */

export interface TrainerAvatar {
  id: string;
  label: string;
  color: string;
  emoji: string;
}

export const TRAINER_AVATARS: TrainerAvatar[] = [
  { id: "red", label: "Red", color: "bg-red-600", emoji: "🧢" },
  { id: "blue", label: "Blue", color: "bg-blue-600", emoji: "💙" },
  { id: "leaf", label: "Leaf", color: "bg-emerald-600", emoji: "🌿" },
  { id: "gold", label: "Gold", color: "bg-amber-500", emoji: "⭐" },
];

/** Emoji do avatar (fallback para o padrão red). */
export function avatarEmoji(id: string | undefined | null): string {
  return TRAINER_AVATARS.find((a) => a.id === id)?.emoji ?? TRAINER_AVATARS[0].emoji;
}
