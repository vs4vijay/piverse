# @vs4vijay/pi-queue

Queue messages to run after the current Pi agent turn settles.

## Install

Install from npm, then add it to your pi config:

```
pi install npm:@vs4vijay/pi-queue
```

In your pi config, reference the package as an extension:

```json
{
  "pi": {
    "extensions": ["@vs4vijay/pi-queue"]
  }
}
```

Or, when developing in this repo, reference the extension path directly:

```json
{
  "pi": {
    "extensions": ["./extensions/pi-queue/src/index.ts"]
  }
}
```

## Commands

All commands are available as both `/queue-*` and `/q-*`.

| Command | Alias | Description |
|---------|-------|-------------|
| `/queue <message>` | `/q <message>` | Add a message to the queue |
| `/queue` | `/q` | Show pending messages with index numbers |
| `/queue-clear` | `/q-clear` | Clear all queued messages |
| `/queue-pause` | `/q-pause` | Pause auto-firing (queue stays intact) |
| `/queue-resume` | `/q-resume` | Resume auto-firing and fire next immediately |
| `/queue-flush` | `/q-flush` | Drain all remaining messages, one per turn, ignoring pause / error stop |
| `/queue-rm <index>` | `/q-rm <index>` | Remove item at position (1-based) |
| `/queue-next <msg>` | `/q-next <msg>` | Insert message at front (fires next) |
| `/queue-file <path>` | `/q-file <path>` | Queue lines from a file (skips `#` comments) |

## How It Works

Queued messages are intentionally delivered **after** the current turn settles. The extension listens for the `agent_settled` event and only then fires the next message as a new user message — so follow-ups you queue mid-run never interrupt the turn in progress. They execute cleanly afterwards, one at a time.

1. You `/q` one or more messages while the agent is working (or idle).
2. The extension listens for the `agent_settled` event — fired when the agent fully settles.
3. On settle, the next queued message fires as a new user message via `pi.sendUserMessage()`.
4. Messages execute one at a time, in FIFO order.
5. Slash commands (messages starting with `/`) are dispatched through the command system automatically.

## Example usage

Queue follow-ups while the agent is working:

```
> /queue refactor the auth module next
Queued #1: "refactor the auth module next"

> /queue run the test suite
Queued #2: "run the test suite"

> /queue
Queued (2):
1. refactor the auth module next
2. run the test suite
```

Once the current turn settles, the queued messages fire one at a time as new user messages:

```
→ Queue: running 1/2   # "refactor the auth module next" is sent
→ Queue: running 2/2   # "run the test suite" is sent
```

Changed your mind? Clear the queue instead:

```
> /queue-clear
Cleared 2 queued message(s)
```

With nothing queued:

```
> /queue
Queue is empty. /queue <message> to add.
```

If the queue is paused and empty:

```
> /queue-pause
Queue paused.

> /queue
Queue is empty and paused. /queue <message> to add.
```

## Features

### Stop on Error

If a tool error occurs during a turn, the queue auto-pauses and notifies you. Use `/q-resume` to continue, or `/q-rm` to skip the problematic next item.

### Progress

During a drain sequence, you'll see: `Queue: running 2/5` — showing which item is firing out of the total batch.

### Queue from File

Load a batch of messages from a file:

```
# tasks.txt
add error handling to the auth module
write tests for it
# this line is skipped
update the README
```

```
/q-file tasks.txt
→ Queued 3 item(s) from tasks.txt
```

### Flush

`/q-flush` drains **all** remaining queued messages back-to-back, one per turn — overriding both a manual pause and the stop-on-error behavior. Useful when you want the whole backlog fired off at once regardless of a mid-batch error.

```
> /q-flush
Flush armed — firing all 3 remaining, one per turn.
→ Queue: running 1/3
→ Queue: running 2/3
→ Queue: running 3/3
```

Running `/q-flush` on an empty queue reports `Queue already empty.`

## Persistence

Queue state and pause flag persist across `/reload` and session restarts via `session_shutdown`/`session_start` hooks.

## Example

```
> /q add error handling to the auth module
Queued #1: "add error handling to the auth module"

> /q write tests for it
Queued #2: "write tests for it"

> /q
Queued (2):
1. add error handling to the auth module
2. write tests for it

> /q-next fix the lint errors first
Inserted at #1: "fix the lint errors first" (3 total)

> /q-pause
Queue paused.

> /q-rm 3
Removed #3: "write tests for it" (2 remaining)

> /q-resume
Queue resumed. Firing next (2 remaining).
→ Queue: running 1/2
```
