# pi-queue — Feature Plan

## Current State

FIFO message queue that fires after each agent turn settles. Commands: `/queue <msg>`, `/queue` (show), `/queue-clear`, `/queue-pause`, `/queue-resume`, `/queue-flush`, `/queue-rm`, `/queue-next`, `/queue-file`. Persists across session restarts. Auto-pauses on tool error; flushes override both pause and error stop.

All planned features below are implemented.

---

## Planned Features

### 1. Alias: `/q`

- Register `/q` as an alias for `/queue` (same handler).
- Similarly `/q-pause`, `/q-resume`, `/q-rm`, `/q-next`, `/q-file`, `/q-clear`.
- Shorter to type during fast workflows.
- **Done.**

### 2. Pause / Resume

- `/queue-pause` — stops auto-firing on `agent_settled`. Queue stays intact.
- `/queue-resume` — re-enables auto-firing and immediately fires next if agent is idle.
- Show paused state in `/queue` output (e.g., `"Queued (3, PAUSED)"`); when paused and empty, show a combined empty+paused message.
- **Done.**

### 3. Remove / Priority Insert

- `/queue-rm <index>` — remove item at position (1-based).
- `/queue-next <message>` — insert at position 1 (fire next).
- **Done.**

### 4. Stop on Error

- If the agent's previous turn produced an error (tool failure, error event), auto-pause the queue.
- Notify: `"Queue paused — previous turn had errors. /queue-resume to continue."`.
- Error detection: watch `tool_result` events for `isError`.
- **Done.**

### 5. Progress Notification

- On each `agent_settled` drain, notify: `"Queue: running 2/5"`.
- Track total at start of drain batch vs remaining.
- Reset counter when queue empties or new items are added after drain completes.
- **Done.**

### 6. Queue from File

- `/queue-file <path>` — read file, each non-empty line becomes a queued message.
- Skip lines starting with `#` (comments).
- Report count added.
- **Done.**

### 7. Flush

- `/queue-flush` — arm a drain that fires **all** remaining messages, one per `agent_settled`, ignoring both the manual pause and the stop-on-error pause, until the queue is empty.
- Repeatedly sending `pi.sendUserMessage` one per turn keeps the extension's "fire after settle, one at a time" model intact and lets each message complete cleanly.
- **Done.**

---

## Implementation Order

| Phase | Features | Reason |
|-------|----------|--------|
| 1 | Alias, Pause/Resume, Remove, Queue-next | Steer a running queue |
| 2 | Stop on Error, Progress | Safety + visibility |
| 3 | Queue from File | Batch input |
| 4 | Flush | Drain the whole backlog on demand |

---

## Notes

- All commands register via `pi.registerCommand`. Each command gets both `/queue-*` and `/q-*` variants.
- State additions (pause flag, progress counter) persist via existing `session_shutdown`/`session_start` pattern. The transient `flushing` flag resets on empty and on session start.
- The queue sends messages as-is — shell commands ("run npm test") work because the agent interprets them like any user message.
- Slash commands (e.g., `/review src/index.ts`, `/commit`) are supported: when a queued message starts with `/`, pass `{ expandPromptTemplates: true }` to `pi.sendUserMessage()` so it routes through the command dispatcher instead of going to the agent as plain text.
- Handlers type their context as `ExtensionCommandContext` from `@earendil-works/pi-coding-agent`.
