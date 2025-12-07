/**
 * note.adapter 테스트
 */

import { describe, it, expect } from "vitest";
import { toFrontendNote, toBackendNote } from "@/lib/api/adapters/note.adapter";

describe("note.adapter", () => {
  it("toFrontendNote 변환", () => {
    const backend = { id: "1", title: "Test", content: "", created_at: "2024-01-01", updated_at: "2024-01-01" };
    const result = toFrontendNote(backend as any);
    expect(result.id).toBe("1");
    expect(result.title).toBe("Test");
  });

  it("toBackendNote 변환", () => {
    const frontend = { id: "1", title: "Test", content: "", createdAt: new Date(), updatedAt: new Date() };
    const result = toBackendNote(frontend as any);
    expect(result.title).toBe("Test");
  });
});
