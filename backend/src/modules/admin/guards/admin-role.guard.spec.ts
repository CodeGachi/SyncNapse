import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminErrors } from '../constants';

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminRoleGuard],
    }).compile();

    guard = module.get<AdminRoleGuard>(AdminRoleGuard);
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
        AdminErrors.ADMIN_ROLE_REQUIRED.message,
      );
    });

    it('should allow access when user role is "admin"', () => {
      mockRequest.user = { id: 'admin-001', role: 'admin' };

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user role is "operator"', () => {
      mockRequest.user = { id: 'operator-001', role: 'operator' };

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

    it('should throw ForbiddenException when user role is unknown', () => {
      mockRequest.user = { id: 'user-001', role: 'unknown-role' };

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

