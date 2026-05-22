import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trophy, RotateCcw } from "lucide-react";
import { z } from "zod";

import { loadArenaSnapshot } from "@/lib/triagent.functions";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/triagent.config";
import { AGENT_GLYPHS, type CompetitionRecord } from "@/lib/triagent.model";
import { clearStoredContractAddress, loadStoredContractAddress, saveStoredContractAddress } from "@/lib/triagent.storage";

export const Route = createFileRoute("/results")({
  validateSearch: z.object({
    id: z.string().optional(),
    address: z.string().optional(),
    tx: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Round Results - TriAgent" }] }),
  component: Results,
});

function Results() {
  const { id, address, tx } = Route.useSearch();
  const snapshotFn = useServerFn(loadArenaSnapshot);
  const configuredContractAddress = DEFAULT_CONTRACT_ADDRESS;

  const [record, setRecord] = useState<CompetitionRecord | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      const storedAddress = loadStoredContractAddress();
      const contractAddress = address ?? configuredContractAddress ?? storedAddress ?? undefined;
      const result = await snapshotFn({
        data: {
          contractAddress,
          competitionId: id,
          txHash: tx,
        },
      });
      if (cancelled) return;
      if (result.contractAddress) {
        if (storedAddress && storedAddress !== result.contractAddress) {
          clearStoredContractAddress();
        }
        saveStoredContractAddress(result.contractAddress);
      }
      setRecord(result.competition);
      setMissing(!result.competition);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [address, configuredContractAddress, id, snapshotFn, tx]);

  if (!id || missing) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="block-card bracket-frame p-10">
          <h1 className="font-display text-3xl font-black tracking-widest text-neon">NO RECORD</h1>
          <p className="mt-2 text-muted-foreground">
            This round is not available.
          </p>
          <Link to="/submit" className="btn-neon mt-6 inline-flex">
            START A NEW ROUND
          </Link>
        </div>
      </main>
    );
  }

  if (!record) return null;

  const winner = record.judge.winner;
  const winnerAgent = record.agents.find((agent) => agent.name === winner)!;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-display tracking-[0.3em] text-neon">// FINALIZED ROUND</span>
          <h1 className="mt-1 font-display text-4xl md:text-5xl font-black tracking-widest">RESULTS</h1>
        </div>
        <div className="text-xs font-display tracking-[0.3em] text-muted-foreground">
          ROUND {record.roundIndex}
        </div>
      </div>

      <div className="block-card p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display tracking-widest text-sm text-muted-foreground">SOURCE</div>
          <div className="text-xs font-display tracking-[0.3em] text-neon">{record.source.kind.toUpperCase()}</div>
        </div>
        <div className="text-sm text-foreground mb-2">{record.source.label}</div>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{record.article}</p>
      </div>

      <div className="block-card bracket-frame winner-aura p-8 mb-8 border-neon border">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center border-2 border-neon text-neon text-3xl bg-neon/10">
              {AGENT_GLYPHS[winner]}
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
              {record.judge.reward.toLocaleString()} <span className="text-base">TRI</span>
            </div>
          </div>
        </div>

        <div className="mt-6 max-w-3xl">
          <div>
            <div className="text-xs font-display tracking-[0.3em] text-muted-foreground mb-2">WINNING SUMMARY</div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{winnerAgent.summary}</p>
          </div>
        </div>
      </div>

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
            {record.agents.map((agent) => {
              const score = record.judge.scores[agent.name];
              const total = record.judge.totals[agent.name];
              const isWinner = agent.name === winner;
              return (
                <tr key={agent.name} className={`border-b border-border ${isWinner ? "bg-neon/5" : ""}`}>
                  <td className="py-3 font-display tracking-widest">
                    <span className={isWinner ? "text-neon" : ""}>
                      {AGENT_GLYPHS[agent.name]} {agent.name}
                    </span>
                  </td>
                  <td className="text-center font-mono">{score.accuracy.toFixed(1)}</td>
                  <td className="text-center font-mono">{score.clarity.toFixed(1)}</td>
                  <td className="text-center font-mono">{score.completeness.toFixed(1)}</td>
                  <td className="text-center font-mono">{score.relevance.toFixed(1)}</td>
                  <td className={`text-right font-mono font-bold ${isWinner ? "text-neon" : ""}`}>{total.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {record.agents.map((agent) => (
          <div key={agent.name} className={`block-card p-5 ${agent.name === winner ? "border-neon" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-display tracking-widest">AGENT {agent.name}</div>
              <div className="text-xs font-display tracking-widest text-neon">
                {record.judge.totals[agent.name].toFixed(1)} / 40
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{agent.summary}</p>
            <div className="mt-4 border-t border-border pt-4">
              <div className="text-[10px] font-display tracking-[0.3em] text-muted-foreground mb-2">KEY POINTS</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {agent.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/submit" className="btn-neon btn-neon-solid">
          <RotateCcw size={16} /> START ANOTHER ROUND
        </Link>
        <Link to="/leaderboard" className="btn-neon">
          VIEW LEADERBOARD
        </Link>
      </div>
    </main>
  );
}
