import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const debugLevel = process.env.DEBUG_LEVEL ?? 'info';
    
    return {
      status: 'ok',
      nodeEnv,
      debugLevel,
      timeIso: new Date().toISOString(),
    };
  }
}
