import { db, databaseConfigurationDiagnostics } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    // Diagnóstico sem host, usuário, senha ou certificado. É opt-in e deve
    // existir apenas no projeto Vercel de staging.
    const diagnostics =
      process.env.APP_ENV === "staging"
        ? databaseConfigurationDiagnostics()
        : undefined;
    return Response.json(
      { ok: false, ...(diagnostics ? { diagnostics } : {}) },
      { status: 500 }
    );
  }
}
