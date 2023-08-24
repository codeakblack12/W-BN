import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SalesModule } from 'src/sales/sales.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserSchema, WarehouseSchema } from 'src/auth/schemas/auth.schema';
import { CartSchema, DockyardCartSchema, TransactionSchema } from 'src/sales/schemas/sales.schema';
import { CategorySchema, InventorySchema } from 'src/inventory/schemas/inventory.schema';
import { CountrySchema } from './schemas/admin.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    SalesModule,
    AuthModule,
    MongooseModule.forFeature([{name: 'User', schema: UserSchema}]),
    MongooseModule.forFeature([{name: 'Cart', schema: CartSchema}]),
    MongooseModule.forFeature([{name: 'DockyardCart', schema: DockyardCartSchema}]),
    MongooseModule.forFeature([{name: 'Category', schema: InventorySchema}]),
    MongooseModule.forFeature([{name: 'Inventory', schema: CategorySchema}]),
    MongooseModule.forFeature([{name: 'Country', schema: CountrySchema}]),
    MongooseModule.forFeature([{name: 'Warehouse', schema: WarehouseSchema}]),
    MongooseModule.forFeature([{name: 'Transaction', schema: TransactionSchema}]),
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
