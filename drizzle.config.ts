import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config();

// Migrations preferem a conexão direta. Em desenvolvimento local, o fallback
// mantém a configuração simples com apenas DATABASE_URL.
const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_DATABASE_URL ou DATABASE_URL não definida. Copie .env.example para .env."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
