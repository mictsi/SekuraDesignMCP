# Dependency baseline for Sekura 3.2.2

Reviewed on **6 November 2026**. Use `npm ci` to reproduce this release's
`package-lock.json`. This record describes the checked dependency tree;
future registry releases require a new review.

## Selection policy

- Keep the reviewed Node 24 LTS runtime on its latest patch; Node 22 remains
  covered by the existing CI matrix. Node 26 has entered LTS, but adopting that
  runtime major requires a separate compatibility review.
- Use Angular's newest LTS line, currently 21; keep its packages aligned.
- Use the latest stable releases for other packages within the supported lines.
  Exclude prereleases and keep compiler/runtime pairs aligned.
- Refresh transitive dependencies through their parents' supported ranges.
  This update needs no overrides or forced major upgrades.

Docker and `.nvmrc` pin **Node 24.22.2**, the latest Node 24 patch on the review
date. This retains the CVE-2026-111497 Brotli fix first shipped in 24.22.1.
Node 22 consumers need at least 22.23.4 for that fix. CI's major selectors obtain
the latest patch on each tested line. See the
[Node 24 release notes](https://nodejs.org/en/blog/release/v24.22.2),
[security advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
and [release schedule](https://nodejs.org/en/about/previous-releases).
Angular 21 remains LTS while Angular 22 is active; see the
[Angular support table](https://angular.dev/reference/releases).

## Security findings and Dependabot

The update incorporates all six open Dependabot proposals reviewed on this date:
[#26 MCP SDK](https://github.com/mictsi/SekuraDesignMCP/pull/26),
[#27 fast-uri](https://github.com/mictsi/SekuraDesignMCP/pull/27),
[#28 body-parser](https://github.com/mictsi/SekuraDesignMCP/pull/28),
[#29 Node](https://github.com/mictsi/SekuraDesignMCP/pull/29),
[#30 Svelte](https://github.com/mictsi/SekuraDesignMCP/pull/30) and
[#31 parse5](https://github.com/mictsi/SekuraDesignMCP/pull/31).
Other compatible direct and transitive updates are included in the lockfile.

Before updating, npm audit reported two affected packages (one high, one moderate):

| Package | Previous | Fixed | Advisory |
|---|---|---|---|
| body-parser | 2.3.0 | 2.4.0 | [Compressed-request denial of service](https://github.com/advisories/GHSA-27r3-jxmh-p828) |
| fast-uri | 3.1.8 | 3.1.9 | [Scheme spoofing](https://github.com/advisories/GHSA-w74x-v6f9-j3xg), [path equivalence](https://github.com/advisories/GHSA-xhq7-xmqj-769h), [host confusion](https://github.com/advisories/GHSA-wjr9-j795-jxcr), [scheme injection](https://github.com/advisories/GHSA-333x-w4r6-6crp) |

The updated full dependency tree reports **zero npm audit vulnerabilities**.
The connected GitHub tool supports PR and public advisory inspection but rejects
repository Dependabot-alert and code-scanning endpoints. Those private alert
inventories could not be read; this audit result does not certify their state.
No open public repository issues were returned during the review.

## Direct package versions

All 23 direct packages were checked against registry metadata. Packages already
at their selected stable/LTS release remain unchanged. Node type declarations
continue to match the shipped runtime major.

| Package | Previous resolved | 3.2.2 resolved | Channel |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | `1.32.1` | `1.32.2` | Stable |
| `express` | `5.3.0` | `5.3.0` | Stable |
| `parse5` | `8.0.1` | `8.1.0` | Stable |
| `zod` | `4.6.7` | `4.6.7` | Stable |
| `@angular/common` | `21.2.25` | `21.2.26` | LTS 21 |
| `@angular/compiler` | `21.2.25` | `21.2.26` | LTS 21 |
| `@angular/core` | `21.2.25` | `21.2.26` | LTS 21 |
| `@angular/platform-browser` | `21.2.25` | `21.2.26` | LTS 21 |
| `@angular/platform-server` | `21.2.25` | `21.2.26` | LTS 21 |
| `@figma/plugin-typings` | `1.142.0` | `1.142.0` | Stable |
| `@types/express` | `5.0.6` | `5.0.6` | Stable |
| `@types/node` | `24.19.2` | `24.19.2` | Node 24 types |
| `@types/react` | `19.3.0` | `19.3.0` | Stable |
| `@types/react-dom` | `19.3.0` | `19.3.0` | Stable |
| `@vue/compiler-sfc` | `3.5.44` | `3.5.45` | Stable |
| `axe-core` | `4.14.0` | `4.14.0` | Stable |
| `esbuild` | `0.28.2` | `0.28.2` | Stable |
| `playwright-core` | `1.64.1` | `1.65.0` | Stable |
| `react` | `19.3.1` | `19.3.1` | Stable |
| `react-dom` | `19.3.1` | `19.3.1` | Stable |
| `svelte` | `5.57.2` | `5.57.3` | Stable |
| `typescript` | `7.0.2` | `7.0.2` | Stable |
| `vue` | `3.5.44` | `3.5.45` | Stable |

Metadata comes from `https://registry.npmjs.org/<package>` and `npm outdated`;
Angular uses `v21-lts` and Node types stay on 24. A major-version difference for
those two selections is intentional.

## Apply the runtime update

Compose refreshes base images during builds. Rebuild and recreate existing
containers to replace their Node binary:

```bash
docker compose build --pull
docker compose up -d --force-recreate
docker compose exec sekura-design-mcp node --version
```

The final command should report `v24.22.2`. Published application images also
need rebuilding before deployment. Updating this source does not replace an
already running container.

## Consumer toolchains

The repository's TypeScript 7 compiler builds its server, controllers and
framework-recipe fixtures. It does **not** prescribe the compiler version for
every consuming framework application. In particular, Angular 21 applications
must use the TypeScript range in the
[Angular compatibility matrix](https://angular.dev/reference/versions):
TypeScript 5.9, below 6.0. The repository checks Angular template parsing, TypeScript recipe wrappers and
an actual Angular server render plus browser hydration. It does not run a full
Angular `ngc` application build for every generated recipe.

Generated `@sekura/behaviours` remains dependency-free. Generated `@sekura/react`
keeps its existing supported React peer range; its build and browser checks use
the selected React release above. Both artifacts take their package version from
the root 3.2.2 manifest.

The 14 GitHub Actions used by CI and release workflows were checked against
their upstream releases on 6 November 2026. Existing major-version references
already select the current stable major; no workflow changes were required.
The 3.1 update moved `actions/setup-dotnet` from v4 to
[v6](https://github.com/actions/setup-dotnet/releases/tag/v6.0.0). The .NET
validation target remains the LTS 10.0 line. Hosted GitHub runners satisfy the
updated action runtime; self-hosted runners must meet the action's documented
runner requirements.

## Reproduce and review an update

```bash
nvm install
nvm use
npm ci
npm run build
npm run check:deps
npm ls --all
npm audit
```

`check:deps` rejects prerelease dependencies in declarations and the lockfile,
checks the reviewed Node LTS window and Angular LTS line, and checks runtime/action
references. Runtime Node checks exclude `@types/node` metadata; type packages do
not add a runtime major to the supported-node matrix. It is an offline policy gate; it does not query upstream to certify
that versions are still the newest. Recheck the official support schedules before
changing its explicit LTS window.

After dependency updates, install the browser revisions required by the resolved
Playwright package, then run `npm run verify` with the .NET 10 SDK and browser
system libraries available. The lockfile, package declarations, runtime pins and
generated release assets belong in the same reviewed change.
