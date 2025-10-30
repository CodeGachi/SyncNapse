import { UploadsService } from './uploads.service';
import { PrismaService } from '../db/prisma.service';
import { SecurityService } from '../security/security.service';
import { PostprocessService } from '../postprocess/postprocess.service';
import * as fs from 'node:fs';

// Mock fs module
jest.mock('node:fs');
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;
const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
const mockCreateReadStream = fs.createReadStream as jest.MockedFunction<typeof fs.createReadStream>;
const mockCreateWriteStream = fs.createWriteStream as jest.MockedFunction<typeof fs.createWriteStream>;

describe('UploadsService', () => {
  let service: UploadsService;
  let mockPrisma: PrismaService;
  let mockSecurity: SecurityService;
  let mockPostprocess: PostprocessService;

  // Mock functions for Prisma operations
  let mockUploadCreate: jest.Mock;
  let mockUploadFindUnique: jest.Mock;
  let mockUploadUpdate: jest.Mock;
  let mockChunkUpsert: jest.Mock;
  let mockChunkCount: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock functions
    mockUploadCreate = jest.fn();
    mockUploadFindUnique = jest.fn();
    mockUploadUpdate = jest.fn();
    mockChunkUpsert = jest.fn();
    mockChunkCount = jest.fn();

    // Create mock Prisma service
    mockPrisma = {
      upload: {
        create: mockUploadCreate,
        findUnique: mockUploadFindUnique,
        update: mockUploadUpdate,
      },
      uploadChunk: {
        upsert: mockChunkUpsert,
        count: mockChunkCount,
      },
    } as unknown as PrismaService;

    mockSecurity = {
      scanFile: jest.fn(),
    } as unknown as SecurityService;

    mockPostprocess = {
      convertIfNeeded: jest.fn().mockResolvedValue({ convertedPath: undefined, format: undefined }),
      getIndexingTarget: jest.fn().mockReturnValue({ enabled: true, kind: 'pdf' }),
      indexIfEnabled: jest.fn().mockResolvedValue({ indexed: true }),
    } as unknown as PostprocessService;

    service = new UploadsService(mockPrisma, mockSecurity, mockPostprocess);

    // Default mock implementations
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
  });

  describe('start', () => {
    it('should create new upload with all fields', async () => {
      const body = {
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        totalChunks: 5,
        totalSizeBytes: 1024000,
        checksumSha256: 'abc123def456',
      };

      const mockUpload = {
        id: 'upload-123',
        ...body,
        status: 'RECEIVING',
      };

      mockUploadCreate.mockResolvedValue(mockUpload);

      const result = await service.start(body);

      expect(mockUploadCreate).toHaveBeenCalledWith({
        data: {
          fileName: 'test.pdf',
          mimeType: 'application/pdf',
          totalChunks: 5,
          totalSizeBytes: 1024000,
          checksumSha256: 'abc123def456',
          status: 'RECEIVING',
        },
      });
      expect(result).toEqual({ id: 'upload-123' });
    });

    it('should create upload with minimal fields', async () => {
      const body = {
        fileName: 'simple.txt',
        totalChunks: 1,
      };

      const mockUpload = {
        id: 'upload-456',
        fileName: 'simple.txt',
        totalChunks: 1,
        status: 'RECEIVING',
      };

      mockUploadCreate.mockResolvedValue(mockUpload);

      const result = await service.start(body);

      expect(mockUploadCreate).toHaveBeenCalledWith({
        data: {
          fileName: 'simple.txt',
          mimeType: undefined,
          totalChunks: 1,
          totalSizeBytes: undefined,
          checksumSha256: undefined,
          status: 'RECEIVING',
        },
      });
      expect(result.id).toBe('upload-456');
    });

    it('should create upload directories if they do not exist when saveChunk is called', async () => {
      // Reset mocks to fresh state
      mockExistsSync.mockReset();
      mockMkdirSync.mockReset();
      mockWriteFileSync.mockReset();
      
      // Directories don't exist, so they should be created
      mockExistsSync.mockReturnValue(false);
      mockMkdirSync.mockReturnValue(undefined);
      mockWriteFileSync.mockReturnValue(undefined);

      const mockUpload = { id: 'upload-new', totalChunks: 1 };
      const file = { buffer: Buffer.from('test'), size: 10 };

      mockUploadFindUnique.mockResolvedValue(mockUpload);
      mockChunkUpsert.mockResolvedValue({});
      mockChunkCount.mockResolvedValue(1);
      mockUploadUpdate.mockResolvedValue({});

      // saveChunk calls getDirs() which checks and creates directories
      await service.saveChunk('upload-new', 0, file);

      // Should create both parts and assembled directories
      expect(mockMkdirSync).toHaveBeenCalledTimes(2);
      expect(mockMkdirSync).toHaveBeenNthCalledWith(1,
        expect.stringContaining('parts'),
        { recursive: true }
      );
      expect(mockMkdirSync).toHaveBeenNthCalledWith(2,
        expect.stringContaining('assembled'),
        { recursive: true }
      );
    });
  });

  describe('saveChunk', () => {
    it('should save chunk and update upload progress', async () => {
      const mockUpload = { id: 'upload-123', totalChunks: 3 };
      const file = { buffer: Buffer.from('test data'), size: 100 };

      mockUploadFindUnique.mockResolvedValue(mockUpload);
      mockChunkUpsert.mockResolvedValue({});
      mockChunkCount.mockResolvedValue(2);
      mockUploadUpdate.mockResolvedValue({});

      const result = await service.saveChunk('upload-123', 1, file);

      expect(mockUploadFindUnique).toHaveBeenCalledWith({ where: { id: 'upload-123' } });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('upload-123.1.part'),
        file.buffer
      );
      expect(mockChunkUpsert).toHaveBeenCalledWith({
        where: { uploadId_index: { uploadId: 'upload-123', index: 1 } },
        update: { sizeBytes: 100 },
        create: { uploadId: 'upload-123', index: 1, sizeBytes: 100 },
      });
      expect(mockUploadUpdate).toHaveBeenCalledWith({
        where: { id: 'upload-123' },
        data: { receivedChunks: 2 },
      });
      expect(result).toEqual({ ok: true, receivedChunks: 2 });
    });

    it('should throw error if upload not found', async () => {
      mockUploadFindUnique.mockResolvedValue(null);
      const file = { buffer: Buffer.from('data'), size: 50 };

      await expect(service.saveChunk('non-existent', 0, file)).rejects.toThrow('upload not found');
    });

    it('should handle multiple chunks for same upload', async () => {
      const mockUpload = { id: 'upload-456', totalChunks: 5 };
      const file = { buffer: Buffer.from('chunk data'), size: 200 };

      mockUploadFindUnique.mockResolvedValue(mockUpload);
      mockChunkUpsert.mockResolvedValue({});
      mockChunkCount.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
      mockUploadUpdate.mockResolvedValue({});

      // Save chunks 0, 1, 2
      await service.saveChunk('upload-456', 0, file);
      await service.saveChunk('upload-456', 1, file);
      await service.saveChunk('upload-456', 2, file);

      expect(mockChunkUpsert).toHaveBeenCalledTimes(3);
      expect(mockUploadUpdate).toHaveBeenCalledTimes(3);
    });
  });

  describe('complete', () => {
    it('should assemble chunks and mark upload as completed', async () => {
      const mockUpload = {
        id: 'upload-complete',
        fileName: 'test.pdf',
        totalChunks: 2,
        mimeType: 'application/pdf',
      };

      mockUploadFindUnique.mockResolvedValue(mockUpload);
      (mockSecurity.scanFile as jest.Mock).mockResolvedValue({
        hasVirus: false,
        isPasswordProtected: false,
        engine: 'stub',
      });
      (mockPostprocess.convertIfNeeded as jest.Mock).mockResolvedValue({ convertedPath: '/converted/file.pdf' });
      (mockPostprocess.getIndexingTarget as jest.Mock).mockReturnValue({ enabled: true, kind: 'pdf' });
      (mockPostprocess.indexIfEnabled as jest.Mock).mockResolvedValue({ indexed: true });
      mockUploadUpdate.mockResolvedValue({});

      // Reset and setup mockExistsSync
      mockExistsSync.mockReset();
      mockExistsSync.mockReturnValue(true); // Directories and all chunks exist

      // Mock file streams
      const mockReadStream = {
        on: jest.fn(function(this: unknown, event: string, handler: () => void) {
          if (event === 'end') setTimeout(handler, 0);
          return this;
        }),
        pipe: jest.fn(function(this: unknown) {
          return this;
        }),
      };

      const mockWriteStream = {
        end: jest.fn((callback?: () => void) => {
          if (callback) callback();
        }),
      };

      mockCreateReadStream.mockReturnValue(mockReadStream as never);
      mockCreateWriteStream.mockReturnValue(mockWriteStream as never);

      const result = await service.complete('upload-complete');

      expect(mockSecurity.scanFile).toHaveBeenCalled();
      // Verify postprocess methods were called (synchronous flow)
      expect(mockPostprocess.convertIfNeeded).toHaveBeenCalled();
      expect(mockPostprocess.getIndexingTarget).toHaveBeenCalled();
      expect(mockPostprocess.indexIfEnabled).toHaveBeenCalled();
      expect(result.ok).toBe(true);
      expect(result.storageKey).toContain('test.pdf');
    });

    it('should throw error if upload not found', async () => {
      mockUploadFindUnique.mockResolvedValue(null);

      await expect(service.complete('non-existent')).rejects.toThrow('upload not found');
    });

    it('should throw error if chunk is missing', async () => {
      const mockUpload = {
        id: 'upload-missing',
        fileName: 'incomplete.pdf',
        totalChunks: 3,
      };

      mockUploadFindUnique.mockResolvedValue(mockUpload);
      
      // Reset mockExistsSync and setup for specific calls
      mockExistsSync.mockReset();
      
      // First call: check partsDir exists (in getDirs)
      mockExistsSync.mockReturnValueOnce(true);
      // Second call: check assembledDir exists (in getDirs)
      mockExistsSync.mockReturnValueOnce(true);
      // Third call: check chunk 0 exists (in for loop)
      mockExistsSync.mockReturnValueOnce(true);
      // Fourth call: check chunk 1 exists (in for loop) - THIS ONE IS MISSING
      mockExistsSync.mockReturnValueOnce(false);

      const mockWriteStream = {
        end: jest.fn((callback?: () => void) => {
          if (callback) callback();
        }),
      };

      mockCreateWriteStream.mockReturnValue(mockWriteStream as never);

      await expect(service.complete('upload-missing')).rejects.toThrow('missing part index=1');
    });
  });

  describe('status', () => {
    it('should return upload status with chunks', async () => {
      const mockUpload = {
        id: 'upload-status',
        fileName: 'file.pdf',
        status: 'RECEIVING',
        totalChunks: 5,
        receivedChunks: 3,
        chunks: [
          { uploadId: 'upload-status', index: 0, sizeBytes: 100 },
          { uploadId: 'upload-status', index: 1, sizeBytes: 150 },
          { uploadId: 'upload-status', index: 2, sizeBytes: 120 },
        ],
      };

      mockUploadFindUnique.mockResolvedValue(mockUpload);

      const result = await service.status('upload-status');

      expect(mockUploadFindUnique).toHaveBeenCalledWith({
        where: { id: 'upload-status' },
        include: { chunks: true },
      });
      expect(result).toEqual(mockUpload);
      expect(result.chunks).toHaveLength(3);
    });

    it('should throw error if upload not found', async () => {
      mockUploadFindUnique.mockResolvedValue(null);

      await expect(service.status('non-existent')).rejects.toThrow('upload not found');
    });
  });
});
