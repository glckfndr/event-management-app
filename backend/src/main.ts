import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnv = process.env.ENABLE_SWAGGER;
  const swaggerEnabled =
    swaggerEnv === 'true' || (!isProduction && swaggerEnv !== 'false');
  const forbidNonWhitelisted =
    process.env.FORBID_NON_WHITELISTED === 'false' ? false : true;
  const allowedOrigins = (
    process.env.FRONTEND_URL ?? 'http://localhost:8090,http://127.0.0.1:8090'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Event Management API')
      .setDescription('API documentation for the Event Management application')
      .setVersion('1.0')
      .addTag('events')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted,
      transform: true,
    }),
  );
<<<<<<< HEAD
  app.useGlobalFilters(new AllExceptionsFilter());
=======
>>>>>>> origin/main
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
