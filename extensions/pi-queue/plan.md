# pi-queue — Feature Plan

## Current State

FIFO message queue that fires after each agent turn settles. Commands: `/queue <msg>`, `/queue` (show), `/queue-clear`. Persists across session restarts.

---

## Planned Features

### 1. Alias: `/q`

- Register `/q` as an alias for `/queue` (same handler).
- Similarly `/q-pause`, `/q-resume`, `/q-rm`, `/q-next`, `/q-file`, `/q-clear`.
- Shorter to type during fast workflows.

### 2. Pause / Resume

- `/queue-pause` — stops auto-firing on `agent_settled`. Queue stays intact.
- `/queue-resume` — re-enables auto-firing and immediately fires next if agent is idle.
- Show paused state in `/queue` output (e.g., `"Queued (3, PAUSED)"`).

### 3. Remove / Priority Insert

- `/queue-rm <index>` — remove item at position (1-based).
- `/queue-next <message>` — insert at position 1 (fire next).

### 4. Stop on Error

- If the agent's previous turn produced an error (tool failure, error event), auto-pause the queue.
- Notify: `"Queue paused — previous turn had errors. /queue-resume to continue."`.
- Error detection: listen for error events via `pi.on("error", ...)` or heuristic based on available API.

### 5. Progress Notification

- On each `agent_settled` drain, notify: `"Queue: running 2/5"`.
- Track total at start of drain batch vs remaining.
- Reset counter when queue empties or new items are added after drain completes.

### 6. Queue from File

- `/queue-file <path>` — read file, each non-empty line becomes a queued message.
- Skip lines starting with `#` (comments).
- Report count added.

---

## Implementation Order

| Phase | Features | Reason |
|-------|----------|--------|
| 1 | Alias, Pause/Resume, Remove, Queue-next | Steer a running queue |
| 2 | Stop on Error, Progress | Safety + visibility |
| 3 | Queue from File | Batch input |

---

## Notes

- All commands register via `pi.registerCommand`. Each command gets both `/queue-*` and `/q-*` variants.
- State additions (pause flag, progress counter) persist via existing `session_shutdown`/`session_start` pattern.
- The queue sends messages as-is — shell commands ("run npm test") work because the agent interprets them like any user message.
- Slash commands (e.g., `/review src/index.ts`, `/commit`) are supported: when a queued message starts with `/`, pass `{ expandPromptTemplates: true }` to `pi.sendUserMessage()` so it routes through the command dispatcher instead of going to the agent as plain text.
- Error detection scope TBD based on available API hooks.
