import { createTransport, type Transporter } from "nodemailer";

/**
 * E-mail transacional via SMTP (confirmação de cadastro).
 *
 * Configurado por variáveis de ambiente (ver `.env.example`):
 *  - `SMTP_HOST` / `SMTP_PORT` (default 587; 465 se `SMTP_SECURE=true`)
 *  - `SMTP_USER` / `SMTP_PASS` (credenciais do provedor)
 *  - `SMTP_FROM` (default = `SMTP_USER`)
 *  - `APP_URL` (link do botão do e-mail; default produção)
 *
 * Sem SMTP configurado:
 *  - **dev/teste** (`NODE_ENV !== "production"`) → o código vai para o log do
 *    servidor (e para a resposta `devCode`), e o fluxo segue utilizável;
 *  - **produção** → a rota devolve "confirmação indisponível" (503): é
 *    melhor bloquear o cadastro do que criar conta sem a trava de e-mail.
 *
 * Nunca logar a senha SMTP nem o código em resposta em produção.
 */

let transporter: Transporter | null = null;

export function mailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    const secure = process.env.SMTP_SECURE?.toLowerCase() === "true";
    transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? (secure ? 465 : 587)),
      secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Envia um e-mail (HTML + fallback em texto puro, para clientes sem HTML).
 * Lança erro de transporte se SMTP não estiver configurado ou falhar.
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  if (!mailerConfigured()) throw new Error("SMTP não configurado");
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });
}
