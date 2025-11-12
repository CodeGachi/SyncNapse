import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  // 테스트용: user가 없으면 기본 사용자 반환
  return request.user || { id: 'seed_1760373434' };
});
