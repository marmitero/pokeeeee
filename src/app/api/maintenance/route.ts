import { timingSafeEqual } from "crypto";
import { runMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;

  const supplied = header.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

/** Invocada diariamente pelo Vercel Cron; nunca pelo navegador do jogador. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runMaintenance();
    console.info("[maintenance] limpeza concluída", result);
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("[maintenance] falha", error);
    return Response.json({ ok: false, error: "Falha na manutenção." }, { status: 500 });
  }
}
