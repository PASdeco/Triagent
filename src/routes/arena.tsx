import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { loadArenaSnapshot } from "@/lib/triagent.functions";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/triagent.config";
import { AGENT_GLYPHS, type ArenaSnapshot } from "@/lib/triagent.model";
import { clearStoredContractAddress, loadStoredContractAddress, saveStoredContractAddress } from "@/lib/triagent.storage";

export const Route = createFileRoute("/arena")({
  validateSearch: z.object({
    id: z.string().optional(),
    tx: z.string().optional(),
    address: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Round Status - TriAgent" }] }),
  component: Arena,
});

function Arena() {
  const { id, tx, address } = Route.useSearch();
  const navigate = useNavigate();
  const snapshotFn = useServerFn(loadArenaSnapshot);
  const configuredContractAddress = DEFAULT_CONTRACT_ADDRESS;

  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      saveStoredContractAddress(address);
    }
  }, [address]);

  useEffect(() => {
    if (!id || !tx) return;

    let cancelled = false;

    const poll = async () => {
      try {
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
        setSnapshot(result);
        setError(null);

        if (
          result.competition &&
          result.transaction?.txExecutionResultName === "FINISHED_WITH_RETURN" &&
          (result.transaction.statusName === "FINALIZED" || result.transaction.statusName === "ACCEPTED")
        ) {
          navigate({
            to: "/results",
            search: {
              id,
              tx,
            },
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError("Unable to read the round state.");
        }
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address, configuredContractAddress, id, navigate, snapshotFn, tx]);

  const competition = snapshot?.competition;

  if (!id || !tx) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="block-card bracket-frame p-10">
          <h1 className="font-display text-3xl font-black tracking-widest text-neon">NO ACTIVE ROUND</h1>
          <p className="mt-2 text-muted-foreground">Start a round to enter the arena.</p>
          <Link to="/submit" className="btn-neon mt-6 inline-flex">
            START A ROUND
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-display tracking-[0.3em] text-neon">ROUND</span>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-black tracking-widest">ROUND IN PROGRESS</h1>
        </div>
      </div>

      {error && (
        <div className="block-card p-6 border-destructive mb-6">
          <div className="font-display tracking-widest text-destructive">ROUND FAILED</div>
          <div className="mt-2 text-sm text-muted-foreground">{error}</div>
        </div>
      )}

      <div className="block-card mb-6">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display tracking-widest text-sm">SOURCE</span>
          <span className="text-xs font-display tracking-[0.3em] text-muted-foreground">
            {competition?.source.kind?.toUpperCase() ?? "PROCESSING"}
          </span>
        </div>
        <div className="p-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {competition
            ? competition.article
            : "Round is underway. Results will appear here shortly."}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {["ALPHA", "BETA", "GAMMA"].map((name) => {
          const agent = competition?.agents.find((entry) => entry.name === name);
          const isWinner = competition?.judge.winner === name;
          return (
            <div key={name} className={`block-card bracket-frame p-6 ${isWinner ? "border-neon" : ""}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-neon text-neon text-lg">
                    {AGENT_GLYPHS[name as keyof typeof AGENT_GLYPHS]}
                  </div>
                  <div className="font-display font-black tracking-widest">AGENT {name}</div>
                </div>
                <div className="text-[10px] font-display tracking-[0.25em] text-neon">
                  {agent ? (isWinner ? "WINNER" : "FINALIZED") : "PENDING"}
                </div>
              </div>

              <div className="min-h-[180px] text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {agent?.summary ?? "Waiting for this summary."}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {competition && (
          <Link
            to="/results"
            search={{ id, tx }}
            className="btn-neon btn-neon-solid"
          >
            OPEN RESULTS
          </Link>
        )}
        <Link to="/submit" className="btn-neon">
          START ANOTHER ROUND
        </Link>
      </div>
    </main>
  );
}
