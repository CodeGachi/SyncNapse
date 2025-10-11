import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiLinksService } from './modules/hypermedia/api-links.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { HalExceptionFilter } from './modules/hypermedia/hal-exception.filter';
import { RequestLoggingInterceptor } from './modules/logging/request-logging.interceptor';

async function bootstrap() {
  const portFromEnv = process.env.PORT;
  const port = portFromEnv ? Number(portFromEnv) : 4000;

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  app.setGlobalPrefix('api');

  // Trust proxy (for correct client IP when behind nginx)
  try {
    const httpAdapter = app.getHttpAdapter().getInstance() as any;
    if (httpAdapter?.set) {
      httpAdapter.set('trust proxy', true);
    }
  } catch (e) {
    // ignore if adapter doesn't support set
  }

  // Register global HAL exception filter
  app.useGlobalFilters(app.get(HalExceptionFilter));

  // Register request logging interceptor globally
  try {
    app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));
  } catch (e) {
    // continue even if interceptor provider is unavailable
  }

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
  const document = SwaggerModule.createDocument(app, config, {
    include: [AuthModule, UsersModule, SessionsModule],
  });
  SwaggerModule.setup('docs', app, document);

  // Expose raw OpenAPI JSON for external tools (e.g., APIDog)
  const http = app.getHttpAdapter().getInstance();
  http.get('/api/docs-json', (_req: unknown, res: any) => {
    res.json(document);
  });

  try {
    const apiLinks = app.get(ApiLinksService);
    apiLinks.setOpenApiDocument(document as any);
  } catch (e) {
    // If service not available, continue without dynamic links
  }

  await app.listen(port);
  const nodeEnv = process.env.NODE_ENV;
  app.getHttpAdapter().getInstance().emit(
    'startup',
    { service: 'backend', nodeEnv, port }
  );
  console.info(`[backend] nodeEnv=${nodeEnv} port=${port}`);

  // DEBUG: Node and OpenSSL info for troubleshooting native deps in container
  try {
    const versions = process.versions as Record<string, string>;
    const openssl = versions?.openssl || 'unknown';
    const node = versions?.node || process.version;
    const uv = versions?.uv || 'unknown';
    const arch = process.arch;
    const platform = process.platform;
    console.info(`[debug] node=${node} openssl=${openssl} uv=${uv} arch=${arch} platform=${platform}`);
  } catch (e) {
    console.warn(`[debug] failed to read process.versions: ${(e as Error)?.message || 'unknown error'}`);
  }
}

bootstrap();
