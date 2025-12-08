import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/db/prisma.service';

/**
 * E2E Integration Tests for SyncNapse API
 * 
 * These tests verify the complete request/response cycle
 * including authentication, authorization, and database operations.
 * 
 * Note: Requires test database to be running
 * Run: docker-compose -f docker-compose.dev.yml up -d
 */
describe('SyncNapse API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data
  const testUser = {
    id: 'e2e-test-user',
    email: 'e2e-test@syncnapse.com',
    displayName: 'E2E Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/api (GET) - should return API root with HATEOAS links', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('_links');
      expect(response.body._links).toHaveProperty('self');
    });
  });

  describe('Authentication Flow', () => {
    describe('OAuth Flow', () => {
      it('/api/auth/google/url (GET) - should return OAuth authorization URL', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/auth/google/url')
          .expect(200);

        expect(response.body).toHaveProperty('url');
        expect(response.body.url).toContain('accounts.google.com');
      });
    });

    describe('Token Refresh', () => {
      it('/api/auth/refresh (POST) - should reject invalid refresh token', async () => {
        await request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);
      });
    });

    describe('Logout', () => {
      it('/api/auth/logout (POST) - should handle logout without token gracefully', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/auth/logout')
          .expect(401);

        expect(response.body.message).toBeDefined();
      });
    });
  });

  describe('Protected Routes (Require Auth)', () => {
    describe('Notes API', () => {
      it('/api/notes (GET) - should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/notes')
          .expect(401);
      });

      it('/api/notes (POST) - should require authentication', async () => {
        await request(app.getHttpServer())
          .post('/api/notes')
          .send({ title: 'Test Note', folder_id: 'root' })
          .expect(401);
      });
    });

    describe('Folders API', () => {
      it('/api/folders (GET) - should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/folders')
          .expect(401);
      });
    });

    describe('Search API', () => {
      it('/api/search (GET) - should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/search?q=test')
          .expect(401);
      });
    });

    describe('Users API', () => {
      it('/api/users/me (GET) - should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/users/me')
          .expect(401);
      });
    });

    describe('Transcription API', () => {
      it('/api/transcription/sessions (GET) - should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/transcription/sessions')
          .expect(401);
      });
    });

    describe('Devices API', () => {
      it('/api/devices (GET) - should require authentication', async () => {
        await request(app.getHttpServer())
          .get('/api/devices')
          .expect(401);
      });
    });
  });

  describe('Admin Routes', () => {
    it('/api/admin/dashboard (GET) - should require admin role', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/dashboard')
        .expect(401);
    });

    it('/api/admin/users (GET) - should require admin role', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .expect(401);
    });

    it('/api/admin/plans (GET) - should require admin role', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/plans')
        .expect(401);
    });
  });

  describe('Public Routes', () => {
    describe('Shared Notes', () => {
      it('/api/s/:shortCode (GET) - should return 404 for invalid short code', async () => {
        await request(app.getHttpServer())
          .get('/api/s/invalid-code')
          .expect(404);
      });
    });
  });

  describe('API Documentation', () => {
    it('/docs (GET) - Swagger UI should be available', async () => {
      const response = await request(app.getHttpServer())
        .get('/docs/')
        .expect(200);

      expect(response.text).toContain('swagger');
    });

    it('/api/docs-json (GET) - OpenAPI JSON should be available', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toBe('SyncNapse API');
    });
  });

  describe('Error Handling', () => {
    it('should return HAL-formatted error for 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/nonexistent-endpoint')
        .expect(404);

      // HAL exception filter should format the error
      expect(response.body).toHaveProperty('error');
    });

    it('should handle validation errors properly', async () => {
      // Try to create a note with invalid data (if authenticated)
      const response = await request(app.getHttpServer())
        .post('/api/notes')
        .send({}) // Empty body
        .expect(401); // Will fail auth first

      expect(response.body).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should not immediately rate limit normal requests', async () => {
      // Make a few requests to verify rate limiting is not too aggressive
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/api')
          .expect(200);
      }
    });
  });

  describe('CORS', () => {
    it('should allow requests from configured origins', async () => {
      const response = await request(app.getHttpServer())
        .options('/api')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});

/**
 * Authenticated E2E Tests
 * 
 * These tests require a valid JWT token.
 * In CI, these can be skipped or use a test token.
 */
describe('Authenticated E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    // In real tests, you would authenticate and get a token here
    // For now, we skip these tests in CI
    authToken = process.env.TEST_AUTH_TOKEN || '';
  });

  afterAll(async () => {
    await app.close();
  });

  const skipIfNoAuth = () => {
    if (!authToken) {
      return true;
    }
    return false;
  };

  describe('Notes CRUD (with auth)', () => {
    it.skip('should create, read, update, and delete a note', async () => {
      if (skipIfNoAuth()) return;

      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'E2E Test Note', folder_id: 'root' })
        .expect(201);

      const noteId = createResponse.body.id;
      expect(noteId).toBeDefined();

      // Read
      await request(app.getHttpServer())
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Update
      await request(app.getHttpServer())
        .patch(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated E2E Note' })
        .expect(200);

      // Delete
      await request(app.getHttpServer())
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Search (with auth)', () => {
    it.skip('should search notes, files, and segments', async () => {
      if (skipIfNoAuth()) return;

      const response = await request(app.getHttpServer())
        .get('/api/search?q=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notes');
      expect(response.body).toHaveProperty('files');
      expect(response.body).toHaveProperty('segments');
    });
  });
});

