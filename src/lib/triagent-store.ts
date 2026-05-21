// localStorage helpers for task history + agent reputation
export type Competition = {
  id: string;
  createdAt: number;
  source: "text" | "url";
  preview: string;
  winner?: "ALPHA" | "BETA" | "GAMMA";
  reward?: number;
  // full result stored too for arena/results pages
  result?: unknown;
  status: "pending" | "done" | "error";
  error?: string;
};

const COMPS = "triagent.competitions";
const REP = "triagent.reputation";

export function loadCompetitions(): Competition[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(COMPS) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCompetition(c: Competition) {
  const all = loadCompetitions().filter((x) => x.id !== c.id);
  all.unshift(c);
  localStorage.setItem(COMPS, JSON.stringify(all.slice(0, 50)));
}

export function getCompetition(id: string): Competition | undefined {
  return loadCompetitions().find((c) => c.id === id);
}

export type AgentRep = {
  name: "ALPHA" | "BETA" | "GAMMA";
  wins: number;
  competitions: number;
  totalReward: number;
  reputation: number;
};

const DEFAULT_REP: AgentRep[] = [
  { name: "ALPHA", wins: 0, competitions: 0, totalReward: 0, reputation: 1000 },
  { name: "BETA",  wins: 0, competitions: 0, totalReward: 0, reputation: 1000 },
  { name: "GAMMA", wins: 0, competitions: 0, totalReward: 0, reputation: 1000 },
];

export function loadReputation(): AgentRep[] {
  if (typeof localStorage === "undefined") return DEFAULT_REP;
  try {
    const r = JSON.parse(localStorage.getItem(REP) ?? "null");
    if (!Array.isArray(r) || r.length !== 3) return DEFAULT_REP;
    return r;
  } catch {
    return DEFAULT_REP;
  }
}

export function recordResult(winner: "ALPHA" | "BETA" | "GAMMA", reward: number) {
  const reps = loadReputation();
  for (const r of reps) {
    r.competitions += 1;
    if (r.name === winner) {
      r.wins += 1;
      r.totalReward += reward;
      r.reputation += 25;
    } else {
      r.reputation = Math.max(500, r.reputation - 8);
    }
  }
  localStorage.setItem(REP, JSON.stringify(reps));
}

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
