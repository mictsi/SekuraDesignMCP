# Dependency baseline for Sekura 3.1.0

Reviewed on **17 October 2026**. Use `npm ci` to reproduce this release's
`package-lock.json`; the versions below describe that release baseline, not a
promise that an unbounded future install will select the same versions.

## Selection policy

- Use the newest supported **LTS line** where upstream publishes an LTS policy.
  Node uses 24.22.0; Angular uses the latest patch on its LTS 21 line.
- Use the newest **stable release** for packages without a separate LTS channel.
  Exclude alpha, beta, RC, canary, experimental and nightly releases.
- Keep related runtime/compiler packages aligned: React with React DOM, Vue
  with its SFC compiler, and Angular core with its compiler.
- Update compatible transitive dependencies through their parents' supported
  ranges. Do not force unrelated transitive major versions with overrides.

Node 24.22.0 is pinned in `.nvmrc` and both Docker stages. Node 22 remains a
supported maintenance-LTS runtime in the existing CI matrix; `@types/node`
tracks the build's Node 24 API. Node 26 was still Current on the review date.
See the [Node release schedule](https://nodejs.org/en/about/previous-releases)
and [24.22.0 release](https://nodejs.org/en/blog/release/v24.22.0).

Angular 21 is LTS while Angular 22 is in active support on the review date.
The LTS choice is intentional even though npm's general `latest` tag points to
22. See the [Angular support table](https://angular.dev/reference/releases)
and [compiler/core registry tags](https://registry.npmjs.org/@angular%2Fcore).

## Direct package versions

All 20 declared packages were checked against the npm registry. Packages already
at the selected release stay at that version. The lockfile pins the actual
resolved dependency tree; `package.json` retains compatible caret ranges.

| Package | Previous declaration | Selected release | Channel |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | `^1.32.0` | `1.32.1` | Stable |
| `express` | `^5.2.1` | `5.3.0` | Stable |
| `parse5` | `^8.0.1` | `8.0.1` | Stable; already current |
| `zod` | `^4.6.5` | `4.6.7` | Stable |
| `@angular/compiler` | `^21.2.25` | `21.2.25` | LTS 21; already current |
| `@angular/core` | `^21.2.25` | `21.2.25` | LTS 21; already current |
| `@figma/plugin-typings` | `^1.140.0` | `1.142.0` | Stable |
| `@types/express` | `^5.0.6` | `5.0.6` | Stable; already current |
| `@types/node` | `^24.19.1` | `24.19.2` | Node 24 types |
| `@types/react` | `^19.3.0` | `19.3.0` | Stable; already current |
| `@types/react-dom` | `^19.3.0` | `19.3.0` | Stable; already current |
| `@vue/compiler-sfc` | `^3.5.43` | `3.5.44` | Stable |
| `axe-core` | `^4.13.0` | `4.14.0` | Stable |
| `esbuild` | `^0.28.2` | `0.28.2` | Stable; already current |
| `playwright-core` | `^1.63.0` | `1.64.1` | Stable |
| `react` | `^19.3.0` | `19.3.1` | Stable |
| `react-dom` | `^19.3.0` | `19.3.1` | Stable |
| `svelte` | `^5.57.1` | `5.57.2` | Stable |
| `typescript` | `^7.0.2` | `7.0.2` | Stable; already current |
| `vue` | `^3.5.43` | `3.5.44` | Stable |

Registry metadata is available from `https://registry.npmjs.org/<package>`;
percent-encode the slash for scoped package names. The release check used
`dist-tags.latest`, except Angular's `v21-lts` and the newest Node-24 types.
To inspect a selection again, use `npm view <package>@<version> version` and
`npm view <package> dist-tags --json`. A future review can return newer versions.

## Consumer toolchains

The repository's TypeScript 7 compiler builds its server, controllers and
framework-recipe fixtures. It does **not** prescribe the compiler version for
every consuming framework application. In particular, Angular 21 applications
must use the TypeScript range in the
[Angular compatibility matrix](https://angular.dev/reference/versions):
TypeScript 5.9, below 6.0. The repository checks Angular template parsing and
TypeScript recipe wrappers; it does not run a full Angular `ngc` application build.

Generated `@sekura/behaviours` remains dependency-free. Generated `@sekura/react`
keeps its existing supported React peer range; its build and browser checks use
the selected React release above. Both artifacts take their package version from
the root 3.1.0 manifest.

The 13 GitHub Actions used by CI and release workflows were also checked against
their upstream releases. Existing major-version references already select the
current stable major except `actions/setup-dotnet`, which moves from v4 to
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
references. It is an offline policy gate; it does not query upstream to certify
that versions are still the newest. Recheck the official support schedules before
changing its explicit LTS window.

After dependency updates, install the browser revisions required by the resolved
Playwright package, then run `npm run verify` with the .NET 10 SDK and browser
system libraries available. The lockfile, package declarations, runtime pins and
generated release assets belong in the same reviewed change.
