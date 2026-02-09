import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export interface ErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const commonErrors = {
  // 400系列错误
  BAD_REQUEST: (message: string = '请求参数错误', details?: any) =>
    new AppError(message, 400, 'BAD_REQUEST', details),
  
  UNAUTHORIZED: (message: string = '未授权访问', details?: any) =>
    new AppError(message, 401, 'UNAUTHORIZED', details),
  
  FORBIDDEN: (message: string = '权限不足', details?: any) =>
    new AppError(message, 403, 'FORBIDDEN', details),
  
  NOT_FOUND: (message: string = '资源未找到', details?: any) =>
    new AppError(message, 404, 'NOT_FOUND', details),
  
  CONFLICT: (message: string = '资源冲突', details?: any) =>
    new AppError(message, 409, 'CONFLICT', details),
  
  VALIDATION_ERROR: (message: string = '数据验证失败', details?: any) =>
    new AppError(message, 422, 'VALIDATION_ERROR', details),

  // 500系列错误
  INTERNAL_ERROR: (message: string = '服务器内部错误', details?: any) =>
    new AppError(message, 500, 'INTERNAL_ERROR', details),
  
  SERVICE_UNAVAILABLE: (message: string = '服务暂时不可用', details?: any) =>
    new AppError(message, 503, 'SERVICE_UNAVAILABLE', details),
};

export async function errorHandlerPlugin(fastify: FastifyInstance) {
  // 设置未捕获异常处理器
  process.on('unhandledRejection', (reason, promise) => {
    fastify.log.error('未处理的Promise拒绝:', reason);
  });

  process.on('uncaughtException', (error) => {
    fastify.log.error('未捕获的异常:', error);
    process.exit(1);
  });

  // 全局错误处理中间件
  fastify.setErrorHandler((error: CustomError, request: FastifyRequest, reply: FastifyReply) => {
    // 记录错误日志
    fastify.log.error(`错误处理: ${error.message}`, {
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
      },
    });

    let statusCode = error.statusCode || 500;
    let errorCode = error.code || 'INTERNAL_ERROR';
    let message = error.message;
    let details = error.details;

    // 处理Fastify验证错误
    if (error.validation) {
      statusCode = 422;
      errorCode = 'VALIDATION_ERROR';
      message = '请求参数验证失败';
      details = error.validation;
    }

    // 处理JWT错误
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      statusCode = 401;
      errorCode = 'MISSING_TOKEN';
      message = '缺少认证令牌';
    }

    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
      message = '认证令牌已过期';
    }

    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
      statusCode = 401;
      errorCode = 'INVALID_TOKEN';
      message = '无效的认证令牌';
    }

    // 构建错误响应
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
    };

    // 发送错误响应
    reply.status(statusCode).send(errorResponse);
  });

  // 404处理
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `路由 ${request.method} ${request.url} 未找到`,
        timestamp: new Date().toISOString(),
      },
    };

    reply.status(404).send(errorResponse);
  });
}