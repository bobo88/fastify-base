import { FastifyInstance } from 'fastify';
import { BasePlugin } from './plugin-manager';

export class CorsPlugin extends BasePlugin {
  name = 'cors';
  version = '1.0.0';
  description = 'CORS跨域资源共享插件';

  async register(fastify: FastifyInstance, options?: any): Promise<void> {
    await fastify.register(require('@fastify/cors'), {
      origin: options?.origin || true,
      methods: options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: options?.allowedHeaders || ['Content-Type', 'Authorization'],
      credentials: options?.credentials || true,
      ...options,
    });
  }

  async onLoad(fastify: FastifyInstance): Promise<void> {
    fastify.log.info('CORS插件已加载');
  }
}