import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "./ThemeToggle";
import { WalletConnectButton } from "./WalletConnectButton";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center border border-neon bg-neon/10 text-neon font-display text-sm font-black">
            /\
          </div>
          <span className="font-display text-lg font-black tracking-[0.18em] text-foreground transition-colors group-hover:text-neon">
            TRIAGENT
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 font-display text-xs tracking-[0.2em]">
          {[
            { to: "/", label: "HOME" },
            { to: "/submit", label: "SUBMIT" },
            { to: "/leaderboard", label: "LEADERBOARD" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-2 text-muted-foreground transition-colors hover:text-neon"
              activeProps={{ className: "px-3 py-2 text-neon" }}
              activeOptions={{ exact: true }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
