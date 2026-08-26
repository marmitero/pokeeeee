import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Tratamento uniforme de erros das rotas.
 *
 * Regra da Fase 1: **detalhe técnico nunca vaza para o cliente**.
 * O erro real vai para o log do servidor; o cliente recebe apenas uma
 * mensagem segura. Mensagens de negócio (ApiError) são a exceção — elas
 * foram escritas para serem lidas pelo jogador.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const unauthorized = (msg = "Autenticação necessária.") =>
  new ApiError(401, msg);
export const forbidden = (msg = "Você não tem permissão para isso.") =>
  new ApiError(403, msg);
export const badRequest = (msg: string) => new ApiError(400, msg);
export const notFound = (msg = "Recurso não encontrado.") =>
  new ApiError(404, msg);
export const tooManyRequests = (msg = "Muitas tentativas. Aguarde um pouco.") =>
  new ApiError(429, msg);

export interface Issue {
  path: string;
  message: string;
}

/**
 * Converte qualquer exceção em resposta JSON.
 *
 * @param err       erro capturado
 * @param context   nome da rota, para o log interno
 * @param fallback  mensagem genérica devolvida em erro inesperado
 */
export function routeError(
  err: unknown,
  context: string,
  fallback = "Erro interno do servidor."
): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (err instanceof ValidationError) {
    return NextResponse.json(
      { error: err.message, issues: err.issues },
      { status: 400 }
    );
  }

  // Erro inesperado: loga o detalhe internamente, devolve só o genérico.
  console.error(`[${context}]`, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** Erro de validação de entrada, já com os campos problemáticos. */
export class ValidationError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[]) {
    super("Dados inválidos.");
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/**
 * Valida o corpo/entrada com Zod ou lança ValidationError (HTTP 400).
 * Devolve o dado já tipado e com defaults aplicados.
 */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join(".") || "(raiz)",
      message: i.message,
    }));
    throw new ValidationError(issues);
  }
  return result.data;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────

type UserRow = { passwordHash: string } & Record<string, unknown>;

/**
 * Remove campos sensíveis antes de devolver o usuário ao cliente.
 *
 * Corrige a V1/V2 da auditoria: `passwordHash` era serializado e enviado
 * no corpo de toda resposta de autenticação.
 */
export function publicUser<T extends UserRow>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe as Omit<T, "passwordHash">;
}
