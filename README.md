# Web Word PDF

🚀 **现代化的在线文档设计与 PDF 生成工具**

一个基于 Vue.js 的可视化文档编辑器，支持拖拽式组件编辑、实时预览、多页面管理和在线分享功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue.js-3.x-green.svg)
![Node](https://img.shields.io/badge/Node.js-16+-green.svg)

## ✨ 核心功能

### 📝 可视化编辑

- **拖拽式组件库**：文本、图片、布局等多种组件
- **所见即所得**：实时预览编辑效果
- **富文本编辑**：集成 TinyMCE 编辑器，支持格式化文本
- **精确定位**：像素级的组件位置和尺寸控制

### 📄 多页面管理

- **无限页面**：支持创建任意数量的页面
- **页面导航**：便捷的页面切换和管理
- **页眉页脚**：全局页眉页脚设计器
- **页面模板**：快速复制和应用页面布局

### 🎨 样式系统

- **全局样式**：统一的字体、颜色、间距设置
- **组件样式**：独立的组件样式配置
- **响应式设计**：适配不同屏幕尺寸
- **主题定制**：可扩展的主题系统

### 🔄 数据管理

- **自动保存**：防止数据丢失的自动保存机制
- **历史记录**：撤销/重做功能
- **导入导出**：JSON 格式的数据交换
- **本地存储**：浏览器本地数据持久化

### 🌐 分享功能

- **一键分享**：生成分享链接，无需注册
- **只读预览**：分享页面为只读模式
- **缩略图导航**：PDF 阅读器级别的页面导航
- **响应式分享**：移动端友好的分享页面

## 🛠️ 技术架构

### 前端技术栈

```
Vue.js 3.x          # 渐进式JavaScript框架
Vue CLI 5.x          # 项目构建工具
TinyMCE 6.x          # 富文本编辑器
HTML5 Drag & Drop    # 原生拖拽API
CSS3 Flexbox/Grid    # 现代布局技术
LocalStorage API     # 本地数据存储
```

### 核心架构设计

```
src/
├── components/           # Vue组件
│   ├── PageEditor.vue   # 主编辑器
│   ├── Canvas.vue       # 画布组件
│   ├── ComponentLibrary.vue  # 组件库
│   ├── PropertyPanel.vue     # 属性面板
│   ├── SharePreview.vue      # 分享预览
│   └── ...
├── utils/               # 工具函数
│   ├── shareManager.js  # 分享管理
│   ├── fileManager.js   # 文件管理
│   ├── historyManager.js # 历史记录
│   └── ...
├── styles/              # 样式文件
└── assets/              # 静态资源
```

## 🚀 快速开始

### 环境要求

- Node.js 16.0+
- npm 8.0+ 或 yarn 1.22+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/web-word-pdf.git
cd web-word-pdf

# 安装依赖
npm install
# 或
yarn install
```

### 开发环境

```bash
# 启动开发服务器
npm run serve
# 或
yarn serve

# 访问 http://localhost:8080
```

### 生产构建

```bash
# 构建生产版本
npm run build
# 或
yarn build

# 预览构建结果
npm run preview
# 或
yarn preview
```

### 代码检查

```bash
# 检查和修复代码
npm run lint
# 或
yarn lint
```

## 📖 使用指南

### 基础操作

1. **创建页面**：点击"添加页面"按钮创建新页面
2. **添加组件**：从左侧组件库拖拽组件到画布
3. **编辑内容**：双击组件进入编辑模式
4. **调整样式**：在右侧属性面板修改样式
5. **保存文档**：使用 Ctrl+S 或点击保存按钮

### 高级功能

- **页眉页脚**：在全局配置中启用并设计页眉页脚
- **分享文档**：点击分享按钮生成分享链接
- **导出数据**：支持 JSON 格式的数据导出
- **批量操作**：支持多选组件进行批量操作

## 🔧 技术特性

### 组件系统

- **模块化设计**：每个组件都是独立的 Vue 组件
- **插件架构**：支持自定义组件扩展
- **类型安全**：完整的数据类型定义
- **性能优化**：虚拟滚动和懒加载

### 数据流管理

- **单向数据流**：清晰的数据流向
- **状态管理**：集中式的状态管理
- **数据验证**：完整的数据校验机制
- **错误处理**：优雅的错误处理和恢复

### 性能优化

- **代码分割**：按需加载减少初始包大小
- **缓存策略**：智能的缓存机制
- **防抖节流**：优化用户交互性能
- **内存管理**：避免内存泄漏

## 🎯 核心算法

### 拖拽系统

```javascript
// 拖拽检测算法
function detectDropZone(mouseX, mouseY, elements) {
  return elements.find((el) => {
    const rect = el.getBoundingClientRect();
    return (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    );
  });
}
```

### 布局引擎

```javascript
// 自动布局算法
function autoLayout(components, containerWidth) {
  let currentY = 0;
  return components.map((component) => {
    const position = { x: 0, y: currentY };
    currentY += component.height + SPACING;
    return { ...component, position };
  });
}
```

### 分享压缩

```javascript
// 数据压缩算法
function compressShareData(schema) {
  const compressed = btoa(encodeURIComponent(JSON.stringify(schema)));
  return compressed;
}
```

## 🖥️ 服务器端

### Node.js 导出服务

项目包含一个完整的 Node.js 服务器，支持高质量的文档导出功能：

```
server/
├── index.js              # 服务器入口
├── routes/               # API路由
│   ├── export.js        # 导出接口
│   └── health.js        # 健康检查
├── services/            # 导出服务
│   ├── PDFExportService.js   # PDF导出
│   ├── WordExportService.js  # Word导出
│   └── PPTExportService.js   # PPT导出
└── tests/               # 测试文件
```

### 导出功能特性

- **PDF 导出**：基于 Playwright 的高质量 PDF 生成
- **Word 导出**：生成标准 DOCX 格式文档
- **PPT 导出**：创建 PowerPoint 演示文稿
- **批量导出**：同时导出多种格式
- **样式保持**：完整保留原始样式和布局

### 服务器启动

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install

# 安装浏览器
npm run install-browsers

# 启动服务
npm run dev

# 服务运行在 http://localhost:3001
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

⭐ 如果这个项目对你有帮助，请给我们一个星标！
