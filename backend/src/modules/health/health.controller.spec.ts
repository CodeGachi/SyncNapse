import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const res = controller.getHealth();
    expect(res.status).toBe('ok');
    expect(typeof res.timeIso).toBe('string');
  });
});
