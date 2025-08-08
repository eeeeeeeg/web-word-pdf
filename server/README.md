# Web Word PDF Server

🚀 **Node.js 服务端，支持 Playwright 导出 PDF、Word、PPT 功能**

基于 Express.js 和 Playwright 的文档导出服务，为 Web Word PDF 前端应用提供强大的文档生成能力。

## ✨ 核心功能

### 📄 PDF 导出

- **Playwright 渲染**：使用 Chromium 引擎确保高质量 PDF 输出
- **完整样式支持**：保持 CSS 样式、字体、颜色等
- **自定义选项**：页面尺寸、边距、方向、缩放等
- **批量导出**：支持多页面合并导出

### 📝 Word 导出

- **DOCX 格式**：生成标准的 Word 文档格式
- **样式转换**：将 CSS 样式转换为 Word 格式
- **布局保持**：保持原有的文档结构和布局
- **图片支持**：处理图片插入和格式转换

### 📊 PPT 导出

- **PPTX 格式**：生成 PowerPoint 演示文稿
- **页面转幻灯片**：每个页面转换为一张幻灯片
- **布局适配**：自动适配幻灯片尺寸
- **主题支持**：支持自定义主题和样式

## 🛠️ 技术栈

```
Node.js 16+          # 服务器运行环境
Express.js 4.x       # Web框架
Playwright 1.40+     # 浏览器自动化
docx 8.x             # Word文档生成
pptxgenjs 3.x        # PPT文档生成
multer 1.x           # 文件上传处理
```

## 🚀 快速开始

### 环境要求

- Node.js 16.0+
- npm 8.0+ 或 yarn 1.22+
- 至少 2GB 可用内存

### 安装依赖

```bash
cd server
npm install

# 安装Playwright浏览器
npm run install-browsers
```

### 环境配置

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

#### 重要配置项

```env
# 服务器端口
PORT=3001

# 前端URL（CORS配置）
FRONTEND_URL=http://localhost:8080

# CORS 跨域配置
CORS_ENABLED=true
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080

# 文件存储
TEMP_DIR=./temp
MAX_FILE_SIZE=50MB
```

> **注意**：由于前端接口统一管理，需要正确配置 CORS 以支持跨域请求。详细配置说明请参考 [CORS_CONFIGURATION.md](./CORS_CONFIGURATION.md)

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 服务将在 http://localhost:3001 启动
```

## 📡 API 接口

### 健康检查

```http
GET /api/health
```

### PDF 导出

```http
POST /api/export/pdf
Content-Type: application/json

{
  "htmlContent": "<html>...</html>",
  "options": {
    "format": "A4",
    "orientation": "portrait",
    "margin": {
      "top": "1cm",
      "right": "1cm",
      "bottom": "1cm",
      "left": "1cm"
    },
    "filename": "document.pdf"
  }
}
```

### Word 导出

```http
POST /api/export/word
Content-Type: application/json

{
  "schemaData": "{...}",
  "options": {
    "pageSize": "A4",
    "orientation": "portrait",
    "includeImages": true,
    "filename": "document.docx"
  }
}
```

### PPT 导出

```http
POST /api/export/ppt
Content-Type: application/json

{
  "schemaData": "{...}",
  "options": {
    "slideSize": "LAYOUT_16x9",
    "theme": "default",
    "includePageTitles": true,
    "filename": "presentation.pptx"
  }
}
```

### 批量导出

```http
POST /api/export/batch
Content-Type: application/json

{
  "formats": ["pdf", "word", "ppt"],
  "schemaData": "{...}",
  "options": {
    "pdf": { "format": "A4" },
    "word": { "orientation": "portrait" },
    "ppt": { "slideSize": "LAYOUT_16x9" }
  }
}
```

## 🔧 配置选项

### PDF 导出选项

```javascript
{
  format: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal',
  orientation: 'portrait' | 'landscape',
  margin: {
    top: '1cm',
    right: '1cm',
    bottom: '1cm',
    left: '1cm'
  },
  printBackground: true,
  displayHeaderFooter: false,
  headerTemplate: '',
  footerTemplate: '',
  scale: 1,
  preferCSSPageSize: false
}
```

### Word 导出选项

```javascript
{
  pageSize: 'A4' | 'A3' | 'A5' | 'Letter',
  orientation: 'portrait' | 'landscape',
  margins: {
    top: 720,    // twips (1英寸 = 720 twips)
    right: 720,
    bottom: 720,
    left: 720
  },
  includeImages: true,
  includePageTitles: false
}
```

### PPT 导出选项

```javascript
{
  slideSize: 'LAYOUT_16x9' | 'LAYOUT_4x3' | 'LAYOUT_WIDE',
  theme: 'default' | 'dark' | 'light',
  includeImages: true,
  includePageTitles: true,
  includePageNumbers: false,
  backgroundColor: '#FFFFFF'
}
```

## 📊 性能优化

### 并发控制

- 最大并发导出任务：5 个
- 单个任务超时：60 秒
- 内存使用监控和清理

### 缓存策略

- 临时文件自动清理
- 浏览器实例复用
- 字体缓存优化

### 资源管理

- 自动释放浏览器资源
- 内存泄漏检测
- 进程监控和重启

## 🔒 安全特性

- **CORS 配置**：限制跨域访问
- **文件类型验证**：严格的文件类型检查
- **大小限制**：防止大文件攻击
- **输入验证**：HTML 和数据内容验证
- **错误处理**：安全的错误信息返回

## 📝 开发指南

### 添加新的导出格式

1. 在`services/`目录创建新的导出服务
2. 在`routes/export.js`中添加新的路由
3. 更新 API 文档和测试用例

### 自定义样式转换

1. 修改对应服务的样式转换方法
2. 添加新的 CSS 属性支持
3. 测试样式转换效果

### 性能调优

1. 监控内存使用情况
2. 优化浏览器启动参数
3. 调整并发限制

## 🧪 测试

```bash
# 运行测试
npm test

# 健康检查测试
curl http://localhost:3001/api/health

# PDF导出测试
curl -X POST http://localhost:3001/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{"htmlContent":"<h1>Test</h1>"}' \
  --output test.pdf
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。
