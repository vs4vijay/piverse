# @vs4vijay/pi-notes

Project-level notes for the Pi coding agent. Persists notes as JSON in `.pi/notes/notes.json` (committed to git, team-shared).

## Install

```sh
pi install npm:@vs4vijay/pi-notes
```

Or add to your Pi config:

```json
{
  "pi": {
    "extensions": [
      "./extensions/pi-queue/src/index.ts",
      "./extensions/pi-notes/src/index.ts"
    ]
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `/notes` | Open TUI (list, view, create, edit, delete) |
| `/notes <title>` | Quick-add note with title (opens editor for content) |
| `/notes list` | List all notes in CLI |
| `/notes show <id>` | Show full note content |
| `/notes edit <id>` | Edit a note's title/content via external editor |
| `/notes rm <id>` | Delete note (with confirmation) |
| `/notes search <query>` | Search notes by title/content |
| `/notes tag <id> <tag>` | Add tag to note |
| `/notes untag <id> <tag>` | Remove tag from note |
| `/notes pin <id>` | Pin note to top of list |
| `/notes unpin <id>` | Unpin note |
| `/notes export [path]` | Export all notes to a JSON file (default: `./notes.json`) |
| `/notes import <path>` | Import and merge notes from a JSON file |

## TUI Interface

```
/notes
```

Opens full-screen TUI with:

- **Left pane**: Note list (title + preview, live filter as you type)
- **Right pane**: Markdown preview of selected note
- **Keys**:
  - `↑/↓` / `j/k` — navigate
  - `Enter` — view full note
  - `n` — new note
  - `e` — edit selected
  - `d` — delete selected (with confirmation)
  - `p` — toggle pin
  - `/` — start filtering: type to filter the list live, `Esc`/`Enter` to finish
  - `q` / `Esc` — quit (or back from view/edit)

### View Mode
Full markdown render. Keys: `e` to edit, `q`/`Esc` back to list.

### Create/Edit Mode
Opens external editor via `ctx.ui.editor()` for title and content. On save, persists and returns to list.

## Persistence

- File: `.pi/notes/notes.json` in project root
- Format:
```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "Architecture decisions",
      "content": "# Architecture decisions\n\nKey choices...",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z",
      "tags": ["architecture", "decision"],
      "pinned": false
    }
  ],
  "version": 1
}
```
- Auto-saves on every mutation
- Loads on `session_start`, flushes on `session_shutdown`

## Usage / Examples

```
> /notes
# Opens the full-screen TUI (list, view, create, edit, delete)

> /notes "API contract"
# Quick-add: title is "API contract" (quotes stripped), opens editor for content

> /notes list
Notes (3):
1. 📌 API contract — Endpoint specs for v2...
2. TODO: refactor auth [backend] — Pending work items...
3. Architecture decisions — Summary of key choices...

> /notes show a1b2c3
# API contract
Pinned  |  Tags: none  |  Created: 2025-01-15T10:30:00.000Z  |  Updated: 2025-01-16T09:12:00.000Z

## Endpoints
...

> /notes search refactor
Search results (1):
1. TODO: refactor auth [backend] — Pending work items...

> /notes tag a1b2c3 api
Added tag "api" to "API contract"

> /notes untag a1b2c3 api
Removed tag "api" from "API contract"

> /notes pin a1b2c3
Pinned "API contract"

> /notes unpin a1b2c3
Unpinned "API contract"

> /notes edit a1b2c3
# Opens external editors prefilled with the note's current title and content
Updated note: API contract

> /notes export
Exported 3 notes to /path/to/project/notes.json

> /notes export backup.json
Exported 3 notes to /path/to/project/backup.json

> /notes import backup.json
Imported 2 note(s) from /path/to/project/backup.json (1 already present, skipped)

> /notes rm a1b2c3
# Confirmation dialog... "Deleted note: API contract"
```

### Export/Import format

`/notes export` writes the same JSON shape used for persistence. `/notes import` reads a file shaped like `{ "notes": [...], "version": 1 }` and **merges** it into the store: notes whose `id` already exists locally are skipped (existing notes win), new ids are appended.

## Roadmap

See [plan.md](./plan.md) for planned features: linking, templates, and other ideas.