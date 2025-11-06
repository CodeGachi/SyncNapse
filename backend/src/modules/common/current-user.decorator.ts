import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as { id: string } | undefined;
  
  // Debug log to help identify authentication issues
  if (!user) {
    console.error('[CurrentUser] ❌ No user found in request. Authentication may have failed.');
    throw new UnauthorizedException('User not authenticated');
  }
  
  // If data is provided (e.g., @CurrentUser('id')), return that specific property
  if (data) {
    const value = user[data as keyof typeof user];
    if (value === undefined) {
      console.error(`[CurrentUser] ❌ Property '${data}' not found on user object:`, user);
      throw new UnauthorizedException(`User property '${data}' not found`);
    }
    return value;
  }
  
  // Otherwise return the whole user object
  return user;
});
