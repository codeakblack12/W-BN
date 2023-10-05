import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesGateway } from './sales.gateway';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CartSchema, DockyardCartSchema, TransactionSchema } from './schemas/sales.schema';
import { UserSchema, WarehouseSchema } from 'src/auth/schemas/auth.schema';
import { CategorySchema, InventorySchema } from 'src/inventory/schemas/inventory.schema';
import { AuthService } from 'src/auth/auth.service';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    SalesModule,
    AuthModule,
    NotificationModule,
    MongooseModule.forFeature([{name: 'User', schema: UserSchema}]),
    MongooseModule.forFeature([{name: 'Cart', schema: CartSchema}]),
    MongooseModule.forFeature([{name: 'DockyardCart', schema: DockyardCartSchema}]),
    MongooseModule.forFeature([{name: 'Inventory', schema: InventorySchema}]),
    MongooseModule.forFeature([{name: 'Category', schema: CategorySchema}]),
    MongooseModule.forFeature([{name: 'Warehouse', schema: WarehouseSchema}]),
    MongooseModule.forFeature([{name: 'Transaction', schema: TransactionSchema}]),
  ],
  controllers: [SalesController],
  providers: [SalesService, SalesGateway],
  exports: [SalesService],
})
export class SalesModule {}
