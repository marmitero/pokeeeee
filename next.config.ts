import type { NextConfig } from "next";

/**
 * Hosts aceitos pelo `next dev` para os recursos de desenvolvimento
 * (HMR, client runtime, chunks).
 *
 * O Next 16 **bloqueia origens cruzadas por padrão**. Como o preview é servido
 * por um proxy num host próprio (`https://{porta}-{sandbox}.e2b.app`), sem esta
 * configuração o client do React é bloqueado e a página quebra de um jeito bem
 * específico e enganoso:
 *
 *   - o HTML chega renderizado pelo servidor (a interface "aparece");
 *   - mas o React **nunca hidrata** → nenhum event handler é ligado e nenhum
 *     `useEffect` roda.
 *
 * Sintoma observado: o mapa não carregava nunca (é buscado em `useEffect`) e
 * os botões de Sprites / PVP / Login não respondiam, com a API respondendo 200
 * normalmente via curl. Não é bug do jogo — é o dev server recusando o host.
 *
 * ⚠️ Afeta **apenas** `next dev`. É ignorado em build de produção.
 *
 * Para adicionar hosts, use a variável de ambiente:
 *   ALLOWED_DEV_ORIGINS="meu-host.com,outro.dev"
 */
const allowedDevOrigins = [
  "*.e2b.app",
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
