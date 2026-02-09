import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';

export interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: any;
}

export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
}

export abstract class BasePlugin {
  abstract name: string;
  abstract version: string;
  abstract description?: string;
  
  abstract register(fastify: FastifyInstance, options?: any): Promise<void>;
  
  async onLoad?(fastify: FastifyInstance): Promise<void>;
  async onUnload?(fastify: FastifyInstance): Promise<void>;
}

export class PluginManager {
  private plugins: Map<string, BasePlugin> = new Map();
  private pluginConfigs: Map<string, PluginConfig> = new Map();

  constructor(private fastify: FastifyInstance) {}

  // 注册单个插件
  async registerPlugin(plugin: BasePlugin, config?: PluginConfig): Promise<void> {
    try {
      const pluginConfig: PluginConfig = {
        name: plugin.name,
        enabled: config?.enabled ?? true,
        options: config?.options,
      };

      if (!pluginConfig.enabled) {
        this.fastify.log.info(`插件 ${plugin.name} 已禁用，跳过注册`);
        return;
      }

      this.fastify.log.info(`注册插件: ${plugin.name} v${plugin.version}`);
      
      await plugin.register(this.fastify, pluginConfig.options);
      
      this.plugins.set(plugin.name, plugin);
      this.pluginConfigs.set(plugin.name, pluginConfig);

      // 调用插件的onLoad钩子
      if (plugin.onLoad) {
        await plugin.onLoad(this.fastify);
      }

      this.fastify.log.info(`插件 ${plugin.name} 注册成功`);
    } catch (error) {
      this.fastify.log.error(`注册插件 ${plugin.name} 失败:`, error);
      throw error;
    }
  }

  // 从目录加载插件
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    try {
      const pluginDir = path.join(process.cwd(), directory);
      
      if (!fs.existsSync(pluginDir)) {
        this.fastify.log.warn(`插件目录不存在: ${pluginDir}`);
        return;
      }

      const files = fs.readdirSync(pluginDir);
      
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const filePath = path.join(pluginDir, file);
          
          try {
            // 动态导入插件
            const pluginModule = await import(filePath);
            const PluginClass = pluginModule.default || pluginModule;
            
            if (PluginClass && PluginClass.prototype instanceof BasePlugin) {
              const pluginInstance = new PluginClass();
              await this.registerPlugin(pluginInstance);
            }
          } catch (error) {
            this.fastify.log.error(`加载插件文件 ${file} 失败:`, error);
          }
        }
      }
    } catch (error) {
      this.fastify.log.error('加载插件目录失败:', error);
      throw error;
    }
  }

  // 获取插件信息
  getPlugin(name: string): BasePlugin | undefined {
    return this.plugins.get(name);
  }

  // 获取所有插件
  getAllPlugins(): Map<string, BasePlugin> {
    return new Map(this.plugins);
  }

  // 卸载插件
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`插件 ${name} 未找到`);
    }

    try {
      if (plugin.onUnload) {
        await plugin.onUnload(this.fastify);
      }

      this.plugins.delete(name);
      this.pluginConfigs.delete(name);
      
      this.fastify.log.info(`插件 ${name} 卸载成功`);
    } catch (error) {
      this.fastify.log.error(`卸载插件 ${name} 失败:`, error);
      throw error;
    }
  }

  // 重新加载插件
  async reloadPlugin(name: string, newConfig?: PluginConfig): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`插件 ${name} 未找到`);
    }

    await this.unloadPlugin(name);
    await this.registerPlugin(plugin, newConfig);
  }
}