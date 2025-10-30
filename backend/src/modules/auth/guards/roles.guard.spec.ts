import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user?: { role?: string }, requiredRoles: string[] = []): ExecutionContext => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles.length > 0 ? requiredRoles : null);

    return mockContext;
  };

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'user' }, []);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'admin' }, ['admin']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow access when user has one of multiple required roles', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'moderator' }, ['admin', 'moderator']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'user' }, ['admin']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should deny access when user has no role', () => {
      // Arrange
      const context = createMockExecutionContext({}, ['admin']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should deny access when user is undefined', () => {
      // Arrange
      const context = createMockExecutionContext(undefined, ['admin']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should deny access when user role is null', () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context = createMockExecutionContext({ role: undefined } as any, ['admin']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should use getAllAndOverride to check both handler and class metadata', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'admin' }, ['admin']);
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');

      // Act
      guard.canActivate(context);

      // Assert
      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should handle multiple roles requirement correctly', () => {
      // Arrange - user with 'user' role trying to access admin/superadmin endpoint
      const context = createMockExecutionContext({ role: 'user' }, ['admin', 'superadmin']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow admin when admin is one of required roles', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'admin' }, ['user', 'admin', 'moderator']);

      // Act
      const result = guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('logging', () => {
    it('should log role check with debug level', () => {
      // Arrange
      const context = createMockExecutionContext({ role: 'user' }, ['admin']);
      const loggerSpy = jest.spyOn(guard['logger'], 'debug');

      // Act
      guard.canActivate(context);

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
      const logMessage = loggerSpy.mock.calls[0][0];
      expect(logMessage).toContain('RolesGuard');
      expect(logMessage).toContain('roles=');
      expect(logMessage).toContain('userRole=');
      expect(logMessage).toContain('allow=');
    });
  });
});

