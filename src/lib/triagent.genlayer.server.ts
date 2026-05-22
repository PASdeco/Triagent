import { readFile } from "node:fs/promises";
import path from "node:path";

import { createAccount, createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov, testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

import {
  type ArenaSnapshot,
  type ArenaState,
  type CompetitionRecord,
  type LeaderboardEntry,
  DEFAULT_LEADERBOARD,
  EMPTY_ARENA_STATE,
  isContractAddress,
  isAgentName,
} from "./triagent.model";
import { DEFAULT_CONTRACT_ADDRESS, DEFAULT_GENLAYER_NETWORK } from "./triagent.config";

type NetworkName = "localnet" | "studionet" | "testnetAsimov" | "testnetBradbury";

type ContractStateWire = {
  nextRound: number;
  competitions: CompetitionRecord[];
  leaderboard: LeaderboardEntry[];
};

type DeploymentCache = {
  address: string;
};

const NETWORKS: Record<NetworkName, typeof localnet> = {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
};

let cachedDeployment: DeploymentCache | null = null;
let cachedDeploymentPromise: Promise<string> | null = null;
let consensusReady = false;

function getNetworkName(): NetworkName {
  const value = (process.env.GENLAYER_NETWORK ?? DEFAULT_GENLAYER_NETWORK).trim();
  return value in NETWORKS ? (value as NetworkName) : DEFAULT_GENLAYER_NETWORK;
}

function getChain() {
  return NETWORKS[getNetworkName()];
}

function getPrivateKey(): `0x${string}` | null {
  const value = process.env.GENLAYER_PRIVATE_KEY?.trim();
  if (!value) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("GENLAYER_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string.");
  }
  return value as `0x${string}`;
}

function getPrivateKeyOrThrow(): `0x${string}` {
  const value = getPrivateKey();
  if (!value) {
    throw new Error("GENLAYER_PRIVATE_KEY is required to submit rounds or deploy contracts on GenLayer.");
  }
  return value;
}

function getClient(options?: { requireSigner?: boolean }) {
  const privateKey = options?.requireSigner ? getPrivateKeyOrThrow() : getPrivateKey();
  const account = privateKey ? createAccount(privateKey) : createAccount();
  return createClient({
    chain: getChain(),
    account,
  });
}

function createWireState(): ContractStateWire {
  return {
    nextRound: EMPTY_ARENA_STATE.nextRound,
    competitions: [],
    leaderboard: DEFAULT_LEADERBOARD.map((row) => ({ ...row })),
  };
}

function parseState(raw: unknown): ContractStateWire {
  if (typeof raw !== "string" || raw.trim() === "") return createWireState();
  const parsed = JSON.parse(raw) as Partial<ContractStateWire>;
  const leaderboard = Array.isArray(parsed.leaderboard) && parsed.leaderboard.length === 3
    ? parsed.leaderboard.filter((row): row is LeaderboardEntry => {
        const candidate = row as LeaderboardEntry;
        return (
          candidate != null &&
          isAgentName(candidate.name) &&
          typeof candidate.wins === "number" &&
          typeof candidate.competitions === "number" &&
          typeof candidate.totalReward === "number" &&
          typeof candidate.reputation === "number"
        );
      })
    : DEFAULT_LEADERBOARD.map((row) => ({ ...row }));

  return {
    nextRound: typeof parsed.nextRound === "number" ? parsed.nextRound : 1,
    competitions: Array.isArray(parsed.competitions) ? (parsed.competitions as CompetitionRecord[]) : [],
    leaderboard,
  };
}

function wireStateToArenaState(state: ContractStateWire): ArenaState {
  const leaderboard = [...state.leaderboard].sort((left, right) => {
    if (right.reputation !== left.reputation) return right.reputation - left.reputation;
    if (right.wins !== left.wins) return right.wins - left.wins;
    return right.totalReward - left.totalReward;
  });

  return {
    nextRound: state.nextRound,
    competitions: state.competitions,
    leaderboard,
  };
}

function getContractFileBytes() {
  const filePath = path.resolve(process.cwd(), "contracts", "triagent.py");
  return readFile(filePath);
}

async function ensureConsensus() {
  if (consensusReady) return;
  const client = getClient();
  await client.initializeConsensusSmartContract();
  consensusReady = true;
}

function extractContractAddress(receipt: unknown): string {
  const data = receipt as {
    data?: { contract_address?: string };
    txDataDecoded?: { contractAddress?: string };
  };

  const address = data.data?.contract_address ?? data.txDataDecoded?.contractAddress;
  if (!address) {
    throw new Error("Unable to determine the deployed contract address.");
  }
  if (!isContractAddress(address)) {
    throw new Error("The deployed contract returned an invalid address.");
  }
  return address;
}

function parseContractAddress(value: string | null | undefined, label: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!isContractAddress(trimmed)) {
    throw new Error(`${label} must be a 0x-prefixed 20-byte contract address.`);
  }
  return trimmed;
}

export async function resolveContractAddress(explicitAddress?: string | null): Promise<string | null> {
  const explicit = parseContractAddress(explicitAddress, "Contract address");
  if (explicit) return explicit;
  const envAddress = parseContractAddress(process.env.GENLAYER_CONTRACT_ADDRESS, "GENLAYER_CONTRACT_ADDRESS");
  if (envAddress) return envAddress;
  if (cachedDeployment?.address) return cachedDeployment.address;
  const configuredAddress = parseContractAddress(DEFAULT_CONTRACT_ADDRESS, "DEFAULT_CONTRACT_ADDRESS");
  if (configuredAddress) return configuredAddress;
  return null;
}

export async function deployArenaContract(): Promise<string> {
  if (cachedDeploymentPromise) return cachedDeploymentPromise;
  cachedDeploymentPromise = (async () => {
    await ensureConsensus();
    const client = getClient({ requireSigner: true });
    const code = new Uint8Array(await getContractFileBytes());
    const txHash = await client.deployContract({
      code,
      args: [],
    });
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.FINALIZED,
      retries: 200,
      interval: 3000,
    });
    const address = extractContractAddress(receipt);
    cachedDeployment = { address };
    return address;
  })();

  try {
    return await cachedDeploymentPromise;
  } finally {
    cachedDeploymentPromise = null;
  }
}

async function getArenaContractAddress(explicitAddress?: string | null): Promise<string> {
  const address = await resolveContractAddress(explicitAddress);
  if (address) return address;
  return deployArenaContract();
}

type XPostRef = {
  id: string;
  username: string | null;
  canonicalUrl: string;
};

type XPostCandidate = {
  label: string;
  text: string;
};

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  mdash: "-",
  nbsp: " ",
  quot: "\"",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g, (match, decimal, hex, named) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return HTML_ENTITIES[String(named).toLowerCase()] ?? match;
  });
}

function htmlToText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanArticleText(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 12000);
}

function cleanXPostText(value: string): string {
  return cleanArticleText(decodeHtmlEntities(value).replace(/https:\/\/t\.co\/\S+/gi, ""));
}

function parseXPostUrl(url: URL): XPostRef | null {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^mobile\./, "");
  if (!["x.com", "twitter.com"].includes(hostname)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const statusIndex = parts.findIndex((part) => part === "status" || part === "statuses");
  if (statusIndex < 0) return null;

  const id = parts[statusIndex + 1];
  if (!id || !/^\d{8,}$/.test(id)) return null;

  const username = statusIndex > 0 && parts[0] !== "i" ? parts[0] : null;
  const canonicalPath = username ? `${username}/status/${id}` : `i/web/status/${id}`;

  return {
    id,
    username,
    canonicalUrl: `https://twitter.com/${canonicalPath}`,
  };
}

async function fetchJson<T>(url: string, headers?: HeadersInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "Triagent/1.0",
      ...headers,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

async function loadXPostViaApi(ref: XPostRef): Promise<XPostCandidate | null> {
  const token = process.env.X_BEARER_TOKEN?.trim() ?? process.env.TWITTER_BEARER_TOKEN?.trim();
  if (!token) return null;

  const endpoint = new URL(`https://api.twitter.com/2/tweets/${ref.id}`);
  endpoint.searchParams.set("tweet.fields", "author_id,created_at,entities");
  endpoint.searchParams.set("expansions", "author_id");
  endpoint.searchParams.set("user.fields", "name,username");

  const data = await fetchJson<{
    data?: { text?: string };
    includes?: { users?: Array<{ name?: string; username?: string }> };
  }>(endpoint.toString(), {
    authorization: `Bearer ${token}`,
  });

  const text = cleanXPostText(data.data?.text ?? "");
  if (text.length < 40) return null;

  const user = data.includes?.users?.[0];
  const label = user?.username ? `X @${user.username}` : ref.username ? `X @${ref.username}` : "X post";
  return { label, text };
}

async function loadXPostViaFxTwitter(ref: XPostRef): Promise<XPostCandidate | null> {
  if (!ref.username) return null;
  const data = await fetchJson<{
    tweet?: {
      text?: string;
      raw_text?: { text?: string };
      author?: { screen_name?: string };
    };
  }>(`https://api.fxtwitter.com/${ref.username}/status/${ref.id}`);

  const text = cleanXPostText(data.tweet?.raw_text?.text ?? data.tweet?.text ?? "");
  if (text.length < 40) return null;

  return {
    label: data.tweet?.author?.screen_name ? `X @${data.tweet.author.screen_name}` : `X @${ref.username}`,
    text,
  };
}

async function loadXPostViaVxTwitter(ref: XPostRef): Promise<XPostCandidate | null> {
  if (!ref.username) return null;
  const data = await fetchJson<{
    text?: string;
    user_screen_name?: string;
  }>(`https://api.vxtwitter.com/${ref.username}/status/${ref.id}`);

  const text = cleanXPostText(data.text ?? "");
  if (text.length < 40) return null;

  return {
    label: data.user_screen_name ? `X @${data.user_screen_name}` : `X @${ref.username}`,
    text,
  };
}

async function loadXPostViaSyndication(ref: XPostRef): Promise<XPostCandidate | null> {
  const endpoint = new URL("https://cdn.syndication.twimg.com/tweet-result");
  endpoint.searchParams.set("id", ref.id);
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("token", "a");

  const data = await fetchJson<{
    text?: string;
    user?: { screen_name?: string };
  }>(endpoint.toString(), {
    referer: "https://platform.twitter.com/",
  });

  const text = cleanXPostText(data.text ?? "");
  if (text.length < 40) return null;

  return {
    label: data.user?.screen_name ? `X @${data.user.screen_name}` : ref.username ? `X @${ref.username}` : "X post",
    text,
  };
}

async function loadXPostViaOEmbed(ref: XPostRef): Promise<XPostCandidate | null> {
  const endpoint = new URL("https://publish.twitter.com/oembed");
  endpoint.searchParams.set("url", ref.canonicalUrl);
  endpoint.searchParams.set("omit_script", "true");
  endpoint.searchParams.set("dnt", "true");

  const data = await fetchJson<{
    author_name?: string;
    html?: string;
  }>(endpoint.toString());

  const paragraph = data.html?.match(/<p[\s\S]*?<\/p>/i)?.[0] ?? data.html ?? "";
  const text = cleanXPostText(htmlToText(paragraph));
  if (text.length < 40) return null;

  return {
    label: data.author_name ? `X ${data.author_name}` : ref.username ? `X @${ref.username}` : "X post",
    text,
  };
}

async function fetchXPostText(url: URL): Promise<{ label: string; article: string } | null> {
  const ref = parseXPostUrl(url);
  if (!ref) return null;

  const loaders = [
    loadXPostViaApi,
    loadXPostViaFxTwitter,
    loadXPostViaVxTwitter,
    loadXPostViaSyndication,
    loadXPostViaOEmbed,
  ];

  const results = await Promise.allSettled(loaders.map((load) => load(ref)));
  const candidates = results
    .filter((result): result is PromiseFulfilledResult<XPostCandidate | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((candidate): candidate is XPostCandidate => candidate != null)
    .sort((left, right) => right.text.length - left.text.length);

  const best = candidates[0];
  if (!best) {
    throw new Error("The X post could not be read.");
  }

  return {
    label: best.label,
    article: best.text.slice(0, 12000),
  };
}

export async function fetchArticleText(sourceKind: "text" | "url", content: string): Promise<{ label: string; article: string }> {
  if (sourceKind === "text") {
    const article = cleanArticleText(content);
    if (article.length < 40) {
      throw new Error("Paste a longer article before submitting.");
    }
    return { label: "Pasted text", article };
  }

  const url = new URL(content.trim());
  const xPost = await fetchXPostText(url);
  if (xPost) return xPost;

  const response = await fetch(url.toString(), {
    headers: { "user-agent": "Triagent/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Could not load the article URL (${response.status}).`);
  }

  const html = await response.text();
  const article = cleanArticleText(htmlToText(html));

  if (article.length < 40) {
    throw new Error("The URL did not contain enough readable article text.");
  }

  return { label: url.hostname, article };
}

export async function submitCompetition(input: {
  competitionId: string;
  sourceKind: "text" | "url";
  content: string;
  sourceLabel: string;
  contractAddress?: string | null;
}): Promise<{ contractAddress: string; transactionHash: string; competitionId: string }> {
  const contractAddress = await getArenaContractAddress(input.contractAddress ?? null);
  const client = getClient({ requireSigner: true });
  const { article } = await fetchArticleText(input.sourceKind, input.content);

  const transactionHash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: "submit_round",
    args: [input.competitionId, input.sourceKind, input.sourceLabel, article],
    value: 0n,
  });

  return {
    contractAddress,
    transactionHash,
    competitionId: input.competitionId,
  };
}

export async function readArenaSnapshot(input: {
  contractAddress?: string | null;
  competitionId?: string | null;
  txHash?: string | null;
}): Promise<ArenaSnapshot> {
  const contractAddress = await resolveContractAddress(input.contractAddress ?? null);
  if (!contractAddress) {
    return {
      contractAddress: null,
      hasContract: false,
      state: null,
      leaderboard: DEFAULT_LEADERBOARD.map((row) => ({ ...row })),
      recentCompetitions: [],
      competition: null,
      transaction: null,
    };
  }

  const client = getClient();
  const stateRaw = await client.readContract({
    address: contractAddress as `0x${string}`,
    functionName: "get_state",
    args: [],
  });

  const state = wireStateToArenaState(parseState(stateRaw));
  const recentCompetitions = [...state.competitions].slice(0, 12);
  const competition = input.competitionId
    ? state.competitions.find((round) => round.id === input.competitionId) ?? null
    : null;

  let transaction: ArenaSnapshot["transaction"] = null;
  if (input.txHash) {
    const tx = await client.getTransaction({ hash: input.txHash as `0x${string}` });
    transaction = {
      hash: input.txHash,
      statusName: typeof tx.statusName === "string" ? tx.statusName : undefined,
      txExecutionResultName:
        tx.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN ||
        tx.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR ||
        tx.txExecutionResultName === ExecutionResult.NOT_VOTED
          ? tx.txExecutionResultName
          : undefined,
      queuePosition: tx.queuePosition,
    };
  }

  return {
    contractAddress,
    hasContract: true,
    state,
    leaderboard: state.leaderboard,
    recentCompetitions,
    competition,
    transaction,
  };
}

export async function getArenaState(explicitAddress?: string | null): Promise<ArenaState | null> {
  const snapshot = await readArenaSnapshot({ contractAddress: explicitAddress ?? null });
  return snapshot.state;
}
