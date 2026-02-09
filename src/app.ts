import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import {
  errorHandlerPlugin,
  AppError,
  commonErrors,
} from "./plugins/error-handler";
import { PluginManager } from "./plugins/plugin-manager";
import { responseDecorator } from "./utils/response";

// 导入插件
import { CorsPlugin } from "./plugins/cors.plugin";
import { RateLimitPlugin } from "./plugins/rate-limit.plugin";
import { JwtPlugin } from "./plugins/jwt.plugin";

export class FastifyApp {
  public app: FastifyInstance;
  private pluginManager: PluginManager;

  constructor() {
    this.app = Fastify({
      logger: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        transport: {
          target: "pino-pretty",
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      },
      disableRequestLogging: process.env.NODE_ENV === "production",
    });

    this.pluginManager = new PluginManager(this.app);
    this.setupDecorators();
  }

  private setupDecorators() {
    // 设置响应装饰器
    responseDecorator(this.app);

    // 添加请求ID装饰器
    this.app.decorateRequest("requestId", "");

    // 添加请求开始时间装饰器
    this.app.decorateRequest("startTime", 0);

    // 添加请求日志装饰器
    this.app.addHook(
      "onRequest",
      async (request: FastifyRequest, reply: FastifyReply) => {
        request.requestId = Math.random().toString(36).substring(2, 15);
        request.startTime = Date.now();

        this.app.log.info(`请求开始: ${request.method} ${request.url}`, {
          requestId: request.requestId,
          ip: request.ip,
          userAgent: request.headers["user-agent"],
        });
      },
    );

    // 添加响应日志装饰器
    this.app.addHook(
      "onResponse",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const responseTime = Date.now() - request.startTime;

        this.app.log.info(
          `请求完成: ${request.method} ${request.url} - ${reply.statusCode}`,
          {
            requestId: request.requestId,
            statusCode: reply.statusCode,
            responseTime: `${responseTime}ms`,
          },
        );
      },
    );
  }

  async registerCorePlugins() {
    try {
      // 注册错误处理插件
      await errorHandlerPlugin(this.app);
      this.app.log.info("错误处理插件已注册");

      // 注册核心插件
      await this.pluginManager.registerPlugin(new CorsPlugin(), {
        enabled: true,
        options: {
          origin: process.env.CORS_ORIGIN || true,
          methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
        },
      });

      await this.pluginManager.registerPlugin(new RateLimitPlugin(), {
        enabled: true,
        options: {
          max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
          timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      });

      await this.pluginManager.registerPlugin(new JwtPlugin(), {
        enabled: true,
        options: {
          secret:
            process.env.JWT_SECRET ||
            "my-super-secret-key-change-in-production",
          expiresIn: process.env.JWT_EXPIRES_IN || "7d",
          issuer: "fastify-base-app",
          audience: "fastify-base-users",
        },
      });

      this.app.log.info("核心插件注册完成");
    } catch (error) {
      this.app.log.error("插件注册失败:", error);
      throw error;
    }
  }

  async registerRoutes() {
    // 健康检查路由
    this.app.get(
      "/health",
      async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.success(
          {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
          },
          "服务运行正常",
        );
      },
    );

    // 版本信息路由
    this.app.get(
      "/version",
      async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.success(
          {
            name: "Fastify Base API",
            version: "1.0.0",
            environment: process.env.NODE_ENV || "development",
          },
          "获取版本信息成功",
        );
      },
    );

    // 示例受保护路由
    this.app.get(
      "/protected",
      {
        preHandler: [this.app.authenticate],
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.getCurrentUser();
        return reply.success(
          {
            message: "这是一个受保护的路由",
            user,
          },
          "访问受保护资源成功",
        );
      },
    );

    // 示例分页数据路由
    this.app.get<{ Querystring: { page?: string; size?: string } }>(
      "/examples",
      async (request, reply) => {
        const currentPage = parseInt(request.query.page || "1");
        const pageSize = parseInt(request.query.size || "10");

        // 模拟数据
        const mockData = Array.from({ length: pageSize }, (_, i) => ({
          id: i + 1,
          name: `示例项目 ${i + 1}`,
          description: `这是第 ${i + 1} 个示例项目`,
        }));

        const totalItems = 100; // 模拟总数据量
        const pagination = {
          currentPage,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
          hasNextPage: currentPage < Math.ceil(totalItems / pageSize),
          hasPrevPage: currentPage > 1,
        };

        return reply.paginated(mockData, pagination, "获取示例数据成功");
      },
    );

    this.app.log.info("核心路由注册完成");
  }

  async initialize() {
    try {
      // 注册插件
      await this.registerCorePlugins();

      // 注册路由
      await this.registerRoutes();

      // 注册Swagger文档（如果启用）
      if (process.env.ENABLE_SWAGGER === "true") {
        await this.app.register(require("@fastify/swagger"), {
          swagger: {
            info: {
              title: "Fastify Base API",
              description: "基于Fastify的API基础框架",
              version: "1.0.0",
            },
            host: process.env.SWAGGER_HOST || "localhost:3000",
            schemes: ["http", "https"],
            consumes: ["application/json"],
            produces: ["application/json"],
          },
        });

        await this.app.register(require("@fastify/swagger-ui"), {
          routePrefix: "/docs",
          uiConfig: {
            docExpansion: "full",
            deepLinking: false,
          },
        });

        this.app.log.info("Swagger文档已启用");
      }

      // 准备服务器
      await this.app.ready();

      this.app.log.info("Fastify应用初始化完成");
    } catch (error) {
      this.app.log.error("应用初始化失败:", error);
      throw error;
    }
  }

  async start(port: number = 3000, host: string = "0.0.0.0") {
    try {
      await this.app.listen({ port, host });

      this.app.log.info(`服务器运行在 http://${host}:${port}`);

      if (process.env.ENABLE_SWAGGER === "true") {
        this.app.log.info(`API文档地址: http://${host}:${port}/docs`);
      }
    } catch (error) {
      this.app.log.error("服务器启动失败:", error);
      process.exit(1);
    }
  }

  async close() {
    try {
      await this.app.close();
      this.app.log.info("服务器已关闭");
    } catch (error) {
      this.app.log.error("关闭服务器时发生错误:", error);
    }
  }
}

// 创建应用实例
export const app = new FastifyApp();
