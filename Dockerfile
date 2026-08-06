# syntax=docker/dockerfile:1

# ---------- Build ----------
# Node 24 "Krypton" is the active LTS line. Only even-numbered majors are ever
# promoted to LTS, so an automated bump to an odd major (25, 27) must be
# rejected — `npm run check:deps` fails the build if one lands.
FROM node:24-alpine AS build

WORKDIR /app

# Copy manifests first so the dependency layer caches independently of source.
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.behaviours.json ./
COPY src ./src
COPY sample ./sample
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

# The behaviours bundle and the documentation site are published by the running
# container too, so they are built here rather than expected from the host.
RUN npm run build:behaviours && node dist/scripts/build-site.js

# Drop dev dependencies from the tree we are about to copy forward.
RUN npm prune --omit=dev


# ---------- Runtime ----------
FROM node:24-alpine AS runtime

# dumb-init gives us correct signal forwarding, so SIGTERM reaches Node and the
# graceful shutdown handler actually runs.
RUN apk add --no-cache dumb-init

# SEKURA_BASE_PATH  — path prefix this process listens under, e.g. /design-system.
#                     Set it when the proxy passes the prefix through.
# SEKURA_EXTERNAL_URL — public base URL used to generate links, e.g.
#                     https://example.com/design-system. Set it when the proxy
#                     strips the prefix, because the container cannot infer what
#                     it was. Left unset, links are derived from X-Forwarded-*.
ENV NODE_ENV=production \
    SEKURA_MCP_TRANSPORT=http \
    PORT=8080 \
    HOST=0.0.0.0 \
    SEKURA_MCP_PATH=/mcp \
    SEKURA_BASE_PATH=/ \
    SEKURA_EXTERNAL_URL= \
    SEKURA_TRUST_PROXY=true

WORKDIR /app

# node:alpine already provides an unprivileged `node` user (uid 1000).
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-css ./dist-css
COPY --from=build --chown=node:node /app/dist-js ./dist-js
COPY --from=build --chown=node:node /app/sample ./sample
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 8080

# /health re-runs the contrast audit, so a container serving a broken palette
# reports unhealthy rather than quietly serving it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const b=(process.env.SEKURA_BASE_PATH||'').replace(/\/+$/,'');fetch('http://127.0.0.1:'+(process.env.PORT||8080)+b+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# One image, both transports. HTTP is the default so the container is useful with
# `docker run -p`; clients that spawn the server directly override the env var:
#
#   docker run -i --rm -e SEKURA_MCP_TRANSPORT=stdio sekura-design-mcp:1.0.0
#
# `runtime` is deliberately the final stage, so a bare `docker build` produces the
# servable image rather than a variant.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
