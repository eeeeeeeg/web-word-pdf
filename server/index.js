const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs-extra");
require("dotenv").config();

// 导入路由
const exportRoutes = require("./routes/export");
const healthRoutes = require("./routes/health");
const shareRoutes = require("./routes/share");
const draftRoutes = require("./routes/drafts");

const app = express();
const PORT = process.env.PORT || 3002;

// 中间件配置
app.use(
  helmet({
    contentSecurityPolicy: false, // 允许内联样式和脚本
  })
);
app.use(compression());
app.use(morgan("combined"));
// CORS 配置
const setupCORS = () => {
  // 从环境变量获取允许的源
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : [];

  // 默认允许的源列表
  const defaultOrigins = [
    process.env.FRONTEND_URL || "http://localhost:8080",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000", // 常见的开发端口
    "http://127.0.0.1:3000",
  ];

  // 合并环境变量和默认配置
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

  console.log("CORS allowed origins:", allowedOrigins);

  return {
    origin: function (origin, callback) {
      console.log(
        `CORS check - Origin: ${origin}, NODE_ENV: ${process.env.NODE_ENV}`
      );

      // 开发环境下允许无 origin 的请求（如 Postman、移动端应用等）
      if (process.env.NODE_ENV === "development" && !origin) {
        console.log("CORS: Allowing request with no origin (development mode)");
        return callback(null, true);
      }

      // 检查 origin 是否在允许列表中
      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log(`CORS: Allowing origin ${origin}`);
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        console.warn(`Allowed origins: ${allowedOrigins.join(", ")}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: process.env.CORS_ALLOW_CREDENTIALS !== "false",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    optionsSuccessStatus: 200, // 支持老版本浏览器
    preflightContinue: false,
  };
};

// 应用 CORS 中间件
if (process.env.CORS_ENABLED !== "false") {
  // 开发环境使用更宽松的 CORS 配置
  if (process.env.NODE_ENV === "development") {
    app.use(
      cors({
        origin: true, // 允许所有 origin（仅开发环境）
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
      })
    );
    console.log("CORS enabled (development mode - allowing all origins)");
  } else {
    app.use(cors(setupCORS()));
    console.log("CORS enabled (production mode)");
  }
} else {
  console.log("CORS disabled");
}

// 解析JSON和URL编码的请求体
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 静态文件服务
app.use("/static", express.static(path.join(__dirname, "public")));

// 确保临时目录存在
const tempDir = path.join(__dirname, "temp");
fs.ensureDirSync(tempDir);

// 路由配置
app.use("/api/health", healthRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/drafts", draftRoutes);

// 根路径
app.get("/", (req, res) => {
  res.json({
    name: "Web Word PDF Server",
    version: "1.0.0",
    description: "支持Playwright导出PDF、Word、PPT的Node.js服务",
    endpoints: {
      health: "/api/health",
      export: {
        pdf: "/api/export/pdf",
        word: "/api/export/word",
        ppt: "/api/export/ppt",
      },
      share: {
        create: "/api/share/create",
        get: "/api/share/:shareId",
        stats: "/api/share/:shareId/stats",
        delete: "/api/share/:shareId",
        cleanup: "/api/share/cleanup",
      },
      drafts: {
        list: "/api/drafts",
        get: "/api/drafts/:id",
        create: "/api/drafts",
        update: "/api/drafts/:id",
        delete: "/api/drafts/:id",
        clear: "/api/drafts",
        convert: "/api/drafts/:id/convert",
      },
    },
    status: "running",
  });
});

// 404处理
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `路径 ${req.originalUrl} 不存在`,
    timestamp: new Date().toISOString(),
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error("服务器错误:", err);

  res.status(err.status || 500).json({
    error: err.name || "Internal Server Error",
    message: err.message || "服务器内部错误",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("收到SIGTERM信号，正在关闭服务器...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("收到SIGINT信号，正在关闭服务器...");
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Web Word PDF Server 启动成功`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📄 API文档: http://localhost:${PORT}/`);
});

module.exports = app;
