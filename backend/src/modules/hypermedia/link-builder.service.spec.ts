import { Test, TestingModule } from '@nestjs/testing';
import { LinkBuilderService } from './link-builder.service';

describe('LinkBuilderService', () => {
  let service: LinkBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkBuilderService],
    }).compile();

    service = module.get<LinkBuilderService>(LinkBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('self', () => {
    it('should create a self link', () => {
      // Act
      const link = service.self('/api/users/123');

      // Assert
      expect(link).toEqual({ href: '/api/users/123' });
    });
  });

  describe('action', () => {
    it('should create an action link with GET method', () => {
      // Act
      const link = service.action('/api/users', 'GET');

      // Assert
      expect(link).toEqual({
        href: '/api/users',
        method: 'GET',
      });
    });

    it('should create an action link with POST method', () => {
      // Act
      const link = service.action('/api/users', 'POST');

      // Assert
      expect(link).toEqual({
        href: '/api/users',
        method: 'POST',
      });
    });

    it('should support all HTTP methods', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

      // Act & Assert
      methods.forEach((method) => {
        const link = service.action('/api/resource', method);
        expect(link.method).toBe(method);
      });
    });
  });

  describe('up', () => {
    it('should create an up link', () => {
      // Act
      const link = service.up('/api');

      // Assert
      expect(link).toEqual({ href: '/api' });
    });
  });

  describe('templated', () => {
    it('should create a templated link', () => {
      // Act
      const link = service.templated('/api/users/{id}');

      // Assert
      expect(link).toEqual({
        href: '/api/users/{id}',
        templated: true,
      });
    });
  });

  describe('link', () => {
    it('should create a custom link with minimal options', () => {
      // Act
      const link = service.link('/api/users');

      // Assert
      expect(link).toEqual({ href: '/api/users' });
    });

    it('should create a custom link with all options', () => {
      // Act
      const link = service.link('/api/users', {
        method: 'GET',
        type: 'application/json',
        title: 'Users List',
        templated: false,
      });

      // Assert
      expect(link).toEqual({
        href: '/api/users',
        method: 'GET',
        type: 'application/json',
        title: 'Users List',
        templated: false,
      });
    });

    it('should create a link with deprecation notice', () => {
      // Act
      const link = service.link('/api/v1/users', {
        deprecation: 'https://api.example.com/docs/deprecations/v1-users',
      });

      // Assert
      expect(link).toHaveProperty('deprecation');
      expect(link.deprecation).toBe('https://api.example.com/docs/deprecations/v1-users');
    });
  });

  describe('pagination', () => {
    it('should create pagination links for first page', () => {
      // Act
      const links = service.pagination({
        baseUrl: '/api/users',
        page: 1,
        pageSize: 10,
        totalPages: 5,
      });

      // Assert
      expect(links).toHaveProperty('self');
      expect(links).toHaveProperty('first');
      expect(links).toHaveProperty('last');
      expect(links).toHaveProperty('next');
      expect(links).not.toHaveProperty('prev');
      expect(links.self.href).toBe('/api/users?page=1&limit=10');
      expect(links.next?.href).toBe('/api/users?page=2&limit=10');
    });

    it('should create pagination links for middle page', () => {
      // Act
      const links = service.pagination({
        baseUrl: '/api/users',
        page: 3,
        pageSize: 10,
        totalPages: 5,
      });

      // Assert
      expect(links).toHaveProperty('prev');
      expect(links).toHaveProperty('next');
      expect(links.prev?.href).toBe('/api/users?page=2&limit=10');
      expect(links.next?.href).toBe('/api/users?page=4&limit=10');
    });

    it('should create pagination links for last page', () => {
      // Act
      const links = service.pagination({
        baseUrl: '/api/users',
        page: 5,
        pageSize: 10,
        totalPages: 5,
      });

      // Assert
      expect(links).toHaveProperty('prev');
      expect(links).not.toHaveProperty('next');
      expect(links.prev?.href).toBe('/api/users?page=4&limit=10');
    });

    it('should create minimal links for single page', () => {
      // Act
      const links = service.pagination({
        baseUrl: '/api/users',
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      // Assert
      expect(links).toHaveProperty('self');
      expect(links).not.toHaveProperty('first');
      expect(links).not.toHaveProperty('last');
      expect(links).not.toHaveProperty('prev');
      expect(links).not.toHaveProperty('next');
    });

    it('should include first and last links when multiple pages exist', () => {
      // Act
      const links = service.pagination({
        baseUrl: '/api/users',
        page: 2,
        pageSize: 20,
        totalPages: 10,
      });

      // Assert
      expect(links.first?.href).toBe('/api/users?page=1&limit=20');
      expect(links.last?.href).toBe('/api/users?page=10&limit=20');
    });
  });
});