import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter())

  // 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  )

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // CORS 配置
  app.enableCors({
    origin: true,
    credentials: true,
  })

  // API 前缀
  app.setGlobalPrefix('api')

  // Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('Personal Accounting API')
    .setDescription('个人记账应用后端 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT || 3000
  await app.listen(port, '0.0.0.0') // 监听所有网络接口
  
  console.log(`🚀 Application is running on: http://localhost:${port}`)
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`)
  console.log(`🔍 Service discovery: http://localhost:${port}/api/discovery/info`)
}

bootstrap()
