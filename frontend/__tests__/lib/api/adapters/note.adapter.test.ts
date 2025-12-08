import { describe, it, expect } from "vitest";
import { apiToNote, dbToNote } from "@/lib/api/adapters/note.adapter";

describe("note.adapter", () => {
  it("apiToNote 변환", () => {
    const apiNote = { id: "1", title: "Test", folder_id: null, type: "student", created_at: "2024-01-01", updated_at: "2024-01-01" };
    const result = apiToNote(apiNote as any);
    expect(result.id).toBe("1");
    expect(result.title).toBe("Test");
  });

  it("dbToNote 변환", () => {
    const dbNote = { id: "1", title: "Test", folderId: null, type: "student" as const, createdAt: 1000, updatedAt: 2000 };
    const result = dbToNote(dbNote);
    expect(result.id).toBe("1");
    expect(result.title).toBe("Test");
  });
});
