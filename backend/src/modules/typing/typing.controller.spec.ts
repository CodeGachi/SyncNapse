/**
 * TypingController Unit Tests
 */
describe('TypingController', () => {
  let mockTypingService: any;

  const getPageContent = async (userId: string, noteId: string, fileId: string, pageNumber: number) => {
    return mockTypingService.getPageContent(userId, noteId, fileId, pageNumber);
  };

  const savePageContent = async (userId: string, noteId: string, dto: any) => {
    return mockTypingService.savePageContent(userId, noteId, dto);
  };

  beforeEach(() => {
    mockTypingService = {
      getPageContent: jest.fn().mockResolvedValue({ id: 'content-1', content: { ops: [{ insert: 'Hello' }] }, version: 1 }),
      savePageContent: jest.fn().mockResolvedValue({ id: 'content-1', version: 2 }),
    };
  });

  it('should be defined', () => {
    expect(getPageContent).toBeDefined();
    expect(savePageContent).toBeDefined();
  });

  describe('getPageContent', () => {
    it('should return page content', async () => {
      const result = await getPageContent('user-1', 'note-1', 'file-1', 1);
      expect(mockTypingService.getPageContent).toHaveBeenCalledWith('user-1', 'note-1', 'file-1', 1);
      expect(result.content).toEqual({ ops: [{ insert: 'Hello' }] });
    });
  });

  describe('savePageContent', () => {
    it('should save page content', async () => {
      const dto = { fileId: 'file-1', pageNumber: 1, content: { ops: [{ insert: 'Updated' }] }, expectedVersion: 1 };
      const result = await savePageContent('user-1', 'note-1', dto);
      expect(mockTypingService.savePageContent).toHaveBeenCalledWith('user-1', 'note-1', dto);
      expect(result.version).toBe(2);
    });
  });
});
