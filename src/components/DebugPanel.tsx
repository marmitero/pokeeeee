"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Bug, Trash2, X } from "lucide-react";
import {
  clearDebugLog,
  getDebugLog,
  sessionDiagnostics,
  subscribeDebug,
} from "@/lib/api-client";

/**
 * Painel de depuração.
 *
 * Existe porque, na validação manual, uma request que falhava **não dava sinal
 * nenhum na tela** — o sintoma era "carrega e para". Aqui toda chamada de API
 * aparece com status, duração e a mensagem de erro real, junto com um
 * diagnóstico de sessão (tem token? está em iframe? cookie habilitado?).
 *
 * Abre com `?debug=1` na URL ou pelo botão 🐞 no canto.
 */

function useDebugLog() {
  return useSyncExternalStore(
    subscribeDebug,
    getDebugLog,
    () => [] as ReturnType<typeof getDebugLog>
  );
}

export function DebugPanel() {
  // O painel expõe diagnóstico operacional e existe apenas para desenvolvimento.
  if (process.env.NODE_ENV === "production") return null;
  return <DebugPanelContent />;
}

function DebugPanelContent() {
  const log = useDebugLog();

  // Inicialização preguiçosa em vez de useEffect: `sessionDiagnostics()` lê
  // window/localStorage e chamar setState dentro do effect dispara
  // react-hooks/set-state-in-effect. No SSR os valores saem nulos.
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1"
  );
  const [diag, setDiag] = useState(() => sessionDiagnostics());

  const toggle = () => {
    setDiag(sessionDiagnostics());
    setOpen((v) => !v);
  };

  const failures = log.filter((e) => !e.ok);

  return (
    <>
      <button
        onClick={toggle}
        title="Depuração"
        className="fixed bottom-3 right-3 z-[100] flex h-10 w-10 items-center justify-center border-2 border-slate-600 bg-slate-900/90 text-slate-300 shadow-lg hover:border-amber-400 hover:text-amber-300"
      >
        <Bug className="h-5 w-5" />
        {failures.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 font-['IBM_Plex_Mono'] text-[10px] text-white">
            {failures.length > 9 ? "9+" : failures.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-16 right-3 z-[100] flex max-h-[70vh] w-[min(460px,92vw)] flex-col border-2 border-amber-400 bg-slate-950/97 shadow-2xl">
          <div className="flex items-center justify-between border-b-2 border-slate-700 bg-slate-900 px-3 py-2">
            <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">
              🐞 DEPURAÇÃO
            </span>
            <div className="flex gap-1">
              <button
                onClick={clearDebugLog}
                title="Limpar"
                className="border border-slate-600 bg-slate-800 p-1 text-slate-300 hover:border-amber-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="border border-slate-600 bg-slate-800 p-1 text-slate-300 hover:border-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Diagnóstico de sessão */}
          {diag && (
            <div className="space-y-0.5 border-b-2 border-slate-800 bg-slate-900/60 px-3 py-2 font-['IBM_Plex_Mono'] text-[11px]">
              <Row label="token no localStorage" value={diag.hasToken ? `sim (${diag.tokenPrefix}…)` : "NÃO"} bad={!diag.hasToken} />
              <Row label="dentro de iframe" value={diag.inIframe ? "sim (cross-site)" : "não"} />
              <Row label="cookieEnabled" value={String(diag.cookieEnabled)} />
              <Row label="origin" value={diag.origin ?? "?"} />
            </div>
          )}

          {/* Log de requests */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {log.length === 0 ? (
              <p className="px-1 font-['VT323'] text-lg text-slate-500">
                Nenhuma chamada registrada ainda.
              </p>
            ) : (
              <div className="space-y-1">
                {log.map((e) => (
                  <div
                    key={e.id}
                    className={`border-l-2 px-2 py-1 font-['IBM_Plex_Mono'] text-[11px] ${
                      e.ok ? "border-emerald-500 bg-slate-900/60" : "border-rose-500 bg-rose-950/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-slate-200">
                        <span className={e.ok ? "text-emerald-400" : "text-rose-400"}>
                          {e.status ?? "ERRO"}
                        </span>{" "}
                        {e.method} {e.path}
                      </span>
                      <span className="shrink-0 text-slate-500">
                        {e.ms}ms · {e.at}
                      </span>
                    </div>
                    {e.error && (
                      <div className="mt-0.5 break-words text-rose-300">{e.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={bad ? "text-rose-400" : "text-slate-200"}>{value}</span>
    </div>
  );
}
