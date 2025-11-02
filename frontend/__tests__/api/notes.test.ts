/**
 * 노트 생성 테스트
 */

import { createNote, getAllNotes } from "@/lib/db/notes";
import { initDB, closeDB } from "@/lib/db/index";

describe("Note Creation", () => {
  beforeEach(async () => {
    // DB 초기화
    await initDB();
  });

  afterEach(() => {
    closeDB();
  });

  it("should create a note successfully", async () => {
    const noteTitle = "Test Note";
    const folderId = "root";

    const note = await createNote(noteTitle, folderId);

    expect(note).toBeDefined();
    expect(note.title).toBe(noteTitle);
    expect(note.id).toBeDefined();
    expect(note.folderId).toBe(folderId);
  });

  it("should create multiple notes", async () => {
    await createNote("Note 1", "root");
    await createNote("Note 2", "root");

    const notes = await getAllNotes();
    expect(notes.length).toBeGreaterThanOrEqual(2);
  });

  it("should create a note in a specific folder", async () => {
    const testFolderId = "test-folder-123";
    const note = await createNote("Folder Note", testFolderId);

    expect(note).toBeDefined();
    expect(note.folderId).toBe(testFolderId);
  });
});
