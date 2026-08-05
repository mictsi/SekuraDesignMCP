# syntax=docker/dockerfile:1

# ---------- Build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy manifests first so the dependency layer caches independently of source.
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# The contrast audit is a build gate, not a report. An image whose palette breaks
# a declared WCAG pairing does not get built.
RUN node dist/scripts/audit-contrast.js

# Component CSS is a string as far as the compiler is concerned, so it gets its
# own structural check: balanced braces, no selector running into an at-rule, no
# hard-coded colours, no unknown tokens, no physical properties.
RUN node dist/scripts/lint-css.js

# Exercise every tool through a real MCP client before shipping the image.
RUN node dist/scripts/smoke.js

# Emit the standalone CSS artefacts so they can be served over plain HTTP.
RUN node dist/scripts/emit-css.js

# Drop dev dependencies from the tree we are about to copy forward.
RUN npm prune --omit=dev


# ---------- Runtime ----------
FROM node:22-alpine AS runtime

# dumb-init gives us correct signal forwarding, so SIGTERM reaches Node and the
# graceful shutdown handler actually runs.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    SEKURA_MCP_TRANSPORT=http \
    PORT=8080 \
    HOST=0.0.0.0 \
    SEKURA_MCP_PATH=/mcp

WORKDIR /app

# node:alpine already provides an unprivileged `node` user (uid 1000).
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-css ./dist-css
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 8080

# /health re-runs the contrast audit, so a container serving a broken palette
# reports unhealthy rather than quietly serving it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# One image, both transports. HTTP is the default so the container is useful with
# `docker run -p`; clients that spawn the server directly override the env var:
#
#   docker run -i --rm -e SEKURA_MCP_TRANSPORT=stdio sekura-design-mcp:1.0.0
#
# `runtime` is deliberately the final stage, so a bare `docker build` produces the
# servable image rather than a variant.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
