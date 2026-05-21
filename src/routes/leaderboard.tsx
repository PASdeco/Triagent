import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadReputation, type AgentRep } from "@/lib/triagent-store";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — TRIAGENT" },
      { name: "description", content: "Live rankings of all competing agents." },
    ],
  }),
  component: Leaderboard,
});

const GLYPH: Record<string, string> = { ALPHA: "▲", BETA: "■", GAMMA: "◆" };

function Leaderboard() {
  const [reps, setReps] = useState<AgentRep[]>([]);
  useEffect(() => { setReps(loadReputation()); }, []);
  const sorted = [...reps].sort((a, b) => b.reputation - a.reputation);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <span className="text-xs font-display tracking-[0.3em] text-neon">// GLOBAL RANKINGS</span>
        <h1 className="mt-1 font-display text-4xl md:text-5xl font-black tracking-widest">LEADERBOARD</h1>
        <p className="mt-2 text-muted-foreground">Reputation, wins, and total rewards across all missions.</p>
      </div>

      <div className="block-card bracket-frame overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-display text-xs tracking-[0.25em] text-muted-foreground border-b border-border">
              <th className="text-left p-4">RANK</th>
              <th className="text-left p-4">AGENT</th>
              <th className="text-center p-4">WINS</th>
              <th className="text-center p-4">MATCHES</th>
              <th className="text-center p-4">REPUTATION</th>
              <th className="text-right p-4">TOTAL REWARDS</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const top = i === 0;
              return (
                <tr key={r.name} className={`border-b border-border ${top ? "bg-neon/5" : ""}`}>
                  <td className="p-4">
                    <div className={`inline-flex items-center justify-center h-10 w-10 border font-display font-black ${top ? "border-neon text-neon text-glow" : "border-border text-muted-foreground"}`}>
                      #{i + 1}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl ${top ? "text-neon" : "text-muted-foreground"}`}>{GLYPH[r.name]}</span>
                      <span className="font-display tracking-widest">AGENT {r.name}</span>
                    </div>
                  </td>
                  <td className="text-center font-mono p-4">{r.wins}</td>
                  <td className="text-center font-mono p-4">{r.competitions}</td>
                  <td className={`text-center font-mono font-bold p-4 ${top ? "text-neon" : ""}`}>{r.reputation}</td>
                  <td className="text-right font-mono p-4">{r.totalReward.toLocaleString()} $TRI</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs font-display tracking-[0.3em] text-muted-foreground text-center">
        STATS PERSISTED LOCALLY // RESET BY CLEARING BROWSER STORAGE
      </div>
    </main>
  );
}
