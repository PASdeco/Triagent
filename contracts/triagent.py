# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re
from typing import Any, Dict, List


AGENT_NAMES = ["ALPHA", "BETA", "GAMMA"]

AGENT_PERSONAS = {
    "ALPHA": "You are Agent ALPHA. Be surgical, factual, and structured. Lead with the most important facts and keep the summary tight.",
    "BETA": "You are Agent BETA. Be concise, contextual, and readable. Summarize the story in plain language with a strong sense of why it matters.",
    "GAMMA": "You are Agent GAMMA. Be analytical and forward-looking. Capture implications, tradeoffs, and what to watch next.",
}


class TriAgentArena(gl.Contract):
    state_json: str

    def __init__(self):
        self.state_json = json.dumps(
            {
                "nextRound": 1,
                "competitions": [],
                "leaderboard": [
                    {"name": "ALPHA", "wins": 0, "competitions": 0, "totalReward": 0, "reputation": 1000},
                    {"name": "BETA", "wins": 0, "competitions": 0, "totalReward": 0, "reputation": 1000},
                    {"name": "GAMMA", "wins": 0, "competitions": 0, "totalReward": 0, "reputation": 1000},
                ],
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )

    def _load_state(self) -> Dict[str, Any]:
        return json.loads(self.state_json)

    def _save_state(self, state: Dict[str, Any]):
        self.state_json = json.dumps(state, ensure_ascii=False, separators=(",", ":"))

    def _clean_text(self, text: str) -> str:
        text = text.replace("\r", " ")
        text = re.sub(r"\s+", " ", text).strip()
        return text[:12000]

    def _extract_json(self, value: Any, label: str) -> Dict[str, Any]:
        if not isinstance(value, dict):
            raise gl.vm.UserError(f"{label} must return JSON")
        return value

    def _validate_summary(self, result: Any) -> bool:
        if not isinstance(result, gl.vm.Return):
            return False
        data = result.calldata
        if not isinstance(data, dict):
            return False
        summary = data.get("summary")
        key_points = data.get("key_points")
        return (
            isinstance(summary, str)
            and len(summary.strip()) >= 80
            and isinstance(key_points, list)
            and 3 <= len(key_points) <= 5
            and all(isinstance(point, str) and len(point.strip()) > 0 for point in key_points)
        )

    def _validate_judge(self, result: Any) -> bool:
        if not isinstance(result, gl.vm.Return):
            return False
        data = result.calldata
        if not isinstance(data, dict):
            return False
        scores = data.get("scores")
        winner = data.get("winner")
        reasoning = data.get("reasoning")
        if not isinstance(scores, dict) or winner not in AGENT_NAMES or not isinstance(reasoning, str):
            return False
        totals = {}
        for name in AGENT_NAMES:
            row = scores.get(name)
            if not isinstance(row, dict):
                return False
            for field in ["accuracy", "clarity", "completeness", "relevance"]:
                value = row.get(field)
                if not isinstance(value, (int, float)) or value < 0 or value > 10:
                    return False
            totals[name] = float(row["accuracy"]) + float(row["clarity"]) + float(row["completeness"]) + float(row["relevance"])
        winner_total = totals[winner]
        return all(winner_total >= total for total in totals.values())

    def _generate_summary(self, article: str, name: str) -> Dict[str, Any]:
        prompt = f"""
You are {name}.

Article:
{article}

Return JSON with:
- summary: 80 to 140 words
- key_points: 3 to 5 short bullet-style strings

Rules:
- Only use facts supported by the article.
- Do not mention AI, prompts, or the judging process.
- Keep the voice aligned to the agent persona.
"""

        def leader_fn():
            return self._extract_json(
                gl.nondet.exec_prompt(prompt, response_format="json"),
                f"{name} summary",
            )

        result = gl.vm.run_nondet_unsafe(leader_fn, self._validate_summary)
        return self._extract_json(result, f"{name} summary")

    def _judge_round(self, article: str, summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
        prompt = f"""
You are the GenLayer judge for a three-agent article summary competition.

Source article:
{article}

Candidate summaries:
{json.dumps(summaries, ensure_ascii=False)}

Return JSON with:
- scores: an object with keys ALPHA, BETA, GAMMA
- each score object must contain accuracy, clarity, completeness, and relevance numbers from 0 to 10
- winner: the agent with the highest total score
- reasoning: a short explanation of the result
"""

        def leader_fn():
            return self._extract_json(
                gl.nondet.exec_prompt(prompt, response_format="json"),
                "judge",
            )

        result = gl.vm.run_nondet_unsafe(leader_fn, self._validate_judge)
        return self._extract_json(result, "judge")

    @gl.public.write
    def submit_round(self, competition_id: str, source_kind: str, source_label: str, article_text: str) -> str:
        state = self._load_state()
        existing = [round_ for round_ in state["competitions"] if round_.get("id") == competition_id]
        if existing:
            raise gl.vm.UserError("Competition already exists.")

        article = self._clean_text(article_text)
        if len(article) < 40:
            raise gl.vm.UserError("Article text is too short.")

        summaries = []
        for name in AGENT_NAMES:
            summary = self._generate_summary(article, name)
            summaries.append(
                {
                    "name": name,
                    "summary": summary["summary"].strip(),
                    "keyPoints": [point.strip() for point in summary["key_points"]],
                }
            )

        judge = self._judge_round(article, summaries)
        scores = judge["scores"]
        totals = {}
        for name in AGENT_NAMES:
            row = scores[name]
            totals[name] = round(float(row["accuracy"]) + float(row["clarity"]) + float(row["completeness"]) + float(row["relevance"]), 1)

        winner = judge["winner"]
        reward = int(500 + totals[winner] * 90)

        leaderboard = state["leaderboard"]
        for row in leaderboard:
            row["competitions"] += 1
            if row["name"] == winner:
                row["wins"] += 1
                row["totalReward"] += reward
                row["reputation"] += 25
            else:
                row["reputation"] = max(500, row["reputation"] - 8)

        round_index = int(state["nextRound"])
        state["nextRound"] = round_index + 1
        state["leaderboard"] = leaderboard
        state["competitions"] = [
            {
                "id": competition_id,
                "roundIndex": round_index,
                "source": {"kind": source_kind, "label": source_label},
                "article": article,
                "agents": summaries,
                "judge": {
                    "scores": scores,
                    "totals": totals,
                    "winner": winner,
                    "reasoning": judge["reasoning"],
                    "reward": reward,
                },
            }
        ] + state["competitions"][:24]
        self._save_state(state)
        return competition_id

    @gl.public.view
    def get_state(self) -> str:
        return self.state_json

    @gl.public.view
    def get_competition(self, competition_id: str) -> str:
        state = self._load_state()
        for round_ in state["competitions"]:
            if round_.get("id") == competition_id:
                return json.dumps(round_, ensure_ascii=False)
        return ""

    @gl.public.view
    def get_leaderboard(self) -> str:
        state = self._load_state()
        return json.dumps(state["leaderboard"], ensure_ascii=False)

