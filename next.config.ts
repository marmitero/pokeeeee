import type { NextConfig } from "next";

/** Hosts extras aceitos apenas pelo dev server (preview legado em proxy). */
const allowedDevOrigins = [
  "*.e2b.app",
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean) ?? []),
];

const production = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next ainda injeta bootstrap/estilos inline. Remover unsafe-inline exigirá
  // nonces por request; por ora a política já bloqueia scripts de terceiros.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https://raw.githubusercontent.com data: blob:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Produção continua recusando qualquer moldura (clickjacking). Em dev o
  // preview do sandbox roda dentro de um iframe em `*.e2b.app`, e com
  // `'none'` a tela fica em branco — por isso a exceção é estrita: só
  // desenvolvimento, só esse host.
  production ? "frame-ancestors 'none'" : "frame-ancestors 'self' https://*.e2b.app",
  ...(production ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  // Cabeçalho legado, sem sintaxe de curinga: em dev ele é omitido e a
  // proteção fica a cargo do `frame-ancestors` acima.
  ...(production ? [{ key: "X-Frame-Options", value: "DENY" }] : []),
  ...(production
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
