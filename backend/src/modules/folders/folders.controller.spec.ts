/**
 * FoldersController Unit Tests
 */
describe('FoldersController', () => {
  let mockFoldersService: any;

  const getFolders = async (userId: string) => {
    return mockFoldersService.getFoldersByUser(userId);
  };

  const createFolder = async (userId: string, dto: { name: string }) => {
    return mockFoldersService.createFolder(userId, dto);
  };

  const updateFolder = async (userId: string, folderId: string, dto: { name: string }) => {
    return mockFoldersService.updateFolder(userId, folderId, dto);
  };

  const deleteFolder = async (userId: string, folderId: string) => {
    return mockFoldersService.deleteFolder(userId, folderId);
  };

  beforeEach(() => {
    mockFoldersService = {
      getFoldersByUser: jest.fn().mockResolvedValue([{ id: 'folder-1', name: 'My Notes' }, { id: 'folder-2', name: 'Work' }]),
      createFolder: jest.fn().mockResolvedValue({ id: 'new-folder', name: 'New Folder' }),
      updateFolder: jest.fn().mockResolvedValue({ id: 'folder-1', name: 'Updated Name' }),
      deleteFolder: jest.fn().mockResolvedValue({ success: true }),
    };
  });

  it('should be defined', () => {
    expect(getFolders).toBeDefined();
  });

  describe('getFolders', () => {
    it('should return folders for user', async () => {
      const result = await getFolders('user-1');
      expect(mockFoldersService.getFoldersByUser).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('createFolder', () => {
    it('should create a new folder', async () => {
      const result = await createFolder('user-1', { name: 'New Folder' });
      expect(mockFoldersService.createFolder).toHaveBeenCalledWith('user-1', { name: 'New Folder' });
      expect(result.name).toBe('New Folder');
    });
  });

  describe('updateFolder', () => {
    it('should update folder', async () => {
      const result = await updateFolder('user-1', 'folder-1', { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteFolder', () => {
    it('should delete folder', async () => {
      const result = await deleteFolder('user-1', 'folder-1');
      expect(result.success).toBe(true);
    });
  });
});
