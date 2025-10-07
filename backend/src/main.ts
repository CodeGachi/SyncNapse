import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const portFromEnv = process.env.PORT;
  const port = portFromEnv ? Number(portFromEnv) : 4000;

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SyncNapse API')
    .setDescription('API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  app.getHttpAdapter().getInstance().emit(
    'startup',
    { service: 'backend', nodeEnv, port }
  );
  console.info(`[backend] nodeEnv=${nodeEnv} port=${port}`);
}

bootstrap();
