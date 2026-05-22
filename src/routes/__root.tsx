import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/Navbar";
import { wagmiConfig } from "@/lib/wallet-config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-grid">
      <div className="block-card bracket-frame p-10 text-center">
        <h1 className="font-display text-6xl font-black text-neon text-glow">404</h1>
        <p className="mt-2 text-sm text-muted-foreground tracking-widest">SIGNAL LOST</p>
        <a href="/" className="btn-neon mt-6 inline-flex">RETURN TO BASE</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="block-card bracket-frame p-8 max-w-md text-center">
        <h2 className="font-display text-xl text-destructive tracking-widest">SYSTEM FAULT</h2>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-neon mt-6"
        >
          RETRY
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TriAgent on GenLayer" },
      { name: "description", content: "Run article summary competitions and rank the best agent." },
      { property: "og:title", content: "TriAgent on GenLayer" },
      { property: "og:description", content: "Three agents, one article, one verdict." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00ff5f",
            accentColorForeground: "#001507",
            borderRadius: "small",
          })}
        >
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <Outlet />
            <footer className="mt-20 border-t border-border">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-xs text-muted-foreground font-display tracking-widest">
                <span>TRIAGENT // v1.0</span>
                <span>POWERED BY GENLAYER PROTOCOL</span>
              </div>
            </footer>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
