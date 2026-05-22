import { testnetBradbury } from "genlayer-js/chains";

import { DEFAULT_CONTRACT_ADDRESS } from "./triagent.config";
import { isContractAddress } from "./triagent.model";

type Address = `0x${string}`;
type CreateGenLayerClient = typeof import("genlayer-js")["createClient"];
type GenLayerProvider = NonNullable<Parameters<CreateGenLayerClient>[0]>["provider"];
type WalletProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
};

function normalizeAddress(value: unknown): Address {
  if (typeof value !== "string" || !isContractAddress(value)) {
    throw new Error("Connect a wallet to continue.");
  }
  return value as Address;
}

async function ensureBradburyNetwork(provider: WalletProvider) {
  const chainIdHex = `0x${testnetBradbury.id.toString(16)}`;
  const currentChainId = await provider.request<string>({ method: "eth_chainId" });
  if (currentChainId === chainIdHex) return;

  const chainParams: Record<string, unknown> = {
    chainId: chainIdHex,
    chainName: testnetBradbury.name,
    rpcUrls: testnetBradbury.rpcUrls.default.http,
    nativeCurrency: testnetBradbury.nativeCurrency,
  };

  const explorerUrl = testnetBradbury.blockExplorers?.default.url;
  if (explorerUrl) {
    chainParams.blockExplorerUrls = [explorerUrl];
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code?: unknown }).code) : undefined;
    if (code === 4902 || /chain.*not.*added|unknown chain|unrecognized chain/i.test(message)) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chainParams],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      return;
    }
    throw error;
  }
}

export async function submitRoundWithWallet(input: {
  account: string;
  provider: WalletProvider;
  competitionId: string;
  sourceKind: "text" | "url";
  sourceLabel: string;
  article: string;
  contractAddress?: string | null;
}): Promise<{ contractAddress: string; transactionHash: string; competitionId: string }> {
  const account = normalizeAddress(input.account);
  const contractAddress = normalizeAddress(input.contractAddress ?? DEFAULT_CONTRACT_ADDRESS);
  const { createClient } = await import("genlayer-js");
  await ensureBradburyNetwork(input.provider);
  const client = createClient({
    chain: testnetBradbury,
    account,
    provider: input.provider as GenLayerProvider,
  });
  const transactionHash = await client.writeContract({
    address: contractAddress,
    functionName: "submit_round",
    args: [input.competitionId, input.sourceKind, input.sourceLabel, input.article],
    value: 0n,
  });

  return {
    contractAddress,
    transactionHash,
    competitionId: input.competitionId,
  };
}
