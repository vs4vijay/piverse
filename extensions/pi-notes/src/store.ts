/**
 * pi-notes store — load/save/CRUD for notes
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import type { Note, NotesState } from "./types.js";
import { NOTES_DIR, NOTES_FILE } from "./types.js";

export class NoteStore {
  private cwd: string;
  private notesPath: string;
  private cache: Note[] | null = null;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.notesPath = join(cwd, NOTES_DIR, NOTES_FILE);
  }

  async ensureDir(): Promise<void> {
    const dir = dirname(this.notesPath);
    await fs.mkdir(dir, { recursive: true });
  }

  async load(): Promise<Note[]> {
    if (this.cache) return this.cache;

    await this.ensureDir();

    try {
      const data = await fs.readFile(this.notesPath, "utf-8");
      const parsed = JSON.parse(data) as NotesState;
      this.cache = parsed.notes ?? [];
    } catch (err: any) {
      if (err.code === "ENOENT") {
        this.cache = [];
      } else {
        throw err;
      }
    }

    return this.cache;
  }

  async save(notes: Note[]): Promise<void> {
    await this.ensureDir();

    const state: NotesState = {
      notes,
      version: 1,
    };

    // Atomic write: write to temp then rename
    const tempPath = this.notesPath + ".tmp";
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), "utf-8");
    await fs.rename(tempPath, this.notesPath);

    this.cache = notes;
  }

  async getAll(): Promise<Note[]> {
    return this.load();
  }

  async getById(id: string): Promise<Note | undefined> {
    const notes = await this.load();
    return notes.find((n) => n.id === id);
  }

  async create(title: string, content: string = ""): Promise<Note> {
    const notes = await this.load();
    const now = new Date().toISOString();

    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
      tags: [],
      pinned: false,
    };

    // Pinned notes first, then by updatedAt desc
    notes.unshift(note);
    await this.save(notes);

    return note;
  }

  async update(id: string, updates: Partial<Pick<Note, "title" | "content" | "tags" | "pinned">>): Promise<Note | undefined> {
    const notes = await this.load();
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) return undefined;

    const updated: Note = {
      ...notes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    notes[index] = updated;

    // Re-sort: pinned first, then updatedAt desc
    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    await this.save(notes);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const notes = await this.load();
    const filtered = notes.filter((n) => n.id !== id);

    if (filtered.length === notes.length) return false;

    await this.save(filtered);
    return true;
  }

  async search(query: string): Promise<Note[]> {
    const notes = await this.load();
    const lower = query.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(lower) || n.content.toLowerCase().includes(lower)
    );
  }

  async exportTo(filePath: string): Promise<number> {
    const state: NotesState = {
      notes: await this.getAll(),
      version: 1,
    };
    const dir = dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tempPath = filePath + ".tmp";
    await fs.writeFile(tempPath, JSON.stringify(state, null, 2), "utf-8");
    await fs.rename(tempPath, filePath);
    return state.notes.length;
  }

  async importFrom(filePath: string): Promise<{ imported: number; skipped: number }> {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    const incoming = parseNotesState(parsed);

    const current = await this.getAll();
    const existingIds = new Set(current.map((n) => n.id));
    const merged = [...current];
    let imported = 0;

    for (const note of incoming) {
      if (existingIds.has(note.id)) continue;
      merged.push(note);
      existingIds.add(note.id);
      imported++;
    }

    merged.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    await this.save(merged);
    return { imported, skipped: incoming.length - imported };
  }
}

function parseNotesState(value: unknown): Note[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { notes?: unknown }).notes)) {
    throw new Error('Invalid notes file: expected an object like { "notes": [...] }');
  }
  const notes = (value as { notes: unknown[] }).notes;
  return notes.map((n, i) => parseNote(n, i));
}

function parseNote(value: unknown, index: number): Note {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid note at index ${index}: expected an object`);
  }
  const n = value as Record<string, unknown>;
  if (
    typeof n.id !== "string" ||
    typeof n.title !== "string" ||
    typeof n.createdAt !== "string" ||
    typeof n.updatedAt !== "string"
  ) {
    throw new Error(`Invalid note at index ${index}: missing id, title, createdAt, or updatedAt`);
  }

  const note: Note = {
    id: n.id,
    title: n.title,
    content: typeof n.content === "string" ? n.content : "",
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  };

  if (Array.isArray(n.tags)) {
    const tags = n.tags.filter((t): t is string => typeof t === "string");
    if (tags.length > 0) note.tags = tags;
  }
  if (typeof n.pinned === "boolean") note.pinned = n.pinned;

  return note;
}

// Per-cwd cache so multi-project sessions don't share a single store instance
const stores = new Map<string, NoteStore>();

export function getNoteStore(cwd?: string): NoteStore {
  const key = cwd ?? process.cwd();
  let store = stores.get(key);
  if (!store) {
    store = new NoteStore(key);
    stores.set(key, store);
  }
  return store;
}

export function resetNoteStore(): void {
  stores.clear();
}
