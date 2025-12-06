/**
 * note.adapter 테스트
 * IndexedDB와 Backend API의 노트 타입 변환
 */

import { describe, it, expect } from "vitest";
import {
  dbToNote,
  dbToNotes,
  noteToDb,
  apiToNote,
  apiToNotes,
  toApiNoteCreateRequest,
} from "@/lib/api/adapters/note.adapter";
import type { DBNote } from "@/lib/db";
import type { ApiNoteResponse } from "@/lib/api/types/api.types";
import type { Note } from "@/lib/types";

describe("note.adapter", () => {
  describe("dbToNote", () => {
    it("DBNote를 Note로 변환", () => {
      const dbNote: DBNote = {
        id: "note-1",
        title: "Test Note",
        folderId: "folder-1",
        type: "student",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
        thumbnail: "thumb.png",
      };

      const result = dbToNote(dbNote);

      expect(result).toEqual({
        id: "note-1",
        title: "Test Note",
        folderId: "folder-1",
        type: "student",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
        thumbnail: "thumb.png",
      });
    });

    it("educator 타입 변환", () => {
      const dbNote: DBNote = {
        id: "note-1",
        title: "Educator Note",
        folderId: "folder-1",
        type: "educator",
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      };

      const result = dbToNote(dbNote);
      expect(result.type).toBe("educator");
    });

    it("thumbnail 없는 경우", () => {
      const dbNote: DBNote = {
        id: "note-1",
        title: "No Thumbnail",
        folderId: "folder-1",
        type: "student",
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      };

      const result = dbToNote(dbNote);
      expect(result.thumbnail).toBeUndefined();
    });
  });

  describe("dbToNotes", () => {
    it("DBNote 배열을 Note 배열로 변환", () => {
      const dbNotes: DBNote[] = [
        {
          id: "note-1",
          title: "Note 1",
          folderId: "folder-1",
          type: "student",
          createdAt: 1704067200000,
          updatedAt: 1704067200000,
        },
        {
          id: "note-2",
          title: "Note 2",
          folderId: "folder-2",
          type: "educator",
          createdAt: 1704153600000,
          updatedAt: 1704153600000,
        },
      ];

      const result = dbToNotes(dbNotes);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("note-1");
      expect(result[1].id).toBe("note-2");
    });

    it("빈 배열", () => {
      const result = dbToNotes([]);
      expect(result).toEqual([]);
    });
  });

  describe("noteToDb", () => {
    it("Note를 DBNote로 변환", () => {
      const note: Note = {
        id: "note-1",
        title: "Test Note",
        folderId: "folder-1",
        type: "student",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
        thumbnail: "thumb.png",
      };

      const result = noteToDb(note);

      expect(result).toEqual({
        id: "note-1",
        title: "Test Note",
        folderId: "folder-1",
        type: "student",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
        thumbnail: "thumb.png",
      });
    });
  });

  describe("apiToNote", () => {
    it("ApiNoteResponse를 Note로 변환", () => {
      const apiNote: ApiNoteResponse = {
        id: "note-1",
        title: "API Note",
        folder_id: "folder-1",
        type: "student",
        public_access: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        thumbnail: "thumb.png",
      };

      const result = apiToNote(apiNote);

      expect(result.id).toBe("note-1");
      expect(result.title).toBe("API Note");
      expect(result.folderId).toBe("folder-1");
      expect(result.type).toBe("student");
      expect(result.publicAccess).toBe(false);
      expect(result.thumbnail).toBe("thumb.png");
      expect(typeof result.createdAt).toBe("number");
      expect(typeof result.updatedAt).toBe("number");
    });

    it("snake_case를 camelCase로 변환", () => {
      const apiNote: ApiNoteResponse = {
        id: "note-1",
        title: "Test",
        folder_id: "folder-123",
        public_access: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = apiToNote(apiNote);

      expect(result.folderId).toBe("folder-123");
      expect(result.publicAccess).toBe(true);
    });

    it("type이 없으면 student 기본값", () => {
      const apiNote: ApiNoteResponse = {
        id: "note-1",
        title: "Test",
        folder_id: "folder-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = apiToNote(apiNote);
      expect(result.type).toBe("student");
    });

    it("ISO 날짜 문자열을 타임스탬프로 변환", () => {
      const apiNote: ApiNoteResponse = {
        id: "note-1",
        title: "Test",
        folder_id: "folder-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const result = apiToNote(apiNote);

      expect(result.createdAt).toBe(new Date("2024-01-01T00:00:00Z").getTime());
      expect(result.updatedAt).toBe(new Date("2024-01-02T00:00:00Z").getTime());
    });
  });

  describe("apiToNotes", () => {
    it("ApiNoteResponse 배열을 Note 배열로 변환", () => {
      const apiNotes: ApiNoteResponse[] = [
        {
          id: "note-1",
          title: "Note 1",
          folder_id: "folder-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "note-2",
          title: "Note 2",
          folder_id: "folder-2",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      const result = apiToNotes(apiNotes);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("note-1");
      expect(result[1].id).toBe("note-2");
    });

    it("빈 배열", () => {
      const result = apiToNotes([]);
      expect(result).toEqual([]);
    });
  });

  describe("toApiNoteCreateRequest", () => {
    it("노트 생성 요청 변환", () => {
      const result = toApiNoteCreateRequest("New Note", "folder-1");

      expect(result).toEqual({
        title: "New Note",
        folder_id: "folder-1",
      });
    });

    it("camelCase를 snake_case로 변환", () => {
      const result = toApiNoteCreateRequest("Test", "folder-123");

      expect(result.folder_id).toBe("folder-123");
      expect((result as any).folderId).toBeUndefined();
    });
  });
});
