import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis';
import { WildcardsIoAdapter } from './components/common/adapters/auth.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const redisIoAdapter = new RedisIoAdapter(app);
  // await redisIoAdapter.connectToRedis();

  const config = new DocumentBuilder()
    .setTitle('Wusuaa api')
    .setDescription('Wusuaa API description')
    .setVersion('1.0')
    .addTag('wusuaa')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // app.enableCors({
  //   origin: [
  //     'http:localhost:3006',
  //     'https://wusuaa-app-7atlx.ondigitalocean.app'
  //   ]
  // })
  app.enableCors({origin: "*"})
  // app.useWebSocketAdapter(new WildcardsIoAdapter(app));

  await app.listen(3000);
}
bootstrap();
