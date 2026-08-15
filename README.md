# Piverse 🌌

A multi-extension ecosystem for the [Pi coding agent](https://pi.dev).

## Extensions

| Extension | Command | Description |
|-----------|---------|-------------|
| [pi-queue](./extensions/pi-queue) | `/queue` | Queue messages to run after the current agent turn settles |

## Install

```bash
pi install git:github.com/vs4vijay/piverse
```

## Usage

### `/queue <message>`

Queue a message that automatically sends after the current turn finishes.

```
/queue refactor the auth module next
/queue run the test suite
```

- `/queue` (no args) — show pending messages
- `/queue-clear` — empty the queue

Messages fire one at a time, in order, after each `agent_settled` event.

## Development

```bash
git clone git@github.com:vs4vijay/piverse.git ~/GitHub/piverse
```

### Hot-reload (symlink into Pi)

```bash
ln -sf ~/GitHub/piverse/extensions/pi-queue ~/.pi/agent/extensions/pi-queue
```

Edit source → `/reload` in Pi → changes are live. No build step.

### Quick test (no install)

```bash
pi -e ./extensions/pi-queue/src/index.ts
```

### Type checking

```bash
npm install
npm run typecheck
```

## Project Structure

```
piverse/
├── extensions/
│   ├── pi-queue/          # /queue - message queueing
│   └── ...                # more extensions coming
├── package.json           # workspace root
├── tsconfig.json          # shared type checking
└── README.md
```

## Contributing

1. Fork & clone
2. `mkdir extensions/pi-<name>/src`
3. Add `package.json` with `"pi": { "extensions": ["./src/index.ts"] }`
4. Implement in `src/index.ts`
5. Test with `pi -e ./extensions/pi-<name>/src/index.ts`
6. PR

## License

MIT
