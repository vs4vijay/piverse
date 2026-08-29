# pi-notes — Feature Plan

## Current State

Project-level note-taking extension for Pi coding agent. Persists notes as JSON in `.pi/notes/notes.json`. Primary interface is a TUI opened via `/notes`, with CLI fallbacks for common operations.

**Implemented:** MVP (store, core commands, TUI), CLI + TUI search, tags, pinning, external-editor title/content editing (`edit`), and JSON export/import. Stores are cached per-project so multi-project sessions don't collide.

---

## Planned Features

### Phase 1: Foundation (MVP)

#### 1.1 Note Store & Persistence
- Load notes from `.pi/notes/notes.json` on `session_start`
- Save notes after every mutation (create/update/delete)
- Also save on `session_shutdown` (safety net)
- Create directory `.pi/notes/` if missing
- Note schema: `{ id: string, title: string, content: string, createdAt: ISO, updatedAt: ISO }`
- ID generation: `crypto.randomUUID()`

#### 1.2 Core Commands
| Command | Behavior |
|---------|----------|
| `/notes` | Open TUI (list/view/edit/create) |
| `/notes <title>` | Quick-add note with title (opens editor for content) |
| `/notes list` | CLI: list all notes with index, title, preview |
| `/notes show <id>` | CLI: print full note content (markdown) |
| `/notes rm <id>` | CLI: delete note by ID (with confirmation) |

#### 1.3 TUI — List View
- Full-screen overlay via `ctx.ui.custom()`
- Left pane: `SelectList` of notes (title + first 60 chars of content)
- Right pane: `Markdown` preview of selected note
- Keys: `↑/↓` navigate, `Enter` view full, `n` new, `e` edit, `d` delete, `q` quit
- Header: "Pi Notes  [n] new  [q] quit"
- Fuzzy filter on type (like session selector)

#### 1.4 TUI — View Mode
- Full-screen markdown render of selected note
- Keys: `q`/`Esc` back to list, `e` edit

#### 1.5 TUI — Create/Edit Mode
- `ctx.ui.editor(title, prefill)` for title + content
- On save: persist, return to list with new/updated note selected
- On cancel: return to list unchanged

---

### Phase 2: Quality of Life

#### 2.1 Search & Filter
- `/notes search <query>` — CLI: filter notes by title/content match
- TUI: live filter as you type (`/` to start, type to filter, `Esc`/`Enter` to finish)
- Show match count in header

#### 2.2 Tags (Frontmatter Extension)
- Optional tags in note frontmatter: `tags: ["architecture", "decision"]`
- `/notes tag <id> <tag>` — add tag
- `/notes untag <id> <tag>` — remove tag
- TUI: filter by tag (`t` key cycles tag filters)
- CLI: `/notes list --tag <tag>`

#### 2.3 Pinning
- `/notes pin <id>` / `/notes unpin <id>` — pin to top of list
- TUI: `p` toggles pin, pinned notes show 📌 prefix
- Pinned notes sort above unpinned (both by updatedAt desc)

---

### Phase 3: Power Features

#### 3.1 Linking & References
- `[[note-id]]` or `[[note-title]]` syntax in content
- TUI: `Enter` on link navigates to linked note
- CLI: `/notes links <id>` — show backlinks

#### 3.2 Templates
- `/notes template <name>` — create note from template
- Built-in templates: `decision`, `meeting`, `todo`, `snippet`
- Templates stored in `.pi/notes/templates/*.md`

---

### Completed

#### Export/Import (CLI)
- `/notes export [path]` — export all notes as JSON (default `./notes.json` in cwd)
- `/notes import <path>` — import and merge from JSON; incoming notes whose `id` already exists are skipped (existing notes win)
- Reuses the atomic (temp + rename) write; validates the imported file shape

#### Title/Content Editing (CLI)
- `/notes edit <id>` — edit a note's title/content via external editor, prefilled with current values

#### Per-Project Store Caching
- `getNoteStore` caches one `NoteStore` per `cwd` (was a single global instance), so notes for different projects in one session don't collide
- `getNoteStore()` (no arg) defaults to `process.cwd()`

---

## Implementation Priority

| Phase | Features | Why |
|-------|----------|-----|
| 1 | Store, Core Commands, TUI (List/View/Edit) | Working note system end-to-end |
| 2 | Search, Tags, Pinning | Daily workflow improvements |
| 3 | Linking, Templates, Export | Advanced organization |

---

## Technical Notes

- All commands register via `pi.registerCommand("notes", ...)`
- Subcommands parsed from `args` string in handler
- TUI uses pi-tui: `SelectList`, `Markdown`, `Editor`, `VStack`, `HStack`, `Box`, `Text`
- Persistence: JSON file, atomic write (write temp → rename)
- Error handling: notify user via `ctx.ui.notify()`, never throw
- Follows Pi Queue patterns for `session_start`/`session_shutdown`

---

## File Structure

```
extensions/pi-notes/
├── src/
│   ├── index.ts        # Extension entry, command registration, hooks
│   ├── store.ts        # NoteStore class: load/save/CRUD
│   ├── tui.ts          # TUI components: ListView, ViewMode, EditorMode
│   └── types.ts        # Note interface, CommandArgs types
├── package.json
├── README.md
└── plan.md             # This file
```

---

## Acceptance Criteria (Phase 1)

- [ ] `/notes` opens TUI with empty list (first run)
- [ ] `/notes "My Title"` creates note, opens editor for content
- [ ] TUI: list shows notes, preview updates on selection
- [ ] TUI: `n` → editor → save → note appears in list
- [ ] TUI: `e` on selected → editor → save → updates note
- [ ] TUI: `d` on selected → confirm → removes note
- [ ] `/notes list` prints formatted table in CLI
- [ ] `/notes show <id>` prints full markdown
- [ ] `/notes rm <id>` confirms then deletes
- [ ] Notes persist across `/reload` and session restart
- [ ] TypeScript compiles without errors