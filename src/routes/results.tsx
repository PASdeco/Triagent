import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, RotateCcw } from "lucide-react";
import { z } from "zod";
import { getCompetition } from "@/lib/triagent-store";
import type { CompetitionResult } from "@/lib/triagent.functions";

export const Route = createFileRoute("/results")({
  validateSearch: z.object({ id: z.string() }),
  head: () => ({ meta: [{ title: "Results — TRIAGENT" }] }),
  component: Results,
});

const AGENTS = ["ALPHA", "BETA", "GAMMA"] as const;
const GLYPH: Record<string, string> = { ALPHA: "▲", BETA: "■", GAMMA: "◆" };

function Results() {
  const { id } = Route.useSearch();
  const [data, setData] = useState<CompetitionResult | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const c = getCompetition(id);
    if (c?.result) setData(c.result as CompetitionResult);
    else setMissing(true);
  }, [id]);

  if (missing) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="block-card bracket-frame p-10">
          <h1 className="font-display text-3xl font-black tracking-widest text-neon">NO RECORD</h1>
          <p className="mt-2 text-muted-foreground">This mission could not be found in local archives.</p>
          <Link to="/submit" className="btn-neon mt-6 inline-flex">NEW MISSION</Link>
        </div>
      </main>
    );
  }
  if (!data) return null;

  const winner = data.judge.winner;
  const winnerAgent = data.agents.find((a) => a.name === winner)!;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <span className="text-xs font-display tracking-[0.3em] text-neon">// VERDICT</span>
        <h1 className="mt-1 font-display text-4xl md:text-5xl font-black tracking-widest">COMPETITION RESULTS</h1>
      </div>

      {/* Winner card */}
      <div className="block-card bracket-frame winner-aura p-8 mb-8 border-neon border">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border-2 border-neon text-neon text-3xl bg-neon/10">
              {GLYPH[winner]}
            </div>
            <div>
              <div className="flex items-center gap-2 text-neon font-display text-xs tracking-[0.3em]">
                <Trophy size={14} /> WINNER
              </div>
              <div className="font-display text-3xl font-black tracking-widest">AGENT {winner}</div>
            </div>
          </div>
          <div className="md:ml-auto text-right">
            <div className="text-xs font-display tracking-[0.3em] text-muted-foreground">REWARD</div>
            <div className="font-display text-3xl font-black text-neon text-glow">
              {data.judge.reward.toLocaleString()} <span className="text-base">$TRI</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-display tracking-[0.3em] text-muted-foreground mb-2">WINNING SUMMARY</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{winnerAgent.summary}</p>
          </div>
          <div>
            <div className="text-xs font-display tracking-[0.3em] text-muted-foreground mb-2">JUDGE REASONING</div>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{data.judge.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Score table */}
      <div className="block-card p-6 mb-8 overflow-x-auto">
        <div className="font-display tracking-widest text-sm text-muted-foreground mb-4">// SCORE BREAKDOWN</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="font-display text-xs tracking-[0.25em] text-muted-foreground border-b border-border">
              <th className="text-left py-3">AGENT</th>
              <th className="text-center py-3">ACCURACY</th>
              <th className="text-center py-3">CLARITY</th>
              <th className="text-center py-3">COMPLETENESS</th>
              <th className="text-center py-3">RELEVANCE</th>
              <th className="text-right py-3">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a) => {
              const s = data.judge.scores[a];
              const total = data.judge.totals[a];
              const isWin = a === winner;
              return (
                <tr key={a} className={`border-b border-border ${isWin ? "bg-neon/5" : ""}`}>
                  <td className="py-3 font-display tracking-widest">
                    <span className={isWin ? "text-neon" : ""}>{GLYPH[a]} {a}</span>
                  </td>
                  <td className="text-center font-mono">{s.accuracy.toFixed(1)}</td>
                  <td className="text-center font-mono">{s.clarity.toFixed(1)}</td>
                  <td className="text-center font-mono">{s.completeness.toFixed(1)}</td>
                  <td className="text-center font-mono">{s.relevance.toFixed(1)}</td>
                  <td className={`text-right font-mono font-bold ${isWin ? "text-neon" : ""}`}>{total.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* All summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {data.agents.map((ag) => (
          <div key={ag.name} className={`block-card p-5 ${ag.name === winner ? "border-neon" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display tracking-widest">AGENT {ag.name}</div>
              <div className="text-xs font-display tracking-widest text-neon">
                {data.judge.totals[ag.name].toFixed(1)} / 40
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{ag.summary}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Link to="/submit" className="btn-neon btn-neon-solid">
          <RotateCcw size={16} /> COMPETE AGAIN
        </Link>
      </div>
    </main>
  );
}
