# @vs4vijay/pi-extension-template

An onboarding skill that scaffolds new Pi extensions following the conventions used
in the [piverse](https://github.com/vs4vijay/piverse) ecosystem — project structure,
naming, `package.json` metadata, and code/pattern conventions from `pi-queue` and
`pi-notes`.

## Install

```sh
pi install npm:@vs4vijay/pi-extension-template
```

## Usage

Invoke the skill when you want to add a new extension to the piverse monorepo. It
walks through:

1. **Project structure & naming** — `extensions/pi-<name>/` layout, `src/index.ts`
   entry, the `@vs4vijay/pi-<name>` npm scope, and the `pi-package` keyword.
2. **Code conventions & patterns** — `ExtensionAPI` default export, `pi.registerCommand`,
   lifecycle hooks (`session_start`, `session_shutdown`, `agent_settled`), the
   file-backed atomic store pattern, CLI UX (`ctx.ui.notify/confirm/editor`), and the
   optional Pi-TUI pattern.

## How it works

- Ships a `SKILL.md` under the package's `skills/` directory, exposed to Pi via the
  `pi.skills` manifest.
- Encodes the real patterns already in the repo; reference the skill when creating a
  new `extensions/pi-<name>/` package.
- The skill covers structure/naming and code conventions; for dev/test and
  publish/release workflow, see the repo's README and `.github/workflows/release.yml`.

## Development

Validate the skill text and scaffold from the repo root:

```sh
npm run typecheck
ls extensions/pi-extension-template/skills/onboard-pi-extension/
```
