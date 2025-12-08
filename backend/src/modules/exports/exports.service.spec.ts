import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs';
import { Readable } from 'stream';

/**
 * ExportsService Unit Tests
 */
describe('ExportsService', () => {
  let service: any;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      lectureNote: {
        findUnique: jest.fn(),
      },
    };

    // Dynamic import
    const { ExportsService } = await import('./exports.service');
    service = new ExportsService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createExportForNote', () => {
    it('should export note with all data', async () => {
      const mockNote = {
        id: 'note-123',
        title: 'Test Note',
        createdAt: new Date('2024-01-01'),
        transcript: [{ id: '1' }, { id: '2' }],
        translations: [{ id: '1' }],
        typingSections: [],
        foldersLink: [],
      };
      mockPrisma.lectureNote.findUnique.mockResolvedValue(mockNote);

      const result = await service.createExportForNote('note-123');

      expect(result.file).toContain('note-123.json');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrisma.lectureNote.findUnique.mockResolvedValue(null);

      await expect(service.createExportForNote('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should handle notes with empty data', async () => {
      const mockNote = {
        id: 'note-empty',
        title: 'Empty Note',
        createdAt: new Date(),
        transcript: [],
        translations: [],
        typingSections: [],
        foldersLink: [],
      };
      mockPrisma.lectureNote.findUnique.mockResolvedValue(mockNote);

      const result = await service.createExportForNote('note-empty');
      expect(result.file).toContain('note-empty.json');
    });
  });

  describe('readExport', () => {
    it('should return stream for existing file', async () => {
      // Create a temp file for testing
      const testPath = '/tmp/test-export.json';
      fs.writeFileSync(testPath, JSON.stringify({ test: true }));

      try {
        const result = await service.readExport(testPath);
        expect(result.stream).toBeDefined();
      } finally {
        fs.unlinkSync(testPath);
      }
    });

    it('should throw NotFoundException when file does not exist', async () => {
      await expect(service.readExport('/nonexistent/path.json')).rejects.toThrow(NotFoundException);
    });
  });
});
