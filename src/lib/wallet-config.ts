import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

import { genlayerBradbury } from "./triagent.chain";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "triagent-local";

export const wagmiConfig = getDefaultConfig({
  appName: "TriAgent",
  projectId,
  chains: [genlayerBradbury],
  transports: {
    [genlayerBradbury.id]: http(genlayerBradbury.rpcUrls.default.http[0]),
  },
  ssr: true,
});
