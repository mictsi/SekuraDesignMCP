# Sekura 3.2.0 — review findings and implementation

This release responds to the 3.1.0 review from product design, end-user,
developer and UI/UX perspectives. The source base is GitHub `main` commit
`115375177e0aff5e8dbadf39bdb55d0b10948f2c`. The audit recorded 28 defects
(six P1 and 22 P2) and 11 design proposals. P1 denotes a high-impact reproduced
defect; it is not a formal security severity rating.

The tables map the audit IDs to code and regression coverage. They do not claim
that every application, platform or assistive technology is certified. Run the
release gates on the final patched tree; the delivery validation record reports
the actual outcomes and environment.

## Reproduced defects

| ID / priority | User or developer impact | 3.2 change | Regression scope |
|---|---|---|---|
| SERVER-01 / P1 | Crafted markup could consume excessive validation work | Bounded parsing, iterative structural budgets and accessible-name work limits | `test:reliability:server`: adversarial input and bounded error outcomes |
| SERVER-02 / P1 | Alpha backgrounds could produce the wrong contrast result | Composite backdrop → background → foreground and disclose assumptions | Color and server contrast fixtures |
| SERVER-03 / P2 | Host, Origin and proxy headers could cross the deployment boundary | Exact allowlists, explicit proxy peers and loopback local binding | Raw HTTP forged/allowed headers, prefixes and MCP |
| SERVER-04 / P2 | An unversioned immutable asset could stay stale after upgrade | Revalidation and conditional cache behavior | 304 for unchanged assets, 200 after content changes |
| SERVER-05 / P2 | Starting from another directory could serve the wrong or no files | Package-relative roots with an explicit absolute override | Foreign-working-directory and fixture isolation |
| SERVER-06 / P2 | Token lookalikes could pass validation while real aliases diverged | Shared registry derived from emitted tokens and declared local properties | Exact token checks, CSS lint and exporter aliases |
| SERVER-07 / P2 | Starter code could point at an unavailable stylesheet URL | Build starter URLs from the actual published artifact paths | Fetch generated URLs at root and prefixed deployments |
| SERVER-08 / P2 | Empty/hidden naming text could incorrectly satisfy a naming check | Meaningful text and hidden-state handling with bounded traversal | Empty, whitespace, hidden and referenced naming cases |
| BEH-01 / P1 | Localized numeric text could commit the wrong value | Locale-aware parsing with separate editable draft and committed value | `test:reliability:inputs`: Swedish, German, Arabic, Indian grouping, invalid text, IME and reset |
| BEH-02 / P1 | Calendar reason text could be interpreted as HTML | Render disabled-date reasons as literal text | Hostile text remains inert and visible as text |
| BEH-03 / P1 | Typed or programmatic dates could bypass selection constraints | Shared date/range validation across all entry paths | Bounds, malformed dates, atomic range changes and getters |
| BEH-04 / P2 | Calendar could open on an unusable focus target | Choose the first appropriate enabled date | Constrained calendar opening and focus |
| BEH-05 / P2 | Strict tag suggestions were not usable by keyboard | Active descendant, traversal, selection and shared dismissal | Keyboard-only suggestion selection and Escape |
| BEH-06 / P2 | Disabled tabs/segments could activate | Reject disabled targets during activation and traversal | Pointer, keyboard and programmatic disabled targets |
| BEH-07 / P2 | Calendar Escape could close its surrounding overlay | Register calendar with the shared dismissal stack and clean descendants | Calendar inside popover, modal drawer and native dialog |
| BEH-08 / P2 | One calendar action could trigger duplicate change callbacks | Separate native calendar events from committed controller notification | Date and range callback counts |
| CON-01 / P1 | Blazor teardown could strand modal background inertness | DOM-owned enhancement root cleans removed descendants and hosts | `test:consumers`: actual .NET Blazor Server conditional removal |
| CON-02 / P2 | Repeated recipes could retain incorrect ID references | Shared registry for single IDs, ID lists and local fragments | Multiple recipe/custom-element instances, ARIA and modern targets |
| CON-03 / P2 | Angular recipes could call browser APIs during SSR | Enhance in `afterNextRender` | Actual Angular server render, hydration identity, editing and modal removal |
| CON-04 / P2 | DTCG/Figma semantic aliases referenced alpha primitives absent from their exported palettes | Include the missing alpha primitives; structure DTCG values and disclose coverage | Every alias resolves; typed token shapes and CSS-only exceptions |
| CON-05 / P2 | CommonJS and `/min` package consumers could fail | Actual CJS builds and matching normal/min declarations | Real packed package install, `require`, `import`, strict `.cts`/`.mts` |
| CON-06 / P2 | Figma resting hints disagreed with web field order | Keep label/hint/control/error slots consistent | API-shaped generator order checks; Figma import remains manual |
| SYS-01 / P2 | Toast timing/overflow could remove focused content | One timer paused by focus or hover, FIFO overflow queue; samples use the same controller | Focus plus hover transitions, queue and teardown |
| SYS-02 / P2 | Blocked storage could leave theme controls and page out of sync | Apply in-memory preference before persistence; report persistence failure | Controller and sample storage-failure tests |
| SYS-03 / P2 | Filtering tokens could leave unusable contents links/current state | Derive contents visibility and current section from visible targets | `test:reliability:product`: filter, no-results and reset |
| SYS-04 / P2 | Manual release dispatch could build a different ref from its tag | Resolve an existing tag once; reuse verified artifacts and probe the candidate image digest | `test:release-policy`; live Actions and Docker remain separate release acceptance |
| SYS-05 / P2 | Release notes claimed an image health gate the release workflow did not run | Probe the actual candidate image, fetching assets and initializing MCP before release tagging; add artifact readiness to health | Exact-image probe policy, plus missing-artifact 503 fixtures |
| SYS-06 / P2 | Dependency gate could treat type packages as runtimes | Exclude type metadata from runtime-major inventory | Runtime/type fixture in release-policy checks |

## Design proposals

| Proposal | 3.2 implementation | Remaining application/design responsibility |
|---|---|---|
| DES-01 — one product frame | Dedicated Workspace frame with a compact local-demo banner and Back to docs link | Adapt the frame to the actual product's navigation architecture. |
| DES-02 — task-based entry | Overview routes for designing, framework implementation, MCP connection and upgrading | Validate those entry labels with the intended audience. |
| DES-03 — separate support axes | Component pages separate API maturity, CSS/controller behavior, native React and design-kit coverage | Human acceptance and unsupported target coverage remain explicit. |
| DES-04 — example before reference | Interactive example first; theme/density and applicable disabled-state controls update the copyable snippet | Full composite-state configuration remains in the workbench and component APIs. |
| DES-05 — reduce mobile chrome | Scoped page search, responsive Pages panel and Document actions disclosure | Physical touch, virtual keyboard and real zoom review. |
| DES-06 — task-focused Settings copy | Remove implementation instructions from the sample's primary flow and clarify persistence | Actual remote preferences, notifications and account actions need host integration. |
| DES-07 — editing contract | Shared input-state helper, corrected controllers and `editing-and-commit` pattern | Business validation and application-specific formats. |
| DES-08 — versioned handoff | `DESIGN-HANDOFF.md`, generated kit coverage/field-order metadata and corrected Figma slots | Import/review in the target design file before publishing a team library. |
| DES-09 — consistent urgency | Align validation, notifications and recovery guidance; one announcement owner | Apply urgency to the user's task, not merely HTTP status or color. |
| DES-10 — save boundaries and conflicts | Guidance for mixed section boundaries, unknown outcome state and a working comparison/recovery Form lab | Durable writes, concurrency control, idempotency and production merge policy. |
| DES-11 — permission discoverability | Distinguish confidential resources from discoverable unavailable features and describe mid-edit access loss | Server authorization and data-disclosure policy. |

## Compatibility and release scope

The package version is 3.2.0. Public component names, CSS classes, token names and
behavior exports are checked against recorded v2.1, v3.0.0 and v3.1.0 baselines.
The new behavior registration API and support metadata are additive. Corrected
validation, event timing and deployment defaults can affect integrations; review
the source-specific paths in `MIGRATION.md` rather than treating a minor version
as permission to skip application acceptance.

Navigation width stays fixed. No width control, width reset, resize handle or
remembered custom width is added. Main navigation retains open/close controls,
submenus and opt-in tree navigation from 3.1.

`npm run verify` includes the new reliability and real consumer tests alongside
the existing build, compatibility, contrast, code generation, multi-browser,
navigation and automated accessibility gates. Chromium/Firefox/WebKit and the
.NET 10 SDK must be installed. Release policy can be checked locally; an actual
multi-architecture image build, live GitHub Actions execution and Figma import
are not implied by those tests. `MANUAL-VALIDATION.md` records the human checks
that remain outstanding.
