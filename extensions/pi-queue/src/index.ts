import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let queue: string[] = [];

  pi.registerCommand("queue", {
    description: "Queue a message to send after the current turn settles. No args = show queue.",
    handler: async (args, ctx) => {
      if (!args.trim()) {
        if (queue.length === 0) {
          ctx.ui.notify("Queue is empty. /queue <message> to add.", "info");
        } else {
          const display = queue.map((m, i) => `${i + 1}. ${m}`).join("\n");
          ctx.ui.notify(`Queued (${queue.length}):\n${display}`, "info");
        }
        return;
      }
      queue.push(args.trim());
      ctx.ui.notify(`Queued #${queue.length}: "${args.trim()}"`, "info");
    },
  });

  pi.registerCommand("queue-clear", {
    description: "Clear all queued messages",
    handler: async (_args, ctx) => {
      const count = queue.length;
      queue = [];
      ctx.ui.notify(count ? `Cleared ${count} queued message(s)` : "Queue already empty", "info");
    },
  });

  pi.on("agent_settled", async () => {
    if (queue.length === 0) return;
    const next = queue.shift()!;
    pi.sendUserMessage(next);
  });

  pi.on("session_start", async (_event, ctx) => {
    queue = [];
    for (const entry of ctx.sessionManager.getEntries()) {
      if (entry.type === "custom" && entry.customType === "piverse-queue-state") {
        queue = (entry.data as { queue: string[] }).queue ?? [];
      }
    }
  });

  pi.on("session_shutdown", async () => {
    if (queue.length > 0) {
      pi.appendEntry("piverse-queue-state", { queue });
    }
  });
}
