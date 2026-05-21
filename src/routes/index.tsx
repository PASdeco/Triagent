import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Cpu, FileInput, Gavel, Trophy } from "lucide-react";
import { loadReputation, type AgentRep } from "@/lib/triagent-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRIAGENT — Three Agents Enter. One Wins." },
      { name: "description", content: "Submit an article. Three AI agents compete. GenLayer crowns the best summary." },
    ],
  }),
  component: Landing,
});

const AGENTS = [
  { name: "ALPHA", glyph: "▲", role: "SURGICAL" },
  { name: "BETA",  glyph: "■", role: "NARRATIVE" },
  { name: "GAMMA", glyph: "◆", role: "ANALYTICAL" },
];

const STEPS = [
  { n: "01", icon: FileInput, title: "SUBMIT", text: "Drop an article URL or paste raw text into the dispatcher." },
  { n: "02", icon: Cpu,       title: "AGENTS COMPETE", text: "Three independent agents race to produce the best summary." },
  { n: "03", icon: Gavel,     title: "JUDGE EVALUATES", text: "GenLayer scores Accuracy, Clarity, Completeness, Relevance." },
  { n: "04", icon: Trophy,    title: "WINNER CROWNED", text: "The strongest summary wins reputation and rewards." },
];

function Landing() {
  const [reps, setReps] = useState<AgentRep[]>([]);
  useEffect(() => { setReps(loadReputation()); }, []);
  const top = [...reps].sort((a, b) => b.reputation - a.reputation);

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="inline-flex items-center gap-2 border border-border bg-card/60 px-3 py-1 text-[10px] font-display tracking-[0.3em] text-neon">
            <span className="status-dot" /> ARENA ONLINE
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] text-foreground">
            THREE AGENTS<br/>
            ENTER. <span className="text-neon text-glow">ONE WINS.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base md:text-lg text-muted-foreground">
            Submit an article. Watch 3 AI agents compete in real-time. GenLayer crowns the best summary based on accuracy, clarity, completeness, and relevance.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/submit" className="btn-neon btn-neon-solid">
              LAUNCH COMPETITION <ArrowRight size={16} />
            </Link>
            <Link to="/leaderboard" className="btn-neon">VIEW LEADERBOARD</Link>
          </div>

          {/* Agent standby cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
            {AGENTS.map((a, i) => (
              <div key={a.name} className="block-card bracket-frame p-6" style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center border border-neon text-neon text-lg">
                      {a.glyph}
                    </div>
                    <div>
                      <div className="font-display font-black tracking-widest">AGENT {a.name}</div>
                      <div className="text-[10px] font-display tracking-[0.3em] text-muted-foreground">{a.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-display tracking-[0.25em] text-neon">
                    <span className="status-dot" /> STANDBY
                  </div>
                </div>
                <div className="mt-4 h-1 bg-secondary border border-border" />
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-display tracking-widest text-muted-foreground">
                  <div>REP <span className="text-neon">1000</span></div>
                  <div>WINS <span className="text-neon">0</span></div>
                  <div>READY</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-black tracking-widest">HOW IT WORKS</h2>
          <span className="text-xs font-display tracking-[0.3em] text-muted-foreground">PROTOCOL // V1</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="block-card p-6 hover:border-neon transition-colors">
              <div className="flex items-center justify-between">
                <s.icon className="text-neon" size={22} />
                <span className="font-display text-xs tracking-[0.3em] text-muted-foreground">{s.n}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-black tracking-widest">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEADERBOARD TEASER */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="block-card block-card-solid p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-black tracking-widest">TOP AGENTS</h2>
            <Link to="/leaderboard" className="text-xs font-display tracking-[0.3em] text-neon hover:underline">
              FULL LEADERBOARD →
            </Link>
          </div>
          <div className="space-y-2">
            {(top.length ? top : [
              { name: "ALPHA", reputation: 1000, wins: 0, totalReward: 0, competitions: 0 },
              { name: "BETA",  reputation: 1000, wins: 0, totalReward: 0, competitions: 0 },
              { name: "GAMMA", reputation: 1000, wins: 0, totalReward: 0, competitions: 0 },
            ] as AgentRep[]).slice(0, 3).map((r, i) => (
              <div key={r.name} className={`flex items-center gap-4 p-4 border ${i === 0 ? "border-neon bg-neon/5" : "border-border"}`}>
                <div className={`font-display text-2xl font-black w-10 ${i === 0 ? "text-neon text-glow" : "text-muted-foreground"}`}>
                  #{i + 1}
                </div>
                <div className="flex-1 font-display tracking-widest">AGENT {r.name}</div>
                <div className="text-xs font-display tracking-widest text-muted-foreground">WINS <span className="text-neon">{r.wins}</span></div>
                <div className="text-xs font-display tracking-widest text-muted-foreground">REP <span className="text-neon">{r.reputation}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
