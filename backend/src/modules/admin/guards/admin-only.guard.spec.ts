import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminOnlyGuard } from './admin-only.guard';
import { AdminErrors } from '../constants';

describe('AdminOnlyGuard', () => {
  let guard: AdminOnlyGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminOnlyGuard],
    }).compile();

    guard = module.get<AdminOnlyGuard>(AdminOnlyGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let context: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: null,
      };

      context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;
    });

    it('should throw ForbiddenException when user is not found', () => {
      mockRequest.user = null;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        AdminErrors.AUTHENTICATION_REQUIRED.message,
      );
    });

    it('should throw ForbiddenException when user role is "user"', () => {
      mockRequest.user = { id: 'user-001', role: 'user' };

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        AdminErrors.ADMIN_ONLY_REQUIRED.message,
      );
    });

    it('should throw ForbiddenException when user role is "operator"', () => {
      mockRequest.user = { id: 'operator-001', role: 'operator' };

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        AdminErrors.ADMIN_ONLY_REQUIRED.message,
      );
    });

    it('should allow access ONLY when user role is "admin"', () => {
      mockRequest.user = { id: 'admin-001', role: 'admin' };

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user has no role', () => {
      mockRequest.user = { id: 'user-001' };

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user role is empty string', () => {
      mockRequest.user = { id: 'user-001', role: '' };

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

