import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link as LinkIcon, FileText, Rocket } from "lucide-react";
import { useAccount } from "wagmi";

import { loadArenaSnapshot, prepareCompetitionSource } from "@/lib/triagent.functions";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/triagent.config";
import type { ArenaSnapshot } from "@/lib/triagent.model";
import { clearStoredContractAddress, loadStoredContractAddress, newId, saveStoredContractAddress } from "@/lib/triagent.storage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Start A Round - TriAgent" },
      { name: "description", content: "Submit article text or a URL and run a real GenLayer-backed competition." },
    ],
  }),
  component: SubmitPage,
});

function toSubmitError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/user rejected|rejected|denied/i.test(message)) return "Request cancelled.";
  if (/chain|network/i.test(message)) return "Switch your wallet to Bradbury and try again.";
  if (/article|url|link|readable/i.test(message)) return "Check the article and try again.";
  return "The round could not be submitted.";
}

function SubmitPage() {
  const navigate = useNavigate();
  const { address, connector, isConnected } = useAccount();
  const snapshotFn = useServerFn(loadArenaSnapshot);
  const prepareSourceFn = useServerFn(prepareCompetitionSource);
  const configuredContractAddress = DEFAULT_CONTRACT_ADDRESS;

  const [mode, setMode] = useState<"text" | "url">("text");
  const [content, setContent] = useState("");
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async (explicitAddress?: string | null) => {
    const storedAddress = loadStoredContractAddress();
    const address = explicitAddress ?? configuredContractAddress ?? storedAddress ?? undefined;
    const result = await snapshotFn({ data: { contractAddress: address } });
    if (result.contractAddress) {
      if (storedAddress && storedAddress !== result.contractAddress) {
        clearStoredContractAddress();
      }
      saveStoredContractAddress(result.contractAddress);
    }
    setSnapshot(result);
  };

  useEffect(() => {
    const address = configuredContractAddress ?? loadStoredContractAddress();
    void refresh(address);
  }, [configuredContractAddress]);

  const runRound = async () => {
    setError(null);
    if (!isConnected || !address || !connector) {
      setError("Connect wallet to compete");
      return;
    }
    const trimmed = content.trim();

    if (mode === "text" && trimmed.length < 50) {
      setError("Paste at least 50 characters of article text.");
      return;
    }

    if (mode === "url") {
      try {
        new URL(trimmed);
      } catch {
        setError("Provide a valid URL.");
        return;
      }
    }

    const competitionId = newId();

    setSubmitting(true);
    try {
      const { submitRoundWithWallet } = await import("@/lib/triagent.wallet");
      const provider = await connector.getProvider();
      const source = await prepareSourceFn({
        data: {
          sourceKind: mode,
          content: trimmed,
        },
      });
      const result = await submitRoundWithWallet({
        account: address,
        provider,
        competitionId,
        sourceKind: mode,
        sourceLabel: source.sourceLabel,
        article: source.article,
        contractAddress: source.contractAddress,
      });
      saveStoredContractAddress(result.contractAddress);
      navigate({
        to: "/arena",
        search: {
          id: competitionId,
          tx: result.transactionHash,
        },
      });
    } catch (e) {
      console.error("Round submission failed:", e);
      setError(toSubmitError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <span className="text-xs font-display tracking-[0.3em] text-neon">// ROUND SUBMISSION</span>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-black tracking-widest">START A REAL ROUND</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 block-card bracket-frame p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode("text")}
                className={`btn-neon !py-2 !text-xs ${mode === "text" ? "btn-neon-solid" : ""}`}
              >
                <FileText size={14} /> TEXT
              </button>
              <button
                onClick={() => setMode("url")}
                className={`btn-neon !py-2 !text-xs ${mode === "url" ? "btn-neon-solid" : ""}`}
              >
                <LinkIcon size={14} /> URL
              </button>
            </div>
          </div>

          {mode === "text" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              placeholder="Paste article content here..."
              className="w-full bg-input border border-border text-foreground font-mono text-sm p-4 outline-none focus:border-neon resize-y"
            />
          ) : (
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full bg-input border border-border text-foreground font-mono text-sm p-4 outline-none focus:border-neon"
            />
          )}

          {error && (
            <div className="mt-3 text-sm text-destructive">{error}</div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-display tracking-[0.3em] text-muted-foreground">
              {mode === "text" ? `${content.length} CHARS` : "READY"}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      onClick={runRound}
                      disabled={submitting || !isConnected}
                      className="btn-neon btn-neon-solid"
                    >
                      <Rocket size={16} /> {submitting ? "SUBMITTING..." : "RUN ROUND"}
                    </button>
                  </span>
                </TooltipTrigger>
                {!isConnected && <TooltipContent>Connect wallet to compete</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <aside className="block-card p-6">
          <div className="font-display text-sm tracking-widest text-muted-foreground mb-4">RECENT ROUNDS</div>
          {!snapshot?.hasContract ? (
            <div className="text-sm text-muted-foreground leading-relaxed">
              No rounds yet.
            </div>
          ) : snapshot.recentCompetitions.length === 0 ? (
            <div className="text-sm text-muted-foreground leading-relaxed">
              No rounds yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {snapshot.recentCompetitions.slice(0, 8).map((round) => (
                <li key={round.id}>
                  <Link
                    to="/results"
                    search={{ id: round.id }}
                    className="block border border-border hover:border-neon p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] font-display tracking-widest text-muted-foreground">
                      <span>ROUND {round.roundIndex}</span>
                      <span className="text-neon">{round.judge.winner}</span>
                    </div>
                    <div className="mt-1 text-sm truncate">{round.source.label}</div>
                    <div className="mt-1 text-[10px] font-display tracking-widest text-muted-foreground">
                      REWARD {round.judge.reward.toLocaleString()} TRI
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
