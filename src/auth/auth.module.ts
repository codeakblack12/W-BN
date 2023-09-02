import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ResetSchema, UserSchema, WarehouseSchema } from './schemas/auth.schema';
import { ConfigModule } from '@nestjs/config';
import { CountrySchema } from 'src/admin/schemas/admin.schema';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    AuthModule,
    MailModule,
    MongooseModule.forFeature([{name: 'User', schema: UserSchema}]),
    MongooseModule.forFeature([{name: 'Warehouse', schema: WarehouseSchema}]),
    MongooseModule.forFeature([{name: 'Country', schema: CountrySchema}]),
    MongooseModule.forFeature([{name: 'Reset', schema: ResetSchema}]),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: process.env.TOKEN_DURATION },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
