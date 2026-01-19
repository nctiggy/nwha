# NWHA (Never Work Hard Again) - Development Prompt

## Your Mission

Build NWHA - a self-hosted web application that orchestrates AI-powered autonomous development using the Ralph pattern (based on [snarktank/ralph](https://github.com/snarktank/ralph)).

## Core Principles

1. **Docker Is The Truth** - Code isn't done until it builds and runs in Docker
2. **Git Is The Record** - Every working state gets committed
3. **Tests Are The Proof** - Tests must FAIL first (TDD), then pass
4. **CI Is The Judge** - GitHub Actions validates in a clean environment
5. **Don't Work Around Problems** - If something breaks, fix it. Don't bypass.

---

## THE RALPH DEVELOPMENT LOOP

Based on Geoffrey Huntley's Ralph pattern. For EVERY task, follow this EXACT sequence.

### Files That Persist Across Iterations

| File | Purpose |
|------|---------|
| `prd.json` | User stories with `passes: true/false` tracking |
| `progress.txt` | Append-only learnings log (never replace, always append) |
| `AGENTS.md` | Discovered patterns and codebase conventions |
| Git history | Commits from prior iterations |

### Per-Iteration Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RALPH DEVELOPMENT LOOP                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. READ STATE                                                      │
│     └─→ Read prd.json - find highest-priority story with           │
│         passes: false                                               │
│     └─→ Read progress.txt - understand learnings so far            │
│     └─→ Read AGENTS.md - understand codebase patterns              │
│                                                                     │
│  2. WRITE FAILING TEST (TDD - Red Phase)                           │
│     └─→ Create test that captures acceptance criteria              │
│     └─→ npm run test:unit -- --grep "story name"                   │
│     └─→ VERIFY test FAILS (if it passes, test is wrong)            │
│                                                                     │
│  3. IMPLEMENT (TDD - Green Phase)                                   │
│     └─→ Write minimal code to pass the test                        │
│     └─→ No over-engineering, no premature abstraction              │
│                                                                     │
│  4. ALL TESTS PASS                                                  │
│     └─→ npm test (ALL tests, not just new one)                     │
│     └─→ If fails: fix and retry                                    │
│                                                                     │
│  5. DOCKER BUILD                                                    │
│     └─→ docker compose build                                        │
│     └─→ If fails: FIX THE ISSUE (don't skip Docker)                │
│                                                                     │
│  6. DOCKER UP + HEALTH CHECK                                        │
│     └─→ docker compose up -d                                        │
│     └─→ sleep 15 (wait for startup)                                │
│     └─→ curl -f http://localhost:3000/health                       │
│     └─→ If fails: docker compose logs nwha, FIX, restart           │
│                                                                     │
│  7. E2E TEST (against running container)                            │
│     └─→ npm run test:e2e                                            │
│     └─→ If fails: fix code, restart from step 4                    │
│                                                                     │
│  8. COMMIT                                                          │
│     └─→ git add -A                                                  │
│     └─→ git commit -m "feat: [Story ID] - [Story Title]"           │
│                                                                     │
│  9. UPDATE TRACKING                                                 │
│     └─→ In prd.json: set story passes: true                        │
│     └─→ Append learnings to progress.txt                           │
│     └─→ Update AGENTS.md with any new patterns                     │
│     └─→ Commit: git commit -am "chore: mark [ID] complete"         │
│                                                                     │
│  10. CHECK COMPLETION                                               │
│      └─→ If ALL stories have passes: true                          │
│          → Output: <promise>COMPLETE</promise>                      │
│      └─→ Otherwise: continue to next story                         │
│                                                                     │
│  ITERATION LIMIT: 20 per task                                       │
│  └─→ If 20 iterations reached without success:                      │
│      → Document blockers in progress.txt                            │
│      → Request human intervention                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### CRITICAL RULES

1. **Never exit early on failure** - Keep iterating until success OR max iterations
2. **Never work around problems** - If Docker breaks, fix Docker. If tests fail, fix the code.
3. **Tests must fail first** - A test that passes on first run is suspicious
4. **Append to progress.txt, never replace** - This is your memory across iterations
5. **One story per iteration** - Focus on completing one thing before moving on

---

## Tech Stack (Non-negotiable)

- **Runtime**: Node.js 20 LTS
- **Backend**: Fastify v4
- **Database**: SQLite with better-sqlite3
- **Real-time**: Socket.io v4
- **Terminal**: xterm.js + node-pty
- **Auth**: Passport.js + GitHub OAuth (with AUTH_BYPASS for testing)
- **Frontend**: Vanilla JS + htmx + Tailwind CSS
- **AI CLI Tools** (subscription-based, NO API):
  - **Primary**: Claude CLI (`claude --dangerously-skip-permissions -p "prompt"`)
  - **Fallback**: Codex CLI (`codex -p "prompt"`) - when Claude credits exhausted
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

---

## CLI Tool Usage

NWHA uses subscription-based CLI tools, NOT API calls.

### Claude CLI (Primary)
```bash
# Autonomous mode (no confirmations)
claude --dangerously-skip-permissions -p "Your prompt here"

# With file context
claude --dangerously-skip-permissions -p "Fix the bug in src/server.js"
```

### Codex CLI (Fallback)
```bash
# Used when Claude credits exhausted or for Codex-specific strengths
codex -p "Your prompt here"
```

### Fallback Logic
1. Try Claude CLI first
2. If Claude returns rate limit or credit errors, switch to Codex
3. Log the fallback in progress.txt for visibility

---

## prd.json Structure

```json
{
  "project": "nwha",
  "branchName": "main",
  "description": "AI-powered autonomous development orchestrator",
  "userStories": [
    {
      "id": "NWHA-001",
      "title": "Health endpoint returns 200",
      "description": "As a user, I want the /health endpoint to return 200 so I can verify the server is running",
      "acceptanceCriteria": [
        "GET /health returns 200 status",
        "Response includes { status: 'ok' }",
        "Response time < 100ms"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

---

## Success Criteria

The project is **DONE** when:

1. All stories in prd.json have `passes: true`
2. All tests pass (unit, integration, E2E)
3. Docker container builds and runs
4. /health returns 200
5. GitHub Actions CI passes
6. v1.0.0 tag created and pushed
7. Container is running at http://localhost:3000

## EXIT SIGNAL

When ALL criteria above are met, output:

```
<promise>COMPLETE</promise>
```

**DO NOT output this signal until ALL stories pass and the container is running.**

---

## Quick Reference Commands

```bash
# Preflight check
npm run preflight

# Testing
npm test                    # Unit + Integration
npm run test:e2e           # E2E (container must be running)
npm run test:all           # Everything

# Docker
npm run docker:build       # Build image
npm run docker:up          # Start container
npm run docker:logs        # View logs
npm run docker:health      # Health check
npm run docker:down        # Stop

# Development
npm run dev                # Watch mode
npm run lint              # Lint check
```
