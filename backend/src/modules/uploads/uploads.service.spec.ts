/**
 * UploadsService Unit Tests
 */
describe('UploadsService', () => {
  let service: any;
  let mockPrisma: any;
  let mockSecurity: any;
  let mockPostprocess: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma = {
      upload: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      uploadChunk: {
        upsert: jest.fn(),
        count: jest.fn(),
      },
    };

    mockSecurity = {
      scanFile: jest.fn(),
    };

    mockPostprocess = {
      convertIfNeeded: jest.fn().mockResolvedValue({ convertedPath: undefined, format: undefined }),
      getIndexingTarget: jest.fn().mockReturnValue({ enabled: true, kind: 'pdf' }),
      indexIfEnabled: jest.fn().mockResolvedValue({ indexed: true }),
    };

    const { UploadsService } = await import('./uploads.service');
    service = new UploadsService(mockPrisma, mockSecurity, mockPostprocess);
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

      mockPrisma.upload.create.mockResolvedValue(mockUpload);

      const result = await service.start(body);

      expect(mockPrisma.upload.create).toHaveBeenCalledWith({
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

      mockPrisma.upload.create.mockResolvedValue(mockUpload);

      const result = await service.start(body);

      expect(mockPrisma.upload.create).toHaveBeenCalledWith({
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
  });

  describe('saveChunk', () => {
    it('should throw error if upload not found', async () => {
      mockPrisma.upload.findUnique.mockResolvedValue(null);
      const file = { buffer: Buffer.from('data'), size: 50 };

      await expect(service.saveChunk('non-existent', 0, file)).rejects.toThrow('upload not found');
    });

    it('should save chunk and update upload progress', async () => {
      const mockUpload = { id: 'upload-123', totalChunks: 3 };
      const file = { buffer: Buffer.from('test data'), size: 100 };

      mockPrisma.upload.findUnique.mockResolvedValue(mockUpload);
      mockPrisma.uploadChunk.upsert.mockResolvedValue({});
      mockPrisma.uploadChunk.count.mockResolvedValue(2);
      mockPrisma.upload.update.mockResolvedValue({});

      const result = await service.saveChunk('upload-123', 1, file);

      expect(mockPrisma.upload.findUnique).toHaveBeenCalledWith({ where: { id: 'upload-123' } });
      expect(mockPrisma.uploadChunk.upsert).toHaveBeenCalledWith({
        where: { uploadId_index: { uploadId: 'upload-123', index: 1 } },
        update: { sizeBytes: 100 },
        create: { uploadId: 'upload-123', index: 1, sizeBytes: 100 },
      });
      expect(mockPrisma.upload.update).toHaveBeenCalledWith({
        where: { id: 'upload-123' },
        data: { receivedChunks: 2 },
      });
      expect(result).toEqual({ ok: true, receivedChunks: 2 });
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

      mockPrisma.upload.findUnique.mockResolvedValue(mockUpload);

      const result = await service.status('upload-status');

      expect(mockPrisma.upload.findUnique).toHaveBeenCalledWith({
        where: { id: 'upload-status' },
        include: { chunks: true },
      });
      expect(result).toEqual(mockUpload);
      expect(result.chunks).toHaveLength(3);
    });

    it('should throw error if upload not found', async () => {
      mockPrisma.upload.findUnique.mockResolvedValue(null);

      await expect(service.status('non-existent')).rejects.toThrow('upload not found');
    });
  });

  describe('complete', () => {
    it('should throw error if upload not found', async () => {
      mockPrisma.upload.findUnique.mockResolvedValue(null);

      await expect(service.complete('non-existent')).rejects.toThrow('upload not found');
    });
  });
});
