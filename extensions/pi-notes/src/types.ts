/**
 * pi-notes type definitions
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  tags?: string[];
  pinned?: boolean;
}

export interface NotesState {
  notes: Note[];
  version: number; // for future migrations
}

export type Subcommand = "list" | "show" | "rm" | "edit" | "search" | "tag" | "untag" | "pin" | "unpin" | "export" | "import" | "";

export interface ParsedCommand {
  subcommand: Subcommand;
  args: string[]; // remaining arguments after subcommand
}

export function parseNotesCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { subcommand: "", args: [] };
  }

  const parts = trimmed.split(/\s+/);
  const first = parts[0];

  const subcommands: Subcommand[] = [
    "list",
    "show",
    "rm",
    "edit",
    "search",
    "tag",
    "untag",
    "pin",
    "unpin",
    "export",
    "import",
  ];

  if (subcommands.includes(first as Subcommand)) {
    return { subcommand: first as Subcommand, args: parts.slice(1) };
  }

  // No recognized subcommand — treat entire input as title for quick-add
  return { subcommand: "", args: [trimmed] };
}

export const NOTES_DIR = ".pi/notes";
export const NOTES_FILE = "notes.json";
export const TEMPLATES_DIR = "templates";
