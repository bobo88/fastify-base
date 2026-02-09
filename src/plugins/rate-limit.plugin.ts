import { FastifyInstance } from 'fastify';
import { BasePlugin } from './plugin-manager';

export class RateLimitPlugin extends BasePlugin {
  name = 'rate-limit';
  version = '1.0.0';
  description = '请求频率限制插件';

  async register(fastify: FastifyInstance, options?: any): Promise<void> {
    await fastify.register(require('@fastify/rate-limit'), {
      max: options?.max || 100,
      timeWindow: options?.timeWindow || '1 minute',
      allowList: options?.allowList || ['127.0.0.1'],
      ...options,
    });
  }

  async onLoad(fastify: FastifyInstance): Promise<void> {
    fastify.log.info('Rate Limit插件已加载');
  }
}