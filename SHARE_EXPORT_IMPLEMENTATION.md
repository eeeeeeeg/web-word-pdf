# 分享页面导出功能实现

## 概述

实现了分享页面的服务端导出功能，让分享出去的页面可以调用服务端的导出功能实现 PDF 和 Word 文档的导出。

## 功能特性

### 🎯 支持的导出格式
- **PDF 导出**：生成高质量的 PDF 文档
- **Word 导出**：生成可编辑的 Word 文档

### 🔄 兼容性
- **服务器分享**：支持通过服务器存储的分享数据导出
- **URL 参数分享**：支持通过 URL 参数传递的分享数据导出

### 📱 用户体验
- **导出状态提示**：显示导出进度和状态
- **按钮禁用**：导出过程中禁用按钮防止重复操作
- **错误处理**：友好的错误提示和处理

## 实现细节

### 1. 分享类型检测

系统会自动检测分享类型：

```javascript
// 检测是否为服务器分享（32位十六进制字符串）
const serverSharePattern = /^[a-f0-9]{32}$/i;
this.isServerShare = serverSharePattern.test(this.shareId);

if (this.isServerShare) {
  // 服务器分享：从服务器获取数据
  this.shareData = await ServerShareManager.getShare(this.shareId);
} else {
  // URL 参数分享：从 URL 解析数据
  this.shareData = ShareManager.parseShareLink(this.shareId);
}
```

### 2. HTML 内容生成

为 PDF 导出生成完整的 HTML 内容：

```javascript
generateHTMLContent() {
  const { schema } = this.shareData;
  const { pageConfig, pages } = schema;

  // 生成页面样式
  const pageStyles = this.generatePageStyles(pageConfig);
  
  // 生成页面内容
  const pagesHTML = pages.map((page, index) => {
    return this.generatePageHTML(page, index, pageConfig);
  }).join('\n');

  return `<!DOCTYPE html>...`;
}
```

### 3. 导出 API 调用

#### PDF 导出
```javascript
await exportPDF(htmlContent, {
  format: 'A4',
  orientation: 'portrait',
  margin: {
    top: '20mm',
    bottom: '20mm',
    left: '20mm',
    right: '20mm'
  }
}, `share-${this.shareId}`);
```

#### Word 导出
```javascript
await exportWord(JSON.stringify(this.shareData.schema), {
  pageSize: 'A4',
  orientation: 'portrait',
  includePageTitles: true
}, `share-${this.shareId}`);
```

## 修改的文件

### 1. SharePreview.vue
- **位置**: `src/components/SharePreview.vue`
- **功能**: 主要的分享预览组件
- **修改内容**:
  - 添加了 PDF 和 Word 导出按钮
  - 实现了服务器分享和 URL 分享的兼容性
  - 添加了 HTML 内容生成功能
  - 实现了导出状态管理

### 2. ShareViewer.vue
- **位置**: `src/components/ShareViewer.vue`
- **功能**: 服务器分享的查看器组件
- **修改内容**:
  - 更新了导出功能实现
  - 添加了 Word 导出按钮
  - 实现了与 SharePreview 相同的导出逻辑

## 样式改进

### 按钮状态
- **正常状态**: 蓝色背景，白色文字
- **导出中状态**: 显示"导出中..."文字，按钮禁用
- **禁用状态**: 灰色背景，不可点击

### 响应式设计
- 在移动设备上按钮会垂直排列
- 保持良好的视觉效果和用户体验

## 技术架构

### 数据流
1. **分享数据获取**: 根据分享类型从不同来源获取数据
2. **内容生成**: 将设计数据转换为 HTML 或 JSON 格式
3. **服务端调用**: 调用统一的导出 API
4. **文件下载**: 服务端处理后自动下载文件

### 错误处理
- **网络错误**: 显示网络连接失败提示
- **数据错误**: 显示数据格式错误提示
- **服务端错误**: 显示具体的错误信息

## 使用方式

### 用户操作流程
1. 打开分享链接
2. 查看页面设计内容
3. 点击"导出PDF"或"导出Word"按钮
4. 等待导出完成
5. 自动下载生成的文件

### 开发者集成
```javascript
// 导入导出功能
import { exportPDF, exportWord } from "../apis";

// 调用导出
await exportPDF(htmlContent, options, taskId);
await exportWord(schemaData, options, taskId);
```

## 配置选项

### PDF 导出选项
- **format**: 页面格式（A4, A3, Letter 等）
- **orientation**: 页面方向（portrait, landscape）
- **margin**: 页面边距设置

### Word 导出选项
- **pageSize**: 页面大小
- **orientation**: 页面方向
- **includePageTitles**: 是否包含页面标题

## 性能优化

### 1. 内容生成优化
- 只在需要时生成 HTML 内容
- 缓存生成的样式和内容

### 2. 用户体验优化
- 导出过程中显示进度提示
- 防止重复点击导出按钮
- 友好的错误提示

### 3. 网络优化
- 使用统一的 API 接口
- 合理的超时设置
- 错误重试机制

## 兼容性说明

### 浏览器支持
- 现代浏览器（Chrome, Firefox, Safari, Edge）
- 移动端浏览器支持

### 分享类型支持
- **服务器分享**: 完全支持，推荐使用
- **URL 参数分享**: 兼容支持，适用于简单场景

## 未来扩展

### 可能的改进方向
1. **更多导出格式**: PPT、图片等
2. **导出选项**: 更丰富的自定义选项
3. **批量导出**: 支持多个页面的批量导出
4. **云端存储**: 导出文件的云端存储和分享

### 技术优化
1. **流式处理**: 大文件的流式导出
2. **缓存机制**: 导出结果的缓存
3. **队列管理**: 导出任务的队列管理
