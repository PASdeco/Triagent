import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  ArenaSnapshot,
  ArenaState,
  CompetitionRecord,
  LeaderboardEntry,
  AgentName,
  AgentScores,
  JudgeOutcome,
} from "./triagent.model";
import { isContractAddress } from "./triagent.model";

export type { ArenaSnapshot, ArenaState, CompetitionRecord, LeaderboardEntry, AgentName, AgentScores, JudgeOutcome };

const COMPETITION_INPUT_SCHEMA = z.object({
  competitionId: z.string().min(1),
  sourceKind: z.enum(["text", "url"]),
  content: z.string().min(20),
  sourceLabel: z.string().min(1),
  contractAddress: z.string().trim().refine(isContractAddress, "Invalid contract address.").optional(),
});

const SNAPSHOT_INPUT_SCHEMA = z.object({
  contractAddress: z.string().trim().refine(isContractAddress, "Invalid contract address.").optional(),
  competitionId: z.string().optional(),
  txHash: z.string().optional(),
});

const SOURCE_INPUT_SCHEMA = z.object({
  sourceKind: z.enum(["text", "url"]),
  content: z.string().min(1),
});

async function loadServer() {
  return import("./triagent.genlayer.server");
}

export const deployArenaContract = createServerFn({ method: "POST" }).handler(async () => {
  const { deployArenaContract: deploy } = await loadServer();
  const contractAddress = await deploy();
  return { contractAddress };
});

export const submitCompetition = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => COMPETITION_INPUT_SCHEMA.parse(input))
  .handler(async ({ data }) => {
    const { submitCompetition: submit } = await loadServer();
    return submit(data);
  });

export const prepareCompetitionSource = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SOURCE_INPUT_SCHEMA.parse(input))
  .handler(async ({ data }) => {
    const { fetchArticleText, resolveContractAddress } = await loadServer();
    const [source, contractAddress] = await Promise.all([
      fetchArticleText(data.sourceKind, data.content),
      resolveContractAddress(),
    ]);

    if (!contractAddress) {
      throw new Error("Arena unavailable.");
    }

    return {
      contractAddress,
      sourceLabel: source.label,
      article: source.article,
    };
  });

export const loadArenaSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SNAPSHOT_INPUT_SCHEMA.parse(input))
  .handler(async ({ data }) => {
    const { readArenaSnapshot } = await loadServer();
    return readArenaSnapshot(data);
  });
