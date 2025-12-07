/**
 * file-batch 유틸리티 테스트
 */

import { describe, it, expect } from "vitest";
import { createFileBatch, splitIntoBatches } from "@/lib/utils/file-batch";

describe("file-batch", () => {
  it("createFileBatch 생성", () => {
    const files = [new File(["test"], "test.txt")];
    const batch = createFileBatch(files);
    expect(batch.files).toHaveLength(1);
  });

  it("splitIntoBatches 분할", () => {
    const files = [new File(["1"], "1.txt"), new File(["2"], "2.txt"), new File(["3"], "3.txt")];
    const batches = splitIntoBatches(files, 2);
    expect(batches.length).toBeGreaterThanOrEqual(1);
  });
});
