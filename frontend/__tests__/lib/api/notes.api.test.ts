/**
 * Tests for Notes API
 */

import {
  fetchNotes,
  fetchNoteById,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
} from "@/lib/api/notes.api";
import type { NoteData } from "@/lib/types";

describe("Notes API", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe("fetchNotes", () => {
    it("fetches all notes successfully", async () => {
      const notes = await fetchNotes();

      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeGreaterThanOrEqual(0);
    });

    it("returns notes with correct structure", async () => {
      const notes = await fetchNotes();

      if (notes.length > 0) {
        const note = notes[0];
        expect(note).toHaveProperty("id");
        expect(note).toHaveProperty("title");
        expect(note).toHaveProperty("location");
        expect(note).toHaveProperty("files");
        expect(note).toHaveProperty("createdAt");
        expect(note).toHaveProperty("updatedAt");
      }
    });
  });

  describe("fetchNoteById", () => {
    it("fetches a specific note by ID", async () => {
      const notes = await fetchNotes();
      if (notes.length > 0) {
        const noteId = notes[0].id;
        const note = await fetchNoteById(noteId);

        expect(note.id).toBe(noteId);
      }
    });

    it("throws error for non-existent note", async () => {
      await expect(fetchNoteById("non-existent-id")).rejects.toThrow();
    });
  });

  describe("createNoteApi", () => {
    it("creates a new note successfully", async () => {
      const noteData: NoteData = {
        title: "Test Note",
        location: "test-folder",
        files: [],
      };

      const newNote = await createNoteApi(noteData);

      expect(newNote).toHaveProperty("id");
      expect(newNote.title).toBe("Test Note");
      expect(newNote.location).toBe("test-folder");
      expect(newNote.files).toEqual([]);
    });

    it("creates note with files", async () => {
      const mockFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });

      const noteData: NoteData = {
        title: "Note with File",
        location: "root",
        files: [mockFile],
      };

      const newNote = await createNoteApi(noteData);

      expect(newNote.files.length).toBe(1);
      expect(newNote.files[0].name).toBe("test.pdf");
      expect(newNote.files[0].type).toBe("application/pdf");
    });

    it("persists note to localStorage", async () => {
      const noteData: NoteData = {
        title: "Persistent Note",
        location: "root",
        files: [],
      };

      await createNoteApi(noteData);

      const stored = localStorage.getItem("notes");
      expect(stored).not.toBeNull();

      const notes = JSON.parse(stored!);
      expect(notes.some((n: any) => n.title === "Persistent Note")).toBe(true);
    });
  });

  describe("updateNoteApi", () => {
    it("updates a note successfully", async () => {
      const noteData: NoteData = {
        title: "Original Title",
        location: "root",
        files: [],
      };

      const createdNote = await createNoteApi(noteData);

      const updatedNote = await updateNoteApi(createdNote.id, {
        title: "Updated Title",
      });

      expect(updatedNote.id).toBe(createdNote.id);
      expect(updatedNote.title).toBe("Updated Title");
      expect(updatedNote.location).toBe("root");
    });

    it("throws error for non-existent note", async () => {
      await expect(
        updateNoteApi("non-existent-id", { title: "New Title" })
      ).rejects.toThrow();
    });

    it("updates updatedAt timestamp", async () => {
      const noteData: NoteData = {
        title: "Test Note",
        location: "root",
        files: [],
      };

      const createdNote = await createNoteApi(noteData);
      const originalUpdatedAt = createdNote.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedNote = await updateNoteApi(createdNote.id, {
        title: "Updated",
      });

      expect(updatedNote.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe("deleteNoteApi", () => {
    it("deletes a note successfully", async () => {
      const noteData: NoteData = {
        title: "To Delete",
        location: "root",
        files: [],
      };

      const createdNote = await createNoteApi(noteData);

      await deleteNoteApi(createdNote.id);

      await expect(fetchNoteById(createdNote.id)).rejects.toThrow();
    });

    it("throws error for non-existent note", async () => {
      await expect(deleteNoteApi("non-existent-id")).rejects.toThrow();
    });

    it("removes note from localStorage", async () => {
      const noteData: NoteData = {
        title: "To Delete",
        location: "root",
        files: [],
      };

      const createdNote = await createNoteApi(noteData);

      await deleteNoteApi(createdNote.id);

      const stored = localStorage.getItem("notes");
      const notes = JSON.parse(stored!);

      expect(notes.some((n: any) => n.id === createdNote.id)).toBe(false);
    });
  });
});
