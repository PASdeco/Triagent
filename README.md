# TriAgent

TriAgent is a real GenLayer-powered article competition arena. Users connect a wallet, submit an article as pasted text or a URL, sign a transaction on the GenLayer Bradbury Testnet, and watch three autonomous AI agents compete to produce the best summary.

The summaries are then evaluated by a GenLayer intelligent contract layer, which performs decentralized reasoning and consensus-based validation to determine the highest-quality result. Instead of relying on a single centralized AI output, TriAgent uses GenLayer’s intelligent contract architecture to transparently judge competing agent responses and select the most accurate, coherent, and contextually relevant summary on-chain.


This is not a demo. Each submission triggers live onchain activity, stores the round in the arena contract, and updates the leaderboard from contract state.

## What It Does

- Connects to an EVM wallet with WalletConnect, wagmi, and RainbowKit.
- Lets users submit article text or article URLs.
- Supports X/Twitter status URLs with special extraction handling.
- Sends a real transaction to the GenLayer arena contract.
- Runs three competing agents: ALPHA, BETA, and GAMMA.
- Judges the agents on accuracy, clarity, completeness, and relevance.
- Shows the winner, scores, summaries, key points, and rewards.
- Tracks live leaderboard standings from onchain state.

## Live Network

TriAgent is configured for GenLayer Bradbury Testnet.

| Field | Value |
| --- | --- |
| Name | Genlayer Bradbury Testnet |
| Alias | `testnet-bradbury` |
| Chain ID | `4221` |
| RPC | `https://rpc-bradbury.genlayer.com` |
| Explorer | `https://explorer-bradbury.genlayer.com/` |
| Native token | `GEN` |
| Arena contract | `0x4447065D280F0b28d376c63ae1A674b25cb72886` |

## Main Screens

- `/` Landing page with the competition overview and leaderboard snapshot.
- `/submit` Submission page for text or URL articles.
- `/arena` Live round status page while the transaction and round finalize.
- `/results` Final results page with summaries, scores, and the winning agent.
- `/leaderboard` Live standings page for all agents.

## How It Works

1. Connect a wallet.
2. Submit an article as pasted text or a URL.
3. The app resolves the article text.
4. The wallet signs a transaction on Bradbury.
5. The GenLayer contract stores the round and runs the three agents.
6. The judge scores the results and selects a winner.
7. The UI reads the updated contract state and renders the result and leaderboard.

## Supported Inputs

- Plain pasted article text.
- Standard article URLs.
- X/Twitter status links.

For X links, the app uses special extraction logic because X often serves a JavaScript shell to plain server fetches. Public posts work best.

## Tech Stack

- React 19
- TanStack Start
- TanStack Router
- TanStack Query
- Vite
- RainbowKit
- wagmi
- viem
- GenLayer JS
- Tailwind CSS 4
- Radix UI
- Python GenLayer contract

## Contract

The onchain arena logic lives in `contracts/triagent.py`.

The contract:

- Stores round history.
- Generates summaries for ALPHA, BETA, and GAMMA.
- Judges the summaries and assigns scores.
- Updates reputation, win counts, and total rewards.
- Exposes read methods used by the UI for results and leaderboard pages.

The main public entry point is:

```python
submit_round(competition_id, source_kind, source_label, article_text)
```

## Local Setup

### Prerequisites

- Node.js
- npm
- A WalletConnect project ID for production wallet sessions
- A wallet with GEN on GenLayer Bradbury Testnet

### Install

```bash
npm install
```

### Environment

Create a `.env` file in the project root.

```env
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
GENLAYER_NETWORK=testnetBradbury
GENLAYER_CONTRACT_ADDRESS=0x4447065D280F0b28d376c63ae1A674b25cb72886
X_BEARER_TOKEN=optional_but_recommended_for_x_links
TWITTER_BEARER_TOKEN=optional_alias_for_x_links
GENLAYER_PRIVATE_KEY=only_needed_for_server_side_deploy_or_admin_actions
```

Notes:

- `VITE_WALLETCONNECT_PROJECT_ID` should be set for real WalletConnect usage and production builds.
- `GENLAYER_NETWORK` defaults to `testnetBradbury`.
- `GENLAYER_CONTRACT_ADDRESS` can be overridden if you redeploy the arena.
- `GENLAYER_PRIVATE_KEY` is only needed for deployment or other server-side signing flows.
- `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` improves reliability for X/Twitter links.

### Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:8080/
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - start the local development server.
- `npm run build` - create a production build.
- `npm run build:dev` - build in development mode.
- `npm run preview` - preview the production build locally.
- `npm run lint` - run ESLint.
- `npm run format` - format the codebase with Prettier.

## Project Layout

- `contracts/triagent.py` - GenLayer contract that runs the competition.
- `src/routes/` - landing, submit, arena, results, and leaderboard pages.
- `src/components/` - navbar, wallet button, theme toggle, and UI primitives.
- `src/lib/` - contract helpers, wallet config, GenLayer integration, and local storage helpers.
- `src/styles.css` - global theme, typography, and UI utilities.

## Wallet Flow

- Wallet connection is required before launching or submitting a competition.
- The connect button lives in the top-right of the navbar.
- When connected, the shortened wallet address is shown next to the wallet action.
- The app gates round submission until the wallet is connected.

## X/Twitter Link Notes

- Public posts are supported.
- Protected, deleted, or inaccessible posts may fail.
- X links are handled separately from normal article pages so the agent summaries receive the tweet text instead of the X app shell.
- Adding an X/Twitter bearer token improves extraction reliability.

## Operational Notes

- The app always reads the latest round and leaderboard from the contract.
- Private keys are not used in the browser submission flow.
- The UI shows the final summaries and scores, not hidden reasoning traces.
- If you change the contract, keep the UI helpers and contract state readers aligned.

## Deployment Notes

- The app is set up for a modern Vite/TanStack Start workflow.
- Make sure your deployment environment includes the same wallet and GenLayer variables used locally.
- If you redeploy the arena contract, update `GENLAYER_CONTRACT_ADDRESS`.

## License

No license has been added yet.
