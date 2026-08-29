import { forbidden } from "./api";

/**
 * Proteção CSRF por validação de `Origin` (Fase 1, reforçada na correção do
 * cookie de sessão).
 *
 * **Por que existe:** o cookie de sessão precisa de `SameSite=None` para
 * funcionar dentro do iframe do preview (contexto cross-site). `SameSite=None`
 * desliga a proteção CSRF do navegador, então ela é reposta aqui.
 *
 * **Como funciona:** navegadores sempre enviam `Origin` em requisições
 * `POST`/`PUT`/`DELETE` cross-origin. Se o `Origin` existir e o host não for o
 * mesmo do `Host` da requisição, é um site externo tentando agir com o cookie
 * da vítima → 403.
 *
 * Se `Origin` **não** vier, a requisição é permitida: isso preserva clientes
 * sem navegador (curl, testes de integração) sem abrir o vetor clássico, que
 * depende justamente do navegador enviar o Origin.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    // Origin chega como "https://host[:porta]"; Referer como URL completa.
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Valida a origem de requisições que mudam estado.
 * Lança `ApiError(403)` quando um site externo tenta agir com o cookie alheio.
 */
export function assertSameOrigin(req: Request): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return;

  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") {
    console.warn("[csrf] requisição cross-site bloqueada por Sec-Fetch-Site");
    throw forbidden("Requisição bloqueada: origem externa.");
  }

  const origin = hostOf(req.headers.get("origin"));
  // Em produção pública, mutações de navegador por cookie devem trazer uma
  // origem verificável. Dev/testes e clientes Bearer continuam compatíveis.
  if (!origin) {
    if (
      process.env.NODE_ENV === "production" &&
      !req.headers.get("authorization")
    ) {
      throw forbidden("Requisição bloqueada: origem ausente.");
    }
    return;
  }

  const host = req.headers.get("host");
  if (!host) {
    if (process.env.NODE_ENV === "production") {
      throw forbidden("Requisição bloqueada: host ausente.");
    }
    return;
  }

  if (origin !== host) {
    console.warn(`[csrf] origem cruzada bloqueada: origin=${origin} host=${host}`);
    throw forbidden("Requisição bloqueada: origem não corresponde ao servidor.");
  }
}
