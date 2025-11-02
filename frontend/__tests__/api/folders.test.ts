/**
 * 폴더 생성 테스트
 */

import { createFolder, getAllFolders } from "@/lib/db/folders";
import { initDB, closeDB } from "@/lib/db/index";

describe("Folder Creation", () => {
  beforeEach(async () => {
    // DB 초기화
    await initDB();
  });

  afterEach(() => {
    closeDB();
  });

  it("should create a folder successfully", async () => {
    const folderName = "Test Folder";
    const folder = await createFolder(folderName, null);

    expect(folder).toBeDefined();
    expect(folder.name).toBe(folderName);
    expect(folder.id).toBeDefined();
    expect(folder.parentId).toBeNull();
  });

  it("should create a subfolder successfully", async () => {
    const parentFolder = await createFolder("Parent Folder", null);
    const subFolder = await createFolder("Sub Folder", parentFolder.id);

    expect(subFolder).toBeDefined();
    expect(subFolder.name).toBe("Sub Folder");
    expect(subFolder.parentId).toBe(parentFolder.id);
  });

  it("should retrieve all folders", async () => {
    await createFolder("Folder 1", null);
    await createFolder("Folder 2", null);

    const folders = await getAllFolders();
    expect(folders.length).toBeGreaterThanOrEqual(2);
  });
});
