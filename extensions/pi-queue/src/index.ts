import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let queue: string[] = [];
  let paused = false;
  let lastTurnHadError = false;
  let drainTotal = 0;
  let flushing = false;

  // Register command under both /queue-* and /q-* names
  function cmd(name: string, description: string, handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>) {
    const opts = { description, handler };
    pi.registerCommand(`queue${name}`, opts);
    pi.registerCommand(`q${name}`, opts);
  }

  cmd("", "Queue a message to send after the current turn settles. No args = show queue.", async (args, ctx) => {
    if (!args.trim()) {
      if (queue.length === 0) {
        ctx.ui.notify(
          paused
            ? "Queue is empty and paused. /queue <message> to add."
            : "Queue is empty. /queue <message> to add.",
          "info"
        );
      } else {
        const label = paused ? `Queued (${queue.length}, PAUSED)` : `Queued (${queue.length})`;
        const display = queue.map((m, i) => `${i + 1}. ${m}`).join("\n");
        ctx.ui.notify(`${label}:\n${display}`, "info");
      }
      return;
    }
    queue.push(args.trim());
    ctx.ui.notify(`Queued #${queue.length}: "${args.trim()}"`, "info");
  });

  cmd("-clear", "Clear all queued messages", async (_args, ctx) => {
    const count = queue.length;
    queue = [];
    ctx.ui.notify(count ? `Cleared ${count} queued message(s)` : "Queue already empty", "info");
  });

  cmd("-pause", "Pause queue auto-firing", async (_args, ctx) => {
    paused = true;
    ctx.ui.notify("Queue paused.", "info");
  });

  cmd("-resume", "Resume queue auto-firing", async (_args, ctx) => {
    paused = false;
    if (queue.length > 0) {
      ctx.ui.notify(`Queue resumed. Firing next (${queue.length} remaining).`, "info");
      const next = queue.shift()!;
      const opts = next.startsWith("/") ? { expandPromptTemplates: true } : {};
      pi.sendUserMessage(next, opts);
    } else {
      ctx.ui.notify("Queue resumed (empty).", "info");
    }
  });

  cmd("-flush", "Drain all remaining queued messages, one per turn, ignoring pause/error stop", async (_args, ctx) => {
    if (queue.length === 0) {
      ctx.ui.notify("Queue already empty.", "info");
      return;
    }
    flushing = true;
    paused = false;
    ctx.ui.notify(`Flush armed — firing all ${queue.length} remaining, one per turn.`, "info");
  });

  cmd("-rm", "Remove a queued item by index (1-based)", async (args, ctx) => {
    const idx = parseInt(args.trim(), 10);
    if (isNaN(idx) || idx < 1 || idx > queue.length) {
      ctx.ui.notify(`Invalid index. Use 1-${queue.length}.`, "warning");
      return;
    }
    const [removed] = queue.splice(idx - 1, 1);
    ctx.ui.notify(`Removed #${idx}: "${removed}" (${queue.length} remaining)`, "info");
  });

  cmd("-next", "Insert a message at the front of the queue (fires next)", async (args, ctx) => {
    const msg = args.trim();
    if (!msg) {
      ctx.ui.notify("Usage: /queue-next <message>", "warning");
      return;
    }
    queue.unshift(msg);
    ctx.ui.notify(`Inserted at #1: "${msg}" (${queue.length} total)`, "info");
  });

  cmd("-file", "Queue messages from a file (one per line, # comments skipped)", async (args, ctx) => {
    const filePath = args.trim();
    if (!filePath) {
      ctx.ui.notify("Usage: /queue-file <path>", "warning");
      return;
    }
    const resolved = resolve(process.cwd(), filePath);
    let content: string;
    try {
      content = readFileSync(resolved, "utf-8");
    } catch {
      ctx.ui.notify(`Cannot read file: ${resolved}`, "error");
      return;
    }
    const lines = content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    for (const line of lines) queue.push(line.trim());
    ctx.ui.notify(`Queued ${lines.length} item(s) from ${filePath}`, "info");
  });

  pi.on("tool_result", async (event) => {
    if (event.isError) lastTurnHadError = true;
  });

  pi.on("agent_settled", async (_event, ctx) => {
    if (queue.length === 0) {
      drainTotal = 0;
      flushing = false;
      return;
    }
    if (!flushing) {
      if (lastTurnHadError) {
        paused = true;
        lastTurnHadError = false;
        ctx.ui.notify("Queue paused — previous turn had errors. /queue-resume to continue.", "warning");
        return;
      }
      if (paused) return;
    }
    lastTurnHadError = false;

    // Track progress
    if (drainTotal === 0) drainTotal = queue.length;
    const current = drainTotal - queue.length + 1;
    ctx.ui.notify(`Queue: running ${current}/${drainTotal}`, "info");

    const next = queue.shift()!;
    const opts = next.startsWith("/") ? { expandPromptTemplates: true } : {};
    pi.sendUserMessage(next, opts);
  });

  pi.on("session_start", async (_event, ctx) => {
    queue = [];
    paused = false;
    flushing = false;
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === "piverse-queue-state") {
        const data = entry.data as { queue: string[]; paused?: boolean };
        queue = data.queue ?? [];
        paused = data.paused ?? false;
      }
    }
  });

  pi.on("session_shutdown", async () => {
    if (queue.length > 0 || paused) {
      pi.appendEntry("piverse-queue-state", { queue, paused });
    }
  });
}
