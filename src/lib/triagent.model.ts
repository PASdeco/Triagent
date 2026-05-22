export const AGENT_NAMES = ["ALPHA", "BETA", "GAMMA"] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export const AGENT_GLYPHS: Record<AgentName, string> = {
  ALPHA: "/\\",
  BETA: "[]",
  GAMMA: "<>",
};

export const AGENT_PERSONAS: Record<AgentName, string> = {
  ALPHA:
    "You are Agent ALPHA. Be surgical, factual, and structured. Lead with the most important facts and keep the summary tight.",
  BETA:
    "You are Agent BETA. Be concise, contextual, and readable. Summarize the story in plain language with a strong sense of why it matters.",
  GAMMA:
    "You are Agent GAMMA. Be analytical and forward-looking. Capture implications, tradeoffs, and what to watch next.",
};

export type AgentSummary = {
  name: AgentName;
  summary: string;
  keyPoints: string[];
};

export type AgentScores = {
  accuracy: number;
  clarity: number;
  completeness: number;
  relevance: number;
};

export type JudgeOutcome = {
  scores: Record<AgentName, AgentScores>;
  totals: Record<AgentName, number>;
  winner: AgentName;
  reasoning: string;
  reward: number;
};

export type CompetitionSource = {
  kind: "text" | "url";
  label: string;
};

export type CompetitionRecord = {
  id: string;
  roundIndex: number;
  source: CompetitionSource;
  article: string;
  agents: AgentSummary[];
  judge: JudgeOutcome;
};

export type LeaderboardEntry = {
  name: AgentName;
  wins: number;
  competitions: number;
  totalReward: number;
  reputation: number;
};

export type ArenaState = {
  nextRound: number;
  competitions: CompetitionRecord[];
  leaderboard: LeaderboardEntry[];
};

export type ArenaTransactionSnapshot = {
  hash: string;
  statusName?: string;
  txExecutionResultName?: string;
  queuePosition?: string;
};

export type ArenaSnapshot = {
  contractAddress: string | null;
  hasContract: boolean;
  state: ArenaState | null;
  leaderboard: LeaderboardEntry[];
  recentCompetitions: CompetitionRecord[];
  competition: CompetitionRecord | null;
  transaction: ArenaTransactionSnapshot | null;
};

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = AGENT_NAMES.map((name) => ({
  name,
  wins: 0,
  competitions: 0,
  totalReward: 0,
  reputation: 1000,
}));

export const EMPTY_ARENA_STATE: ArenaState = {
  nextRound: 1,
  competitions: [],
  leaderboard: DEFAULT_LEADERBOARD,
};

export const CONTRACT_ADDRESS_KEY = "triagent.genlayer.contractAddress";
export const GENLAYER_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isAgentName(value: string): value is AgentName {
  return (AGENT_NAMES as readonly string[]).includes(value);
}

export function isContractAddress(value: string): boolean {
  return GENLAYER_ADDRESS_PATTERN.test(value.trim());
}
