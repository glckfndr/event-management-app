import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerEnv = process.env.ENABLE_SWAGGER;
  const swaggerEnabled =
    swaggerEnv === 'true' || (!isProduction && swaggerEnv !== 'false');
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
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
