# Piverse

A multi-extension ecosystem for the [Pi coding agent](https://github.com/earendil-works/pi).

## Extensions

| Extension | Description |
|-----------|-------------|
| [@piverse/queue](./extensions/pi-queue) | Queue messages to run after the current turn settles |

## Development

### Quick test (single extension)

```bash
pi -e ./extensions/pi-queue/src/index.ts
```

### Hot-reload via symlink

Link an extension into Pi's auto-discovery directory:

```bash
ln -sf ~/GitHub/piverse/extensions/pi-queue ~/.pi/agent/extensions/pi-queue
```

Then `/reload` inside Pi to pick up changes.

### Type checking

```bash
npm run typecheck
```

## Structure

```
piverse/
├── extensions/
│   ├── pi-queue/        # /queue - message queueing
│   └── ...              # future extensions
├── package.json         # workspace root
└── tsconfig.json        # shared type checking
```
