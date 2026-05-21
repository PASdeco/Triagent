import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link as LinkIcon, FileText, Rocket } from "lucide-react";
import { loadCompetitions, saveCompetition, newId, type Competition } from "@/lib/triagent-store";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Article — TRIAGENT" },
      { name: "description", content: "Deploy 3 AI agents to compete on summarizing your article." },
    ],
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<Competition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setHistory(loadCompetitions()); }, []);

  const deploy = () => {
    setError(null);
    const trimmed = content.trim();
    if (mode === "text" && trimmed.length < 50) { setError("Paste at least 50 characters."); return; }
    if (mode === "url" && !/^https?:\/\//i.test(trimmed)) { setError("Provide a valid URL (https://...)."); return; }
    const id = newId();
    const preview = (mode === "url" ? trimmed : trimmed.slice(0, 140)).slice(0, 200);
    const comp: Competition = {
      id, createdAt: Date.now(), source: mode, preview, status: "pending",
    };
    saveCompetition(comp);
    // stash raw content for arena to read
    sessionStorage.setItem(`triagent.input.${id}`, JSON.stringify({ source: mode, content: trimmed }));
    navigate({ to: "/arena", search: { id } });
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <span className="text-xs font-display tracking-[0.3em] text-neon">// DISPATCH TERMINAL</span>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-black tracking-widest">DEPLOY AGENTS</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Provide article text or a URL. Three agents will be dispatched in parallel; GenLayer will judge the results.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 block-card bracket-frame p-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setMode("text")}
              className={`btn-neon !py-2 !text-xs ${mode === "text" ? "btn-neon-solid" : ""}`}
            >
              <FileText size={14} /> PASTE TEXT
            </button>
            <button
              onClick={() => setMode("url")}
              className={`btn-neon !py-2 !text-xs ${mode === "url" ? "btn-neon-solid" : ""}`}
            >
              <LinkIcon size={14} /> ARTICLE URL
            </button>
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
            <div className="mt-3 text-xs font-display tracking-widest text-destructive">{error.toUpperCase()}</div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs font-display tracking-[0.3em] text-muted-foreground">
              {mode === "text" ? `${content.length} CHARS` : "AWAITING URL"}
            </span>
            <button onClick={deploy} className="btn-neon btn-neon-solid">
              <Rocket size={16} /> DEPLOY AGENTS
            </button>
          </div>
        </div>

        <aside className="block-card p-6">
          <div className="font-display text-sm tracking-widest text-muted-foreground mb-4">// RECENT COMPETITIONS</div>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center font-display tracking-widest">
              NO MISSIONS YET
            </div>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link
                    to="/results"
                    search={{ id: c.id }}
                    className="block border border-border hover:border-neon p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] font-display tracking-widest text-muted-foreground">
                      <span>{c.source.toUpperCase()}</span>
                      <span className={
                        c.status === "done" ? "text-neon" :
                        c.status === "error" ? "text-destructive" : "text-muted-foreground"
                      }>
                        {c.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 text-sm truncate">{c.preview}</div>
                    {c.winner && (
                      <div className="mt-1 text-[10px] font-display tracking-widest text-neon">
                        WINNER: AGENT {c.winner}
                      </div>
                    )}
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
