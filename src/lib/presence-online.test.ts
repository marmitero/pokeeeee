import { describe, expect, it } from "vitest";
import { PRESENCE_ONLINE_MS, isPresenceOnline } from "@/lib/presence-online";

describe("isPresenceOnline", () => {
  const now = Date.UTC(2026, 8, 10, 12, 0, 0);

  it("considera online um heartbeat dentro da janela de 30 s", () => {
    expect(isPresenceOnline(new Date(now - PRESENCE_ONLINE_MS + 1), now)).toBe(true);
    expect(isPresenceOnline(new Date(now - PRESENCE_ONLINE_MS).toISOString(), now)).toBe(true);
  });

  it("considera offline heartbeat ausente, inválido ou velho", () => {
    expect(isPresenceOnline(null, now)).toBe(false);
    expect(isPresenceOnline("not-a-date", now)).toBe(false);
    expect(isPresenceOnline(new Date(now - PRESENCE_ONLINE_MS - 1), now)).toBe(false);
  });
});
