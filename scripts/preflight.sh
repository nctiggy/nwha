#!/bin/bash
# NWHA Preflight Check
# Run this before first docker compose up to validate environment
# Usage: ./scripts/preflight.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "========================================"
echo "NWHA Preflight Check"
echo "========================================"
echo ""

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# ===========================================
# 1. Check .env file exists
# ===========================================
echo "Checking configuration..."

if [ -f ".env" ]; then
    check_pass ".env file exists"
    source .env
else
    check_fail ".env file not found. Copy .env.example to .env and configure it."
fi

# ===========================================
# 2. Check required environment variables
# ===========================================
echo ""
echo "Checking environment variables..."

# Session secret
if [ -n "$SESSION_SECRET" ] && [ "$SESSION_SECRET" != "change_this_to_random_string" ]; then
    check_pass "SESSION_SECRET is set"
else
    check_fail "SESSION_SECRET not set or using default. Generate with: openssl rand -hex 32"
fi

# Auth bypass or GitHub OAuth
if [ "$AUTH_BYPASS" = "true" ]; then
    check_warn "AUTH_BYPASS=true - GitHub OAuth disabled (testing mode)"
else
    if [ -n "$GITHUB_CLIENT_ID" ] && [ "$GITHUB_CLIENT_ID" != "your_github_client_id" ]; then
        check_pass "GITHUB_CLIENT_ID is set"
    else
        check_fail "GITHUB_CLIENT_ID not set. Create OAuth app at https://github.com/settings/developers"
    fi

    if [ -n "$GITHUB_CLIENT_SECRET" ] && [ "$GITHUB_CLIENT_SECRET" != "your_github_client_secret" ]; then
        check_pass "GITHUB_CLIENT_SECRET is set"
    else
        check_fail "GITHUB_CLIENT_SECRET not set"
    fi
fi

# ===========================================
# 3. Check CLI Tools Credentials
# ===========================================
echo ""
echo "Checking CLI credentials (subscription-based, NO API)..."

# Claude CLI credentials
CLAUDE_CREDS="$HOME/.claude"
CLAUDE_CREDS_FILE="$HOME/.claude/.credentials.json"
HAS_CLAUDE=false

if [ -d "$CLAUDE_CREDS" ]; then
    if [ -f "$CLAUDE_CREDS_FILE" ]; then
        check_pass "Claude CLI credentials found at $CLAUDE_CREDS_FILE"
        HAS_CLAUDE=true
    else
        check_warn "Claude directory exists but no credentials. Run: claude --dangerously-skip-permissions"
    fi
else
    check_warn "Claude CLI not configured. Run: claude --dangerously-skip-permissions"
fi

# Codex CLI credentials
CODEX_CREDS="$HOME/.codex"
HAS_CODEX=false

if [ -d "$CODEX_CREDS" ]; then
    check_pass "Codex CLI credentials found at $CODEX_CREDS"
    HAS_CODEX=true
else
    check_warn "Codex CLI not configured. Run: codex (to authenticate)"
fi

# At least one CLI must be available
if [ "$HAS_CLAUDE" = false ] && [ "$HAS_CODEX" = false ]; then
    check_fail "No CLI credentials found. At least one of Claude or Codex must be configured."
    echo "         Claude: Run 'claude --dangerously-skip-permissions'"
    echo "         Codex: Run 'codex' and follow prompts"
fi

# Check CLI_PRIMARY setting
if [ -n "$CLI_PRIMARY" ]; then
    if [ "$CLI_PRIMARY" = "claude" ] && [ "$HAS_CLAUDE" = false ]; then
        check_warn "CLI_PRIMARY=claude but Claude credentials not found"
    elif [ "$CLI_PRIMARY" = "codex" ] && [ "$HAS_CODEX" = false ]; then
        check_warn "CLI_PRIMARY=codex but Codex credentials not found"
    else
        check_pass "CLI_PRIMARY=$CLI_PRIMARY"
    fi
fi

# ===========================================
# 4. Check Docker
# ===========================================
echo ""
echo "Checking Docker..."

if command -v docker &> /dev/null; then
    check_pass "Docker is installed"

    if docker info &> /dev/null; then
        check_pass "Docker daemon is running"
    else
        check_fail "Docker daemon is not running. Start Docker Desktop or docker service."
    fi
else
    check_fail "Docker is not installed"
fi

if command -v docker compose &> /dev/null; then
    check_pass "Docker Compose is available"
else
    check_warn "docker compose not found (trying docker-compose)"
    if command -v docker-compose &> /dev/null; then
        check_pass "docker-compose is available"
    else
        check_fail "Docker Compose is not installed"
    fi
fi

# ===========================================
# 5. Check Node.js (for local development)
# ===========================================
echo ""
echo "Checking local development tools..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        check_pass "Node.js $(node -v) (>= 20 required)"
    else
        check_warn "Node.js $(node -v) - version 20+ recommended"
    fi
else
    check_warn "Node.js not installed locally (only needed for local dev, not Docker)"
fi

if command -v npm &> /dev/null; then
    check_pass "npm $(npm -v)"
else
    check_warn "npm not installed locally"
fi

# Check local CLI installations
if command -v claude &> /dev/null; then
    check_pass "Claude CLI installed locally"
else
    check_warn "Claude CLI not installed locally (will use Docker-installed version)"
fi

if command -v codex &> /dev/null; then
    check_pass "Codex CLI installed locally"
else
    check_warn "Codex CLI not installed locally (will use Docker-installed version)"
fi

# ===========================================
# 6. Check Git
# ===========================================
echo ""
echo "Checking Git..."

if command -v git &> /dev/null; then
    check_pass "Git is installed"
else
    check_fail "Git is not installed"
fi

if command -v gh &> /dev/null; then
    check_pass "GitHub CLI (gh) is installed"
    if gh auth status &> /dev/null; then
        check_pass "GitHub CLI is authenticated"
    else
        check_warn "GitHub CLI not authenticated. Run: gh auth login"
    fi
else
    check_warn "GitHub CLI (gh) not installed - needed for CI verification"
fi

# ===========================================
# Summary
# ===========================================
echo ""
echo "========================================"
echo "Summary"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Ready to run:${NC}"
    echo "  docker compose up -d"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}$WARNINGS warning(s) found. You can proceed, but review warnings above.${NC}"
    echo ""
    echo "To start:"
    echo "  docker compose up -d"
else
    echo -e "${RED}$ERRORS error(s) found. Please fix before proceeding.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Also: $WARNINGS warning(s)${NC}"
    fi
    exit 1
fi
