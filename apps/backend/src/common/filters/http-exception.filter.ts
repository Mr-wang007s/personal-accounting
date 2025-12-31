import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let errors: unknown = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>
        message = (resp.message as string) || message
        errors = resp.errors
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    // 开发环境打印错误
    if (process.env.NODE_ENV === 'development') {
      console.error('Exception:', exception)
    }

    response.status(status).json({
      code: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
    })
  }
}
