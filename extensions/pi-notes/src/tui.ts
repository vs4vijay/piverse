/**
 * pi-notes TUI — interactive note management
 */

import { VStack, HStack, Box, Text, ScrollView, Markdown, SelectList, type SelectItem, type SelectListTheme, type MarkdownTheme } from "@earendil-works/pi-tui";
import type { Component, Focusable, TUI } from "@earendil-works/pi-tui";
import { Theme } from "@earendil-works/pi-coding-agent";
import type { Note } from "./types.js";
import { getNoteStore } from "./store.js";

interface ListItem {
  note: Note;
  display: string;
}

type ViewMode = "list" | "view" | "editor" | "confirm";

export class NotesTUI extends VStack implements Focusable {
  private mode: ViewMode = "list";
  private notes: Note[] = [];
  private filteredNotes: ListItem[] = [];
  private searchQuery = "";
  private listSelect: SelectList;
  private previewMarkdown: Markdown;
  private statusText: Text;
  private headerText: Text;
  private onClose: () => void;
  private onSave: (note: Note) => void;
  private onDelete: (id: string) => void;
  private editingNote: Note | null = null;
  private confirmAction: "delete" | "cancel" | null = null;
  private confirmNoteId: string | null = null;
  private tuiRef: TUI | null = null;
  private listBox: Box;
  private previewBox: Box;
  private headerBox: Box;
  private statusBox: Box;

  constructor(
    initialNotes: Note[],
    tui: TUI,
    theme: Theme,
    onClose: () => void,
    onSave: (note: Note) => void,
    onDelete: (id: string) => void
  ) {
    super([], { gap: 0 });
    this.tuiRef = tui;
    this.notes = initialNotes;
    this.onClose = onClose;
    this.onSave = onSave;
    this.onDelete = onDelete;
    this.filteredNotes = this.buildListItems(this.notes);

    // Header
    this.headerText = new Text("Pi Notes  [n] new  [/] search  [q] quit");
    this.headerBox = new Box(1, 0);
    this.headerBox.addChild(this.headerText);

    // Status line
    this.statusText = new Text(this.buildStatusText());
    this.statusBox = new Box(1, 0);
    this.statusBox.addChild(this.statusText);

    // List selector - use SelectItem type from pi-tui
    const selectItems: SelectItem[] = this.filteredNotes.map(item => ({
      value: item.note.id,
      label: item.display,
    }));

    this.listSelect = new SelectList(selectItems, 20, this.getSelectTheme(theme));

    // Preview markdown
    this.previewMarkdown = new Markdown("", 0, 0, this.getMarkdownTheme(theme));

    // Layout: Header | List (left) + Preview (right) | Status
    const listScrollView = new ScrollView(this.listSelect, { scrollbar: "auto" });
    this.listBox = new Box(0, 0);
    this.listBox.addChild(listScrollView);

    const previewScrollView = new ScrollView(this.previewMarkdown, { scrollbar: "auto" });
    this.previewBox = new Box(0, 0);
    this.previewBox.addChild(previewScrollView);

    const mainSplit = new HStack([this.listBox, this.previewBox], { gap: 1 });

    this.addChild(this.headerBox);
    this.addChild(mainSplit);
    this.addChild(this.statusBox);

    // Listen for selection changes
    this.listSelect.onSelectionChange = (item) => this.onListSelect(item);
    this.updatePreview();
  }

  private getSelectTheme(theme: Theme): SelectListTheme {
    return {
      selectedPrefix: (text) => `\x1b[7m ${text} \x1b[0m`,
      selectedText: (text) => `\x1b[7m${text}\x1b[0m`,
      description: (text) => `\x1b[90m${text}\x1b[0m`,
      scrollInfo: (text) => `\x1b[90m${text}\x1b[0m`,
      noMatch: (text) => `\x1b[31m${text}\x1b[0m`,
    };
  }

  private getMarkdownTheme(theme: Theme): MarkdownTheme {
    const fg = (color: string) => (text: string) => theme.fg(color as any, text);
    return {
      heading: fg("accent"),
      link: fg("accent"),
      linkUrl: fg("accent"),
      code: fg("foreground"),
      codeBlock: fg("foreground"),
      codeBlockBorder: fg("border"),
      quote: fg("muted"),
      quoteBorder: fg("border"),
      hr: fg("border"),
      listBullet: fg("muted"),
      bold: (text) => `\x1b[1m${text}\x1b[0m`,
      italic: (text) => `\x1b[3m${text}\x1b[0m`,
      strikethrough: (text) => `\x1b[9m${text}\x1b[0m`,
      underline: (text) => `\x1b[4m${text}\x1b[0m`,
    };
  }

  private buildListItems(notes: Note[]): ListItem[] {
    return notes.map((note) => {
      const preview = note.content.slice(0, 60).replace(/\n/g, " ");
      const pin = note.pinned ? "📌 " : "";
      const tags = note.tags?.length ? ` [${note.tags.join(", ")}]` : "";
      return {
        note,
        display: `${pin}${note.title}${tags}\n  ${preview}`,
      };
    });
  }

  private buildStatusText(): string {
    const total = this.notes.length;
    const filtered = this.filteredNotes.length;
    const pinned = this.notes.filter((n) => n.pinned).length;
    const mode = this.mode === "list" ? "LIST" : this.mode.toUpperCase();
    const search = this.searchQuery ? ` | search: "${this.searchQuery}"` : "";
    return `${mode} | ${filtered}/${total} notes${pinned ? ` | ${pinned} pinned` : ""}${search}`;
  }

  private onListSelect(item: SelectItem | undefined): void {
    if (item) {
      const note = this.filteredNotes.find(n => n.note.id === item.value)?.note;
      if (note) this.updatePreview(note);
    }
  }

  private updatePreview(note?: Note): void {
    const target = note ?? this.getSelectedNote();
    if (target) {
      this.previewMarkdown.setText(target.content || "*(empty)*");
    } else {
      this.previewMarkdown.setText("*(no notes)*");
    }
  }

  private getSelectedNote(): Note | null {
    const selected = this.listSelect.getSelectedItem();
    if (!selected) return null;
    return this.filteredNotes.find(n => n.note.id === selected.value)?.note ?? null;
  }

  private refreshList(): void {
    this.filteredNotes = this.buildListItems(this.applyFilter(this.notes));
    const selectItems: SelectItem[] = this.filteredNotes.map(item => ({
      value: item.note.id,
      label: item.display,
    }));
    // Replace SelectList - need to recreate the list
    this.listSelect = new SelectList(selectItems, 20, this.getSelectTheme((this as any).theme));
    // Update list box child
    this.listBox.clear();
    this.listBox.addChild(new ScrollView(this.listSelect, { scrollbar: "auto" }));
    this.listSelect.onSelectionChange = (item) => this.onListSelect(item);
    this.statusText.setText(this.buildStatusText());
    this.updatePreview();
  }

  private applyFilter(notes: Note[]): Note[] {
    if (!this.searchQuery) return notes;
    const q = this.searchQuery.toLowerCase();
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }

  // Focusable implementation
  private _focused = false;

  set focused(value: boolean) {
    this._focused = value;
    // SelectList doesn't have focused property
  }

  get focused(): boolean {
    return this._focused;
  }

  handleInput(keyData: string): void {
    // Global keys
    if (keyData === "q" || keyData === "Escape") {
      if (this.mode === "list") {
        this.onClose();
        return;
      }
      this.exitMode();
      return;
    }

    // Mode-specific handling
    switch (this.mode) {
      case "list":
        this.handleListInput(keyData);
        break;
      case "view":
        this.handleViewInput(keyData);
        break;
      case "confirm":
        this.handleConfirmInput(keyData);
        break;
    }
  }

  private handleListInput(key: string): void {
    switch (key) {
      case "n":
        this.openEditor();
        break;
      case "e":
        this.editSelected();
        break;
      case "d":
        this.confirmDelete();
        break;
      case "p":
        this.togglePin();
        break;
      case "/":
        this.startSearch();
        break;
      case "Enter":
        this.enterViewMode();
        break;
      case "ArrowUp":
      case "k":
        this.listSelect.handleInput("ArrowUp");
        break;
      case "ArrowDown":
      case "j":
        this.listSelect.handleInput("ArrowDown");
        break;
      case "PageUp":
        this.listSelect.handleInput("PageUp");
        break;
      case "PageDown":
        this.listSelect.handleInput("PageDown");
        break;
      case "Home":
        this.listSelect.handleInput("Home");
        break;
      case "End":
        this.listSelect.handleInput("End");
        break;
    }
  }

  private handleViewInput(key: string): void {
    switch (key) {
      case "e":
        this.editSelected();
        this.exitMode();
        break;
      case "q":
      case "Escape":
        this.exitMode();
        break;
    }
  }

  private handleConfirmInput(key: string): void {
    if (key === "y" || key === "Y") {
      if (this.confirmAction === "delete" && this.confirmNoteId) {
        this.onDelete(this.confirmNoteId);
        this.notes = this.notes.filter((n) => n.id !== this.confirmNoteId);
        this.refreshList();
      }
      this.exitConfirmMode();
    } else if (key === "n" || key === "N" || key === "Escape") {
      this.exitConfirmMode();
    }
  }

  private enterViewMode(): void {
    const note = this.getSelectedNote();
    if (note) {
      this.mode = "view";
      this.headerText.setText(`Pi Notes — ${note.title}  [e] edit  [q] back`);
      this.statusText.setText(this.buildStatusText());
    }
  }

  private exitMode(): void {
    this.mode = "list";
    this.headerText.setText("Pi Notes  [n] new  [/] search  [q] quit");
    this.statusText.setText(this.buildStatusText());
  }

  private exitConfirmMode(): void {
    this.mode = "list";
    this.confirmAction = null;
    this.confirmNoteId = null;
    this.headerText.setText("Pi Notes  [n] new  [/] search  [q] quit");
    this.statusText.setText(this.buildStatusText());
  }

  private openEditor(note?: Note): void {
    this.mode = "editor";
    this.editingNote = note ?? null;
    this.headerText.setText(note ? `Pi Notes — Edit: ${note.title}  [Esc] cancel` : "Pi Notes — New Note  [Esc] cancel");
    this.statusText.setText("Editing... use external editor");
    this.requestExternalEdit(note);
  }

  private editSelected(): void {
    const note = this.getSelectedNote();
    if (note) {
      this.openEditor(note);
    }
  }

  private confirmDelete(): void {
    const note = this.getSelectedNote();
    if (note) {
      this.mode = "confirm";
      this.confirmAction = "delete";
      this.confirmNoteId = note.id;
      this.headerText.setText(`Delete "${note.title}"?  [y] yes  [n] no`);
      this.statusText.setText("Confirm deletion");
    }
  }

  private togglePin(): void {
    const note = this.getSelectedNote();
    if (note) {
      getNoteStore().update(note.id, { pinned: !note.pinned }).then(() => {
        this.refreshNotes();
      });
    }
  }

  private startSearch(): void {
    // For now, just clear search on ESC - a full search input would need a modal
    this.searchQuery = "";
    this.refreshList();
  }

  private async requestExternalEdit(note?: Note): Promise<void> {
    // Use ctx.ui.editor() via a callback - we need to bridge to the extension context
    if (this.tuiRef && (this.tuiRef as any)._piEditorCallback) {
      await (this.tuiRef as any)._piEditorCallback(note);
    }
  }

  // Called by extension after external editor returns
  async onEditorResult(title: string, content: string): Promise<void> {
    if (this.editingNote) {
      await getNoteStore().update(this.editingNote.id, { title, content });
    } else {
      await getNoteStore().create(title, content);
    }
    this.editingNote = null;
    this.refreshNotes();
    this.exitMode();
  }

  private async refreshNotes(): Promise<void> {
    this.notes = await getNoteStore().getAll();
    this.refreshList();
  }

  // Public method to update notes from outside (e.g., after CLI command)
  setNotes(notes: Note[]): void {
    this.notes = notes;
    this.refreshList();
  }
}

// Factory function for ctx.ui.custom()
export function createNotesTUI(
  notes: Note[],
  tui: TUI,
  theme: Theme,
  onClose: () => void,
  onSave: (note: Note) => void,
  onDelete: (id: string) => void
): Component & Focusable {
  return new NotesTUI(notes, tui, theme, onClose, onSave, onDelete);
}