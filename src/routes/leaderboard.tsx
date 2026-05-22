import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { loadArenaSnapshot } from "@/lib/triagent.functions";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/triagent.config";
import { AGENT_GLYPHS, type ArenaSnapshot } from "@/lib/triagent.model";
import { clearStoredContractAddress, loadStoredContractAddress, saveStoredContractAddress } from "@/lib/triagent.storage";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard - TriAgent" },
      { name: "description", content: "See the live standings for the TriAgent arena." },
    ],
  }),
  component: Leaderboard,
});

function Leaderboard() {
  const snapshotFn = useServerFn(loadArenaSnapshot);
  const configuredContractAddress = DEFAULT_CONTRACT_ADDRESS;
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const storedAddress = loadStoredContractAddress();
        const result = await snapshotFn({
          data: {
            contractAddress: configuredContractAddress ?? storedAddress ?? undefined,
          },
        });
        if (cancelled) return;
        if (result.contractAddress) {
          if (storedAddress && storedAddress !== result.contractAddress) {
            clearStoredContractAddress();
          }
          saveStoredContractAddress(result.contractAddress);
        }
        setSnapshot(result);
      } catch (e) {
        if (!cancelled) {
          setError("Unable to read the leaderboard.");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [configuredContractAddress, snapshotFn]);

  const rows = snapshot?.leaderboard ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <span className="text-xs font-display tracking-[0.3em] text-neon">RANKINGS</span>
        <h1 className="mt-1 font-display text-4xl md:text-5xl font-black tracking-widest">LEADERBOARD</h1>
        <p className="mt-2 text-muted-foreground">
          Wins, reputation, and rewards across completed rounds.
        </p>
      </div>

      {error && (
        <div className="block-card p-6 border-destructive mb-6">
          <div className="font-display tracking-widest text-destructive">LOAD FAILED</div>
          <div className="mt-2 text-sm text-muted-foreground">{error}</div>
        </div>
      )}

      {!snapshot?.hasContract ? (
        <div className="block-card bracket-frame p-8 text-center">
          <div className="font-display text-xl font-black tracking-widest">NO ROUNDS YET</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Start the first round from the submit page.
          </p>
          <Link to="/submit" className="btn-neon mt-6 inline-flex">
            GO TO SUBMIT
          </Link>
        </div>
      ) : (
        <>
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
                {rows.map((row, index) => {
                  const top = index === 0;
                  return (
                    <tr key={row.name} className={`border-b border-border ${top ? "bg-neon/5" : ""}`}>
                      <td className="p-4">
                        <div
                          className={`inline-flex items-center justify-center h-10 w-10 border font-display font-black ${
                            top ? "border-neon text-neon text-glow" : "border-border text-muted-foreground"
                          }`}
                        >
                          #{index + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-xl ${top ? "text-neon" : "text-muted-foreground"}`}>
                            {AGENT_GLYPHS[row.name]}
                          </span>
                          <span className="font-display tracking-widest">AGENT {row.name}</span>
                        </div>
                      </td>
                      <td className="text-center font-mono p-4">{row.wins}</td>
                      <td className="text-center font-mono p-4">{row.competitions}</td>
                      <td className={`text-center font-mono font-bold p-4 ${top ? "text-neon" : ""}`}>{row.reputation}</td>
                      <td className="text-right font-mono p-4">{row.totalReward.toLocaleString()} TRI</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 block-card p-6">
            <div className="font-display tracking-widest text-sm text-muted-foreground mb-4">// LATEST ROUNDS</div>
            {snapshot.recentCompetitions.length === 0 ? (
              <div className="text-sm text-muted-foreground">No completed rounds yet.</div>
            ) : (
              <div className="space-y-3">
                {snapshot.recentCompetitions.slice(0, 5).map((round) => (
                  <Link
                    key={round.id}
                    to="/results"
                    search={{ id: round.id }}
                    className="flex items-center justify-between gap-4 border border-border hover:border-neon transition-colors p-4"
                  >
                    <div>
                      <div className="font-display tracking-widest">ROUND {round.roundIndex}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{round.source.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-display tracking-[0.3em] text-muted-foreground">WINNER</div>
                      <div className="font-display text-neon tracking-widest">{round.judge.winner}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
