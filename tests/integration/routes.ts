import { POST as authPost, GET as authGet } from "@/app/api/auth/route";
import { POST as battlePost, GET as battleGet } from "@/app/api/battle/route";
import { POST as shopPost, GET as shopGet } from "@/app/api/shop/route";
import { POST as mapPost, GET as mapGet } from "@/app/api/maps/route";
import { PUT as mapPut } from "@/app/api/maps/[id]/route";
import { GET as gymGet } from "@/app/api/gym/route";
import { POST as managePost } from "@/app/api/pokemon/manage/route";
import { POST as healPost } from "@/app/api/pokemon/heal/route";
import { POST as adminPost } from "@/app/api/admin/route";
import { POST as pvpPost, GET as pvpGet } from "@/app/api/pvp/route";

export type Ctx = { params: Promise<{ id: string }> };
export type Handler = (req: Request, ctx: Ctx) => Promise<Response> | Response;

/** Mapa de rotas para os testes de integração. */
export const ROUTES: Record<string, Record<string, Handler>> = {
  "/api/auth": { POST: authPost, GET: authGet },
  "/api/battle": { POST: battlePost, GET: battleGet },
  "/api/shop": { POST: shopPost, GET: shopGet },
  "/api/maps": { POST: mapPost, GET: mapGet },
  "/api/maps/:id": { PUT: mapPut },
  "/api/gym": { GET: gymGet },
  "/api/pokemon/manage": { POST: managePost },
  "/api/pokemon/heal": { POST: healPost },
  "/api/admin": { POST: adminPost },
  "/api/pvp": { POST: pvpPost, GET: pvpGet },
};
