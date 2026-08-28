/**
 * pi-notes — Project-level notes for Pi coding agent
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getNoteStore, resetNoteStore } from "./store.js";
import type { Note } from "./types.js";
import { parseNotesCommand, type ParsedCommand } from "./types.js";
import { createNotesTUI } from "./tui.js";

let tuiHandle: (() => void) | null = null;

export default async function (pi: ExtensionAPI) {
  // Initialize store on session start
  pi.on("session_start", async (_event, ctx) => {
    resetNoteStore(); // Ensure fresh instance per session
    const store = getNoteStore(ctx.cwd);
    await store.load();
  });

  // Save on shutdown
  pi.on("session_shutdown", async () => {
    // Store auto-saves on mutations, but ensure final flush
    const store = getNoteStore();
    const notes = await store.getAll();
    await store.save(notes);
  });

  // Main /notes command
  pi.registerCommand("notes", {
    description: "Project notes — TUI (no args) or quick-add: /notes <title>",
    handler: async (args, ctx) => {
      const parsed = parseNotesCommand(args);
      const store = getNoteStore(ctx.cwd);
      const notes = await store.getAll();

      // Handle subcommands
      switch (parsed.subcommand) {
        case "list":
          await handleList(notes, ctx);
          return;
        case "show":
          await handleShow(parsed.args, notes, ctx);
          return;
        case "rm":
          await handleRemove(parsed.args, store, ctx);
          return;
        case "search":
          await handleSearch(parsed.args, notes, ctx);
          return;
        case "tag":
          await handleTag(parsed.args, store, ctx);
          return;
        case "untag":
          await handleUntag(parsed.args, store, ctx);
          return;
        case "pin":
          await handlePin(parsed.args, store, ctx);
          return;
        case "unpin":
          await handleUnpin(parsed.args, store, ctx);
          return;
        default:
          // Quick-add or open TUI
          if (parsed.args.length > 0) {
            await handleQuickAdd(parsed.args.join(" "), store, ctx);
          } else {
            await openTUI(ctx, notes);
          }
      }
    },
  });
}

async function handleList(notes: Note[], ctx: ExtensionCommandContext): Promise<void> {
  if (notes.length === 0) {
    ctx.ui.notify("No notes yet. Use /notes <title> to create one.", "info");
    return;
  }

  const lines = notes.map((n, i) => {
    const pin = n.pinned ? "📌 " : "";
    const tags = n.tags?.length ? ` [${n.tags.join(", ")}]` : "";
    const preview = n.content.slice(0, 50).replace(/\n/g, " ");
    return `${i + 1}. ${pin}${n.title}${tags} — ${preview}`;
  });

  ctx.ui.notify(`Notes (${notes.length}):\n${lines.join("\n")}`, "info");
}

async function handleShow(args: string[], notes: Note[], ctx: ExtensionCommandContext): Promise<void> {
  if (args.length === 0) {
    ctx.ui.notify("Usage: /notes show <id>", "error");
    return;
  }

  const id = args[0];
  const note = notes.find((n) => n.id === id || n.id.startsWith(id));

  if (!note) {
    ctx.ui.notify(`Note not found: ${id}`, "error");
    return;
  }

  const meta = `📌 ${note.pinned ? "pinned" : ""}  |  Tags: ${note.tags?.join(", ") || "none"}  |  Created: ${note.createdAt}  |  Updated: ${note.updatedAt}`;
  ctx.ui.notify(`# ${note.title}\n${meta}\n\n${note.content || "*(empty)*"}`, "info");
}

async function handleRemove(args: string[], store: ReturnType<typeof getNoteStore>, ctx: ExtensionCommandContext): Promise<void> {
  if (args.length === 0) {
    ctx.ui.notify("Usage: /notes rm <id>", "error");
    return;
  }

  const id = args[0];
  const notes = await store.getAll();
  const note = notes.find((n) => n.id === id || n.id.startsWith(id));

  if (!note) {
    ctx.ui.notify(`Note not found: ${id}`, "error");
    return;
  }

  // Confirm via TUI confirm dialog
  const confirmed = await ctx.ui.confirm(
    "Delete note",
    `Delete "${note.title}"? This cannot be undone.`
  );

  if (confirmed) {
    const deleted = await store.delete(id);
    if (deleted) {
      ctx.ui.notify(`Deleted note: ${note.title}`, "info");
    } else {
      ctx.ui.notify("Delete failed", "error");
    }
  }
}

async function handleSearch(args: string[], notes: Note[], ctx: ExtensionCommandContext): Promise<void> {
  if (args.length === 0) {
    ctx.ui.notify("Usage: /notes search <query>", "error");
    return;
  }

  const query = args.join(" ").toLowerCase();
  const results = notes.filter(
    (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
  );

  if (results.length === 0) {
    ctx.ui.notify(`No notes matching: ${query}`, "info");
    return;
  }

  const lines = results.map((n, i) => {
    const pin = n.pinned ? "📌 " : "";
    const preview = n.content.slice(0, 50).replace(/\n/g, " ");
    return `${i + 1}. ${pin}${n.title} — ${preview}`;
  });

  ctx.ui.notify(`Search results (${results.length}):\n${lines.join("\n")}`, "info");
}

async function handleTag(args: string[], store: ReturnType<typeof getNoteStore>, ctx: ExtensionCommandContext): Promise<void> {
  if (args.length < 2) {
    ctx.ui.notify("Usage: /notes tag <id> <tag>", "error");
    return;
  }

  const [id, tag] = args;
  const note = await store.getById(id);

  if (!note) {
    ctx.ui.notify(`Note not found: ${id}`, "error");
    return;
  }

  const tags = [...new Set([...(note.tags || []), tag])];
  await store.update(id, { tags });
  ctx.ui.notify(`Added tag "${tag}" to "${note.title}"`, "info");
}

async function handleUntag(args: string[], store: ReturnType<typeof getNoteStore>, ctx: ExtensionCommandContext): Promise<void> {
  if (args.length < 2) {
    ctx.ui.notify("Usage: /notes untag <id> <tag>", "error");
    return;
  }

  const [id, tag] = args;
  const note = await store.getById(id);

  if (!note) {
    ctx.ui.notify(`Note not found: ${id}`, "error");
    return;
  }

  const tags = (note.tags || []).filter((t) => t !== tag);
  await store.update(id, { tags });
  ctx.ui.notify(`Removed tag "${tag}" from "${note.title}"`, "info");
}

async function handlePin(args: string[], store: ReturnType<typeof getNoteStore>, ctx: ExtensionCommandContext): Promise<void> {
  if (args.length === 0) {
    ctx.ui.notify("Usage: /notes pin <id>", "error");
    return;
  }

  const id = args[0];
  const note = await store.getById(id);

  if (!note) {
    ctx.ui.notify(`Note not found: ${id}`, "error");
    return;
  }

  await store.update(id, { pinned: true });
  ctx.ui.notify(`Pinned "${note.title}"`, "info");
}

async function handleUnpin(args: string[], store: ReturnType<typeof getNoteStore>, ctx: ExtensionCommandContext): Promise<void> {
  if (args.length === 0) {
    ctx.ui.notify("Usage: /notes unpin <id>", "error");
    return;
  }

  const id = args[0];
  const note = await store.getById(id);

  if (!note) {
    ctx.ui.notify(`Note not found: ${id}`, "error");
    return;
  }

  await store.update(id, { pinned: false });
  ctx.ui.notify(`Unpinned "${note.title}"`, "info");
}

async function handleQuickAdd(title: string, store: ReturnType<typeof getNoteStore>, ctx: ExtensionCommandContext): Promise<void> {
  // Strip surrounding quotes from a quoted title
  title = title.replace(/^(['"])(.*)\1$/, "$2");

  // Open external editor for content
  const content = await ctx.ui.editor(`New note: ${title}`, "");

  if (content === undefined) {
    ctx.ui.notify("Cancelled", "info");
    return;
  }

  const note = await store.create(title, content);
  ctx.ui.notify(`Created note: ${note.title}`, "info");
}

async function openTUI(ctx: ExtensionCommandContext, initialNotes: Note[]): Promise<void> {
  // Create TUI component
  const component = createNotesTUI(
    initialNotes,
    ctx.ui.theme as any, // TUI type
    ctx.ui.theme,
    () => {
      // onClose
      tuiHandle?.();
      tuiHandle = null;
    },
    async (note: Note) => {
      // onSave - handled internally by TUI
    },
    async (id: string) => {
      // onDelete - handled internally by TUI
    }
  );

  // Inject editor callback into TUI for external editor support
  const tuiRef = (ctx.ui as any).tui; // Access underlying TUI instance
  if (tuiRef) {
    (tuiRef as any)._piEditorCallback = async (editingNote?: Note) => {
      const title = await ctx.ui.editor(
        editingNote ? `Edit: ${editingNote.title}` : "New Note",
        editingNote?.title || ""
      );

      if (title === undefined) return; // Cancelled

      const content = await ctx.ui.editor(
        `Content for: ${title}`,
        editingNote?.content || ""
      );

      if (content === undefined) return; // Cancelled

      // Find the TUI component and call onEditorResult
      // This is a bit hacky - better approach would be to pass callbacks
      const store = getNoteStore(ctx.cwd);
      if (editingNote) {
        await store.update(editingNote.id, { title, content });
      } else {
        await store.create(title, content);
      }

      // Refresh TUI notes
      const notes = await store.getAll();
      // Need to trigger TUI refresh - for now just close and reopen
      tuiHandle?.();
      await openTUI(ctx, notes);
    };
  }

  // Show custom overlay
  const result = await ctx.ui.custom(
    (tui, theme, keybindings, done) => {
      // The component is already a Focusable Component
      tuiHandle = () => done(undefined);
      return component;
    },
    { overlay: true, overlayOptions: { width: "100%", maxHeight: "100%" } }
  );
}