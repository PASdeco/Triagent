import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp } from "lucide-react";
import { runCompetition, type CompetitionResult } from "@/lib/triagent.functions";
import { getCompetition, recordResult, saveCompetition } from "@/lib/triagent-store";
import { z } from "zod";

export const Route = createFileRoute("/arena")({
  validateSearch: z.object({ id: z.string() }),
  head: () => ({ meta: [{ title: "Arena — TRIAGENT" }] }),
  component: Arena,
});

type Status = "INITIALIZING" | "ANALYZING" | "WRITING" | "SUBMITTED";
const AGENTS = ["ALPHA", "BETA", "GAMMA"] as const;
const GLYPH: Record<string, string> = { ALPHA: "▲", BETA: "■", GAMMA: "◆" };

function Arena() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const runFn = useServerFn(runCompetition);

  const [statuses, setStatuses] = useState<Record<string, Status>>({
    ALPHA: "INITIALIZING", BETA: "INITIALIZING", GAMMA: "INITIALIZING",
  });
  const [streamed, setStreamed] = useState<Record<string, string>>({ ALPHA: "", BETA: "", GAMMA: "" });
  const [result, setResult] = useState<CompetitionResult | null>(null);
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArticle, setShowArticle] = useState(true);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const raw = sessionStorage.getItem(`triagent.input.${id}`);
    if (!raw) { setError("Mission data not found."); return; }
    const input = JSON.parse(raw) as { source: "text" | "url"; content: string };

    // Staggered status animation (purely visual)
    const transitions: { agent: string; status: Status; at: number }[] = [];
    AGENTS.forEach((a, i) => {
      const base = 400 + i * 600;
      transitions.push({ agent: a, status: "ANALYZING", at: base });
      transitions.push({ agent: a, status: "WRITING", at: base + 1800 + Math.random() * 600 });
    });
    transitions.forEach((t) => {
      setTimeout(() => setStatuses((s) => ({ ...s, [t.agent]: t.status })), t.at);
    });

    runFn({ data: input })
      .then((res) => {
        setResult(res);
        // typewriter for each agent, staggered
        res.agents.forEach((ag, i) => {
          const delay = i * 700;
          const text = ag.summary;
          let idx = 0;
          setTimeout(() => {
            setStatuses((s) => ({ ...s, [ag.name]: "WRITING" }));
            const tick = () => {
              idx += Math.max(2, Math.floor(text.length / 120));
              if (idx >= text.length) {
                setStreamed((s) => ({ ...s, [ag.name]: text }));
                setStatuses((s) => ({ ...s, [ag.name]: "SUBMITTED" }));
              } else {
                setStreamed((s) => ({ ...s, [ag.name]: text.slice(0, idx) }));
                setTimeout(tick, 18);
              }
            };
            tick();
          }, delay);
        });

        // After all submitted (~typewriter ms), show judging, then navigate
        const totalDuration = 2200 + res.agents.length * 700;
        setTimeout(() => setJudging(true), totalDuration);
        setTimeout(() => {
          const existing = getCompetition(id);
          recordResult(res.judge.winner, res.judge.reward);
          saveCompetition({
            id,
            createdAt: existing?.createdAt ?? Date.now(),
            source: existing?.source ?? input.source,
            preview: existing?.preview ?? input.content.slice(0, 140),
            status: "done",
            winner: res.judge.winner,
            reward: res.judge.reward,
            result: res,
          });
          navigate({ to: "/results", search: { id } });
        }, totalDuration + 2400);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        const existing = getCompetition(id);
        if (existing) saveCompetition({ ...existing, status: "error", error: msg });
      });
  }, [id, runFn, navigate]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs font-display tracking-[0.3em] text-neon">// COMPETITION ARENA</span>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-black tracking-widest">LIVE FEED</h1>
        </div>
        <div className="text-xs font-display tracking-[0.3em] text-muted-foreground">
          MISSION ID: <span className="text-foreground">{id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {error && (
        <div className="block-card p-6 border-destructive mb-6">
          <div className="font-display tracking-widest text-destructive">DISPATCH FAILED</div>
          <div className="mt-2 text-sm text-muted-foreground">{error}</div>
        </div>
      )}

      {/* Article panel */}
      <div className="block-card mb-6">
        <button
          onClick={() => setShowArticle((s) => !s)}
          className="w-full flex items-center justify-between p-4 font-display tracking-widest text-sm hover:text-neon transition-colors"
        >
          <span>// SOURCE ARTICLE</span>
          {showArticle ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showArticle && (
          <div className="px-4 pb-4 max-h-72 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap font-mono">
            {result?.article ?? "FETCHING SOURCE..."}
          </div>
        )}
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {AGENTS.map((name) => {
          const status = statuses[name];
          const isDone = status === "SUBMITTED";
          return (
            <div key={name} className={`block-card bracket-frame p-6 ${isDone ? "border-neon" : ""}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-neon text-neon text-lg">
                    {GLYPH[name]}
                  </div>
                  <div className="font-display font-black tracking-widest">AGENT {name}</div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-display tracking-[0.25em] text-neon">
                  {!isDone && <span className="status-dot" />}
                  {status}
                </div>
              </div>

              <div className="min-h-[200px] text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {streamed[name] ? (
                  <span className={isDone ? "" : "caret"}>{streamed[name]}</span>
                ) : (
                  <div className="text-muted-foreground font-display text-xs tracking-widest">
                    {status === "INITIALIZING" && "BOOTING AGENT CORE..."}
                    {status === "ANALYZING" && "ANALYZING SOURCE..."}
                    {status === "WRITING" && <span className="caret">DRAFTING_</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Judging bar */}
      {judging && (
        <div className="mt-8 block-card p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display tracking-widest text-neon">GENLAYER IS JUDGING...</span>
            <span className="text-xs font-display tracking-[0.3em] text-muted-foreground">CONSENSUS PROTOCOL</span>
          </div>
          <div className="scan-bar h-2" />
        </div>
      )}
    </main>
  );
}
