// Set environment variables before any imports that might use AuthConfig
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-minimum-32-characters-long';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:4000/callback';

import { Test, TestingModule } from '@nestjs/testing';
import { AuthCacheService } from './auth-cache.service';

const originalEnv = { ...process.env };

describe('AuthCacheService', () => {
  let service: AuthCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthCacheService],
    }).compile();

    service = module.get<AuthCacheService>(AuthCacheService);
  });

  afterEach(() => {
    service.stopCleanup();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get and set', () => {
    it('should store and retrieve values', async () => {
      await service.set('test-key', 'test-value', 60);

      const value = await service.get('test-key');

      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await service.get('non-existent');

      expect(value).toBeNull();
    });

    it('should return null for expired keys', async () => {
      await service.set('expired-key', 'value', 0); // 0 second TTL

      await new Promise((resolve) => setTimeout(resolve, 100));

      const value = await service.get('expired-key');

      expect(value).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      await service.set('delete-me', 'value', 60);

      await service.del('delete-me');

      const value = await service.get('delete-me');

      expect(value).toBeNull();
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await service.set('user:1:data', 'data1', 60);
      await service.set('user:2:data', 'data2', 60);
      await service.set('other:key', 'data3', 60);

      const deleted = await service.delPattern('user:*');

      expect(deleted).toBe(2);

      const value1 = await service.get('user:1:data');
      const value2 = await service.get('user:2:data');
      const value3 = await service.get('other:key');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBe('data3');
    });
  });

  describe('getOrCompute', () => {
    it('should compute value if not in cache', async () => {
      const compute = jest.fn().mockResolvedValue('computed-value');

      const value = await service.getOrCompute('compute-key', compute, 60);

      expect(value).toBe('computed-value');
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('should return cached value without computing', async () => {
      const compute = jest.fn().mockResolvedValue('new-value');

      await service.set('cached-key', 'cached-value', 60);

      const value = await service.getOrCompute('cached-key', compute, 60);

      expect(value).toBe('cached-value');
      expect(compute).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all cache', async () => {
      await service.set('key1', 'value1', 60);
      await service.set('key2', 'value2', 60);

      await service.clear();

      const value1 = await service.get('key1');
      const value2 = await service.get('key2');

      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await service.set('key1', 'value1', 60);
      await service.set('key2', 'value2', 60);

      const stats = service.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });
});