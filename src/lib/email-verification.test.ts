import { afterEach, describe, expect, it } from "vitest";
import {
  buildVerificationEmailHtml,
  generateVerificationCode,
  hashVerificationCode,
} from "./email-verification";

/**
 * Testes unitários do ciclo do código de confirmação e do e-mail estilizado.
 * As regras de banco (expiração, tentativas, cooldown) vivem na suíte de
 * integração — aqui só a lógica pura.
 */

describe("generateVerificationCode", () => {
  it("é um código de 6 dígitos (zero à esquerda)", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });

  it("não é previsível (dois sorteios seguidos diferem)", () => {
    const a = generateVerificationCode();
    const b = generateVerificationCode();
    expect(b).not.toBe(a);
  });
});

describe("hashVerificationCode", () => {
  it("é determinístico", () => {
    expect(hashVerificationCode("123456")).toBe(hashVerificationCode("123456"));
  });

  it("diferencia códigos próximos", () => {
    expect(hashVerificationCode("123456")).not.toBe(hashVerificationCode("123457"));
  });
});

describe("buildVerificationEmailHtml", () => {
  const oldAppUrl = process.env.APP_URL;

  afterEach(() => {
    if (oldAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = oldAppUrl;
  });

  it("mostra o código em destaque, o treinador e a marca", () => {
    const html = buildVerificationEmailHtml("482913", "AshKetchum");

    expect(html).toContain("482913");
    expect(html).toContain("AshKetchum");
    expect(html).toContain("CATCHBOUND");
    expect(html).toContain("10 minutos");
    expect(html).toContain("ENTRAR NA JORNADA");
  });

  it("segue o tema do jogo (fundo escuro + âmbar, monoespaçada)", () => {
    const html = buildVerificationEmailHtml("000001", "Pikachu");

    expect(html).toContain("#020617"); // fundo
    expect(html).toContain("#f59e0b"); // borda âmbar
    expect(html).toContain("Courier");
    expect(html).not.toContain("<style>"); // CSS inline apenas (clientes de e-mail)
  });

  it("usa o APP_URL do ambiente no botão (default: produção)", () => {
    expect(buildVerificationEmailHtml("111111", "Test")).toContain(
      "https://catchbound.vercel.app"
    );

    process.env.APP_URL = "http://localhost:3000";
    expect(buildVerificationEmailHtml("111111", "Test")).toContain(
      "http://localhost:3000"
    );
  });

  it("neutraliza HTML no username (não injeta tags)", () => {
    const html = buildVerificationEmailHtml("222222", "<script>alert(1)</script>");

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("script"); // o texto, sem as tags
  });
});
