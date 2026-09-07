import { beforeEach, describe, expect, it } from "vitest";
import { client } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const { c } = await registerVerified(username);
  return c;
}

describe("Chat — global", () => {
  it("envia e lista mensagens globais", async () => {
    const a = await register(`chatg${Date.now()}`);
    const sent = await a.call("/api/chat", {
      body: { channel: "global", message: "Olá mundo!" },
    });
    expect(sent.status, JSON.stringify(sent.body)).toBe(200);

    const listed = await a.call("/api/chat?channel=global");
    expect(listed.status).toBe(200);
    const msgs = (listed.body as { messages: { message: string }[] }).messages;
    expect(msgs.some((m) => m.message === "Olá mundo!")).toBe(true);
  });

  it("não aceita mensagem vazia", async () => {
    const a = await register(`chatgv${Date.now()}`);
    const r = await a.call("/api/chat", {
      body: { channel: "global", message: "   " },
    });
    expect(r.status).toBe(400);
  });
});

describe("Chat — local", () => {
  it("envia e lista por mapa", async () => {
    const a = await register(`chatl${Date.now()}`);
    const sent = await a.call("/api/chat", {
      body: { channel: "local", message: "Alguém aqui?", mapId: 1 },
    });
    expect(sent.status, JSON.stringify(sent.body)).toBe(200);

    const listed = await a.call("/api/chat?channel=local&mapId=1");
    expect(listed.status).toBe(200);
    const msgs = (listed.body as { messages: { message: string; mapId: number }[] }).messages;
    expect(msgs.some((m) => m.message === "Alguém aqui?")).toBe(true);

    const otherMap = await a.call("/api/chat?channel=local&mapId=2");
    expect(otherMap.status).toBe(200);
    const otherMsgs = (otherMap.body as { messages: { message: string }[] }).messages;
    expect(otherMsgs.some((m) => m.message === "Alguém aqui?")).toBe(false);
  });

  it("exige mapId para local", async () => {
    const a = await register(`chatlm${Date.now()}`);
    const r = await a.call("/api/chat", {
      body: { channel: "local", message: "sem mapa" },
    });
    expect(r.status).toBe(400);
  });
});

describe("Chat — whisper (privado)", () => {
  it("envia privado e só participantes veem", async () => {
    const suffix = Date.now().toString(36);
    const aliceName = `alice${suffix}`;
    const bobName = `bob${suffix}`;
    const eveName = `eve${suffix}`;

    const alice = await register(aliceName);
    const bob = await register(bobName);
    const eve = await register(eveName);

    const sent = await alice.call("/api/chat", {
      body: { channel: "whisper", message: "segredo", recipientUsername: bobName },
    });
    expect(sent.status, JSON.stringify(sent.body)).toBe(200);

    // Bob vê a conversa com Alice
    const bobConv = await bob.call(`/api/chat?channel=whisper&withUser=${aliceName}`);
    expect(bobConv.status).toBe(200);
    const bobMsgs = (bobConv.body as { messages: { message: string }[] }).messages;
    expect(bobMsgs.some((m) => m.message === "segredo")).toBe(true);

    // Alice também vê
    const aliceConv = await alice.call(`/api/chat?channel=whisper&withUser=${bobName}`);
    expect(aliceConv.status).toBe(200);
    const aliceMsgs = (aliceConv.body as { messages: { message: string }[] }).messages;
    expect(aliceMsgs.some((m) => m.message === "segredo")).toBe(true);

    // Eve NÃO vê na conversa com Alice
    const eveConv = await eve.call(`/api/chat?channel=whisper&withUser=${aliceName}`);
    expect(eveConv.status).toBe(200);
    const eveMsgs = (eveConv.body as { messages: { message: string }[] }).messages;
    expect(eveMsgs.some((m) => m.message === "segredo")).toBe(false);

    // Lista geral de whispers de Eve não contém
    const eveList = await eve.call("/api/chat?channel=whisper");
    expect(eveList.status).toBe(200);
    const eveListMsgs = (eveList.body as { messages: { message: string }[] }).messages;
    expect(eveListMsgs.some((m) => m.message === "segredo")).toBe(false);
  });

  it("não deixa sussurrar para si mesmo", async () => {
    const name = `self${Date.now()}`;
    const a = await register(name);
    const r = await a.call("/api/chat", {
      body: { channel: "whisper", message: "oi eu", recipientUsername: name },
    });
    expect(r.status).toBe(400);
  });

  it("não encontra destinatário inexistente", async () => {
    const a = await register(`w404_${Date.now().toString(36)}`);
    const r = await a.call("/api/chat", {
      body: { channel: "whisper", message: "oi", recipientUsername: "naoexiste999" },
    });
    expect(r.status).toBe(404);
  });

  it("lista conversas recentes", async () => {
    const suffix = Date.now().toString(36);
    const aName = `convA${suffix}`;
    const bName = `convB${suffix}`;
    const a = await register(aName);
    await register(bName);

    await a.call("/api/chat", {
      body: { channel: "whisper", message: "primeira", recipientUsername: bName },
    });

    const list = await a.call("/api/chat?channel=whisper");
    expect(list.status).toBe(200);
    const body = list.body as { conversations: { username: string }[] };
    expect(body.conversations.some((c) => c.username === bName)).toBe(true);
  });
});

describe("Chat — polling incremental", () => {
  it("afterId retorna só mensagens novas", async () => {
    const a = await register(`poll_${Date.now().toString(36)}`);
    const first = await a.call("/api/chat", {
      body: { channel: "global", message: "primeira" },
    });
    expect(first.status).toBe(200);
    const firstId = (first.body as { message: { id: number } }).message.id;

    const second = await a.call("/api/chat", {
      body: { channel: "global", message: "segunda" },
    });
    expect(second.status).toBe(200);

    const poll = await a.call(`/api/chat?channel=global&afterId=${firstId}`);
    expect(poll.status).toBe(200);
    const msgs = (poll.body as { messages: { message: string; id: number }[] }).messages;
    expect(msgs.some((m) => m.message === "primeira")).toBe(false);
    expect(msgs.some((m) => m.message === "segunda")).toBe(true);
  });
});
