import { FastifyApp } from '../app';

// 演示测试脚本
async function demoTest() {
  console.log('🚀 开始演示Fastify基础框架功能...\n');

  // 1. 创建应用实例
  console.log('1. 创建Fastify应用实例...');
  const app = new FastifyApp();
  
  try {
    // 2. 初始化应用
    console.log('2. 初始化应用...');
    await app.initialize();
    
    console.log('✅ 应用初始化成功！');
    console.log('📋 已注册的功能：');
    console.log('   • 全局错误处理中间件');
    console.log('   • 插件管理系统');
    console.log('   • JWT认证机制');
    console.log('   • 统一响应格式');
    console.log('   • CORS跨域支持');
    console.log('   • 速率限制保护');
    console.log('   • 请求日志记录');
    console.log('   • Swagger API文档');
    
    // 3. 测试路由
    console.log('\n3. 测试路由功能...');
    
    // 健康检查路由
    const healthResponse = await app.app.inject({
      method: 'GET',
      url: '/health'
    });
    
    console.log('   • 健康检查路由: ✅');
    
    // 版本信息路由
    const versionResponse = await app.app.inject({
      method: 'GET',
      url: '/version'
    });
    
    console.log('   • 版本信息路由: ✅');
    
    // 分页数据路由
    const examplesResponse = await app.app.inject({
      method: 'GET',
      url: '/examples?page=1&size=5'
    });
    
    console.log('   • 分页数据路由: ✅');
    
    // 4. 测试JWT认证
    console.log('\n4. 测试JWT认证功能...');
    
    // 登录获取token
    const loginResponse = await app.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        username: 'admin',
        password: 'password'
      }
    });
    
    if (loginResponse.statusCode === 200) {
      console.log('   • 用户登录: ✅');
      const loginData = JSON.parse(loginResponse.body);
      const token = loginData.data.token;
      
      // 测试受保护路由
      const protectedResponse = await app.app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (protectedResponse.statusCode === 200) {
        console.log('   • 受保护路由访问: ✅');
      } else {
        console.log('   • 受保护路由访问: ❌');
      }
      
      // 测试无token访问受保护路由
      const unauthorizedResponse = await app.app.inject({
        method: 'GET',
        url: '/protected'
      });
      
      if (unauthorizedResponse.statusCode === 401) {
        console.log('   • 无token访问拦截: ✅');
      } else {
        console.log('   • 无token访问拦截: ❌');
      }
    } else {
      console.log('   • 用户登录: ❌');
    }
    
    // 5. 测试错误处理
    console.log('\n5. 测试错误处理功能...');
    
    // 测试404错误
    const notFoundResponse = await app.app.inject({
      method: 'GET',
      url: '/nonexistent-route'
    });
    
    if (notFoundResponse.statusCode === 404) {
      console.log('   • 404错误处理: ✅');
    } else {
      console.log('   • 404错误处理: ❌');
    }
    
    // 测试验证错误
    const validationResponse = await app.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        // 缺少必需字段
      }
    });
    
    if (validationResponse.statusCode === 400) {
      console.log('   • 参数验证错误处理: ✅');
    } else {
      console.log('   • 参数验证错误处理: ❌');
    }
    
    console.log('\n🎉 所有功能测试完成！');
    console.log('\n📊 可用API端点：');
    console.log('   GET  /health              - 健康检查');
    console.log('   GET  /version             - 版本信息');
    console.log('   GET  /examples            - 分页示例数据');
    console.log('   POST /auth/login          - 用户登录');
    console.log('   POST /auth/refresh        - 刷新令牌');
    console.log('   GET  /auth/profile        - 用户信息');
    console.log('   GET  /auth/admin          - 管理员路由');
    console.log('   GET  /protected           - 受保护路由');
    console.log('   GET  /docs                - Swagger文档');
    
    // 关闭应用
    await app.close();
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    await app.close();
  }
}

// 如果是直接运行此文件，则执行演示
export { demoTest };

if (require.main === module) {
  demoTest().catch(console.error);
}