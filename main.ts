import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
  app.enableCors({
    origin: isDev
      ? true
      : [process.env.APPLICANT_PORTAL_URL, process.env.ADMIN_PORTAL_URL].filter(Boolean) as string[],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('SHIBMATS Admission API')
    .setDescription('REST API for the SHIBMATS admission platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.getHttpAdapter().get('/api/v1/health', (_req: any, res: any) => res.json({ status: 'ok' }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
