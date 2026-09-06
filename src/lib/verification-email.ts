import { createHash, randomInt } from "crypto";
import { sendMail } from "./mailer";

/**
 * Parte PURA do fluxo de confirmação de e-mail (2026-09-06): geração do
 * código, hash e construção do e-mail estilizado.
 *
 * Este módulo **não importa `@/db`** de propósito — os testes unitários
 * rodam no CI sem banco (o job de unit não define `DATABASE_URL`), e o
 * `@/db` lança no import sem configuração. O lado com banco vive em
 * `email-verification.ts`, que reexporta tudo daqui.
 */

export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
export const RESEND_INTERVAL_MS = 60 * 1000;

export function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// ─── O e-mail em si ─────────────────────────────────────────────────────────

const MONO = "'Courier New', Courier, monospace";

/**
 * E-mail de confirmação no visual do jogo (tema escuro + âmbar, monoespaçada
 * estilo pixel). Layout em tabelas com CSS inline: é o único formato que os
 * clientes de e-mail (Gmail/Outlook) renderizam de forma confiável.
 */
export function buildVerificationEmailHtml(code: string, username: string): string {
  const appUrl = process.env.APP_URL ?? "https://catchbound.vercel.app";
  const safeUsername = username.replace(/[<>&"]/g, "");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#020617;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border:4px solid #f59e0b;background-color:#0f172a;">
          <!-- Cabeçalho -->
          <tr>
            <td style="border-bottom:4px solid #1e293b;padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="60" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:46px;height:46px;border:2px solid #f59e0b;background-color:#dc2626;">
                      <tr>
                        <td align="center" valign="middle" style="font-family:${MONO};font-size:13px;font-weight:bold;color:#ffffff;letter-spacing:1px;">PKM</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle" style="padding-left:16px;">
                    <div style="font-family:${MONO};font-size:20px;font-weight:bold;color:#fbbf24;letter-spacing:6px;text-transform:uppercase;">CATCHBOUND</div>
                    <div style="font-family:${MONO};font-size:12px;color:#94a3b8;margin-top:6px;letter-spacing:2px;">MMORPG RETRO PIXEL ONLINE</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Corpo -->
          <tr>
            <td style="padding:28px;">
              <p style="font-family:${MONO};font-size:15px;color:#e2e8f0;line-height:1.6;margin:0 0 12px 0;">
                Olá, <strong style="color:#fbbf24;">${safeUsername}</strong>!
              </p>
              <p style="font-family:${MONO};font-size:15px;color:#cbd5e1;line-height:1.6;margin:0 0 4px 0;">
                Sua jornada em <strong style="color:#fbbf24;">CATCHBOUND</strong> está a um código de
                distância. Use o código abaixo para confirmar seu e-mail e entrar no mundo:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:2px solid #fbbf24;background-color:#1e293b;">
                <tr>
                  <td align="center" style="padding:20px 8px;">
                    <div style="font-family:${MONO};font-size:34px;font-weight:bold;color:#fde68a;letter-spacing:14px;padding-left:14px;">${code}</div>
                  </td>
                </tr>
              </table>
              <p style="font-family:${MONO};font-size:13px;color:#94a3b8;line-height:1.7;margin:0;">
                O código expira em <strong style="color:#fbbf24;">10 minutos</strong>.<br/>
                Se você não criou esta conta, ignore este e-mail — ninguém
                consegue entrar sem o código.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                <tr>
                  <td style="background-color:#f59e0b;border:2px solid #fbbf24;">
                    <a href="${appUrl}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${MONO};font-size:14px;font-weight:bold;color:#0f172a;text-decoration:none;letter-spacing:2px;">&#9654; ENTRAR NA JORNADA</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Rodapé -->
          <tr>
            <td style="border-top:4px solid #1e293b;padding:16px 28px;">
              <p style="font-family:${MONO};font-size:11px;color:#64748b;line-height:1.7;margin:0;">
                CATCHBOUND • MMORPG RETRO PIXEL ONLINE<br/>
                E-mail automático de confirmação — não responda a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
        <p style="font-family:${MONO};font-size:11px;color:#475569;margin-top:16px;letter-spacing:1px;">
          &#9889; USE WASD PARA EXPLORAR • CAPTURE • EVOLUA • DERROTE OS LÍDERES
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const VERIFICATION_TEXT = (code: string, username: string) =>
  `CATCHBOUND — sua jornada está a um código de distância!\n\n` +
  `Olá, ${username}! Use o código abaixo para confirmar seu e-mail e entrar no mundo:\n\n` +
  `      ${code}\n\n` +
  `O código expira em 10 minutos.\n` +
  `Se você não criou esta conta, ignore este e-mail — ninguém consegue entrar sem o código.\n\n` +
  `${process.env.APP_URL ?? "https://catchbound.vercel.app"}\n\n` +
  `Catchbound • MMORPG Retro Pixel Online (e-mail automático — não responda)`;

/** Envia o e-mail de confirmação (HTML + texto). Propaga erro de transporte. */
export async function sendVerificationEmail(
  to: string,
  username: string,
  code: string
): Promise<void> {
  await sendMail(
    to,
    "🎮 CATCHBOUND — seu código de confirmação",
    buildVerificationEmailHtml(code, username),
    VERIFICATION_TEXT(code, username)
  );
}
