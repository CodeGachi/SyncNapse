/**
 * folder.adapter 테스트
 * IndexedDB와 Backend API의 폴더 타입 변환
 */

import { describe, it, expect } from "vitest";
import {
  dbToFolder,
  dbToFolders,
  folderToDb,
  apiToFolder,
  apiToFolders,
  toApiFolderCreateRequest,
} from "@/lib/api/adapters/folder.adapter";
import type { DBFolder } from "@/lib/db";
import type { ApiFolderResponse } from "@/lib/api/types/api.types";
import type { Folder } from "@/lib/types";

describe("folder.adapter", () => {
  describe("dbToFolder", () => {
    it("DBFolder를 Folder로 변환", () => {
      const dbFolder: DBFolder = {
        id: "folder-1",
        name: "Work",
        parentId: "root",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
      };

      const result = dbToFolder(dbFolder);

      expect(result).toEqual({
        id: "folder-1",
        name: "Work",
        parentId: "root",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
      });
    });

    it("parentId가 null인 경우 (루트 폴더)", () => {
      const dbFolder: DBFolder = {
        id: "root",
        name: "Root",
        parentId: null,
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      };

      const result = dbToFolder(dbFolder);
      expect(result.parentId).toBeNull();
    });
  });

  describe("dbToFolders", () => {
    it("DBFolder 배열을 Folder 배열로 변환", () => {
      const dbFolders: DBFolder[] = [
        {
          id: "folder-1",
          name: "Work",
          parentId: "root",
          createdAt: 1704067200000,
          updatedAt: 1704067200000,
        },
        {
          id: "folder-2",
          name: "Personal",
          parentId: "root",
          createdAt: 1704153600000,
          updatedAt: 1704153600000,
        },
      ];

      const result = dbToFolders(dbFolders);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Work");
      expect(result[1].name).toBe("Personal");
    });

    it("빈 배열", () => {
      const result = dbToFolders([]);
      expect(result).toEqual([]);
    });
  });

  describe("folderToDb", () => {
    it("Folder를 DBFolder로 변환", () => {
      const folder: Folder = {
        id: "folder-1",
        name: "Work",
        parentId: "root",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
      };

      const result = folderToDb(folder);

      expect(result).toEqual({
        id: "folder-1",
        name: "Work",
        parentId: "root",
        createdAt: 1704067200000,
        updatedAt: 1704153600000,
      });
    });

    it("parentId가 null인 경우", () => {
      const folder: Folder = {
        id: "root",
        name: "Root",
        parentId: null,
        createdAt: 1704067200000,
        updatedAt: 1704067200000,
      };

      const result = folderToDb(folder);
      expect(result.parentId).toBeNull();
    });
  });

  describe("apiToFolder", () => {
    it("ApiFolderResponse를 Folder로 변환", () => {
      const apiFolder: ApiFolderResponse = {
        id: "folder-1",
        name: "API Folder",
        parent_id: "root",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const result = apiToFolder(apiFolder);

      expect(result.id).toBe("folder-1");
      expect(result.name).toBe("API Folder");
      expect(result.parentId).toBe("root");
      expect(typeof result.createdAt).toBe("number");
      expect(typeof result.updatedAt).toBe("number");
    });

    it("snake_case를 camelCase로 변환", () => {
      const apiFolder: ApiFolderResponse = {
        id: "folder-1",
        name: "Test",
        parent_id: "parent-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = apiToFolder(apiFolder);

      expect(result.parentId).toBe("parent-123");
      expect((result as any).parent_id).toBeUndefined();
    });

    it("ISO 날짜 문자열을 타임스탬프로 변환", () => {
      const apiFolder: ApiFolderResponse = {
        id: "folder-1",
        name: "Test",
        parent_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T12:30:00Z",
      };

      const result = apiToFolder(apiFolder);

      expect(result.createdAt).toBe(new Date("2024-01-01T00:00:00Z").getTime());
      expect(result.updatedAt).toBe(new Date("2024-01-02T12:30:00Z").getTime());
    });

    it("parent_id가 null인 경우", () => {
      const apiFolder: ApiFolderResponse = {
        id: "root",
        name: "Root",
        parent_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const result = apiToFolder(apiFolder);
      expect(result.parentId).toBeNull();
    });
  });

  describe("apiToFolders", () => {
    it("ApiFolderResponse 배열을 Folder 배열로 변환", () => {
      const apiFolders: ApiFolderResponse[] = [
        {
          id: "folder-1",
          name: "Folder 1",
          parent_id: "root",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "folder-2",
          name: "Folder 2",
          parent_id: "folder-1",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      const result = apiToFolders(apiFolders);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Folder 1");
      expect(result[1].parentId).toBe("folder-1");
    });

    it("빈 배열", () => {
      const result = apiToFolders([]);
      expect(result).toEqual([]);
    });
  });

  describe("toApiFolderCreateRequest", () => {
    it("폴더 생성 요청 변환", () => {
      const result = toApiFolderCreateRequest("New Folder", "root");

      expect(result).toEqual({
        name: "New Folder",
        parent_id: "root",
      });
    });

    it("parentId가 null인 경우 (루트 레벨)", () => {
      const result = toApiFolderCreateRequest("Root Folder", null);

      expect(result).toEqual({
        name: "Root Folder",
        parent_id: null,
      });
    });

    it("camelCase를 snake_case로 변환", () => {
      const result = toApiFolderCreateRequest("Test", "parent-123");

      expect(result.parent_id).toBe("parent-123");
      expect((result as any).parentId).toBeUndefined();
    });
  });
});
