# @piverse/queue

Queue messages to run after the current Pi agent turn settles.

## Install

Add `@vs4vijay/piverse` to your pi config, or reference the extension path directly:

```json
{
  "pi": {
    "extensions": ["./extensions/pi-queue/src/index.ts"]
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `/queue <message>` | Add a message to the queue |
| `/queue` | Show pending messages with index numbers |
| `/queue-clear` | Clear all queued messages |

## How It Works

1. You `/queue` one or more messages while the agent is working (or idle).
2. The extension listens for the `agent_settled` event — fired when the agent fully settles (no retries, no follow-ups).
3. On settle, the next queued message fires as a new user message via `pi.sendUserMessage()`.
4. Messages execute one at a time, in FIFO order.
5. Queue state persists across `/reload` and session restarts via `session_shutdown`/`session_start` hooks.

## Persistence

On `session_shutdown`, any remaining queue is saved as a custom session entry (`piverse-queue-state`). On `session_start`, the extension restores the queue from that entry. This means you can restart your session without losing queued work.

## Example

```
> /queue add error handling to the auth module
Queued #1: "add error handling to the auth module"

> /queue write tests for it
Queued #2: "write tests for it"

> /queue
Queued (2):
1. add error handling to the auth module
2. write tests for it
```

After the current turn finishes → "add error handling to the auth module" sends automatically → once that settles → "write tests for it" sends.

## Roadmap

See [plan.md](./plan.md) for planned features: pause/resume, stop-on-error, reorder, batch input, progress tracking, and more.
