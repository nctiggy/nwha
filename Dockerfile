# NWHA Dockerfile - Multi-stage build
# =============================================================================

# Stage 1: Build app dependencies
FROM node:20-alpine AS builder

# Build tools for native modules (better-sqlite3, node-pty)
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build CSS
COPY . .
RUN npm run build:css 2>/dev/null || true

# Prune dev dependencies
RUN npm prune --production

# =============================================================================
# Stage 2: Production
FROM node:20-alpine

# Install runtime dependencies + build tools (needed for CLI native modules)
RUN apk add --no-cache \
    bash \
    tini \
    wget \
    git \
    jq \
    curl \
    python3 \
    make \
    g++

# Install CLI tools globally (subscription-based, NO API)
# - Claude CLI: Primary tool for autonomous development
# - Codex CLI: Fallback when Claude credits exhausted
RUN npm install -g @anthropic-ai/claude-code @openai/codex && \
    npm cache clean --force

# Create app user (may already exist in node image)
RUN addgroup -g 1000 node 2>/dev/null || true && \
    adduser -u 1000 -G node -s /bin/bash -D node 2>/dev/null || true

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts ./scripts

# Create data directories and CLI config dirs
RUN mkdir -p /app/data /app/projects /home/node/.claude /home/node/.codex && \
    chown -R node:node /app/data /app/projects /home/node/.claude /home/node/.codex

# Make scripts executable
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true

USER node
ENV HOME=/home/node
ENV PATH="/home/node/.npm-global/bin:$PATH"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
