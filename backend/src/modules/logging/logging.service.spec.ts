import { LoggingService } from './logging.service';
import { PrismaService } from '../db/prisma.service';

describe('LoggingService', () => {
  let service: LoggingService;
  let mockPrisma: PrismaService;
  let mockAuditCreate: jest.Mock;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock function
    mockAuditCreate = jest.fn();

    // Mock Prisma service
    mockPrisma = {
      auditLog: {
        create: mockAuditCreate,
      },
    } as unknown as PrismaService;

    service = new LoggingService(mockPrisma);

    // Spy on console.log to verify JSON output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('log', () => {
    it('should write info level log to stdout as JSON', () => {
      service.log('test message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logOutput).toMatchObject({
        level: 'info',
        service: 'backend',
        msg: 'test message',
        key: 'value',
      });
      expect(logOutput.timestamp).toBeDefined();
    });

    it('should log without metadata', () => {
      service.log('simple message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logOutput).toMatchObject({
        level: 'info',
        service: 'backend',
        msg: 'simple message',
      });
    });
  });

  describe('warn', () => {
    it('should write warn level log to stdout as JSON', () => {
      service.warn('warning message', { reason: 'test' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logOutput).toMatchObject({
        level: 'warn',
        service: 'backend',
        msg: 'warning message',
        reason: 'test',
      });
    });
  });

  describe('error', () => {
    it('should write error level log to stdout as JSON', () => {
      service.error('error occurred', { errorCode: 500 });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logOutput).toMatchObject({
        level: 'error',
        service: 'backend',
        msg: 'error occurred',
        errorCode: 500,
      });
    });
  });

  describe('debug', () => {
    it('should write debug level log to stdout as JSON', () => {
      service.debug('debug info', { debugData: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

      expect(logOutput).toMatchObject({
        level: 'debug',
        service: 'backend',
        msg: 'debug info',
        debugData: 'value',
      });
    });
  });

  describe('audit', () => {
    it('should create audit log with all fields', async () => {
      const payload = {
        userId: 'user-123',
        method: 'POST',
        path: '/api/notes',
        status: 201,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-456',
        action: 'note.create',
        resourceId: 'note-789',
        extra: { noteTitle: 'Test Note' },
      };

      mockAuditCreate.mockResolvedValue({});

      await service.audit(payload);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          method: 'POST',
          path: '/api/notes',
          status: 201,
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          requestId: 'req-456',
          action: 'note.create',
          resourceId: 'note-789',
          payload: { noteTitle: 'Test Note' },
        },
      });
    });

    it('should handle partial audit data', async () => {
      const payload = {
        userId: 'user-456',
        action: 'file.upload',
      };

      mockAuditCreate.mockResolvedValue({});

      await service.audit(payload);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          method: undefined,
          path: undefined,
          status: undefined,
          ip: undefined,
          userAgent: undefined,
          requestId: undefined,
          action: 'file.upload',
          resourceId: undefined,
          payload: null,
        },
      });
    });

    it('should handle null extra data', async () => {
      const payload = {
        userId: 'user-789',
        action: 'test.action',
        extra: undefined,
      };

      mockAuditCreate.mockResolvedValue({});

      await service.audit(payload);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          payload: null,
        }),
      });
    });

    it('should catch and log audit creation failures', async () => {
      // Mock Prisma failure
      mockAuditCreate.mockRejectedValue(new Error('Database connection failed'));

      const warnSpy = jest.spyOn(service, 'warn');

      await service.audit({ userId: 'user-123', action: 'test' });

      // Should not throw, but should log warning
      expect(warnSpy).toHaveBeenCalledWith('audit_failed', {
        error: 'Database connection failed',
      });
    });

    it('should handle unknown error types', async () => {
      // Mock non-Error object being thrown
      mockAuditCreate.mockRejectedValue('string error');

      const warnSpy = jest.spyOn(service, 'warn');

      await service.audit({ userId: 'user-123', action: 'test' });

      expect(warnSpy).toHaveBeenCalledWith('audit_failed', {
        error: 'unknown',
      });
    });
  });

  describe('JSON logging format', () => {
    it('should include ISO timestamp in all logs', () => {
      service.log('test');

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should always include service field', () => {
      service.log('test');

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.service).toBe('backend');
    });

    it('should merge metadata into log object', () => {
      service.log('test', { field1: 'value1', field2: 'value2', nested: { key: 'value' } });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.field1).toBe('value1');
      expect(logOutput.field2).toBe('value2');
      expect(logOutput.nested).toEqual({ key: 'value' });
    });
  });
});

