/**
 * StorageService Unit Tests
 * Testing storage abstraction layer
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PrismaService } from '../db/prisma.service';

// Mock environment for local provider
process.env.STORAGE_PROVIDER = 'local';
process.env.STORAGE_LOCAL_PATH = '/tmp/test-storage';

describe('StorageService', () => {
  let service: StorageService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn() as jest.Mock,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env.STORAGE_PROVIDER = 'local';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicUrl', () => {
    it('should return local storage URL', () => {
      const url = service.getPublicUrl('test/file.txt');

      expect(url).toBe('/storage/test/file.txt');
    });
  });

  describe('uploadBuffer', () => {
    it('should upload buffer to local storage', async () => {
      const buffer = Buffer.from('test content');
      const storageKey = 'test/file.txt';

      const result = await service.uploadBuffer(buffer, storageKey, 'text/plain');

      expect(result.storageKey).toBe(storageKey);
      expect(result.size).toBe(buffer.length);
      expect(result.publicUrl).toContain('/storage/');
    });

    it('should create directories if not exist', async () => {
      const buffer = Buffer.from('nested content');
      const storageKey = 'deeply/nested/path/file.txt';

      const result = await service.uploadBuffer(buffer, storageKey);

      expect(result.storageKey).toBe(storageKey);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      // First upload a file
      await service.uploadBuffer(Buffer.from('test'), 'exists/test.txt');

      const exists = await service.fileExists('exists/test.txt');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await service.fileExists('nonexistent/file.txt');

      expect(exists).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      // First upload a file
      await service.uploadBuffer(Buffer.from('to delete'), 'todelete/file.txt');
      
      // Verify exists
      let exists = await service.fileExists('todelete/file.txt');
      expect(exists).toBe(true);

      // Delete
      await service.deleteFile('todelete/file.txt');

      // Verify deleted
      exists = await service.fileExists('todelete/file.txt');
      expect(exists).toBe(false);
    });

    it('should not throw for non-existing file', async () => {
      await expect(service.deleteFile('nonexistent/file.txt')).resolves.not.toThrow();
    });
  });

  describe('getFileStream', () => {
    it('should return file content as buffer', async () => {
      const content = 'test file content';
      await service.uploadBuffer(Buffer.from(content), 'stream/test.txt');

      const result = await service.getFileStream('stream/test.txt');

      expect(result.body).toBeInstanceOf(Buffer);
      expect(result.contentLength).toBe(content.length);
    });

    it('should throw for non-existing file', async () => {
      await expect(service.getFileStream('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('createFolder', () => {
    it('should create folder for local storage', async () => {
      await expect(service.createFolder('newfolder')).resolves.not.toThrow();
    });

    it('should handle trailing slash', async () => {
      await expect(service.createFolder('folder/')).resolves.not.toThrow();
    });
  });

  describe('renameFolder', () => {
    it('should rename folder for local storage', async () => {
      // Use unique folder names to avoid conflicts between test runs
      const timestamp = Date.now();
      const oldFolder = `oldfolder_${timestamp}`;
      const newFolder = `newfolder_${timestamp}`;

      // Create folder with file
      await service.uploadBuffer(Buffer.from('content'), `${oldFolder}/file.txt`);

      // Rename
      await service.renameFolder(oldFolder, newFolder);

      // Verify old not exists and new exists
      const oldExists = await service.fileExists(`${oldFolder}/file.txt`);
      const newExists = await service.fileExists(`${newFolder}/file.txt`);

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });
  });

  describe('downloadFile', () => {
    it('should download file to local path', async () => {
      // Upload first
      const content = 'download test';
      await service.uploadBuffer(Buffer.from(content), 'download/test.txt');

      // Download
      const destPath = '/tmp/test-storage/downloaded.txt';
      await service.downloadFile('download/test.txt', destPath);

      // Verify by reading downloaded file
      const { readFileSync, existsSync } = await import('node:fs');
      expect(existsSync(destPath)).toBe(true);
      expect(readFileSync(destPath, 'utf-8')).toBe(content);
    });
  });

  describe('uploadFile (local path)', () => {
    it('should upload file from local path', async () => {
      // Create a temp file
      const { writeFileSync, mkdirSync, existsSync } = await import('node:fs');
      const tempDir = '/tmp/test-storage-upload';
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
      const tempPath = `${tempDir}/source.txt`;
      writeFileSync(tempPath, 'source content');

      const result = await service.uploadFile(tempPath, 'uploaded/from-path.txt');

      expect(result.storageKey).toBe('uploaded/from-path.txt');
    });
  });

  describe('uploadAudioChunk', () => {
    it('should upload audio chunk with correct path', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const buffer = Buffer.from('audio data');

      const result = await service.uploadAudioChunk(buffer, 'user-123', 'session-456', 0, 'webm');

      expect(result.key).toContain('users/test@example.com/transcription/session-456/audio/chunk_0000.webm');
      expect(result.url).toContain('/storage/');
    });

    it('should throw NotFoundException for invalid user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadAudioChunk(Buffer.from('data'), 'invalid-user', 'session', 0, 'webm'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listFolders', () => {
    it('should list folders in directory', async () => {
      // Create some folders with files
      await service.uploadBuffer(Buffer.from(''), 'listtest/folder1/file.txt');
      await service.uploadBuffer(Buffer.from(''), 'listtest/folder2/file.txt');

      const folders = await service.listFolders('listtest/');

      expect(folders).toContain('folder1');
      expect(folders).toContain('folder2');
    });

    it('should return empty array for non-existing path', async () => {
      const folders = await service.listFolders('nonexistent/');

      expect(folders).toEqual([]);
    });
  });

  describe('deleteFolderRecursively', () => {
    it('should delete folder and all contents', async () => {
      // Create folder with multiple files
      await service.uploadBuffer(Buffer.from(''), 'recursive/file1.txt');
      await service.uploadBuffer(Buffer.from(''), 'recursive/sub/file2.txt');

      // Delete recursively
      await service.deleteFolderRecursively('recursive');

      // Verify all deleted
      const file1Exists = await service.fileExists('recursive/file1.txt');
      const file2Exists = await service.fileExists('recursive/sub/file2.txt');

      expect(file1Exists).toBe(false);
      expect(file2Exists).toBe(false);
    });
  });

  describe('renameFile', () => {
    it('should rename file', async () => {
      await service.uploadBuffer(Buffer.from('rename me'), 'rename/old.txt');

      await service.renameFile('rename/old.txt', 'rename/new.txt');

      const oldExists = await service.fileExists('rename/old.txt');
      const newExists = await service.fileExists('rename/new.txt');

      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });
  });
});

