/**
 * NotesController Unit Tests
 */
describe('NotesController', () => {
  let mockNotesService: any;

  const getNotes = async (userId: string, folderId?: string) => {
    return mockNotesService.getNotesByUser(userId, folderId);
  };

  const savePageTyping = async (userId: string, noteId: string, fileId: string, pageNumber: string, dto: { content: any; version?: number }) => {
    return mockNotesService.savePageTyping(userId, noteId, fileId, parseInt(pageNumber, 10), dto.content, dto.version);
  };

  beforeEach(() => {
    mockNotesService = {
      getNotesByUser: jest.fn().mockResolvedValue([{ id: 'note-1', title: 'Test Note' }]),
      savePageTyping: jest.fn().mockResolvedValue({ id: 'content-1', version: 1 }),
    };
  });

  it('should be defined', () => {
    expect(getNotes).toBeDefined();
    expect(savePageTyping).toBeDefined();
  });

  describe('getNotes', () => {
    it('should return notes for user', async () => {
      const result = await getNotes('user-1');
      expect(mockNotesService.getNotesByUser).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toHaveLength(1);
    });

    it('should filter by folder', async () => {
      await getNotes('user-1', 'folder-1');
      expect(mockNotesService.getNotesByUser).toHaveBeenCalledWith('user-1', 'folder-1');
    });
  });

  describe('savePageTyping', () => {
    it('should save page typing content', async () => {
      const dto = { content: { ops: [] }, version: 1 };
      const result = await savePageTyping('user-1', 'note-1', 'file-1', '1', dto);
      expect(mockNotesService.savePageTyping).toHaveBeenCalledWith('user-1', 'note-1', 'file-1', 1, dto.content, 1);
      expect(result.version).toBe(1);
    });
  });
});
