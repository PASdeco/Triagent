import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Shield, Sparkles, Trophy } from "lucide-react";
import { useAccount } from "wagmi";

import { AGENT_GLYPHS, type ArenaSnapshot } from "@/lib/triagent.model";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadArenaSnapshot } from "@/lib/triagent.functions";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/triagent.config";
import { clearStoredContractAddress, loadStoredContractAddress, saveStoredContractAddress } from "@/lib/triagent.storage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TriAgent on GenLayer" },
      {
        name: "description",
        content: "Three agents enter. One wins.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { isConnected } = useAccount();
  const snapshotFn = useServerFn(loadArenaSnapshot);
  const configuredContractAddress = DEFAULT_CONTRACT_ADDRESS;
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (explicitAddress?: string | null) => {
    setError(null);
    try {
      const storedAddress = loadStoredContractAddress();
      const contractAddress = explicitAddress ?? configuredContractAddress ?? storedAddress ?? undefined;
      const result = await snapshotFn({ data: { contractAddress } });
      if (result.contractAddress) {
        if (storedAddress && storedAddress !== result.contractAddress) {
          clearStoredContractAddress();
        }
        saveStoredContractAddress(result.contractAddress);
      }
      setSnapshot(result);
    } catch {
      setError("Could not refresh.");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const top = snapshot?.leaderboard ?? [
    { name: "ALPHA" as const, wins: 4, competitions: 4, totalReward: 0, reputation: 1092 },
    { name: "BETA" as const, wins: 1, competitions: 4, totalReward: 0, reputation: 993 },
    { name: "GAMMA" as const, wins: 0, competitions: 4, totalReward: 0, reputation: 960 },
  ];

  return (
    <main className="bg-background text-foreground">
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-background/20" />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-14 md:pt-20 md:pb-16">
          <div className="inline-flex items-center gap-2 border border-neon bg-background/80 px-4 py-2 font-display text-[10px] tracking-[0.35em] text-neon">
            <Shield size={12} /> ARENA ONLINE
          </div>

          <h1 className="mt-8 max-w-4xl font-display text-[clamp(3.6rem,10vw,7rem)] font-black leading-[0.9] text-foreground">
            THREE AGENTS
            <br />
            ENTER. <span className="text-neon text-glow">ONE WINS.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
            Submit an article. Watch 3 AI agents compete in real-time. GenLayer crowns the best summary based on accuracy,
            clarity, completeness, and relevance.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {isConnected ? (
                      <Link to="/submit" className="btn-neon btn-neon-solid">
                        LAUNCH COMPETITION <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <button disabled className="btn-neon btn-neon-solid">
                        LAUNCH COMPETITION <ArrowRight size={16} />
                      </button>
                    )}
                  </span>
                </TooltipTrigger>
                {!isConnected && <TooltipContent>Connect wallet to compete</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <Link to="/leaderboard" className="btn-neon">
              VIEW LEADERBOARD
            </Link>
          </div>

          {error && <div className="mt-6 text-sm text-destructive">{error}</div>}

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
            {["ALPHA", "BETA", "GAMMA"].map((name, index) => (
              <div key={name} className="block-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-neon text-neon text-lg">
                      {AGENT_GLYPHS[name as keyof typeof AGENT_GLYPHS]}
                    </div>
                    <div>
                      <div className="font-display text-sm font-black tracking-widest">AGENT {name}</div>
                      <div className="text-[10px] font-display tracking-[0.25em] text-muted-foreground">
                        {index === 0 ? "SURGICAL" : index === 1 ? "NARRATIVE" : "ANALYTICAL"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-display tracking-[0.25em] text-neon">STANDBY</div>
                </div>
                <div className="mt-4 h-px bg-neon/30" />
                <div className="mt-4 grid grid-cols-3 text-[10px] font-display tracking-[0.25em] text-muted-foreground">
                  <span>REP {top.find((entry) => entry.name === name)?.reputation ?? 1000}</span>
                  <span>WINS {top.find((entry) => entry.name === name)?.wins ?? 0}</span>
                  <span>READY</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl md:text-4xl font-black tracking-widest">HOW IT WORKS</h2>
          <span className="text-xs font-display tracking-[0.35em] text-muted-foreground">PROTOCOL // V1</span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              n: "01",
              icon: FileText,
              title: "SUBMIT",
              text: "Drop an article URL or paste raw text into the dispatcher.",
            },
            {
              n: "02",
              icon: Sparkles,
              title: "AGENTS COMPETE",
              text: "Three independent agents race to produce the best summary.",
            },
            {
              n: "03",
              icon: Shield,
              title: "JUDGE EVALUATES",
              text: "GenLayer scores Accuracy, Clarity, Completeness, Relevance.",
            },
            {
              n: "04",
              icon: Trophy,
              title: "WINNER CROWNED",
              text: "The strongest summary wins reputation and rewards.",
            },
          ].map((step) => (
            <div key={step.n} className="block-card p-5">
              <div className="flex items-center justify-between">
                <step.icon size={18} className="text-neon" />
                <span className="text-[10px] font-display tracking-[0.35em] text-muted-foreground">{step.n}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-black tracking-widest">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="block-card p-6 md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl font-black tracking-widest">TOP AGENTS</h2>
            <Link to="/leaderboard" className="text-xs font-display tracking-[0.35em] text-neon">
              FULL LEADERBOARD -&gt;
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {top.map((row, index) => (
              <div
                key={row.name}
                className={`flex items-center justify-between gap-4 border p-4 ${index === 0 ? "border-neon bg-neon/5" : "border-border"}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 text-center font-display text-lg font-black text-neon">#{index + 1}</div>
                  <div className="font-display tracking-widest">AGENT {row.name}</div>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-display tracking-[0.25em] text-muted-foreground">
                  <span>WINS {row.wins}</span>
                  <span>REP {row.reputation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
