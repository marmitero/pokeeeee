import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "drizzle/**", "next-env.d.ts"]),
  {
    rules: {
      /**
       * Desligado DE PROPÓSITO — decisão de projeto, não supressão por preguiça.
       *
       * Todos os <img> deste projeto renderizam sprites de Pokémon em GIF
       * ANIMADO vindos de uma CDN externa (raw.githubusercontent.com), em
       * tamanho pequeno (28px a 112px), com `image-rendering: pixelated` e
       * filtros CSS de variante aplicados por cima.
       *
       * `next/image` não otimiza GIF animado: com o otimizador ligado a
       * animação quebra, e com `unoptimized: true` ele apenas emite um <img>
       * com uma volta a mais pelo loader — sem ganho nenhum.
       *
       * Se um dia os sprites passarem a ser PNGs estáticos locais, esta regra
       * deve ser RELIGADA e os <img> convertidos para <Image>.
       */
      "@next/next/no-img-element": "off",
    },
  },
]);
