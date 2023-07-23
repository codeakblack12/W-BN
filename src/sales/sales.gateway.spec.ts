import { Test, TestingModule } from '@nestjs/testing';
import { SalesGateway } from './sales.gateway';

describe('SalesGateway', () => {
  let gateway: SalesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesGateway],
    }).compile();

    gateway = module.get<SalesGateway>(SalesGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
