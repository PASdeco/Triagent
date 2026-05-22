import { defineChain } from "viem";

export const genlayerBradbury = defineChain({
  id: 4221,
  name: "Genlayer Bradbury Testnet",
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-bradbury.genlayer.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Genlayer Explorer",
      url: "https://explorer-bradbury.genlayer.com",
    },
  },
});
