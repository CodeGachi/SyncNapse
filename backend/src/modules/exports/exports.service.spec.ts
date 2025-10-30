import { ExportsService } from './exports.service';
import { PrismaService } from '../db/prisma.service';
import * as fs from 'node:fs';

// Mock fs module
jest.mock('node:fs');
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;
const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

describe('ExportsService', () => {
  let service: ExportsService;
  let mockPrisma: PrismaService;
  let mockFindUnique: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock function
    mockFindUnique = jest.fn();

    // Create mock Prisma service
    mockPrisma = {
      lectureNote: {
        findUnique: mockFindUnique,
      },
    } as unknown as PrismaService;

    service = new ExportsService(mockPrisma);

    // Default mock implementations
    mockExistsSync.mockReturnValue(false);
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
  });

  describe('createExportForNote', () => {
    it('should create export directory if it does not exist', async () => {
      // Mock directory does not exist
      mockExistsSync.mockReturnValue(false);

      // Mock note data
      const mockNote = {
        id: 'note-123',
        title: 'Test Note',
        createdAt: new Date('2024-01-01'),
        transcript: [{ id: '1' }, { id: '2' }],
        translations: [{ id: '1' }],
        typingSections: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      await service.createExportForNote('note-123');

      // Should create directory
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('exports'),
        { recursive: true }
      );
    });

    it('should not create directory if it already exists', async () => {
      // Mock directory exists
      mockExistsSync.mockReturnValue(true);

      const mockNote = {
        id: 'note-456',
        title: 'Existing Export',
        createdAt: new Date('2024-01-02'),
        transcript: [],
        translations: [],
        typingSections: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      await service.createExportForNote('note-456');

      // Should not create directory
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should export note with all data', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockNote = {
        id: 'note-789',
        title: 'Complete Note',
        createdAt: new Date('2024-03-15'),
        transcript: [{ id: '1' }, { id: '2' }, { id: '3' }],
        translations: [{ id: '1' }, { id: '2' }],
        typingSections: [{ id: '1' }],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      const result = await service.createExportForNote('note-789');

      // Verify file write was called with correct data
      const writeCall = mockWriteFileSync.mock.calls[0];
      expect(writeCall[0]).toContain('note-789.json');
      expect(writeCall[1]).toContain('"id": "note-789"'); // Note: JSON.stringify with 2 spaces adds spaces
      expect(writeCall[2]).toBe('utf8');

      expect(result.file).toContain('note-789.json');
    });

    it('should throw error when note not found', async () => {
      // Mock note not found
      mockFindUnique.mockResolvedValue(null);

      await expect(service.createExportForNote('non-existent')).rejects.toThrow('note not found');
    });

    it('should include correct counts in export', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockNote = {
        id: 'note-count',
        title: 'Count Test',
        createdAt: new Date('2024-02-20'),
        transcript: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
        translations: [{ id: '1' }],
        typingSections: [{ id: '1' }, { id: '2' }],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      await service.createExportForNote('note-count');

      // Verify the JSON contains correct counts
      const writeCall = mockWriteFileSync.mock.calls[0];
      const writtenJson = JSON.parse(writeCall[1] as string);

      expect(writtenJson).toMatchObject({
        id: 'note-count',
        title: 'Count Test',
        transcriptSegments: 4,
        translationSegments: 1,
        typingSections: 2,
      });
      expect(writtenJson.generatedAt).toBeDefined();
    });

    it('should use custom export directory from env', async () => {
      process.env.EXPORT_DIR = '/custom/export/path';
      mockExistsSync.mockReturnValue(true);

      const mockNote = {
        id: 'note-env',
        title: 'Env Test',
        createdAt: new Date(),
        transcript: [],
        translations: [],
        typingSections: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      const result = await service.createExportForNote('note-env');

      expect(result.file).toContain('/custom/export/path');

      delete process.env.EXPORT_DIR;
    });

    it('should handle notes with no transcript or translations', async () => {
      mockExistsSync.mockReturnValue(true);

      const mockNote = {
        id: 'note-empty',
        title: 'Empty Note',
        createdAt: new Date('2024-01-10'),
        transcript: [],
        translations: [],
        typingSections: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      await service.createExportForNote('note-empty');

      const writeCall = mockWriteFileSync.mock.calls[0];
      const writtenJson = JSON.parse(writeCall[1] as string);

      expect(writtenJson).toMatchObject({
        id: 'note-empty',
        title: 'Empty Note',
        transcriptSegments: 0,
        translationSegments: 0,
        typingSections: 0,
      });
    });
  });

  describe('readExport', () => {
    it('should read export file and return buffer', async () => {
      // Mock file content
      const mockBuffer = Buffer.from('{"test": "data"}');
      mockReadFileSync.mockReturnValue(mockBuffer);

      const result = await service.readExport('/path/to/export.json');

      expect(result.content).toEqual(mockBuffer);
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/export.json');
    });

    it('should handle various file paths', async () => {
      const mockBuffer = Buffer.from('test content');
      mockReadFileSync.mockReturnValue(mockBuffer);

      const paths = [
        '/var/exports/note1.json',
        'C:\\exports\\note2.json',
        './exports/note3.json',
      ];

      for (const filePath of paths) {
        const result = await service.readExport(filePath);
        expect(result.content).toEqual(mockBuffer);
      }

      expect(mockReadFileSync).toHaveBeenCalledTimes(3);
    });

    it('should handle large export files', async () => {
      // Mock large file content
      const largeContent = JSON.stringify({ data: 'x'.repeat(10000) });
      const mockBuffer = Buffer.from(largeContent);
      mockReadFileSync.mockReturnValue(mockBuffer);

      const result = await service.readExport('/path/to/large.json');

      expect(result.content).toEqual(mockBuffer);
      expect(result.content.length).toBeGreaterThan(10000);
    });
  });
});
