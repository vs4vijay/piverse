---
name: onboard-pi-extension
description: Scaffold a new Pi coding agent extension inside the piverse monorepo, following the established project structure, naming, and code conventions. Use when adding a new extension (a `pi-<name>` package under `extensions/`), creating its src/index.ts entry, README, and package.json, or when asked to "add another extension", "onboard a new extension", or "create a pi extension".
---

# Onboarding a new Pi extension

This skill encodes the conventions used by the existing extensions in this repo
(`pi-queue`, `pi-notes`). Follow them exactly so new extensions are consistent,
publishable to npm, and discoverable on the [pi.dev gallery](https://pi.dev/packages).

Read `extensions/pi-queue/` and `extensions/pi-notes/` as living references before
and while you scaffold.

---

## 1. Project structure & naming

Each extension is its own npm package inside the monorepo root:

```
extensions/
├── pi-queue/               # /queue  — message queueing
├── pi-notes/               # /notes  — project notes (CLI + TUI)
└── pi-<name>/              # <-- NEW extension lives here
    ├── src/
    │   └── index.ts        # required extension entry point
    ├── README.md           # required
    ├── package.json        # required
    └── plan.md             # optional (planning notes; tracked like others)
```

### Naming rules

- Folder: `extensions/pi-<name>/` — always the `pi-` prefix, lowercase, hyphenated.
- npm name: `@vs4vijay/pi-<name>` — **always the `@vs4vijay` scope**.
- Default export registers one or more `/` slash commands. Pick clear, short command
  names. If the extension has several related commands, prefix them (e.g. `pi-queue`
  registers `/queue-*` and `/q-*` aliases).
- `keywords` must include `"pi-package"` for pi.dev gallery discovery.

### tsconfig conventions (repo root, no per-extension change needed)

`strict: true`, `module: ESNext`, `moduleResolution: bundler`, `noEmit: true`,
`verbatimModuleSyntax: true`, `isolatedModules: true`. The root tsconfig includes
`extensions/*/src/**/*.ts`.

---

## 2. package.json template

Copy this shape exactly (values change per extension). Match the existing files'
field ordering for consistency:

```json
{
  "name": "@vs4vijay/pi-<name>",
  "version": "0.1.0",
  "description": "<one-line: what the /<command> does>",
  "type": "module",
  "keywords": ["pi-package"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vs4vijay/piverse.git"
  },
  "author": "vs4vijay",
  "homepage": "https://github.com/vs4vijay/piverse",
  "bugs": {
    "url": "https://github.com/vs4vijay/piverse/issues"
  },
  "pi": {
    "extensions": ["./src/index.ts"]
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-tui": "*",
    "typebox": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- The `pi` manifest tells Pi where the resources live: `"extensions": ["./src/index.ts"]`.
- `peerDependencies` **must** use `"*"` ranges for the bundled Pi core packages
  (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`) — Pi provides
  them at runtime; do not bundle them.
- If the extension only ships as part of the parent `@vs4vijay/piverse` package, list
  the same resource path in the root `package.json` `pi.extensions` array. Each
  extension normally also ships standalone via its own package (the repo's
  `.github/workflows/release.yml` publishes every `extensions/*/` sub-package).

---

## 3. src/index.ts — extension entry point

Use the `ExtensionAPI` type and a default export. This is the canonical structure
(see `extensions/pi-queue/src/index.ts` and `extensions/pi-notes/src/index.ts`):

```ts
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

export default async function (pi: ExtensionAPI) {
  // Register /<command>
  pi.registerCommand("<command>", {
    description: "<one line: what it does and how to use it>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      // args: the raw string after the command name
      // ctx.ui.notify(message, level) — levels: "info" | "warning" | "error"
      ctx.ui.notify(`Hello: ${args}`, "info");
    },
  });
}
```

### Key rules

- **`import type` for types**: with `verbatimModuleSyntax`, use `import type` when
  importing only types (e.g. `ExtensionAPI`, `ExtensionCommandContext`).
- **`.js` extensions on relative imports**: ESM/NodeNext-style — `from "./store.js"`,
  not `"./store"`.
- **No build step**: Pi loads TypeScript extensions directly (via jiti). No compile.
- **State in closure scope**: keep per-extension state as module/closure variables
  inside the default export (see `pi-queue`'s `let queue`).

### Lifecycle hooks

Use `pi.on("<event>", handler)` for session lifecycle (see both extensions):

```ts
pi.on("session_start", async (_event, ctx) => { /* reset/load state */ });
pi.on("session_shutdown", async () => { /* flush/persist */ });
pi.on("agent_settled", async (_event, ctx) => { /* run after each turn */ });
pi.on("tool_result", async (event) => { /* observe tool outcomes */ });
```

When you need state to survive across turns, persist it — either to a file (see the
store pattern) or to the session (`pi.appendEntry(type, data)` and read it back in
`session_start` via `ctx.sessionManager.getEntries()` — see `pi-queue`).

---

## 4. Persistence store pattern (file-backed)

For persisted data, create a small `src/store.ts` following `pi-notes/src/store.ts`:

- A `class` that wraps read/write, with `load()`, `save()`, `getAll()`, `getById()`,
  `create()`, `update()`, `delete()`, and any domain methods.
- **Atomic writes**: write to a temp path then `fs.rename` (never write in place).
- A module-level singleton (`getNoteStore`) with a `reset` function so a fresh
  instance is created per session.
- **Lifecycle ordering matters**: on `session_start`, `reset()` the store **first**,
  then `getStore(cwd)` and `await store.load()`, so the same loaded instance is used
  all session and the `session_shutdown` flush writes real data (not an emptied one).

---

## 5. CLI UX

- Use `ctx.ui.notify(message, level)` for all user feedback (`info | warning | error`).
- Use `ctx.ui.confirm(title, message)` for destructive actions that need confirmation.
- Use `ctx.ui.editor(title, initial)` to open the external editor for multi-line content.
- Validate input and return early with a usage/error message:
  `ctx.ui.notify("Usage: /<command> <arg>", "error")`.
- For slash-command dispatch helpers, see `pi-queue/src/index.ts`.

---

## 6. TUI (optional)

For interactive full-screen UI, follow `pi-notes/src/tui.ts`:

- Build a component class implementing `Focusable` using primitives from
  `@earendil-works/pi-tui` (`VStack`, `HStack`, `Box`, `Text`, `ScrollView`,
  `Markdown`, `SelectList`).
- Export a factory function (e.g. `create<Name>TUI`) returning `Component & Focusable`.
- Show it from the extension via `ctx.ui.custom(fn, { overlay: true, overlayOptions })`.
  Note: `OverlayOptions` supports `width`/`maxHeight` (percentages), **not** `height`.
- Keep a module-level `tuiHandle` you can call to programmatically close/reopen it.
- Keep TUI state in the component; persist via the store.

---

## 7. README.md

Include, in this order (match `pi-queue/README.md` and `pi-notes/README.md`):

1. `# @vs4vijay/pi-<name>` heading
2. One-paragraph description
3. **Install** — `pi install npm:@vs4vijay/pi-<name>`
4. **Commands** table (command → description)
5. **Usage / Examples** — transcript-style examples with realistic output
6. Any additional sections (How it works, Features, Persistence, TUI, etc.)

---

## 8. Verification

Before finishing:

1. Run the typecheck from the repo root and confirm it passes:
   ```bash
   npm run typecheck
   ```
2. Quick-test without installing:
   ```bash
   pi -e ./extensions/pi-<name>/src/index.ts
   ```
3. Confirm the `package.json` has all required fields (name scope, `pi-package`
   keyword, `pi` manifest, repository, license, peerDependencies with `"*"`).
4. Add the new extension under `extensions/` and, if it should ship with the parent
   ecosystem package, register it in the root `package.json` `pi.extensions`.

---

## Checklist

- [ ] Folder named `extensions/pi-<name>/`
- [ ] npm name `@vs4vijay/pi-<name>`
- [ ] `src/index.ts` with default `export default function(pi)` and `registerCommand`
- [ ] `package.json` with `pi-package` keyword, `pi` manifest, repository/license, peerDeps `"*"`
- [ ] `README.md` with install + commands + usage examples
- [ ] `npm run typecheck` passes
- [ ] Tested with `pi -e`
