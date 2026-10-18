/**
 * UX patterns — recurring problems and the Sekura answer to each.
 *
 * A component says how one thing looks and behaves. A pattern says how several
 * components combine to solve a problem that shows up on every other screen.
 */

export interface Pattern {
  id: string;
  name: string;
  summary: string;
  problem: string;
  solution: string;
  rules: string[];
  components: string[];
  accessibility: string[];
  antiPatterns: string[];
  html?: string;
}

export const patterns: Pattern[] = [
  {
    id: 'hierarchical-navigation',
    name: 'Hierarchical page navigation',
    summary: 'Group destinations by purpose and keep navigation, disclosure and current location distinct.',
    problem: 'A long flat list is hard to scan, while a parent that both opens a page and expands its children makes exploration unpredictable.',
    solution: 'Use ordinary links and separate named disclosure buttons. Render the current route with aria-current="page", mark its ancestors with data-active-ancestor, and expand the full current path. Use the explicit sk-side-nav--drawer variant only for primary navigation; local settings links remain in the page. The documentation sidebar and Settings sample demonstrate both compositions.',
    rules: [
      'Group destinations from application metadata and preserve a stable order within each group.',
      'Keep search available at narrow widths and include the parent/category path in results.',
      'Disclosure changes visibility without changing the route; parent overview links navigate independently.',
      'A collapsed hierarchical rail must expose a named control that expands the rail before users browse its children.',
      'Breadcrumb overflow contains normal links; a named parent link preserves context on small screens.',
      'Initialize only the controllers required by the markup: links alone need neither createDisclosure nor createDrawer.',
    ],
    components: ['side-nav', 'breadcrumbs', 'disclosure', 'drawer', 'search-field'],
    accessibility: [
      'Use a named nav landmark with native lists, links and buttons; do not add role=menu to page navigation.',
      'Keep current location, expanded state and keyboard focus independently visible.',
      'Opening a branch must not steal focus; hidden descendants must leave the tab order.',
      'Verify RTL, forced colors, long labels, 200% text and the mobile drawer focus return.',
    ],
    antiPatterns: ['One control that unpredictably navigates and expands.', 'Hiding search on mobile without a visible replacement.', 'Applying primary drawer CSS to local section navigation.', 'Hover-only access to collapsed children.'],
  },
  {
    id: 'action-submenus',
    name: 'Action menus and submenus',
    summary: 'Use owned command groups with predictable keyboard transitions and a mobile Back action.',
    problem: 'Nested action lists can leak child items into parent keyboard navigation or dismiss several layers on one Escape.',
    solution: 'Initialize createMenu on the root trigger and menu. Mark submenu parent items with data-sk-submenu, aria-haspopup="menu" and aria-controls; the root controller owns their panels. Add a data-sk-menu-back item for drilldown mode. The default responsive mode cascades on desktop and presents one panel on narrow screens. The menu reference contains a working Export submenu.',
    rules: [
      'Keep nesting shallow; prefer one submenu level and move complex choices into a dialog.',
      'Use stable data-value command IDs and execute outcomes in onSelect or sk:menu:select.',
      'Use submenuMode to choose auto, cascade or drilldown; use submenuMediaQuery to match the application breakpoint.',
      'Scope keyboard traversal to one menu. Forward opens a submenu; backward returns to its parent item, mirrored for RTL.',
      'Expose unavailable commands with aria-disabled and an explanation; keep them focusable and prevent execution.',
      'Close the command menu before transferring focus to a new dialog or route. Do not add a second focus-restoration handler.',
    ],
    components: ['menu', 'button', 'dialog'],
    accessibility: ['One Escape closes the active submenu or root menu and returns focus appropriately.', 'Tab and Shift+Tab leave the entire menu chain.', 'Click/tap and keyboard activation expose the same commands.', 'A submenu Back action is named and appears only in drilldown presentation.'],
    antiPatterns: ['Auto-initializing submenu parent items as independent root menus.', 'Using command-menu roles for an ordinary list of page links.', 'Closing every overlay for one Escape.', 'Restoring focus to the old trigger after a command opens a dialog.'],
  },
  {
    id: 'navigation-tree',
    name: 'Navigating a document tree',
    summary: 'Opt into tree navigation with stable identity, deliberate activation and recoverable filtering.',
    problem: 'Selection, expansion and the current document are often conflated, so browsing a branch changes content or filtering loses the user’s location.',
    solution: 'Create a manually owned tree with navigation: true and data-sk-custom-tree when the host needs setCurrent, filter or revealCurrent. Every treeitem has a unique nonempty data-value ID. Chevron activation expands; label activation emits sk:tree:activate. The host opens the destination, updates its breadcrumb and heading, then calls setCurrent(id). With automatic data-sk-tree-navigation ownership instead, handle the activation event and render aria-current=page from confirmed route state. See the working document sample.',
    rules: [
      'Keep legacy selection mode when the task is choosing items. Navigation and checkbox multi-selection are separate modes.',
      'Keep data-value stable across rename and reparent operations; a label is not an identity.',
      'Set aria-current="page" from confirmed route state, independently of keyboard focus.',
      'The local filter searches loaded nodes only, retains matching ancestors, and restores expansion on clear. Remote search must return usable paths.',
      'A second disclosure action during loading cancels the pending request. Ignore stale results and preserve retry after failure.',
      'Use one owner: data-sk-custom-tree for a manual provider, refresh after external DOM changes, and destroy before unmounting.',
    ],
    components: ['tree-view', 'breadcrumbs', 'search-field', 'content-header'],
    accessibility: ['Keep a single roving tab stop and the documented tree arrow/typeahead model.', 'Choose whether successful navigation focuses the destination heading or retains focus in the tree; apply that policy consistently.', 'Keep full labels available, provide a named filter and announce no results.', 'Reveal current without moving focus by default; request focus explicitly when that is the user’s action.'],
    antiPatterns: ['Deriving IDs from display labels.', 'Changing the current document when only expanding a branch.', 'Claiming a loaded-node filter searches the entire backend.', 'Adding a separate tab stop for every tree chevron.'],
  },
  {
    id: 'destructive-confirmation',
    name: 'Confirming a destructive action',
    summary: 'Match the friction to the consequence. Most destructive actions deserve undo, not a dialog.',
    problem:
      'Users delete things they did not mean to delete. The reflex is to add a confirmation dialog, but a dialog users click through without reading provides no protection at all — it just adds a step. Confirmation fatigue is real and measurable.',
    solution: `Choose the mechanism by consequence, not by habit:

| Consequence | Mechanism |
|---|---|
| Reversible, low impact | **Undo toast.** No dialog. Act immediately, offer Undo for 10 seconds. |
| Irreversible, low impact | **Simple dialog** naming the specific target. |
| Irreversible, high impact | **Typed confirmation**: the user types the resource name. |
| Irreversible, catastrophic | Typed confirmation **plus** recent step-up authentication. |

Undo is almost always better than a dialog when it is technically possible. It is
faster for the common case, and it actually protects against the mistake rather
than protecting against the click.`,
    rules: [
      'Name the specific target in both the message and the button: "Delete project Website redesign", never "Confirm".',
      'Quantify the impact: "This removes 128 records and cannot be undone."',
      'Focus the safe option, never the destructive one.',
      'Say what else is affected — dependent resources, downstream services.',
      'Never use a dialog for something undo could handle.',
    ],
    components: ['dialog', 'toast', 'button', 'text-field', 'alert'],
    accessibility: [
      'Initial focus goes to Cancel. A user pressing Enter reflexively must not destroy anything.',
      'The dialog is labelled by its title via aria-labelledby.',
      'The confirm button label must make sense read alone: "Delete project", not "Yes".',
      'The typed-confirmation field is a normal labelled input with the phrase shown in the label, not in a placeholder.',
      'Announce the outcome in a live region — the dialog closing is silent.',
      'Escape must always work. For a dirty dialog, intercept and confirm rather than blocking it.',
    ],
    antiPatterns: [
      'A dialog asking "Are you sure?" with OK and Cancel. It conveys nothing and trains users to click OK.',
      'Focusing the destructive button.',
      'Requiring a typed confirmation for a trivially reversible action, which trains users to type past warnings.',
      'Colour as the only destructive signal.',
    ],
    html: `<!-- Low impact and reversible: no dialog at all -->
<script>
  await deleteRecord(id);
  showToast({
    intent: 'success',
    message: 'Record Pricing table variants deleted.',
    action: { label: 'Undo', onClick: () => restoreRecord(id) },
    duration: 10000,   // longer, because it carries an action
  });
</script>

<!-- High impact: typed confirmation, safe option focused -->
<dialog class="sk-dialog sk-dialog--destructive sk-dialog--sm" aria-labelledby="dz-title">
  <form method="dialog" class="sk-dialog__panel">
    <header class="sk-dialog__header">
      <h2 class="sk-dialog__title" id="dz-title">Delete Website redesign?</h2>
    </header>
    <div class="sk-dialog__body">
      <p>This removes <strong>128 records</strong> and cannot be undone. Any service
         everyone assigned to it loses access immediately.</p>
      <div class="sk-field">
        <label class="sk-field__label" for="confirm">
          Type <code class="sk-code">Website redesign</code> to confirm
        </label>
        <input class="sk-input sk-input--mono" id="confirm" type="text" autocomplete="off" />
      </div>
    </div>
    <footer class="sk-dialog__footer">
      <button type="submit" value="cancel" class="sk-button sk-button--secondary" autofocus>Cancel</button>
      <button type="submit" value="confirm" class="sk-button sk-button--danger" disabled>Delete project</button>
    </footer>
  </form>
</dialog>`,
  },

  {
    id: 'editing-and-commit', name: 'Editing and committed values',
    summary: 'Preserve draft text, commit valid values once, and make correction predictable.',
    problem: 'Formatting, validation and host callbacks can disagree about whether an edit is valid or saved.',
    solution: `Keep draft text separate from the last valid committed value. Parsing uses the configured locale; formatting must round-trip without changing the value. Validate typed, selected and programmatic values through the same restrictions. An invalid draft stays editable with an associated error while getters retain the last valid value. A valid commit owns exactly one public value callback; documented native events remain available. Reset, cancel, overlay dismissal and unmount must release their owned state and restore appropriate focus.`,
    rules: ['Never replace invalid draft text with an empty value or an unrelated parsed number.', 'Define commit timing, reset behavior and event ownership in the controller API.', 'Retain widget-specific keyboard models; consistency does not make a tag list a menu or a tree a combobox.', 'Treat client validity as feedback; the server validates the submitted value.'],
    components: ['number-input', 'date-picker', 'date-range-picker', 'tag-input', 'combobox', 'form-field'],
    accessibility: ['Associate hint and error with the input, and keep aria-invalid consistent with the displayed draft.', 'Use polite correction feedback; move focus only for a blocking task transition.', 'Keep the active keyboard item, focus indicator and committed choice synchronized.'],
    antiPatterns: ['A value changes on blur without an edit.', 'A calendar click and typed date obey different limits.', 'One selection triggers duplicate saves.', 'Removing a parent leaves an open child focus trap.'],
  },

  {
    id: 'form-validation',
    name: 'Form validation',
    summary: 'Validate at the right moment, say how to fix it, and never lose the user’s work.',
    problem:
      'Validation that fires too early punishes users mid-typing. Validation that fires too late wastes their time. Messages that say "invalid input" tell them nothing. And a server round-trip that clears the form destroys real work.',
    solution: `**When to validate**

- **While typing:** never, except to *remove* an existing error once it is fixed.
- **On blur:** format and syntax only. The user has finished with that field.
- **On submit:** everything. This is the authoritative pass.
- **Server:** always authoritative, regardless of what the client decided.

**On failed submit**

1. Render an error summary at the top of the form.
2. Move focus to the summary and give it \`tabindex="-1"\`.
3. Each summary entry links to its field.
4. Mark each bad field with \`aria-invalid\` and an inline message.
5. Preserve every value the user entered.`,
    rules: [
      'Errors say how to fix: "Enter a number of days between 1 and 30", not "Invalid value".',
      'Never validate on keystroke. Do clear an error on keystroke once it is resolved.',
      'Preserve input across a failed server submit. Never clear a password field.',
      'Mark optional fields, not required ones.',
      'Hint above the control, error below it.',
    ],
    components: ['form-field', 'alert', 'text-field', 'inline-message', 'button'],
    accessibility: [
      'A blocking error summary has tabindex="-1" for deliberate focus. Use assertive announcement only when needed and avoid announcing the same error twice.',
      'aria-describedby lists hint then error, in that order — order determines reading order.',
      'Remove aria-invalid when the error is resolved. A stale aria-invalid is worse than none.',
      'Follow the notifications urgency policy: blur corrections are polite; a blocking failed submit may interrupt and move focus to its summary.',
      'Never rely on the browser’s native validation bubbles — they are inconsistent and time out.',
    ],
    antiPatterns: [
      'Turning a field red while the user is still typing in it.',
      'Placing the error message in the placeholder.',
      'Disabling submit until the form is valid, which hides why it cannot be submitted.',
      'Clearing the form on server error.',
      'A generic "Please correct the errors below" with no summary or links.',
    ],
  },

  {
    id: 'loading-states',
    name: 'Loading and empty states',
    summary: 'Distinct situations that need different explanations and recovery actions.',
    problem:
      'Loading, first-use, no-results, no-access and error are five different facts about the world. Showing "No data" for all of them leaves the user unable to tell whether something is broken, whether they need permission, or whether they simply need to start.',
    solution: `**Loading** — under 300ms show nothing. 300ms to about 1s, a skeleton matching
the real content’s shape. Beyond that, a skeleton plus a status message. Use a
spinner only where the shape of what is coming is unknown.

**First use** — explain what the thing is and offer the one obvious action. This is
the only empty state where a warm tone and a primary action belong.

**No results** — name the filters that caused it and offer to clear them. That is
almost always what the user wants.

**No access** — conceal confidential resource identities. For an intentionally discoverable feature, explain the restriction and provide a real request-access or contact-owner path. The host decides which policy applies; server authorization is authoritative.

**Error** — say what failed, offer retry, include a correlation ID.`,
    rules: [
      'Never show a spinner for content whose shape you already know.',
      'Skeletons must match the real content’s dimensions, or they cause the layout shift they exist to prevent.',
      'Announce loading once and completion once. Never on a loop.',
      'Do not replace existing content with a skeleton on refresh; keep it and dim it.',
      'No-access states must not enumerate resources.',
    ],
    components: ['skeleton', 'spinner', 'empty-state', 'alert', 'progress'],
    accessibility: [
      'Skeleton shapes are aria-hidden; a single visually hidden role="status" carries the meaning.',
      'aria-busy="true" on the region while loading.',
      'Announce the result count after a filter changes — the visual change is silent.',
      'The empty-state heading is a real heading at the correct outline level.',
      'Delay spinners by ~400ms so fast responses do not flash.',
    ],
    antiPatterns: [
      'A bare "No data" for every situation.',
      'The same copy for first-use and no-results.',
      'A full-page spinner for a partial update.',
      'A skeleton whose size differs from the content it becomes.',
      'Jokes in an empty state a user hits repeatedly.',
    ],
  },

  {
    id: 'search-and-filter',
    name: 'Search and filtering',
    summary: 'Filters are visible, removable, shareable, and reflected in the URL.',
    problem:
      'Users apply a filter, forget it, and then report that data is missing. Or they find the right view and cannot share it. Or a filter change silently strands them on page 7 of a 2-page result set.',
    solution: `Keep every filter visible as a removable chip. Put the complete filter state
in the URL so the view is shareable, bookmarkable, and survives a refresh. Show the
result count and announce it. Offer "Clear all" whenever more than one filter is
active. Reset to page 1 on any filter change, and say so.`,
    rules: [
      'Every active filter is visible as a removable chip, not hidden behind a panel.',
      'Filter state lives in the URL.',
      'Show the result count and announce it politely.',
      'Debounce free-text search at ~250ms and cancel superseded requests.',
      'Reset to page 1 on filter change.',
      'A no-results state names the filters and offers to clear them.',
    ],
    components: ['search-field', 'popover', 'badge', 'button', 'empty-state', 'pagination', 'cluster'],
    accessibility: [
      'The search form is role="search" — a landmark screen reader users jump to directly.',
      'Result counts go in an aria-live="polite" region, announced after the debounce settles rather than per keystroke.',
      'Each filter chip’s remove button names its filter: "Remove environment filter Staging".',
      'Announce when filters are cleared.',
      'Keyboard users must reach every filter without opening a hover-only menu.',
    ],
    antiPatterns: [
      'Filters that persist across navigation with no visible indication.',
      'Search state kept only in component state, so a refresh loses it.',
      'Searching on every keystroke with no debounce.',
      'Clearing the query when results return.',
      'Hiding the count of excluded items.',
    ],
  },

  {
    id: 'bulk-actions',
    name: 'Bulk actions',
    summary: 'Selection is explicit, the count is always visible, and "select all" never lies about its scope.',
    problem:
      '"Select all" is ambiguous: does it mean the 20 rows on this page, or all 4,000 matching the filter? Users act on the wrong scope and cannot tell what they just did.',
    solution: `The header checkbox selects the **current page** and shows an indeterminate
state when the page is partially selected. When a whole page is selected, offer a
separate, explicit escalation: "All 20 on this page are selected. Select all 4,000
matching projects." Never make that leap implicitly.

The action bar appears on first selection, states the count, and offers Clear
selection. Destructive bulk actions name the count in the button label.`,
    rules: [
      'The header checkbox scopes to the current page only.',
      'Selecting all matching items is an explicit, separate action.',
      'The count is always visible while a selection exists.',
      'Destructive bulk buttons name the count: "Delete 3 projects".',
      'Report per-item results on partial failure and never call the batch atomic.',
      'Selection survives sorting; it does not survive filtering — and say so when it is cleared.',
    ],
    components: ['checkbox', 'table', 'button', 'alert', 'toast', 'dialog'],
    accessibility: [
      'Each row checkbox names its row: "Select Website redesign".',
      'The header checkbox uses the indeterminate DOM property, announced as "mixed".',
      'Announce selection count changes politely.',
      'The action bar is a labelled region so it can be reached by landmark.',
      'Shift+click range selection needs a keyboard equivalent (Shift+Space).',
    ],
    antiPatterns: [
      '"Select all" that silently spans every page.',
      'An action bar that covers the rows it acts on.',
      'A bulk delete with no count in the confirmation.',
      'Reporting a partial failure as complete success.',
    ],
  },

  {
    id: 'saving',
    name: 'Saving and unsaved changes',
    summary: 'One save model per clearly labeled transaction, explicit durability, and recoverable drafts.',
    problem:
      'Mixing auto-save and explicit save in one view leaves users unsure whether their work is safe. Optimistic UI that reports success before the server confirms is a lie the user discovers later.',
    solution: `A save boundary is one clearly labeled transaction or section. Pick one model within that boundary:

- **Explicit save** — a Save button, a dirty indicator, and a warning before
  navigating away. Use Checkbox for booleans, never Switch.
- **Auto-save** — changes persist as they are made, with a visible "Saving…" then
  "Saved" indicator. Use Switch for booleans, never Checkbox.

Independent sections may use different models when their boundaries and feedback are clear. If the server has not acknowledged a durable save, show pending rather than success.

| State | Meaning and next action |
|---|---|
| Draft | Edits exist locally and may be lost on leaving. |
| Saving | The request is awaiting acknowledgement. |
| Saved locally | A device checkpoint exists; it is not a server save. |
| Saved | The named durable boundary has acknowledged this revision. |
| Failed | The operation is known to have failed; retain edits and offer safe recovery. |
| Conflict | Keep the draft, load the newer server revision, compare, then explicitly reapply or use the latest values. |
| Unknown outcome | A timeout, cancellation or unreadable acknowledgement cannot establish success or failure. Check the current revision before retrying a write. |

The form composition lab demonstrates retained drafts and explicit conflict recovery. Persistence, concurrency checks and merge policy remain application-owned.`,
    rules: [
      'Use one save model per labeled transaction or section; describe each boundary clearly.',
      'Show a pending state while the server has not confirmed.',
      'Warn before discarding unsaved changes, and name what will be lost.',
      'Preserve input across failed saves.',
      'Idempotency belongs on the server; do not prevent double submission by disabling the button.',
    ],
    components: ['button', 'switch', 'checkbox', 'toast', 'dialog', 'alert', 'inline-message'],
    accessibility: [
      'Announce save state changes politely and name their actual boundary: awaiting acknowledgement, saved on this device, or saved to the server.',
      'aria-busy on the button while in flight, keeping it focusable.',
      'The unsaved-changes dialog names what would be lost.',
      'The dirty indicator is text plus icon, not a coloured dot alone.',
    ],
    antiPatterns: [
      'Auto-save with no visible indication.',
      'A switch inside a form with a Save button.',
      'Reporting success before the server confirms.',
      'Navigating away from unsaved work with no warning.',
    ],
  },

  {
    id: 'notifications',
    name: 'Notifications and announcements',
    summary: 'Match urgency to mechanism, and never interrupt for something that is not urgent.',
    problem:
      'Everything gets announced assertively, so screen reader users are interrupted constantly and start ignoring announcements. Or nothing is announced, and non-visual users have no idea anything happened.',
    solution: `| Urgency | Mechanism | ARIA |
|---|---|---|
| Confirmation of a user action | Toast | \`role="status"\`, polite |
| Persistent page condition | Alert | no role if present on load; \`role="status"\` if inserted |
| Blocking failure needing immediate attention | Alert or focused error summary | \`role="alert"\` when an interruption is needed; avoid duplicate announcements |
| Nonblocking failure | Inline message | \`role="status"\`, polite |
| Field-level problem | Form field error | \`aria-describedby\` + \`aria-invalid\` |
| Background event | Notification centre | polite, batched |

The live region container must exist in the DOM before the message is inserted.`,
    rules: [
      'Reserve assertive announcements for blocking or urgent failures; ordinary field corrections and nonblocking failures are polite.',
      'The live region must pre-exist the message.',
      'Toasts never carry information the user might need later.',
      'Auto-dismiss pauses on hover and focus, and a manual close is always available.',
      'Show at most three toasts and queue overflow; never evict a focused or hovered notification.',
    ],
    components: ['toast', 'alert', 'inline-message', 'badge'],
    accessibility: [
      'Adding the live region and its content in the same tick announces nothing.',
      'Polite is the default; assertive is the exception.',
      'Toasts must be keyboard reachable — an Undo nobody can reach is not an Undo.',
      'Notification counts need text: "Notifications, 3 unread", not a bare dot.',
      'WCAG 2.2.1: auto-dismissing content must be pausable or extendable.',
    ],
    antiPatterns: [
      'role="alert" on a success message.',
      'A toast that is the only record of an error.',
      'Auto-dismiss with no close button.',
      'A live region created at the same moment as its content.',
    ],
  },

  {
    id: 'permissions',
    name: 'Permission-aware interfaces',
    summary: 'Conceal confidential resources and explain intentionally discoverable restricted features.',
    problem:
      'Client-side hiding of unauthorised actions leaks the existence of resources and the shape of the permission model, and it is trivially bypassed. Meanwhile, disabling everything with no explanation leaves users stuck with no idea why.',
    solution: `The server supplies authorized content and classifies discoverability. The client never grants access.

- **Confidential resources:** omit their identities, actions and counts. Use a consistent not-found/forbidden policy that prevents enumeration.
- **Intentionally discoverable features:** show an explanatory locked destination or an unavailable action with a stated reason. Offer Request access or Contact owner only if the application supports that action.
- **Lost access during a task:** preserve permitted draft information, explain the change without leaking confidential data, and give a real recovery path.

The host application chooses the policy for each feature/resource. Visibility and disabled styling are not authorization`,
    rules: [
      'The server decides; the client renders.',
      'Never render an action the user cannot perform without explaining why.',
      'Counts must never include inaccessible resources.',
      'Use a consistent not-found/forbidden response so resources cannot be enumerated.',
      'Never put permission logic in a component.',
    ],
    components: ['side-nav', 'button', 'empty-state', 'inline-message', 'alert'],
    accessibility: [
      'A disabled control needs aria-describedby pointing at the reason.',
      'Make the restriction reason reachable. If aria-disabled keeps an action focusable, prevent activation through every input method.',
      'Hide confidential destinations. A deliberately discoverable locked destination must explain its restriction and supported recovery.',
      'No-access messages must not disclose confidential identities; discoverable capability names follow the host policy.',
    ],
    antiPatterns: [
      'Rendering everything and hiding with CSS.',
      'A disabled button with no explanation.',
      'Counts that include invisible resources.',
      'Different responses for "does not exist" and "not allowed", which enables enumeration.',
    ],
  },

  {
    id: 'progressive-disclosure',
    name: 'Progressive disclosure',
    summary: 'Common tasks stay direct; advanced options stay reachable and clearly labelled.',
    problem:
      'Showing every option at once overwhelms new users. Hiding options behind vague labels means expert users cannot find them, and clicking "Advanced" to discover what is inside is a guessing game.',
    solution: `Keep the primary path direct and complete — a user who never expands anything
should still be able to finish the task. Put secondary options behind clearly
labelled disclosures that name their contents ("Advanced sharing options", not
"Advanced"). Remember expansion state per user. Never hide a required field.`,
    rules: [
      'The default path must be complete on its own.',
      'Disclosure labels name their contents.',
      'Never hide a required field inside a collapsed section.',
      'Expand a section automatically if it contains a validation error.',
      'Persist expansion state per user.',
    ],
    components: ['tabs', 'dialog', 'popover', 'fieldset', 'tree-view'],
    accessibility: [
      'Disclosures use a button with aria-expanded and aria-controls.',
      'Collapsed content is hidden from the accessibility tree, not just visually.',
      'Auto-expand and move focus to a section containing an error.',
      'Never hide required content behind hover.',
    ],
    antiPatterns: [
      'A disclosure labelled only "Advanced" or "More".',
      'A required field inside a collapsed section.',
      'A validation error on a field the user cannot see.',
      'Hiding something behind hover with no click or keyboard path.',
    ],
  },

  {
    id: 'keyboard-shortcuts',
    name: 'Keyboard shortcuts',
    summary: 'Discoverable, non-conflicting, remappable, and never the only path.',
    problem:
      'Single-key shortcuts fire while users are typing. Shortcuts nobody can discover go unused. Shortcuts that conflict with assistive technology or browser bindings break the page for the people who most rely on the keyboard.',
    solution: `Require a modifier for global shortcuts (\`Mod+K\`). Reserve single-key
shortcuts for a focused context, and always suppress them while a text input has
focus. Provide a shortcut reference at \`?\` and surface the important ones in situ —
in menu items and in tooltips. Every shortcut has a pointer equivalent.`,
    rules: [
      'Global shortcuts require a modifier.',
      'Never fire a single-key shortcut while a text input has focus.',
      'Every shortcut has a visible, pointer-driven equivalent.',
      'Show shortcuts in menus so they are discoverable.',
      'Single-key shortcuts must be remappable or disableable (WCAG 2.1.4).',
    ],
    components: ['command-palette', 'menu', 'kbd', 'dialog'],
    accessibility: [
      'WCAG 2.1.4 Character Key Shortcuts: a single-character shortcut must be turn-off-able, remappable, or active only on focus.',
      'Do not override browser or assistive-technology bindings.',
      'Render platform-appropriate modifiers in visible text, not only in an aria-label.',
      'The shortcut reference itself must be reachable without a shortcut.',
    ],
    antiPatterns: [
      'A single-key shortcut that fires while typing.',
      'A feature only reachable by shortcut.',
      'Undiscoverable shortcuts.',
      'Overriding Ctrl+F, Ctrl+P or Tab.',
    ],
  },

  {
    id: 'responsive-tables',
    name: 'Responsive tables',
    summary: 'Scroll the table, not the page — and never silently drop columns.',
    problem:
      'A wide table either forces the whole page to scroll sideways, or "helpfully" hides columns on narrow screens, so mobile users silently see less data than desktop users and have no idea.',
    solution: `Put the table in its own scroll container with \`overflow-x: auto\`,
\`tabindex="0"\`, \`role="region"\` and an accessible name. The page never scrolls
horizontally; the table does. The \`tabindex\` is not optional — without it keyboard
users cannot scroll the container at all.

Where a genuinely different view is warranted on narrow screens, offer a card list
as an *explicit alternative* the user can switch to, with all the same data. Never
silently drop columns.

For very wide tables, a sticky first column keeps the row identity visible while
scrolling.`,
    rules: [
      'The table scrolls; the page does not.',
      'The scroll container needs tabindex="0" and an accessible name.',
      'Never silently hide columns on narrow screens.',
      'A column-visibility control is a user preference, not a responsive behaviour.',
      'Right-align numeric columns and use tabular figures.',
    ],
    components: ['table', 'card', 'button-group', 'menu', 'pagination'],
    accessibility: [
      'Without tabindex="0" on the scroll container, keyboard users cannot scroll it — WCAG 2.1.1.',
      'Give the container role="region" and a name so it is announced as a scrollable landmark.',
      'A card alternative must carry the same information, with each field labelled.',
      'Announce sort changes politely.',
      'A sticky column must not obscure focus.',
    ],
    antiPatterns: [
      'The whole page scrolling horizontally.',
      'Silently hiding columns below a breakpoint.',
      'A scroll container with no tabindex.',
      'Transforming a table into unlabelled stacked divs, losing header association.',
    ],
  },

  {
    id: 'optimistic-ui',
    name: 'Optimistic updates',
    summary: 'Only be optimistic about things that essentially always succeed, and roll back visibly when they do not.',
    problem:
      'Optimistic UI makes an application feel fast, but applied to operations that genuinely fail it makes the application lie. The user sees success, moves on, and discovers later that nothing happened.',
    solution: `Be optimistic only when the operation succeeds essentially always and is
locally reversible — toggling a favourite, reordering a list. For anything involving
an external system, a durable queue, or a provider round-trip, show a pending state
and tell the truth.

When an optimistic update fails: roll the UI back visibly, explain what happened
with an assertive announcement, and offer retry. A silent rollback is worse than
no optimism.`,
    rules: [
      'Only be optimistic about near-certain, locally reversible operations.',
      'Never be optimistic about external provider work.',
      'A failed optimistic update rolls back visibly and announces the failure.',
      'Pending is a real state and must be shown, not smoothed over.',
    ],
    components: ['switch', 'toast', 'alert', 'status-indicator', 'progress'],
    accessibility: [
      'A pending control is aria-busy and does not claim a state it has not reached.',
      'Announce failure assertively; a silent rollback is invisible to a screen reader user.',
      'Do not move focus during a rollback.',
    ],
    antiPatterns: [
      'A switch that shows "on" before the server confirms.',
      'A silent rollback.',
      'Optimistic UI for anything that takes a durable queue round-trip.',
    ],
  },

  {
    id: 'onboarding',
    name: 'First-run and onboarding',
    summary: 'Teach through the product, not through a tour nobody remembers.',
    problem:
      'Product tours are skipped, and the ones that are not skipped are forgotten by the time the knowledge is needed. Meanwhile empty states — which users actually read, because they are stuck — are left as "No data".',
    solution: `Put the teaching where the need is. The strongest onboarding surface in any
product is its first-use empty state, because the user is looking at it precisely
when they need to know what to do next.

Use contextual help — a Popover on a term, a hint under a field — at the moment of
use. Reserve a guided tour for genuinely novel interaction models, keep it under
four steps, make it skippable and resumable, and never block the interface behind
it.`,
    rules: [
      'Empty states are the primary onboarding surface.',
      'Teach at the point of need, not up front.',
      'Tours are skippable, resumable, and four steps at most.',
      'Never block the interface behind a tour.',
      'Sample data must be obviously sample data, and trivially removable.',
    ],
    components: ['empty-state', 'popover', 'alert', 'stepper', 'card'],
    accessibility: [
      'Tour steps must be keyboard navigable, with Escape exiting at any point.',
      'Focus moves to each step and returns to the origin on exit.',
      'Announce step changes politely.',
      'Contextual help must be reachable by keyboard, not hover-only.',
      'Never auto-advance a tour on a timer.',
    ],
    antiPatterns: [
      'A modal tour on first load.',
      'Tooltips that only appear on hover.',
      'A tour that cannot be dismissed or resumed.',
      'Sample data indistinguishable from real data.',
    ],
  },

  {
    id: 'error-recovery',
    name: 'Error recovery',
    summary: 'Say what failed, what still worked, and what to do next.',
    problem:
      'Errors are reported as opaque failures with no scope and no path forward. Users cannot tell whether anything succeeded, whether retrying is safe, or who to ask.',
    solution: `Every error answers four questions: what failed, what scope it affected, what
the user can do, and how to get help.

Be explicit about partial success — "10 of 12 records applied; 2 failed" is far more
useful than "operation failed". Offer retry where retrying is safe, and say when it
is not. Include a correlation ID for support, and never expose raw provider errors,
stack traces or internal hostnames.`,
    rules: [
      'State scope precisely: how many of how many.',
      'Never report partial failure as total failure, or as success.',
      'Offer retry when it is safe; say so when it is not.',
      'Include a correlation ID.',
      'Never expose provider internals to a non-administrator.',
    ],
    components: ['alert', 'empty-state', 'button', 'code-block', 'timeline'],
    accessibility: [
      'Follow the notifications urgency policy: ordinary field and nonblocking errors are polite; blocking or urgent failures may use role="alert".',
      'Focus moves to the error when it blocks the current task.',
      'Retry is a real button, adjacent to the error.',
      'Technical detail lives in a disclosure so it does not overwhelm the message.',
      'Never rely on colour alone to mark a failed row.',
    ],
    antiPatterns: [
      '"An error occurred."',
      'Reporting a partially successful batch as failed.',
      'A raw stack trace in the UI.',
      'A retry button that repeats an operation that cannot succeed.',
    ],
  },

  {
    id: 'theme-switching',
    name: 'Theme switching',
    summary: 'Three options with System as the default, applied before first paint, and announced.',
    problem:
      'A two-state light/dark toggle silently overrides the OS preference the first time it is touched, with no way back. And a theme applied after first paint produces a flash of the wrong theme on every page load.',
    solution: `Offer **System**, **Light** and **Dark**, defaulting to System. Persist the
choice, and keep following the OS while the choice is System.

Apply the theme with a synchronous inline script in \`<head>\`, before any
stylesheet. This is the only way to avoid the flash — anything async is too late.

Treat high contrast as a separate axis driven by \`prefers-contrast: more\`,
producing \`hc-light\` and \`hc-dark\`.`,
    rules: [
      'Three options, with System as the default.',
      'The theme script is inline and synchronous, before any stylesheet.',
      'Set color-scheme on the root so browser UI follows.',
      'Announce theme changes politely.',
      'High contrast is a separate axis from light/dark.',
    ],
    components: ['button-group', 'switch', 'menu', 'icon-button'],
    accessibility: [
      'The theme control is a radiogroup, not a toggle, since there are three states.',
      'Announce the change in a polite live region — the visual change is completely silent.',
      'Never trap users in a theme they cannot leave.',
      'Respect prefers-contrast independently of the light/dark choice.',
    ],
    antiPatterns: [
      'A two-state toggle with no System option.',
      'A theme applied after first paint.',
      'Not setting color-scheme, leaving white scrollbars in a dark app.',
      'An unannounced theme change.',
    ],
  },
];

const byId = new Map(patterns.map((p) => [p.id, p]));

export function getPattern(id: string): Pattern | undefined {
  return byId.get(id.toLowerCase().trim());
}
