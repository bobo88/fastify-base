import { FastifyReply } from "fastify";

export interface SuccessResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  pagination: PaginationMeta;
}

export class ResponseBuilder {
  private reply: FastifyReply;
  private requestId?: string;

  constructor(reply: FastifyReply, requestId?: string) {
    this.reply = reply;
    this.requestId = requestId;
  }

  // 成功响应
  success<T = any>(data: T, message: string = "操作成功"): FastifyReply {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return this.reply.status(200).send(response);
  }

  // 创建成功响应
  created<T = any>(data: T, message: string = "创建成功"): FastifyReply {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return this.reply.status(201).send(response);
  }

  // 分页响应
  paginated<T = any>(
    data: T[],
    pagination: PaginationMeta,
    message: string = "获取数据成功",
  ): FastifyReply {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      pagination,
    };

    return this.reply.status(200).send(response);
  }

  // 无内容响应
  noContent(message: string = "操作成功"): FastifyReply {
    const response: SuccessResponse<null> = {
      success: true,
      data: null,
      message,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    return this.reply.status(204).send(response);
  }

  // 错误响应
  error(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: any,
  ): FastifyReply {
    const response = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: this.requestId,
      },
    };

    return this.reply.status(statusCode).send(response);
  }

  // 常见错误响应快捷方法
  badRequest(message: string = "请求参数错误", details?: any): FastifyReply {
    return this.error("BAD_REQUEST", message, 400, details);
  }

  unauthorized(message: string = "未授权访问", details?: any): FastifyReply {
    return this.error("UNAUTHORIZED", message, 401, details);
  }

  forbidden(message: string = "权限不足", details?: any): FastifyReply {
    return this.error("FORBIDDEN", message, 403, details);
  }

  notFound(message: string = "资源未找到", details?: any): FastifyReply {
    return this.error("NOT_FOUND", message, 404, details);
  }

  conflict(message: string = "资源冲突", details?: any): FastifyReply {
    return this.error("CONFLICT", message, 409, details);
  }

  validationError(
    message: string = "数据验证失败",
    details?: any,
  ): FastifyReply {
    return this.error("VALIDATION_ERROR", message, 422, details);
  }

  internalError(
    message: string = "服务器内部错误",
    details?: any,
  ): FastifyReply {
    return this.error("INTERNAL_ERROR", message, 500, details);
  }

  serviceUnavailable(
    message: string = "服务暂时不可用",
    details?: any,
  ): FastifyReply {
    return this.error("SERVICE_UNAVAILABLE", message, 503, details);
  }
}

// 分页工具函数
export function buildPaginationMeta(
  currentPage: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

// 响应装饰器
export function responseDecorator(fastify: any) {
  fastify.decorateReply("success", function <
    T = any,
  >(data: T, message: string = "操作成功") {
    const responseBuilder = new ResponseBuilder(this);
    return responseBuilder.success(data, message);
  });

  fastify.decorateReply("created", function <
    T = any,
  >(data: T, message: string = "创建成功") {
    const responseBuilder = new ResponseBuilder(this);
    return responseBuilder.created(data, message);
  });

  fastify.decorateReply("paginated", function <
    T = any,
  >(data: T[], pagination: PaginationMeta, message: string = "获取数据成功") {
    const responseBuilder = new ResponseBuilder(this);
    return responseBuilder.paginated(data, pagination, message);
  });

  fastify.decorateReply("noContent", function (message: string = "操作成功") {
    const responseBuilder = new ResponseBuilder(this);
    return responseBuilder.noContent(message);
  });

  fastify.decorateReply(
    "error",
    function (
      code: string,
      message: string,
      statusCode: number = 500,
      details?: any,
    ) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.error(code, message, statusCode, details);
    },
  );

  // 快捷方法
  fastify.decorateReply(
    "badRequest",
    function (message: string = "请求参数错误", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.badRequest(message, details);
    },
  );

  fastify.decorateReply(
    "unauthorized",
    function (message: string = "未授权访问", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.unauthorized(message, details);
    },
  );

  fastify.decorateReply(
    "forbidden",
    function (message: string = "权限不足", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.forbidden(message, details);
    },
  );

  fastify.decorateReply(
    "notFound",
    function (message: string = "资源未找到", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.notFound(message, details);
    },
  );

  fastify.decorateReply(
    "conflict",
    function (message: string = "资源冲突", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.conflict(message, details);
    },
  );

  fastify.decorateReply(
    "validationError",
    function (message: string = "数据验证失败", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.validationError(message, details);
    },
  );

  fastify.decorateReply(
    "internalError",
    function (message: string = "服务器内部错误", details?: any) {
      const responseBuilder = new ResponseBuilder(this);
      return responseBuilder.internalError(message, details);
    },
  );
}

// 导出类型
export type { SuccessResponse, PaginatedResponse, PaginationMeta };
