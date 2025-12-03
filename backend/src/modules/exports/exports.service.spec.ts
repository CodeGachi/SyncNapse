import { NotFoundException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { PrismaService } from '../db/prisma.service';
import * as fs from 'node:fs';
import { Readable } from 'stream';

// Mock fs module
jest.mock('node:fs');
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;
const mockCreateWriteStream = fs.createWriteStream as jest.MockedFunction<typeof fs.createWriteStream>;
const mockCreateReadStream = fs.createReadStream as jest.MockedFunction<typeof fs.createReadStream>;
const mockStatSync = fs.statSync as jest.MockedFunction<typeof fs.statSync>;

// Mock stream/promises
jest.mock('node:stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined),
}));

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
    mockStatSync.mockReturnValue({ size: 1024 } as fs.Stats);
    
    // Mock stream creation
    // We need to return an object that looks like a writable stream
    mockCreateWriteStream.mockReturnValue({
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    } as any);

    const mockReadable = new Readable();
    mockReadable.push('test');
    mockReadable.push(null);
    mockCreateReadStream.mockReturnValue(mockReadable as any);
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
        foldersLink: [],
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
        foldersLink: [],
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
        foldersLink: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      const result = await service.createExportForNote('note-789');

      expect(mockCreateWriteStream).toHaveBeenCalledWith(
        expect.stringContaining('note-789.json'),
        expect.objectContaining({ encoding: 'utf8' })
      );

      expect(result.file).toContain('note-789.json');
      expect(result.size).toBe(1024);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when note not found', async () => {
      // Mock note not found
      mockFindUnique.mockResolvedValue(null);

      await expect(service.createExportForNote('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.createExportForNote('non-existent')).rejects.toThrow('Note with ID non-existent not found');
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
        foldersLink: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      await service.createExportForNote('note-count');
      
      expect(mockCreateWriteStream).toHaveBeenCalled();
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
        foldersLink: [],
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
        foldersLink: [],
      };

      mockFindUnique.mockResolvedValue(mockNote);

      await service.createExportForNote('note-empty');
      expect(mockCreateWriteStream).toHaveBeenCalled();
    });
  });

  describe('readExport', () => {
    it('should read export file and return stream', async () => {
      // Mock file exists
      mockExistsSync.mockReturnValue(true);
      
      const result = await service.readExport('/path/to/export.json');

      expect(result.stream).toBeDefined();
      expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/export.json');
    });

    it('should throw NotFoundException when file does not exist', async () => {
      // Mock file does not exist
      mockExistsSync.mockReturnValue(false);

      await expect(service.readExport('/path/to/missing.json')).rejects.toThrow(NotFoundException);
      await expect(service.readExport('/path/to/missing.json')).rejects.toThrow('Export file not found');
    });

    it('should handle read errors gracefully', async () => {
      // Mock file exists but read fails
      mockExistsSync.mockReturnValue(true);
      mockCreateReadStream.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(service.readExport('/path/to/protected.json')).rejects.toThrow('Failed to read export file');
    });
  });
});
