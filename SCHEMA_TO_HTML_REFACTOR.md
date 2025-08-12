# Schema 转 HTML 统一重构文档

## 重构目标

将分散在多个文件中的 schema 转 HTML 逻辑统一抽象到 utils 文件中，避免出现多套解析逻辑，提高代码的可维护性和一致性。

## 问题分析

### 重构前的问题

1. **多套重复逻辑**：在以下文件中存在重复的 schema 转 HTML 逻辑：

   - `server/services/PDFExportService.js`
   - `server/routes/export.js`
   - `src/components/PageEditor.vue`
   - `src/components/SharePreview.vue`
   - `src/components/ShareViewer.vue`

2. **逻辑不一致**：不同文件中的转换逻辑存在差异，导致：

   - 样式处理方式不同
   - 组件渲染结果不一致
   - 页眉页脚处理逻辑分散
   - 背景样式生成方式不统一

3. **维护困难**：
   - 修改转换逻辑需要在多个文件中同步更新
   - 容易出现遗漏和不一致
   - 代码重复度高

## 解决方案

### 1. 创建统一的转换器

#### 前端版本：`src/utils/schemaToHtml.js`

```javascript
export class SchemaToHtmlConverter {
  // 统一的转换方法
  static convertToFullHTML(schema, options = {})
  static generatePageStyles(pageConfig, environment)
  static generatePageHTML(page, pageIndex, pageConfig, options)
  static generateComponentHTML(component, isHeaderFooter)
  // ... 其他方法
}
```

#### 服务端版本：`server/utils/schemaToHtml.js`

```javascript
class SchemaToHtmlConverter {
  // 与前端版本保持一致的API和逻辑
  static convertToFullHTML(schema, options = {})
  // ... 相同的方法结构
}
module.exports = SchemaToHtmlConverter;
```

### 2. 环境适配

转换器支持不同的环境配置：

- **web**：用于前端预览和分享页面
- **pdf**：用于 PDF 导出，优化打印样式
- **word**：用于 Word 导出，添加 Word 特定样式

### 3. 功能特性

#### 统一的样式生成

- 页面尺寸和边距计算
- 背景样式处理（颜色、图片、尺寸模式）
- 响应式和打印样式

#### 组件转换

- 文本组件：支持富文本和样式
- 图片组件：支持多种尺寸模式
- 布局组件：支持网格和自由布局

#### 页眉页脚处理

- 变量替换（页码、日期等）
- 背景样式适配
- 透明背景支持

## 重构内容

### 1. 服务端文件更新

#### `server/services/PDFExportService.js`

- ✅ 添加统一转换器导入
- ✅ 替换`convertSchemaToHTML`方法
- ✅ 删除重复的组件转换方法
- ✅ 删除重复的样式构建方法

#### `server/routes/export.js`

- ✅ 添加统一转换器导入
- ✅ 替换`convertSchemaToHTML`函数
- ✅ 删除重复的组件转换函数

### 2. 前端文件更新

#### `src/components/PageEditor.vue`

- ✅ 添加统一转换器导入
- ✅ 替换`generatePlaywrightHTML`方法
- ⚠️ 保留部分方法（用于页眉页脚模板生成等前端特定功能）

#### `src/components/SharePreview.vue`

- ✅ 添加统一转换器导入
- ✅ 替换`generateHTMLContent`方法
- ✅ 删除重复的页面样式生成方法
- ✅ 删除重复的组件 HTML 生成方法

#### `src/components/ShareViewer.vue`

- ✅ 添加统一转换器导入
- ✅ 替换`generateHTMLContent`方法
- ✅ 删除重复的页面样式生成方法
- ✅ 删除重复的组件 HTML 生成方法

## 重构效果

### 1. 代码统一性

- 所有 schema 转 HTML 的逻辑现在使用统一的转换器
- 确保不同环境下的渲染结果一致
- 页眉页脚背景色问题得到统一修复

### 2. 可维护性提升

- 修改转换逻辑只需要在一个地方进行
- 新增组件类型只需要在转换器中添加
- 样式调整可以统一应用到所有使用场景

### 3. 功能增强

- 支持环境特定的样式优化
- 统一的变量替换机制
- 更好的背景样式处理

### 4. 问题修复

- ✅ 修复了 PDF 导出页眉页脚背景色问题
- ✅ 统一了不同环境下的样式渲染
- ✅ 解决了代码重复和不一致问题

## 使用方式

### 前端使用

```javascript
import SchemaToHtmlConverter from "@/utils/schemaToHtml";

// 生成完整HTML文档
const html = SchemaToHtmlConverter.convertToFullHTML(schema, {
  title: "页面设计",
  environment: "web",
  includeHeaderFooter: true,
});
```

### 服务端使用

```javascript
const SchemaToHtmlConverter = require("../utils/schemaToHtml");

// 生成PDF用的HTML
const html = SchemaToHtmlConverter.convertToFullHTML(schema, {
  environment: "pdf",
  includeDoctype: false,
});
```

## 注意事项

1. **PageEditor.vue 保留部分方法**：由于 PageEditor 中有一些前端特定的功能（如页眉页脚模板生成、Playwright 变量替换等），这些方法暂时保留，但已经修复了背景色问题。

2. **环境配置重要性**：不同环境（web、pdf、word）会生成不同的样式，确保在正确的环境下使用转换器。

3. **向后兼容性**：重构保持了原有的 API 接口，现有代码无需大幅修改。

## 修复记录

### 2025-08-12 修复

在重构过程中发现并修复了以下问题：

#### 1. 总页数传递问题

**问题**：页眉页脚中的总页数获取错误，使用了`pageConfig.pages?.length`而不是`schema.pages?.length`
**修复**：

- 在`convertToFullHTML`方法中添加`totalPages`到选项中
- 页眉页脚生成时使用`options.totalPages`而不是`pageConfig.pages?.length`

#### 2. 变量替换格式兼容性

**问题**：新版本使用`{{pageNumber}}`格式，但旧版本使用`{pageNumber}`格式
**修复**：

- 支持双大括号格式：`{{pageNumber}}`, `{{totalPages}}`, `{{currentDate}}`等
- 支持单大括号格式（兼容旧版本）：`{pageNumber}`, `{totalPages}`, `{date}`等
- 使用正确的正则表达式转义处理大括号

#### 3. 背景样式处理完整性

**验证**：确认背景图片的所有属性都正确处理：

- `backgroundImage`: 图片 URL
- `backgroundSize`: cover, contain, stretch (转换为 100% 100%)
- `backgroundPosition`: 位置设置
- `backgroundRepeat`: 重复模式

#### 4. 页眉页脚背景色处理

**验证**：确认页眉页脚背景色处理正确：

- 默认透明背景
- 支持自定义背景色
- 正确的样式生成

### 测试验证

通过自动化测试验证了修复效果：

- ✅ Web 环境转换正常，包含变量替换和背景样式
- ✅ PDF 环境转换正常，包含打印样式和分页符
- ✅ 新旧格式变量替换都正常工作
- ✅ 背景样式生成完整，stretch 模式正确转换
- ✅ 页眉页脚背景色处理正确

## 后续优化建议

1. **进一步统一 PageEditor**：可以考虑将 PageEditor 中剩余的 HTML 生成逻辑也迁移到统一转换器中。

2. **类型定义**：添加 TypeScript 类型定义，提高代码的类型安全性。

3. **测试覆盖**：为统一转换器添加完整的单元测试。

4. **性能优化**：对于大型文档，可以考虑添加缓存机制。
