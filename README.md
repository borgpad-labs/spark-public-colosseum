# Spark

> **The Idea LaunchPad** — fund ideas before teams exist, then let the market select the best builders via futarchy on Realms.

[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-14F195?logo=solana&logoColor=white)](https://solana.com)
[![Realms DAO](https://img.shields.io/badge/Realms-DAO%20Governance-blueviolet)](https://realms.today)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

---

## Graveyard Hackathon Submission

**Hackathon:** [Solana Graveyard Hack](https://solana.com/graveyard-hack)

**Sponsor Track:** Realms — DAOs ($5,000)

**Deployed app:** [justspark.fun/ideas](https://justspark.fun/ideas)

**First funded idea (hackathon live):** [OpenClaw Instances for Investors](https://justspark.fun/ideas/openclaw-instances-for-investors)

**Links:** [X](https://x.com/sparkdotfun) | [Telegram](https://t.me/sparkdotfun) | [Documentation](https://justspark.notion.site/spark-doc-public)

**Team:** Mathis (Founder/Strategy) | Ewan (CTO/Solana) | Emre (Marketing/Community)

**Contact:** @mathis_btc (Telegram)

---

## What is Spark?

Spark is an Idea LaunchPad on Solana. We tokenize ideas before teams exist — anyone can submit an idea, and the community funds it — then we mint Ownership Coins inspired by MetaDAO. These are treasury-backed tokens where 80% of raised funds go into the treasury, 20% into the AMM pool. Once an idea is funded, builders compete to execute it through a hackathon, and futarchy-powered decision markets select the best team.

**Our thesis:** AI has commoditized execution. Code is no longer the bottleneck — ideas, early conviction and distribution are. Vibecoder = 1% of the population. But 99% can VibeFund. Spark connects both sides.

### How it works

1. **Anyone submits an idea** on Twitter by tagging the official Spark account
2. **Spark creates an SPL token** for that idea with dynamic bonding curves on Meteora
3. **Community funds the idea** with USDC deposits into an on-chain vault
4. **A Realms DAO is created** for the funded idea — token holders govern the treasury
5. **Builders compete** through hackathons, selected via futarchy decision markets
6. **Treasury funds the winner** — governed entirely on-chain through Realms

---

## How we use Realms

Each funded idea on Spark deploys its treasury into a **Realms DAO** ([spl-governance](https://github.com/solana-labs/solana-program-library/tree/master/governance)). We migrated from Squads to Realms specifically for this hackathon in partnership with [combinator.trade](https://combinator.trade).

### Governance for Builders

Idea/Ownership Coin holders govern their idea's treasury through Realms. Proposals include builder selection, milestone approvals, and fund allocation — all on-chain.

### Futarchy via Realms Extensions

In collaboration with [combinator.trade](https://combinator.trade), we integrated futarchy-based decision markets on top of Realms. When builders apply to ship a funded idea, a decision market opens where participants predict the best team. The market resolves and the treasury is allocated to the winner — governed through Realms authority.

### Authority-First Orgs

Every funded idea creates a strong on-chain organization. The treasury is 100% redeemable by token holders if no suitable builder is selected. Each Realms DAO is an authority-first entity where community funds are protected by design.

### Realms integration in the codebase

| What | Where | Description |
|------|-------|-------------|
| DAO creation | [`frontend/functions/api/createdao.ts`](frontend/functions/api/createdao.ts) | Creates a Realms DAO with governance, community token mint, and native treasury for each funded idea |
| Multi-sig DAO creation | [`frontend/functions/api/createdaomultisig.ts`](frontend/functions/api/createdaomultisig.ts) | Multi-signature variant for DAO creation |
| DAO data fetching | [`frontend/functions/api/getdao.ts`](frontend/functions/api/getdao.ts) | Retrieves Realm info, governance accounts, proposals, and voting config |
| Governance data | [`frontend/functions/api/getgovernancedata.ts`](frontend/functions/api/getgovernancedata.ts) | Fetches user voting power and governance token records |
| Governance service | [`frontend/src/services/governanceService.ts`](frontend/src/services/governanceService.ts) | Full governance operations: deposit tokens, cast votes (binary + multi-choice), withdraw, relinquish votes |
| Governance UI | [`frontend/src/components/GovernanceStatus/`](frontend/src/components/GovernanceStatus/) | Token deposit/withdrawal and voting power display |
| Proposal voting UI | [`frontend/src/components/ProposalVoting/`](frontend/src/components/ProposalVoting/) | Cast votes on proposals with multi-choice support |
| Graduation check | [`frontend/functions/api/admin/gettokengraduate.ts`](frontend/functions/api/admin/gettokengraduate.ts) | Checks if a token qualifies for DAO creation |
| DAO scheduler | [`workers/schedulerCreateDao/`](workers/schedulerCreateDao/) | Automated DAO creation for graduated tokens |
| Data models | [`frontend/shared/models.ts`](frontend/shared/models.ts) | `DaoModel`, `DaoGovernanceModel`, `DaoProposalModel`, `DaoProposalState` |

---

## Solana Smart Contracts

### Spark Idea Vault (Anchor)

**Program ID:** `8ijFSYEJ7dCWSGVbLs7nVntbbmaz1tXYtkBGpn5JSNep`

**Source:** [`onchain/programs/spark_idea_vault/src/lib.rs`](onchain/programs/spark_idea_vault/src/lib.rs)

Custom Anchor program for USDC-denominated idea funding with on-chain vaults.

| Instruction | Description |
|-------------|-------------|
| `initialize_admin_config` | One-time setup of the singleton admin account and pause flag |
| `update_admin` | Transfer admin role to a new address |
| `toggle_pause` | Pause/unpause all deposits and withdrawals |
| `initialize_vault` | Create a new vault for an idea (PDA seeded by SHA256 of idea_id) |
| `deposit` | Users deposit USDC into a vault (min 0.001 USDC, check-effects-interactions pattern) |
| `withdraw` | Users withdraw their deposited USDC |
| `admin_withdraw` | Admin withdraws all vault funds to the Realms DAO treasury |

**Account structures:**
- `AdminConfig` — singleton admin config (admin pubkey, pause flag, bump)
- `IdeaVault` — one per idea (idea_id, vault_seed, mint, vault_ata, total_deposited)
- `UserDeposit` — tracks per-user deposits (vault, user, amount)

**Client integration:** [`frontend/shared/solana/sparkVaultService.ts`](frontend/shared/solana/sparkVaultService.ts)

### Solana Governance (spl-governance) — Realms

**Program ID:** `GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw`

Standard Solana governance program used for all Realms DAO operations (proposal creation, voting, treasury management).

### Other on-chain integrations

| Program | Usage |
|---------|-------|
| **Meteora DAMM v2** | Dynamic bonding curves for token trading pools |
| **Jupiter** | Swap aggregation for token trades |
| **SPL Token** | Token creation and transfers |
| **Metaplex Token Metadata** | Token metadata (name, symbol, image) |

---

## What's live today

- Platform at [justspark.fun/ideas](https://justspark.fun/ideas) with idea submission and USDC deposits
- AI-powered idea analysis (market size, competition, feasibility)
- First idea funded by the community with hackathon in progress
- Realms DAO treasury integration
- CombinatorFed decision market integration for builder selection
- MCP server for AI agent integration ([`mcp-server/`](mcp-server/))

---

## Architecture

```
spark-it/
├── frontend/              # React + TypeScript frontend
│   ├── src/               # UI components, pages, services
│   ├── functions/         # Cloudflare Pages Functions (serverless API)
│   ├── shared/            # Shared types, Solana services, constants
│   └── migrations/        # D1 database migrations
├── onchain/               # Solana smart contracts (Anchor)
│   ├── programs/          # Spark Idea Vault program (Rust)
│   ├── client/            # TypeScript client for the program
│   └── tests/             # On-chain tests
├── mcp-server/            # MCP server for AI agents
├── workers/               # Cloudflare Workers (schedulers)
│   ├── schedulerCreateDao/          # Auto DAO creation
│   ├── schedulerClaimFees/          # Fee collection
│   └── schedulerRefreshTwitterStats/ # Twitter data refresh
└── docs/                  # Technical documentation
```

### Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Privy auth
- **Backend:** Cloudflare Pages Functions, D1 Database, R2 Storage
- **Blockchain:** Solana, Anchor Framework, spl-governance (Realms), Meteora SDK, Jupiter SDK
- **AI:** OpenAI + Gemini for idea analysis, MCP server for agent tooling

---

## Getting Started

### Prerequisites
- Node.js 18+
- Solana CLI tools
- A Solana wallet (Phantom, Backpack, etc.)

### Installation

```bash
git clone https://github.com/borgpad-labs/spark-it.git
cd spark-it

# Frontend
cd frontend && npm install
cp .env.example .env  # Edit with your config
npm run dev

# Smart contracts
cd ../onchain && npm install
anchor build
anchor test
```

See [`frontend/wrangler.toml`](frontend/wrangler.toml) for the full list of required environment variables.

---

## Roadmap

- First community-funded hackathon completing as you review this — our end-to-end Proof of Concept
- Iterate: ship more ideas, run more hackathons, refine futarchy-based builder selection
- DEX partnership for Ownership Coin liquidity (in discussions with several)
- Discussions with stablecoin issuers to replace USDC
- Long-term: hackathons as e-sports — competitive builder sport
- Expanding into robotics

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Made with Spark by Mathis, Ewan & Emere**
