import { Test, TestingModule } from '@nestjs/testing';
import { HalService } from './hal.service';
import { LinkBuilderService } from './link-builder.service';

describe('HalService', () => {
  let service: HalService;
  let linkBuilder: LinkBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HalService, LinkBuilderService],
    }).compile();

    service = module.get<HalService>(HalService);
    linkBuilder = module.get<LinkBuilderService>(LinkBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resource', () => {
    it('should create a HAL resource with links', () => {
      // Arrange
      const data = { id: '123', name: 'Test User' };
      const links = {
        self: linkBuilder.self('/api/users/123'),
        update: linkBuilder.action('/api/users/123', 'PATCH'),
      };

      // Act
      const result = service.resource(data, links);

      // Assert
      expect(result).toHaveProperty('id', '123');
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('_links');
      expect(result._links).toHaveProperty('self');
      expect(result._links).toHaveProperty('update');
    });

    it('should include embedded resources when provided', () => {
      // Arrange
      const data = { id: '123' };
      const links = { self: linkBuilder.self('/api/users/123') };
      const embedded = {
        posts: [
          { id: '1', title: 'Post 1', _links: { self: { href: '/api/posts/1' } } },
          { id: '2', title: 'Post 2', _links: { self: { href: '/api/posts/2' } } },
        ],
      };

      // Act
      const result = service.resource(data, links, embedded);

      // Assert
      expect(result).toHaveProperty('_embedded');
      expect(result._embedded).toEqual(embedded);
    });

    it('should not include _embedded when empty', () => {
      // Arrange
      const data = { id: '123' };
      const links = { self: linkBuilder.self('/api/users/123') };

      // Act
      const result = service.resource(data, links, {});

      // Assert
      expect(result).not.toHaveProperty('_embedded');
    });

    it('should use empty href for self link if not provided', () => {
      // Arrange
      const data = { id: '123' };
      const links = {};

      // Act
      const result = service.resource(data, links);

      // Assert
      expect(result._links.self).toEqual({ href: '' });
    });
  });

  describe('collection', () => {
    it('should create a HAL collection with items', () => {
      // Arrange
      const items = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];
      const params = {
        selfHref: '/api/users',
        itemSelfHref: (item: typeof items[0]) => `/api/users/${item.id}`,
      };

      // Act
      const result = service.collection(items, params);

      // Assert
      expect(result.count).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]._links.self.href).toBe('/api/users/1');
      expect(result.items[1]._links.self.href).toBe('/api/users/2');
      expect(result._links.self.href).toBe('/api/users');
    });

    it('should include pagination links when provided', () => {
      // Arrange
      const items = [{ id: '1' }];
      const params = {
        selfHref: '/api/users?page=2',
        itemSelfHref: (item: typeof items[0]) => `/api/users/${item.id}`,
        nextHref: '/api/users?page=3',
        prevHref: '/api/users?page=1',
        firstHref: '/api/users?page=1',
        lastHref: '/api/users?page=10',
      };

      // Act
      const result = service.collection(items, params);

      // Assert
      expect(result._links).toHaveProperty('next');
      expect(result._links).toHaveProperty('prev');
      expect(result._links).toHaveProperty('first');
      expect(result._links).toHaveProperty('last');
      expect((result._links.next as { href: string })?.href).toBe('/api/users?page=3');
      expect((result._links.prev as { href: string })?.href).toBe('/api/users?page=1');
    });

    it('should include pagination metadata', () => {
      // Arrange
      const items = [{ id: '1' }];
      const params = {
        selfHref: '/api/users',
        itemSelfHref: (item: typeof items[0]) => `/api/users/${item.id}`,
      };
      const pagination = {
        page: 2,
        limit: 10,
        total: 100,
      };

      // Act
      const result = service.collection(items, params, pagination);

      // Assert
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(100);
    });

    it('should include extra links when provided', () => {
      // Arrange
      const items = [{ id: '1' }];
      const params = {
        selfHref: '/api/users',
        itemSelfHref: (item: typeof items[0]) => `/api/users/${item.id}`,
        extraLinks: {
          create: linkBuilder.action('/api/users', 'POST'),
        },
      };

      // Act
      const result = service.collection(items, params);

      // Assert
      expect(result._links).toHaveProperty('create');
      expect((result._links.create as { method: string })?.method).toBe('POST');
    });

    it('should handle empty collection', () => {
      // Arrange
      const items: Array<{ id: string }> = [];
      const params = {
        selfHref: '/api/users',
        itemSelfHref: (item: { id: string }) => `/api/users/${item.id}`,
      };

      // Act
      const result = service.collection(items, params);

      // Assert
      expect(result.count).toBe(0);
      expect(result.items).toHaveLength(0);
      expect(result._links.self.href).toBe('/api/users');
    });
  });

  describe('emptyCollection', () => {
    it('should create an empty HAL collection', () => {
      // Act
      const result = service.emptyCollection('/api/users');

      // Assert
      expect(result.count).toBe(0);
      expect(result.items).toEqual([]);
      expect(result._links.self.href).toBe('/api/users');
    });
  });

  describe('error', () => {
    it('should create a HAL error response', () => {
      // Act
      const result = service.error('Not found', 404);

      // Assert
      expect(result).toHaveProperty('error');
      expect(result.error).toMatchObject({
        message: 'Not found',
        statusCode: 404,
      });
      expect(result).toHaveProperty('_links');
    });

    it('should include error details when provided', () => {
      // Act
      const result = service.error('Validation failed', 400, {
        field: 'email',
        reason: 'Invalid format',
      });

      // Assert
      expect(result.error).toMatchObject({
        message: 'Validation failed',
        statusCode: 400,
        field: 'email',
        reason: 'Invalid format',
      });
    });
  });
});