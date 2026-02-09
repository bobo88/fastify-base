import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BasePlugin } from './plugin-manager';

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn?: string;
  issuer?: string;
  audience?: string;
}

export class JwtPlugin extends BasePlugin {
  name = 'jwt';
  version = '1.0.0';
  description = 'JWT认证插件';

  async register(fastify: FastifyInstance, options?: JwtConfig): Promise<void> {
    const config: JwtConfig = {
      secret: options?.secret || process.env.JWT_SECRET || 'my-super-secret-key',
      expiresIn: options?.expiresIn || '7d',
      issuer: options?.issuer || 'fastify-base',
      audience: options?.audience || 'fastify-base-users',
      ...options,
    };

    // 注册JWT插件
    await fastify.register(require('@fastify/jwt'), {
      secret: config.secret,
      sign: {
        expiresIn: config.expiresIn,
        issuer: config.issuer,
        audience: config.audience,
      },
      verify: {
        issuer: config.issuer,
        audience: config.audience,
      },
    });

    // 装饰器：生成JWT令牌
    fastify.decorate('generateToken', (payload: Omit<JwtPayload, 'iat' | 'exp'>) => {
      return fastify.jwt.sign(payload);
    });

    // 装饰器：验证JWT令牌
    fastify.decorate('verifyToken', async (token: string) => {
      return fastify.jwt.verify(token);
    });

    // 装饰器：基础认证中间件
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (error) {
        reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '认证失败',
            details: error.message,
          },
        });
      }
    });

    // 装饰器：角色验证中间件
    fastify.decorate('requireRole', (roles: string | string[]) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
          
          const userRole = (request.user as JwtPayload).role;
          const requiredRoles = Array.isArray(roles) ? roles : [roles];
          
          if (!requiredRoles.includes(userRole)) {
            reply.status(403).send({
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: '权限不足',
                details: `需要角色: ${requiredRoles.join(', ')}`,
              },
            });
          }
        } catch (error) {
          reply.status(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: '认证失败',
              details: error.message,
            },
          });
        }
      };
    });

    // 装饰器：可选认证中间件
    fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
      try {
        await request.jwtVerify();
      } catch (error) {
        // 可选认证，失败时不抛出错误
        request.user = null;
      }
    });

    // 添加获取当前用户信息的装饰器
    fastify.decorateRequest('getCurrentUser', function() {
      return this.user as JwtPayload;
    });

    // 添加检查权限的装饰器
    fastify.decorateRequest('hasPermission', function(permission: string) {
      const user = this.user as JwtPayload;
      if (!user) return false;
      
      // 这里可以根据实际需求实现权限检查逻辑
      // 例如从数据库查询用户权限
      return true;
    });

    // 添加刷新令牌的装饰器
    fastify.decorate('refreshToken', async (oldToken: string) => {
      try {
        const decoded = await fastify.jwt.verify(oldToken);
        const payload = { ...decoded };
        delete payload.iat;
        delete payload.exp;
        
        return fastify.jwt.sign(payload);
      } catch (error) {
        throw new Error('无法刷新令牌');
      }
    });
  }

  async onLoad(fastify: FastifyInstance): Promise<void> {
    fastify.log.info('JWT插件已加载');
    
    // 添加健康检查路由
    fastify.get('/auth/health', async (request, reply) => {
      return { status: 'JWT服务正常' };
    });

    // 添加登录示例路由
    fastify.post<{ Body: { username: string; password: string } }>('/auth/login', {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    }, async (request, reply) => {
      const { username, password } = request.body;
      
      // 这里应该从数据库验证用户
      // 示例代码，实际项目中需要替换为真实的用户验证逻辑
      if (username === 'admin' && password === 'password') {
        const token = fastify.generateToken({
          userId: 1,
          username: 'admin',
          role: 'admin',
        });
        
        return {
          success: true,
          data: {
            token,
            user: {
              userId: 1,
              username: 'admin',
              role: 'admin',
            },
          },
          message: '登录成功',
        };
      } else {
        reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: '用户名或密码错误',
          },
        });
      }
    });

    // 添加刷新令牌路由
    fastify.post('/auth/refresh', {
      preHandler: [fastify.authenticate],
    }, async (request, reply) => {
      const oldToken = request.headers.authorization?.replace('Bearer ', '');
      
      if (!oldToken) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: '缺少令牌',
          },
        });
        return;
      }

      try {
        const newToken = await fastify.refreshToken(oldToken);
        
        return {
          success: true,
          data: {
            token: newToken,
          },
          message: '令牌刷新成功',
        };
      } catch (error) {
        reply.status(400).send({
          success: false,
          error: {
            code: 'REFRESH_FAILED',
            message: '令牌刷新失败',
          },
        });
      }
    });

    // 添加受保护的路由示例
    fastify.get('/auth/profile', {
      preHandler: [fastify.authenticate],
    }, async (request, reply) => {
      const user = request.getCurrentUser();
      
      return {
        success: true,
        data: {
          user,
        },
        message: '获取用户信息成功',
      };
    });

    // 添加需要特定角色的路由示例
    fastify.get('/auth/admin', {
      preHandler: [fastify.requireRole(['admin', 'superadmin'])],
    }, async (request, reply) => {
      return {
        success: true,
        data: {
          message: '管理员专属内容',
        },
        message: '访问成功',
      };
    });
  }
}