import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { MongooseModule } from '@nestjs/mongoose';
import { InventorySchema } from './schemas/inventory.schema';
import { CategorySchema } from './schemas/inventory.schema';
import { InventoryGateway } from './inventory.gateway';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';
import { WarehouseSchema } from 'src/auth/schemas/auth.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    AuthModule,
    MongooseModule.forFeature([{name: 'Category', schema: CategorySchema}]),
    MongooseModule.forFeature([{name: 'Inventory', schema: InventorySchema}]),
    MongooseModule.forFeature([{name: 'Warehouse', schema: WarehouseSchema}]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryGateway],
  exports: [InventoryService],
})
export class InventoryModule {}
