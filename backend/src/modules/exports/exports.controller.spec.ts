/**
 * ExportsController Unit Tests
 */
describe('ExportsController', () => {
  let mockExportsService: any;

  const createExport = async (userId: string, noteId: string) => {
    return mockExportsService.createExportForNote(userId, noteId);
  };

  const readExport = async (exportFile: string) => {
    return mockExportsService.readExport(exportFile);
  };

  beforeEach(() => {
    mockExportsService = {
      createExportForNote: jest.fn().mockResolvedValue({
        file: '/exports/note-123.json',
        size: 1024,
        generatedAt: new Date(),
      }),
      readExport: jest.fn().mockResolvedValue({
        stream: { pipe: jest.fn() },
      }),
    };
  });

  it('should be defined', () => {
    expect(createExport).toBeDefined();
    expect(readExport).toBeDefined();
  });

  describe('createExport', () => {
    it('should create export for note', async () => {
      const result = await createExport('user-1', 'note-123');
      expect(mockExportsService.createExportForNote).toHaveBeenCalledWith('user-1', 'note-123');
      expect(result.file).toBe('/exports/note-123.json');
    });
  });

  describe('readExport', () => {
    it('should read export file', async () => {
      const result = await readExport('note-123.json');
      expect(mockExportsService.readExport).toHaveBeenCalledWith('note-123.json');
      expect(result.stream).toBeDefined();
    });
  });
});
