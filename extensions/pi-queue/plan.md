# pi-queue — Feature Plan

## Current State

FIFO message queue that fires after each agent turn settles. Commands: `/queue <msg>`, `/queue` (show), `/queue-clear`. Persists across session restarts.

---

## Planned Features

### 1. Queue Control Flow

#### 1.1 Pause / Resume

- `/queue-pause` — stops auto-firing on `agent_settled`. Queue stays intact.
- `/queue-resume` — re-enables auto-firing and immediately fires next if agent is idle.
- Show paused state in `/queue` output.

#### 1.2 Stop on Error (Conditional Execution)

- Default behavior: if the agent's previous turn produced an error (tool failure, explicit error message), pause the queue automatically.
- `/queue-continue` — override and fire next anyway.
- Optional flag: `/queue --no-halt` when adding a message to mark it as "fire regardless of previous outcome".

#### 1.3 Remove / Reorder

- `/queue-rm <index>` — remove item at position (1-based).
- `/queue-move <from> <to>` — move item from one position to another.
- `/queue-next <message>` — insert at position 1 (priority/urgent).

---

### 2. Batch Input

#### 2.1 Queue from File

- `/queue-file <path>` — read file, each non-empty line becomes a queued message.
- Skip lines starting with `#` (comments).
- Report count added.

#### 2.2 Multi-add

- `/queue-batch "msg1" "msg2" "msg3"` — add multiple in one command.
- Parsing: split on quoted strings or newlines.

---

### 3. Visibility

#### 3.1 Progress

- On each `agent_settled` drain, notify: `"Queue: running 2/5"`.
- Track total queued at start of drain vs remaining.

#### 3.2 History

- Keep a log of executed messages this session: `{ message, startedAt, outcome }`.
- `/queue-history` — show what ran and whether it succeeded/failed.
- Outcome detection: listen for error events or heuristic (agent response contains error indicators).

---

### 4. Named Sequences (Saved Workflows)

- `/queue-save <name>` — save current queue contents as a named sequence.
- `/queue-run <name>` — load a saved sequence into the queue.
- `/queue-list-saved` — show all saved sequences.
- `/queue-delete-saved <name>` — remove a saved sequence.
- Storage: persist as a JSON file in the project or user config directory.

---

### 5. Delay / Throttle

- `/queue-delay <seconds>` — set a wait time between queue items.
- `/queue-delay 0` — disable (default).
- Useful for rate-limited workflows or giving the user time to scan output.

---

## Implementation Priority

| Phase | Features | Why |
|-------|----------|-----|
| 1 | Pause/Resume, Remove/Reorder, Queue-next | Steer a running queue — most immediate value |
| 2 | Stop on Error, Progress | Safety + visibility |
| 3 | Queue from File, Multi-add, History | Quality of life |
| 4 | Named Sequences, Delay | Power-user features, add when needed |

---

## Notes

- All new commands register via `pi.registerCommand`.
- State additions (pause flag, history, saved sequences) persist via the existing `session_shutdown`/`session_start` pattern.
- Error detection will need a heuristic or hook into agent error events — scope TBD based on available API.
