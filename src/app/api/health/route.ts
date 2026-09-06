import { db, databaseConfigurationDiagnostics } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);

    // Sonda NÃO fatal da tabela de confirmação de e-mail (2026-09-06): em
    // produção ela nasce com RLS e precisa de policy/grant para o papel de
    // runtime — sem isso o cadastro quebra enquanto o resto do jogo segue.
    // `ok` continua refletindo só o banco; `emailVerification` diz se o
    // cadastro consegue tocar a tabela. Sem detalhes de erro na resposta.
    // Um SELECT não serviria de sonda: RLS sem policy devolve 0 linhas em
    // silêncio; só o INSERT falha. Então perguntamos ao catálogo se o papel
    // atual tem privilégio de INSERT e, com RLS ligado, alguma policy.
    let emailVerification: "ok" | "unavailable" = "ok";
    try {
      const probe = await db.execute<{ writable: boolean }>(sql`
        select
          has_table_privilege(current_user, 'public.email_verification_codes', 'INSERT')
          and (
            not c.relrowsecurity
            or exists (
              select 1 from pg_policies p
              where p.schemaname = 'public'
                and p.tablename = 'email_verification_codes'
                and (
                  current_user::name = any (p.roles)
                  or 'public'::name = any (p.roles)
                  or exists (
                    select 1 from unnest(p.roles) r
                    where pg_has_role(current_user, r, 'MEMBER')
                  )
                )
            )
          ) as writable
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'email_verification_codes'
      `);
      if (!probe.rows[0]?.writable) emailVerification = "unavailable";
    } catch (err) {
      emailVerification = "unavailable";
      console.error("[health] sonda de email_verification_codes falhou", err);
    }

    return Response.json({ ok: true, emailVerification });
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
