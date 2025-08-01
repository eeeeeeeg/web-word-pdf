# 安装指南

## 📋 系统要求

### 基础环境
- **Node.js**: 16.0+ (推荐 18.x LTS)
- **npm**: 8.0+ 或 **yarn**: 1.22+
- **内存**: 至少 4GB RAM (推荐 8GB+)
- **存储**: 至少 2GB 可用空间

### 操作系统支持
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Ubuntu 18.04+
- ✅ CentOS 7+
- ✅ Docker 环境

## 🚀 快速安装

### 方法一：一键安装（推荐）
```bash
# 克隆项目
git clone https://github.com/your-username/web-word-pdf.git
cd web-word-pdf

# 安装所有依赖（前端 + 后端）
npm run setup

# 启动开发环境
npm run dev
```

### 方法二：分步安装
```bash
# 1. 克隆项目
git clone https://github.com/your-username/web-word-pdf.git
cd web-word-pdf

# 2. 安装前端依赖
npm install

# 3. 安装后端依赖
cd server
npm install

# 4. 安装Playwright浏览器
npm run install-browsers

# 5. 返回根目录启动
cd ..
npm run dev
```

## 🐳 Docker 安装

### 使用 Docker Compose（推荐）
```bash
# 克隆项目
git clone https://github.com/your-username/web-word-pdf.git
cd web-word-pdf

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 单独构建服务器
```bash
# 构建服务器镜像
cd server
docker build -t web-word-pdf-server .

# 运行容器
docker run -d \
  --name web-word-pdf-server \
  -p 3001:3001 \
  -e NODE_ENV=production \
  web-word-pdf-server
```

## ⚙️ 环境配置

### 服务器环境变量
```bash
# 复制环境配置文件
cd server
cp .env.example .env

# 编辑配置文件
nano .env
```

### 主要配置项
```env
# 服务器端口
PORT=3001

# 前端URL（CORS配置）
FRONTEND_URL=http://localhost:8080

# 文件存储
TEMP_DIR=./temp
MAX_FILE_SIZE=50MB

# Playwright配置
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
```

## 🔧 开发环境设置

### VS Code 推荐插件
```json
{
  "recommendations": [
    "vue.volar",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### 代码格式化配置
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "vetur.validation.template": false
}
```

## 🧪 验证安装

### 1. 检查服务状态
```bash
# 前端服务
curl http://localhost:8080

# 后端服务
curl http://localhost:3001/api/health
```

### 2. 运行测试
```bash
# 运行后端测试
npm test

# 手动测试PDF导出
curl -X POST http://localhost:3001/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{"htmlContent":"<h1>Test</h1>"}' \
  --output test.pdf
```

### 3. 功能验证清单
- [ ] 前端页面正常加载
- [ ] 组件库可以拖拽
- [ ] 文本编辑器正常工作
- [ ] 页面可以添加和删除
- [ ] 分享功能正常
- [ ] PDF导出成功
- [ ] Word导出成功
- [ ] PPT导出成功

## 🐛 常见问题

### Node.js 版本问题
```bash
# 检查版本
node --version
npm --version

# 升级Node.js（使用nvm）
nvm install 18
nvm use 18
```

### Playwright 安装失败
```bash
# 手动安装浏览器
cd server
npx playwright install chromium

# 如果网络问题，设置镜像
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium
```

### 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :8080
netstat -tulpn | grep :3001

# 修改端口
# 前端: vue.config.js
# 后端: server/.env
```

### 内存不足
```bash
# 增加Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 或在package.json中设置
"scripts": {
  "dev": "node --max-old-space-size=4096 start-dev.js"
}
```

### Docker 权限问题
```bash
# Linux下添加用户到docker组
sudo usermod -aG docker $USER
newgrp docker

# 重启Docker服务
sudo systemctl restart docker
```

## 🔄 更新升级

### 更新依赖
```bash
# 更新前端依赖
npm update

# 更新后端依赖
cd server
npm update

# 更新Playwright浏览器
npm run install-browsers
```

### 版本迁移
```bash
# 备份数据
cp -r data data_backup

# 拉取最新代码
git pull origin main

# 重新安装依赖
npm run setup

# 重启服务
npm run dev
```

## 📞 获取帮助

### 问题排查步骤
1. 检查Node.js版本是否符合要求
2. 确认所有依赖已正确安装
3. 查看控制台错误信息
4. 检查网络连接和防火墙设置
5. 查看服务器日志文件

### 联系支持
- 📧 邮箱: support@webwordpdf.com
- 🐛 问题反馈: [GitHub Issues](https://github.com/your-username/web-word-pdf/issues)
- 📖 文档: [项目Wiki](https://github.com/your-username/web-word-pdf/wiki)

### 社区资源
- 💬 讨论区: [GitHub Discussions](https://github.com/your-username/web-word-pdf/discussions)
- 📺 视频教程: [YouTube频道](https://youtube.com/webwordpdf)
- 📚 博客文章: [技术博客](https://blog.webwordpdf.com)
