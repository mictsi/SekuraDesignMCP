# Sekura Design MCP

A dockerized [Model Context Protocol](https://modelcontextprotocol.io) server that
serves the complete **Sekura Design System** — tokens, components, layouts, UX
patterns, accessibility contract and paste-ready code — to any MCP-capable tool.

Point an agent at it and it can build a correct, accessible, dark-mode-first
interface without guessing at a single value.

```
55 components · 15 foundations · 15 UX patterns · 9 layout recipes
120 semantic tokens · 4 themes · 3 densities · 8 target frameworks
344 contrast checks · 45 colour · 63 behaviour · 73 RTL · 0 axe violations
```

The human-readable specification is [`DESIGN.md`](./DESIGN.md), and there is an
81-page [documentation site](./sample) — generated from the same data — that
explains it with live demos, a full colour guide and worked examples.

---

## Quickest start

```bash
./run.sh start-build
```

Builds everything — TypeScript, contrast audit, CSS lint, stylesheets, the
documentation site and the Docker image — then starts the MCP server on `:8080`
and the docs on `:4173`.

```
./run.sh build          Compile, run gates, emit CSS, build the docs and the image
./run.sh start          Start the MCP server and the documentation site
./run.sh start-build    Build, then start
./run.sh restart        Stop, then start
./run.sh stop           Stop everything
./run.sh logs [target]  Follow logs            (target: server | sample)
./run.sh status         What is running, plus a live contrast-audit check
./run.sh verify         Run every gate without starting anything
./run.sh clean [--all]  Remove build output, container and image
./run.sh help
```

The MCP server runs in Docker when Docker is available and falls back to a local
Node process when it is not, so the script behaves the same either way. Ports and
image names are overridable: `SEKURA_PORT`, `SAMPLE_PORT`, `SEKURA_IMAGE`,
`SEKURA_CONTAINER`.

`./run.sh status` is a real check rather than a liveness ping — `/health`
re-runs the full contrast audit, so a server quietly using a broken palette
reports it.

---

## The documentation site

```bash
./run.sh start-build          # then open http://localhost:4173
```

An 81-page documentation site — explanations, a full colour guide, a type
specimen, live demos, a complete component reference and six worked examples.

**It is generated from the design system's own data**, so the colour guide shows
genuinely audited contrast values and the component pages show the same
specification the MCP server serves. The docs cannot drift from the system they
document.

| | |
|---|---|
| `color.html` | Every ramp step with its contrast against white *and* black, all 120 semantic tokens in four themes, and the full 86-pairing contrast contract with measured ratios |
| `dark-mode.html` | The elevation inversion, demonstrated with the same markup under both themes side by side — plus the nine things that break silently |
| `layout.html` | Flex-first, with **resizable** demos that reflow on container width |
| `tokens.html` | Filterable reference for every token |
| `component-*.html` | One page per component: anatomy, states, dark-mode note, full keyboard and ARIA contract |

See [`sample/README.md`](./sample/README.md) for what to try.

---

## Quick start

### Docker (recommended)

```bash
docker compose up -d
curl http://localhost:8080/health
```

Or without compose:

```bash
docker build -t sekura-design-mcp .
docker run -d -p 8080:8080 --name sekura sekura-design-mcp
```

The build runs the contrast audit and the full smoke test. **An image whose palette
breaks a declared WCAG pairing does not get built.**

### Local

```bash
npm install
npm run build
npm start              # stdio
npm run start:http     # HTTP on :8080
```

---

## Connecting a client

### Claude Code / Claude Desktop — HTTP

```json
{
  "mcpServers": {
    "sekura-design": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### Claude Code — one-liner

```bash
claude mcp add --transport http sekura-design http://localhost:8080/mcp
```

### OpenAI Codex

Codex reads MCP servers from `~/.codex/config.toml`. Add a `[mcp_servers.<name>]`
table:

```toml
# ~/.codex/config.toml

[mcp_servers.sekura-design]
command = "docker"
args = ["run", "-i", "--rm", "-e", "SEKURA_MCP_TRANSPORT=stdio", "sekura-design-mcp:1.0.0"]

# The first call builds a 5,900-line overview, so allow a little headroom.
startup_timeout_sec = 30
tool_timeout_sec = 60
```

Without Docker, point it at the built server directly:

```toml
[mcp_servers.sekura-design]
command = "node"
args = ["/absolute/path/to/SekuraDesignMCP/dist/index.js"]
```

Recent Codex versions can add it for you:

```bash
codex mcp add sekura-design -- docker run -i --rm \
  -e SEKURA_MCP_TRANSPORT=stdio sekura-design-mcp:1.0.0

codex mcp list          # confirm it registered
```

Then just ask for work in design-system terms — Codex will call the tools:

```
> Build a settings page using the Sekura design system. Check the dark mode
> foundation before you write any CSS, and validate the markup when you're done.
```

**Note on transport.** stdio is the broadly supported path and is what the
examples above use. Codex's support for remote `url`-based MCP servers is newer
and has moved between releases — check `codex mcp --help` for your version before
relying on the HTTP endpoint. Everything the server exposes is available over
stdio, so nothing is lost.

**Getting good results.** The server's `instructions` already tell a client where
to start, but these help:

- Ask it to call `get_overview` first on a new task.
- For anything visual, `get_foundation({ id: "dark-mode" })` before writing CSS
  prevents the nine most common dark-mode defects.
- Ask it to finish with `validate_markup` — the linter catches missing accessible
  names and hard-coded colours that a model will otherwise leave behind.

### stdio (client spawns the container)

```json
{
  "mcpServers": {
    "sekura-design": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "SEKURA_MCP_TRANSPORT=stdio",
               "sekura-design-mcp:1.0.0"]
    }
  }
}
```

### stdio (local install)

```json
{
  "mcpServers": {
    "sekura-design": {
      "command": "node",
      "args": ["/absolute/path/to/SekuraDesignMCP/dist/index.js"]
    }
  }
}
```

---

## Tools

| Tool | Returns |
|---|---|
| `get_overview` | **Start here.** The map of everything, with the call needed to fetch each part. |
| `search` | Full-text search across components, foundations, patterns, layouts and tokens. |
| `get_foundation` | The reasoning: colour, dark mode, responsive layout, accessibility, typography, motion, i18n, theming… |
| `list_components` | The catalogue, filterable by category and maturity. |
| `get_component` | Full spec: anatomy, variants, sizes, states, props, tokens, dark-mode behaviour, complete accessibility contract, do/don't. |
| `get_component_code` | Paste-ready code in `html`, `css`, `react`, `vue`, `svelte`, `angular`, `blazor` or `web-component`. |
| `get_layout` | A complete page blueprint with markup and CSS. |
| `get_pattern` | A recurring UX problem, its solution, and the anti-patterns. |
| `get_tokens` | Resolved token values, showing all four themes side by side. |
| `export_tokens` | CSS, SCSS, W3C DTCG, Tailwind v3/v4, JS, TS, Swift, Android XML, Figma. |
| `get_primitives` | The raw colour ramps behind the semantic layer. |
| `suggest_token` | Describe an intent in words, get the right token with values per theme and *why*. |
| `check_contrast` | WCAG verdict for any pair — accepts hex or token names, resolves per theme, composites translucency. |
| `audit_theme` | Every declared pairing across every theme. The build gate. |
| `validate_markup` | Lints HTML/CSS for the failures that actually ship. |
| `get_setup` | HTML scaffold, pre-paint theme script, reset, utilities, prose, theme control. |
| `get_stylesheet` | The entire stylesheet as one file. |

### Resources

`sekura://tokens/css` · `sekura://tokens/dtcg` · `sekura://foundations/principles` ·
`sekura://foundations/dark-mode`

### Prompts

`build-page` · `review-ui` · `implement-dark-mode`

---

## HTTP endpoints

Beyond MCP, the container serves plain HTTP so a build step can consume tokens
without speaking the protocol:

| Endpoint | Purpose |
|---|---|
| `POST /mcp` | MCP streamable HTTP endpoint |
| `GET /health` | Health check — **re-runs the contrast audit**, so a container serving a broken palette reports unhealthy |
| `GET /tokens.css` | CSS custom properties, all themes and densities |
| `GET /tokens.json` | W3C Design Tokens JSON |

---

## What makes this specification unusual

**Dark mode is specified, not derived.** Every component documents what changes in
dark mode and why. The system encodes the rules most implementations get wrong:
floating surfaces get *lighter* as they rise while recessed surfaces get *darker*;
saturated fills step *up* the ramp so their labels flip to dark; borders go *darker*
on dark, not lighter; and elevation is two tokens because a drop shadow is nearly
invisible against a dark page.

`get_foundation({ id: "dark-mode" })` lists the nine failures that pass a design
review and break in production — the unstyleable Chrome autofill background, SVG
chevrons baked into data URIs, WebKit's search clear button, scrims that are too
weak on dark, and so on.

**The contrast contract is machine-verified.** 73 declared pairings × 4 themes = 292
checks, run on every build and by the container's health check. Two neutral steps
are pinned by contrast rather than by eye: `neutral-400` is the lightest grey
clearing 3:1 on white, and `neutral-500` the lightest clearing 4.5:1 on the subtle
surface. Moving either lighter breaks a promise, and the audit catches it.

Sekura exceeds WCAG in three places where products commonly fail: placeholder text
and tertiary text are both held to full body contrast, and switch and progress
tracks are treated as meaningful graphics rather than decoration.

**Layout is flex-first.** Composition primitives wrap rather than overflow, children
declare `flex` explicitly, text-bearing flex children set `min-inline-size: 0`, and
widths are `flex-basis` (an ideal) rather than `width` (a demand). Most layouts
therefore respond to their **container** and need no media query — including the
two-column `sidebar-layout`, which stacks purely through flex wrapping.

---

## Example session

```
> get_overview
  → the full map

> get_foundation({ id: "dark-mode" })
  → the nine silent failures, the elevation inversion, theme-switching rules

> get_layout({ id: "list-page" })
  → regions, responsive strategy, a11y obligations, markup + CSS

> get_component({ id: "table" })
  → 6 variants, 6 states, full keyboard model, and why row separators
    go DARKER in dark mode

> get_component_code({ id: "table", framework: "react" })
  → typed component forwarding the required ARIA attributes

> suggest_token({ intent: "border around a card in dark mode" })
  → --sk-color-border-default, values per theme, and why

> check_contrast({ foreground: "#8590a3", background: "#ffffff", use: "ui-component" })
  → 3.22:1 — AA pass for control boundaries

> validate_markup({ markup: "<button><svg/></button>" })
  → ❌ button-accessible-name, with the fix and the WCAG criterion

> audit_theme
  → 292/292 pairings satisfied across all four themes
```

---

## CI and releases

Two workflows in `.github/workflows/`.

**`ci.yml`** runs on every push and pull request. Each step is a gate that exits
non-zero, so a change that breaks a promise cannot merge green:

| Gate | Checks |
|---|---|
| `check:version` | No version literal has drifted from `package.json` |
| `check:deps` | No pre-release dependencies; every Node reference an LTS line |
| `check:env` | `.env.example` documents every setting, and only real ones |
| `audit:contrast` | 344 checks — 86 declared pairings across four themes |
| `lint:css` | Structure, tokens only, no physical properties |
| `smoke` | Every MCP tool, component, framework and export format |
| `test:color` | Colour maths against WCAG reference values |
| `test:urls` | Path prefixes and proxy headers resolve to reachable URLs |
| `test:behaviours` | Real key presses in a browser: focus, ARIA, Escape, inert |
| `test:rtl` | Nothing clipped in either direction, at three widths, 12 pages |
| `verify:sample` | Dangling references, broken links, markup lint |
| `test:a11y` | axe-core, WCAG 2.2 AA, both themes |
| Docker | Image builds, `/health` re-runs the contrast audit inside it |

**`release.yml`** runs on a `v*` tag and publishes artifacts.

```bash
npm version minor          # bumps package.json; everything else derives from it
git push --follow-tags
```

The workflow **refuses to release if the tag disagrees with `package.json`** —
otherwise you ship artifacts labelled one version and containing another. It then
runs the full gate chain again (a release cannot skip checks) and publishes:

| Artifact | Use |
|---|---|
| `sekura-<v>.css` | The whole stylesheet, one file |
| `tokens-<v>.css` | Custom properties only, all themes and densities |
| `tokens-<v>.dtcg.json` | W3C Design Tokens format |
| `sekura-behaviours-<v>.iife.min.js` | Drop-in `<script>`, global `Sekura` |
| `sekura-behaviours-<v>.esm.min.js` | ES module for bundlers |
| `sekura-css-<v>.zip` | Per-component CSS, Tailwind, Swift, Android |
| `sekura-docs-<v>.zip` | The documentation site, hostable anywhere |
| `SHA256SUMS.txt` | Checksums |

Plus a multi-arch image to GHCR, tagged `1.2.3`, `1.2`, `1` and `latest`:

```bash
docker run -d -p 8080:8080 ghcr.io/mictsi/sekuradesignmcp:1.0.0
```

and the documentation site to GitHub Pages.

### Versioning

`package.json` is the single source of truth. The server, docs site, behaviours
bundle and container tag all derive from it — `check:version` fails the build if
a literal creeps back in.

A **major** bump is required for anything that breaks consumers silently:
renaming a semantic token or component class, changing a keyboard contract,
removing an MCP tool, or changing the focus ring or spacing scale. Changing a
*primitive* value is a minor bump, because the semantic layer absorbs it and the
contrast audit proves nothing regressed. See [`CHANGELOG.md`](./CHANGELOG.md).

---

## Development

```bash
npm run verify          # everything below, in order
npm run build           # compile
npm run check:version   # no version literal has drifted
npm run check:deps      # dependency policy: stable releases, Node LTS only
npm run check:env       # .env.example matches what the code actually reads
npm run test:color      # colour maths vs WCAG reference values
npm run test:urls       # URL generation under prefixes and reverse proxies
npm run audit:contrast  # 344 contrast checks — build gate
npm run lint:css        # structural CSS lint over all 67 stylesheets
npm run smoke           # 704 checks across every tool, component and export
npm run emit:css        # write dist-css/ — 66 files, sekura.css is ~190 KB
npm run site:build      # regenerate the 81-page documentation site
npm run verify:sample   # lint every page against the design system itself
```

`lint:css` exists because component CSS is a string as far as the TypeScript
compiler is concerned. It checks for unbalanced braces, selectors running into
at-rules, hard-coded colours, unknown tokens and physical properties — it was
added after building the sample surfaced an invalid selector in the dialog
stylesheet that had shipped unnoticed.

`npm run emit:css` produces standalone artefacts for consuming Sekura as plain
files: `sekura.css` (everything), `tokens.css`, `tokens.dtcg.json`,
`tailwind.config.js`, `SekuraColor.swift`, `android-resources.xml`,
`tokens.figma.json`, and per-component CSS.

### Layout

```
src/
├── index.ts              entry, transport selection
├── server.ts             MCP server: 17 tools, 4 resources, 3 prompts
├── http.ts               streamable HTTP transport, health, plain-HTTP token endpoints
├── site/                 documentation site generator
│   ├── shell.ts          page shell, navigation, reusable doc blocks
│   └── pages.ts          every page, built from the data below
├── data/
│   ├── primitives.ts     ramps, scales, type scale, elevation, motion, breakpoints
│   ├── semantic.ts       120 tokens × 4 themes + the contrast contract
│   ├── tokens.ts         resolution and audit
│   ├── base-css.ts       reset, utilities, prose, theme runtime
│   ├── foundations.ts    15 foundation documents
│   ├── layouts.ts        9 page recipes
│   ├── patterns.ts       15 UX patterns
│   └── components/       55 component specifications
└── lib/
    ├── color.ts          WCAG luminance, contrast, compositing
    ├── exporters.ts      11 output formats
    ├── codegen.ts        8 target frameworks
    ├── validate.ts       markup linting
    ├── markdown.ts       minimal renderer for the foundation documents
    ├── suggest.ts        intent → token
    └── search.ts         weighted full-text search
```

### Settings

Every setting, with what it does and when you would change it, is documented in
[`.env.example`](./.env.example) — including the path variables this section
used to omit. See [Configuration](#configuration) for how to use the file.

A second list here would drift from that one, which is the failure
`npm run check:env` exists to prevent.

---

## Notes

The HTTP server is **stateless** — a fresh server per request, no sessions to lose.
The design system is read-only at runtime, so the container runs unprivileged with a
read-only filesystem and all capabilities dropped.

## Supported runtimes

Node **22 (Jod)** and **24 (Krypton)** — the two Node LTS lines currently in
support. The container builds on 24; CI runs every gate on both, so
`engines: >=22` is a verified claim rather than an aspiration.

Odd-numbered Node majors are never promoted to LTS, so a dependency bot
offering `node:25-alpine` is offering a runtime that reaches end-of-life in
months. `npm run check:deps` fails the build if one lands.

## Configuration

Every container setting lives in one file.

```bash
cp .env.example .env      # then edit .env, which is gitignored
```

`docker compose up`, `./run.sh start` and `docker run --env-file .env` all read
it, so there is a single place to look when a deployment misbehaves. Anything
already exported wins, so `SEKURA_PORT=9000 ./run.sh start` still works for a
one-off.

`npm run check:env` fails the build if the code reads a setting `.env.example`
does not document, or documents one nothing reads — a setting someone will set,
restart for, and watch do nothing is worse than an undocumented one. It also
rejects quoted values, because `docker run --env-file` keeps the quotes as part
of the value while Compose strips them.

## Publishing under a path

**The MCP endpoint, the health check and the documentation site are served from
one port under one path prefix.** There is no second port and no second server:

```
http://host:8080/<app_path>/mcp        MCP, POST
http://host:8080/<app_path>/health     health
http://host:8080/<app_path>/docs/      documentation site
```

The image serves at the root by default. To publish it under a path on an
existing web server — `https://example.com/design-system/` — you need to know
which of two things your proxy does, because they need different settings.

| Variable | Answers |
|---|---|
| `SEKURA_BASE_PATH` | *Where does this process listen?* |
| `SEKURA_EXTERNAL_URL` | *What does the outside world see?* |

They are equal in the simple case and different in the common one, which is why
they are two variables rather than one.

**If the proxy passes the prefix through**, the app has to answer on
`/design-system/health`:

```nginx
location /design-system/ {
    proxy_pass http://app:8080/design-system/;   # prefix kept
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
```bash
docker run -d -p 8080:8080 -e SEKURA_BASE_PATH=/design-system sekura-design-mcp:1.0.0
```

**If the proxy strips the prefix**, the app still listens at the root but has no
way to discover what was removed, so it must be told:

```nginx
location /design-system/ {
    proxy_pass http://app:8080/;                 # prefix stripped
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
```bash
docker run -d -p 8080:8080 \
  -e SEKURA_EXTERNAL_URL=https://example.com/design-system \
  sekura-design-mcp:1.0.0
```

**With Traefik or ingress-nginx, neither is needed.** `X-Forwarded-Prefix` is
honoured automatically. Set `SEKURA_TRUST_PROXY=false` if the container is
exposed directly to the internet, so a forged `X-Forwarded-Host` cannot rewrite
the links it hands out.

### What gets published

Every path below is relative to the mount point.

| Path | What |
|---|---|
| `/mcp` | MCP endpoint (POST). Rename with `SEKURA_MCP_PATH` |
| `/health` | Liveness, and the contrast audit re-run inside the container |
| `/manifest.json` | **Every URL above and below, as JSON** |
| `/tokens.css` | Custom properties, all themes and densities |
| `/tokens.json` | W3C DTCG format |
| `/css/sekura.css` | The complete stylesheet; `/css/` also has per-component files |
| `/js/sekura.iife.min.js` | Behaviours, drop-in `<script>`; `.esm.min.js` alongside |
| `/docs/` | The 85-page documentation site |

Do not assemble those paths by hand from a base you assume. Fetch
`/manifest.json`, or call the `get_endpoints` MCP tool — only the server knows
what prefix it is actually reachable on, and both report the real URLs including
anything a proxy rewrote.

```bash
curl -s https://example.com/design-system/manifest.json | jq .artefacts.stylesheet.url
# "https://example.com/design-system/css/sekura.css"
```

The documentation site uses relative links throughout, so it is portable to any
prefix with no rebuild.

## Licence

MIT — see [`LICENSE`](./LICENSE).

Contributing: [`CONTRIBUTING.md`](./CONTRIBUTING.md) · Security: [`SECURITY.md`](./SECURITY.md) · Changes: [`CHANGELOG.md`](./CHANGELOG.md)
