import { Test, TestingModule } from '@nestjs/testing';
import { InventoryGateway } from './inventory.gateway';

describe('InventoryGateway', () => {
  let gateway: InventoryGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryGateway],
    }).compile();

    gateway = module.get<InventoryGateway>(InventoryGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
