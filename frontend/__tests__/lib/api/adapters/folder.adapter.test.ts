import { describe, it, expect } from "vitest";
import { apiToFolder, dbToFolder } from "@/lib/api/adapters/folder.adapter";

describe("folder.adapter", () => {
  it("apiToFolder 변환", () => {
    const apiFolder = { id: "1", name: "Test", parent_id: null, created_at: "2024-01-01", updated_at: "2024-01-01" };
    const result = apiToFolder(apiFolder as any);
    expect(result.id).toBe("1");
    expect(result.name).toBe("Test");
  });

  it("dbToFolder 변환", () => {
    const dbFolder = { id: "1", name: "Test", parentId: null, createdAt: 1000, updatedAt: 2000 };
    const result = dbToFolder(dbFolder);
    expect(result.id).toBe("1");
    expect(result.name).toBe("Test");
  });
});
