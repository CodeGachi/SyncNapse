/**
 * folder.adapter 테스트
 */

import { describe, it, expect } from "vitest";
import { toFrontendFolder, toBackendFolder } from "@/lib/api/adapters/folder.adapter";

describe("folder.adapter", () => {
  it("toFrontendFolder 변환", () => {
    const backend = { id: "1", name: "Test", parent_id: null, created_at: "2024-01-01" };
    const result = toFrontendFolder(backend as any);
    expect(result.id).toBe("1");
    expect(result.name).toBe("Test");
  });

  it("toBackendFolder 변환", () => {
    const frontend = { id: "1", name: "Test", parentId: null };
    const result = toBackendFolder(frontend as any);
    expect(result.name).toBe("Test");
  });
});
