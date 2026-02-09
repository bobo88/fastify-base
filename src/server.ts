import { app } from "./app";

// 加载环境变量
import dotenv from "dotenv";
dotenv.config();

// 优雅关闭处理
process.on("SIGINT", async () => {
  console.log("收到SIGINT信号，正在关闭服务器...");
  await app.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("收到SIGTERM信号，正在关闭服务器...");
  await app.close();
  process.exit(0);
});

// 未处理的Promise拒绝
process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的Promise拒绝:", reason);
});

// 启动应用
async function bootstrap() {
  try {
    // 初始化应用
    await app.initialize();

    // 启动服务器
    const port = parseInt(process.env.PORT || "3456");
    const host = process.env.HOST || "0.0.0.0";

    await app.start(port, host);
  } catch (error) {
    console.error("启动应用失败:", error);
    process.exit(1);
  }
}

// 如果是直接运行此文件，则启动应用
if (require.main === module) {
  bootstrap();
}

export { app };
