import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Hash de senha com scrypt (nativo do Node).
 *
 * Escolhido em vez de bcrypt/argon2 de propósito: é um KDF forte, já vem no
 * runtime e não adiciona dependência nativa nem superfície de supply chain.
 *
 * Formato armazenado:  scrypt$N$r$p$<salt base64>$<hash base64>
 * Os parâmetros vão junto no próprio hash para permitir re-hash futuro
 * (aumentar o custo) sem invalidar as senhas existentes.
 */

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const PREFIX = "scrypt";

/** Normaliza para que acentos/composição não mudem o hash da mesma senha. */
function normalize(password: string): string {
  return password.normalize("NFKC");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const derived = scryptSync(normalize(password), salt, KEY_LENGTH, COST);
  return [
    PREFIX,
    COST.N,
    COST.r,
    COST.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Compara em tempo constante. Retorna `false` para qualquer entrada
 * malformada — nunca lança.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== "string") return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  try {
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (expected.length === 0) return false;

    const derived = scryptSync(normalize(password), salt, expected.length, {
      N,
      r,
      p,
      maxmem: COST.maxmem,
    });

    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  } catch {
    return false;
  }
}

/**
 * Detecta senha legada em texto puro (pré-Fase 1).
 * Usada pelo script de migração e pelo login, que re-hash na hora.
 */
export function isLegacyPlaintext(stored: string): boolean {
  return typeof stored === "string" && !stored.startsWith(`${PREFIX}$`);
}
