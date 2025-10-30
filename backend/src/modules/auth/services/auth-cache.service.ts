import { Injectable, Logger } from '@nestjs/common';
import { AuthConfig } from '../config/auth.config';

// Simple in-memory cache for auth operations
// Can be replaced with Redis for production
@Injectable()
export class AuthCacheService {
  private readonly logger = new Logger(AuthCacheService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly cache = new Map<string, { value: any; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

   // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return cached.value as T;
  }

   // Set value in cache with TTL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(key: string, value: any, ttl: number = AuthConfig.CACHE_TTL): Promise<void> {
    const expiresAt = Date.now() + (ttl * 1000);

    this.cache.set(key, { value, expiresAt });
  }

   // Delete value from cache
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

   // Delete all keys matching pattern
  async delPattern(pattern: string): Promise<number> {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

   // Get or compute value if not in cache
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number = AuthConfig.CACHE_TTL,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await compute();

    await this.set(key, value, ttl);

    return value;
  }

   // Clear entire cache
  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('[clear] Cache cleared');
  }

   // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

   // Start cleanup interval to remove expired entries
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        this.logger.debug(`[cleanup] Removed ${removed} expired entries`);
      }
    }, 60000);
  }

   // Stop cleanup interval (for testing/shutdown)
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

   // Clean up on module destroy
  onModuleDestroy(): void {
    this.stopCleanup();
  }
}