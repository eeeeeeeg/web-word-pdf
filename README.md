# Web Word PDF

🚀 **在线文档设计与导出工具**

基于 Vue.js 2.6 的可视化文档编辑器，支持拖拽式组件编辑、富文本编辑、多页面管理和文档导出功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue.js-2.6-green.svg)
![TinyMCE](https://img.shields.io/badge/TinyMCE-8.0-blue.svg)
![Node](https://img.shields.io/badge/Node.js-16+-green.svg)

## ✨ 核心功能

### 📝 可视化编辑

- **拖拽式组件**：文本组件、图片组件、自由文本、自由图片
- **富文本编辑**：集成 TinyMCE 8.0 编辑器，支持格式化文本
- **自由定位**：支持自由拖拽和精确定位
- **实时预览**：所见即所得的编辑体验

### 📄 页面管理

- **多页面支持**：创建和管理多个页面
- **页面导航**：便捷的页面切换
- **页眉页脚**：全局页眉页脚设计
- **自动分页**：内容超出时自动分页处理

### 🎨 样式配置

- **全局样式**：统一的页面样式设置
- **组件样式**：字体、颜色、对齐等样式配置
- **布局控制**：精确的位置和尺寸控制

### � 数据管理

- **草稿保存**：服务器端草稿管理
- **分享功能**：生成分享链接进行文档分享
- **导出功能**：支持 PDF、Word、PPT 格式导出
- **数据持久化**：JSON 格式的数据存储

## 🛠️ 技术架构

### 前端技术栈

```
Vue.js 2.6.14           # 渐进式JavaScript框架
Vue CLI 5.x             # 项目构建工具
TinyMCE 8.0.1           # 富文本编辑器
@tinymce/tinymce-vue    # TinyMCE Vue组件
HTML5 Drag & Drop       # 原生拖拽API
Axios 1.11.0            # HTTP客户端
HTML2Canvas 1.4.1       # 截图生成
jsPDF 3.0.1             # PDF生成
file-saver 2.0.5        # 文件下载
```

### 后端技术栈

```
Node.js 16+             # 服务器运行环境
Express 4.18.2          # Web框架
Playwright 1.40.0       # 浏览器自动化
docx 8.5.0              # Word文档生成
pptxgenjs 3.12.0        # PPT文档生成
Sharp 0.34.3            # 图片处理
JSDOM 26.1.0            # DOM解析
```

### 项目结构

```
src/
├── components/              # Vue组件
│   ├── PageEditor.vue      # 主编辑器
│   ├── Canvas.vue          # 画布组件
│   ├── ComponentLibrary.vue # 组件库
│   ├── PropertyPanel.vue   # 属性面板
│   ├── RichTextEditor.vue  # 富文本编辑器
│   ├── FreeTextComponent.vue # 自由文本组件
│   ├── ShareViewer.vue     # 分享查看器
│   └── ...
├── utils/                  # 工具函数
│   ├── shareManager.js     # 分享管理
│   ├── exportManager.js    # 导出管理
│   ├── schemaManager.js    # 数据模式管理
│   ├── autoPagination.js   # 自动分页
│   └── ...
├── apis/                   # API接口
├── types/                  # 类型定义
└── styles/                 # 样式文件

server/
├── routes/                 # API路由
│   ├── export.js          # 导出接口
│   ├── share.js           # 分享接口
│   └── drafts.js          # 草稿接口
├── services/              # 业务服务
│   ├── PDFExportService.js # PDF导出服务
│   ├── PPTExportService.js # PPT导出服务
│   └── DraftService.js    # 草稿服务
└── utils/                 # 工具函数
```

## 🚀 快速开始

### 环境要求

- Node.js 16.0+
- npm 8.0+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 完整安装

```bash
# 克隆项目
git clone https://github.com/your-username/web-word-pdf.git
cd web-word-pdf

# 安装前端和后端依赖
npm run setup
```

### 开发环境

```bash
# 启动前端开发服务器
npm run serve
# 访问 http://localhost:8080

# 启动后端服务器（新终端）
npm run server:dev
# 服务运行在 http://localhost:3001
```

### 生产构建

```bash
# 构建前端
npm run build

# 启动后端服务
npm run server:start
```

### 可用脚本

```bash
npm run serve          # 启动前端开发服务器
npm run build          # 构建前端生产版本
npm run lint           # 代码检查
npm run server:dev     # 启动后端开发服务器
npm run server:start   # 启动后端生产服务器
npm run setup          # 安装所有依赖
```

## 📖 使用指南

### 基础操作

1. **创建页面**：点击"添加页面"按钮创建新页面
2. **添加组件**：从左侧组件库拖拽组件到画布
   - 文本组件：用于添加富文本内容
   - 图片组件：用于添加图片
   - 自由文本：可自由定位的文本组件
   - 自由图片：可自由定位的图片组件
3. **编辑内容**：双击组件进入编辑模式
4. **调整样式**：在右侧属性面板修改样式
5. **保存草稿**：点击保存按钮保存到服务器

### 组件功能

- **富文本编辑**：支持粗体、斜体、颜色、对齐等格式
- **自由定位**：拖拽组件到任意位置
- **尺寸调整**：拖拽边框调整组件大小
- **样式配置**：字体、颜色、背景等样式设置

### 导出功能

- **PDF 导出**：生成高质量 PDF 文档
- **Word 导出**：生成 DOCX 格式文档
- **PPT 导出**：生成 PowerPoint 演示文稿
- **分享链接**：生成在线分享链接

## 🔧 核心特性

### 组件系统

- **模块化组件**：Canvas、PageEditor、ComponentLibrary、PropertyPanel
- **富文本编辑**：基于 TinyMCE 8.0 的富文本编辑器
- **自由定位**：TransformController 实现组件的拖拽和缩放
- **数据驱动**：基于 JSON Schema 的数据模型

### 导出服务

- **PDF 导出**：使用 Playwright 生成高质量 PDF
- **Word 导出**：使用 docx 库生成 DOCX 文档
- **PPT 导出**：使用 pptxgenjs 生成 PowerPoint 文档
- **图片处理**：使用 Sharp 进行图片优化

### 数据管理

- **草稿系统**：服务器端草稿保存和管理
- **分享机制**：基于 URL 的文档分享
- **自动分页**：内容超出时的自动分页处理
- **数据持久化**：JSON 格式的数据存储

## 🎯 核心实现

### 组件拖拽

```javascript
// TransformController 实现组件变换
export default {
  name: "TransformController",
  props: ["component", "selected", "mode"],
  methods: {
    handleMouseDown(event) {
      // 拖拽开始逻辑
    },
    handleResize(direction, event) {
      // 尺寸调整逻辑
    },
  },
};
```

### 富文本编辑

```javascript
// RichTextEditor 配置
editorConfig: {
  base_url: "/tinymce",
  license_key: "gpl",
  inline: true,
  plugins: ["advlist", "autolink", "lists", "link", "image"],
  toolbar: "undo redo | formatselect | bold italic"
}
```

### 自动分页

```javascript
// 自动分页算法
function calculatePagination(components, pageHeight) {
  let currentPage = 0;
  let currentY = 0;

  return components.map((component) => {
    if (currentY + component.height > pageHeight) {
      currentPage++;
      currentY = 0;
    }
    currentY += component.height;
    return { ...component, page: currentPage };
  });
}
```

## 🖥️ 服务器端

### Node.js 服务架构

基于 Express 的 RESTful API 服务器，提供文档导出和数据管理功能：

```
server/
├── index.js              # 服务器入口
├── routes/               # API路由
│   ├── export.js        # 导出接口
│   ├── share.js         # 分享接口
│   ├── drafts.js        # 草稿接口
│   └── health.js        # 健康检查
├── services/            # 业务服务
│   ├── PDFExportService.js   # PDF导出服务
│   ├── PPTExportService.js   # PPT导出服务
│   └── DraftService.js      # 草稿管理服务
├── temp/                # 临时文件存储
└── tests/               # 测试文件
```

### API 接口

- **POST /api/export/pdf** - PDF 导出
- **POST /api/export/word** - Word 导出
- **POST /api/export/ppt** - PPT 导出
- **POST /api/drafts** - 保存草稿
- **GET /api/drafts/:id** - 获取草稿
- **POST /api/share** - 创建分享
- **GET /api/share/:id** - 获取分享内容

### 服务器部署

```bash
# 安装依赖
cd server && npm install

# 安装 Playwright 浏览器
npm run install-browsers

# 开发环境
npm run dev

# 生产环境
npm start

# Docker 部署
docker-compose up -d
```

## 📋 依赖说明

### 前端核心依赖

- **Vue.js 2.6.14** - 主框架
- **TinyMCE 8.0.1** - 富文本编辑器
- **@tinymce/tinymce-vue 3.2.8** - TinyMCE Vue 组件
- **Axios 1.11.0** - HTTP 请求库
- **HTML2Canvas 1.4.1** - 页面截图
- **jsPDF 3.0.1** - PDF 生成
- **file-saver 2.0.5** - 文件下载

### 后端核心依赖

- **Express 4.18.2** - Web 框架
- **Playwright 1.40.0** - 浏览器自动化
- **docx 8.5.0** - Word 文档生成
- **pptxgenjs 3.12.0** - PPT 文档生成
- **Sharp 0.34.3** - 图片处理
- **JSDOM 26.1.0** - DOM 解析

## 🤝 贡献指南

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/NewFeature`)
3. 提交更改 (`git commit -m 'Add NewFeature'`)
4. 推送到分支 (`git push origin feature/NewFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 Vue.js 官方风格指南
- 组件命名使用 PascalCase
- 方法命名使用 camelCase

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

⭐ 如果这个项目对你有帮助，请给我们一个星标！
