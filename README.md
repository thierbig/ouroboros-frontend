# Ouroboros Frontend

The chat-based development interface for building Pyth Network mini-games with an AI agent.

> Built for the [Pyth Community Hackathon](https://dev-forum.pyth.network/t/pyth-community-hackathon-official-rules/521) (March 4 - April 1, 2026)

## What It Does

Ouroboros Frontend is the web UI where users describe a game idea in plain English, and an AI agent builds it live. The interface streams the agent's reasoning, tool executions, and terminal output in real time — from first prompt to deployed game. It provides project management, file viewing, live preview of deployed games, a contract explorer for on-chain deployments, and analytics for tracking usage and costs.

## Screenshots

*Coming soon*

## Features

- **Project Templates** — Start with Entropy Game (on-chain randomness), Price Game (live Pyth feeds), or Custom Game
- **Real-Time Agent Chat** — Watch the agent think, write code, run commands, and deploy — streamed via WebSocket
- **Activity Log** — Timeline of all tool executions with color-coded categories (terminal, file ops, Pyth tools)
- **File Viewer** — Syntax-highlighted view of any file the agent reads or writes
- **Live Preview** — Embedded iframe of deployed games with auto-detected Netlify URLs
- **Contract Explorer** — View deployed smart contracts on Base Sepolia with BaseScan links
- **API Tester** — Built-in REST client to test deployed backend endpoints
- **Analytics Dashboard** — Session history, token usage, cumulative cost charts (ApexCharts)
- **Admin Panel** — Debug sessions, inspect API chunks, edit project CLAUDE.md and lessons
- **Stuck Detection** — Auto-detects unresponsive agents with force-stop and retry options

## Tech Stack

- **Framework:** Nuxt 3 (Vue 3, TypeScript)
- **UI:** Nuxt UI 3 + Tailwind CSS (dark mode)
- **Charts:** ApexCharts (vue3-apexcharts)
- **Real-Time:** WebSocket for agent event streaming
- **Package Manager:** Bun
- **Deployment:** Netlify (SPA mode, SSR disabled)

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Ouroboros Backend running on port 8001

### Install

```bash
git clone https://github.com/anthropics/ouroboros-frontend.git
cd ouroboros-frontend
bun install  # or npm install
```

### Configure

Create a `.env` file (optional — defaults to localhost):

```env
NUXT_PUBLIC_API_URL=http://localhost:8001/api
NUXT_PUBLIC_WS_URL=ws://localhost:8001/api/agent
```

### Run

```bash
bun dev  # or npm run dev
```

Open `http://localhost:3000`.

### Build

```bash
bun run build
bun run preview  # test production build locally
```

## Project Structure

```
ouroboros-frontend/
├── pages/
│   ├── index.vue          # Home — project picker, template selection, session resume
│   ├── chat.vue           # Main chat interface with split-panel layout
│   ├── analytics.vue      # Session analytics table
│   └── admin/
│       ├── index.vue      # Admin dashboard — session debugging
│       ├── [id].vue       # Session debugger — full conversation + chunk inspector
│       └── project/
│           └── [id].vue   # Project config editor (CLAUDE.md, lessons.md)
├── components/
│   ├── AppHeader.vue      # Nav bar — API key input, model selector, token counter
│   ├── ChatMessage.vue    # Message renderer with markdown + tool call display
│   ├── ActivityLog.vue    # Tool execution timeline with live terminal output
│   ├── FileViewer.vue     # Syntax-highlighted code viewer
│   ├── ContractExplorer.vue # Deployed contract details + BaseScan link
│   ├── ApiTester.vue      # Built-in REST API tester
│   ├── StatsOverview.vue  # Cost charts + session breakdown
│   ├── ToolCallCard.vue   # Individual tool execution card
│   ├── ContextBar.vue     # Token usage progress bar
│   ├── StopButton.vue     # Force-stop for running agents
│   └── ...
├── composables/
│   └── useAgent.ts        # WebSocket connection, message handling, state management
├── assets/css/
│   └── main.css           # Custom theme (emerald green accent, dark palette)
├── nuxt.config.ts         # Nuxt config (SPA mode, dark theme, runtime URLs)
└── package.json
```

## How It Works

1. **Create a project** — Pick a template (Entropy, Price, or Custom) and name it
2. **Chat with the agent** — Describe your game idea in the chat panel
3. **Watch it build** — The agent writes files, installs dependencies, deploys contracts, and ships to Netlify
4. **Play your game** — Click the live preview to see your deployed game
5. **Iterate** — Keep chatting to add features, fix bugs, or redeploy

The frontend communicates with the backend over WebSocket, receiving streaming events:

| Event | Description |
|-------|-------------|
| `session` | New session started |
| `tool_call` | Agent executing a tool (file write, terminal, Pyth API, etc.) |
| `tool_result` | Tool execution completed |
| `stream` | Token streamed from LLM |
| `response` | Complete agent response |
| `usage` | Token count update |
| `terminal_output` | Live command output |
| `error` | Error occurred |

## Pyth Integration in the UI

- **Template Selection** — Entropy Game and Price Game templates pre-configure Pyth features
- **Activity Log** — Pyth tool calls (`pyth_price`, `pyth_search`, `pyth_deploy`) are highlighted with distinct colors
- **Contract Explorer** — Shows deployed Pyth Entropy contracts on Base Sepolia (chain 84532) with BaseScan links
- **Session Suggestions** — Quick actions like "Add Pyth integration" and "Deploy to Base Sepolia" for existing projects

## License

Apache 2.0