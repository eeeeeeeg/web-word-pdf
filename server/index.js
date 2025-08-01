const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// 导入路由
const exportRoutes = require('./routes/export');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false, // 允许内联样式和脚本
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// 解析JSON和URL编码的请求体
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'public')));

// 确保临时目录存在
const tempDir = path.join(__dirname, 'temp');
fs.ensureDirSync(tempDir);

// 路由配置
app.use('/api/health', healthRoutes);
app.use('/api/export', exportRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'Web Word PDF Server',
    version: '1.0.0',
    description: '支持Playwright导出PDF、Word、PPT的Node.js服务',
    endpoints: {
      health: '/api/health',
      export: {
        pdf: '/api/export/pdf',
        word: '/api/export/word',
        ppt: '/api/export/ppt'
      }
    },
    status: 'running'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `路径 ${req.originalUrl} 不存在`,
    timestamp: new Date().toISOString()
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || '服务器内部错误',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Web Word PDF Server 启动成功`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`📄 API文档: http://localhost:${PORT}/`);
});

module.exports = app;
