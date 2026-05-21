import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AGENT_NAMES = ["ALPHA", "BETA", "GAMMA"] as const;

const AGENT_PERSONAS: Record<(typeof AGENT_NAMES)[number], string> = {
  ALPHA:
    "You are Agent ALPHA — surgical, factual, and structured. Favor bullet-style clarity and precise figures. Lead with the most consequential fact.",
  BETA:
    "You are Agent BETA — narrative and contextual. Write a tight prose summary that situates the story and explains why it matters. Avoid lists.",
  GAMMA:
    "You are Agent GAMMA — analytical and forward-looking. Distill key findings, then highlight implications and what to watch next.",
};

const INPUT_SCHEMA = z.object({
  source: z.enum(["text", "url"]),
  content: z.string().min(20).max(50000),
});

const SCORES = z.object({
  accuracy: z.number(),
  clarity: z.number(),
  completeness: z.number(),
  relevance: z.number(),
});

export type JudgeResult = {
  scores: Record<string, z.infer<typeof SCORES>>;
  totals: Record<string, number>;
  winner: "ALPHA" | "BETA" | "GAMMA";
  reasoning: string;
  reward: number;
};

export type CompetitionResult = {
  article: string;
  agents: { name: string; summary: string; persona: string }[];
  judge: JudgeResult;
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(body: Record<string, unknown>): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Workspace → Usage.");
    throw new Error(`AI gateway error (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchUrlText(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "TriagentBot/1.0" } });
    if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
    const html = await r.text();
    // crude tag/script strip
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 20000);
  } catch (e) {
    throw new Error(`Could not fetch URL: ${e instanceof Error ? e.message : "unknown"}`);
  }
}

async function runAgent(name: string, persona: string, article: string): Promise<string> {
  const data = await callAI({
    messages: [
      {
        role: "system",
        content: `${persona}\n\nWrite a summary of the provided article in 120-200 words. Output only the summary text — no preamble, no headings, no commentary about being an AI.`,
      },
      { role: "user", content: `Article:\n\n${article}` },
    ],
  });
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

async function runJudge(article: string, summaries: { name: string; summary: string }[]): Promise<JudgeResult> {
  const tool = {
    type: "function",
    function: {
      name: "submit_verdict",
      description: "Score all 3 agents and declare a winner.",
      parameters: {
        type: "object",
        properties: {
          scores: {
            type: "object",
            properties: Object.fromEntries(
              AGENT_NAMES.map((n) => [
                n,
                {
                  type: "object",
                  properties: {
                    accuracy: { type: "number", minimum: 0, maximum: 10 },
                    clarity: { type: "number", minimum: 0, maximum: 10 },
                    completeness: { type: "number", minimum: 0, maximum: 10 },
                    relevance: { type: "number", minimum: 0, maximum: 10 },
                  },
                  required: ["accuracy", "clarity", "completeness", "relevance"],
                  additionalProperties: false,
                },
              ]),
            ),
            required: [...AGENT_NAMES],
            additionalProperties: false,
          },
          winner: { type: "string", enum: [...AGENT_NAMES] },
          reasoning: { type: "string" },
        },
        required: ["scores", "winner", "reasoning"],
        additionalProperties: false,
      },
    },
  };

  const summariesBlock = summaries
    .map((s) => `--- AGENT ${s.name} ---\n${s.summary}`)
    .join("\n\n");

  const data = await callAI({
    messages: [
      {
        role: "system",
        content:
          "You are GenLayer, an impartial AI judge. Evaluate the 3 candidate summaries against the original article on Accuracy, Clarity, Completeness, and Relevance (each 0-10). Declare the strongest summary as the winner. Be discerning — meaningful differentiation between scores is expected.",
      },
      {
        role: "user",
        content: `ORIGINAL ARTICLE:\n${article}\n\nCANDIDATE SUMMARIES:\n${summariesBlock}\n\nScore each agent and declare a winner.`,
      },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "submit_verdict" } },
  });

  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("Judge returned no verdict.");
  const parsed = JSON.parse(call.function.arguments);
  const scores = parsed.scores as Record<string, z.infer<typeof SCORES>>;
  const totals: Record<string, number> = {};
  for (const n of AGENT_NAMES) {
    const s = scores[n];
    totals[n] = +(s.accuracy + s.clarity + s.completeness + s.relevance).toFixed(1);
  }
  const reward = Math.round(500 + Math.random() * 1500);
  return {
    scores,
    totals,
    winner: parsed.winner,
    reasoning: parsed.reasoning,
    reward,
  };
}

export const runCompetition = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => INPUT_SCHEMA.parse(input))
  .handler(async ({ data }): Promise<CompetitionResult> => {
    const article = data.source === "url" ? await fetchUrlText(data.content) : data.content;
    if (article.length < 50) throw new Error("Article content is too short.");

    const summaries = await Promise.all(
      AGENT_NAMES.map((n) =>
        runAgent(n, AGENT_PERSONAS[n], article).then((summary) => ({
          name: n,
          summary,
          persona: AGENT_PERSONAS[n],
        })),
      ),
    );

    const judge = await runJudge(article, summaries);

    return {
      article: article.slice(0, 6000),
      agents: summaries,
      judge,
    };
  });
