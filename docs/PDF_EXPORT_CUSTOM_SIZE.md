# PDF导出自定义尺寸功能

## 功能概述

现在PDF导出功能支持通过前端传入自定义的宽高尺寸，同时保持原有的横向纵向计算逻辑。

## 使用方法

### 1. 默认导出（使用页面配置尺寸）

```javascript
// 使用页面配置的尺寸，自动调整高度
await this.exportAsHTML();
```

### 2. 自定义尺寸导出

```javascript
// 导出指定尺寸的PDF
await this.exportAsHTML(width, height, unit);

// 示例：导出300x400毫米的PDF
await this.exportAsHTML(300, 400, 'mm');

// 示例：导出800x1200像素的PDF
await this.exportAsHTML(800, 1200, 'px');

// 示例：导出8.5x11英寸的PDF
await this.exportAsHTML(8.5, 11, 'in');
```

### 3. 通用方法调用

```javascript
// 使用专门的方法进行自定义尺寸导出
await this.exportPDFWithCustomSize(width, height, unit);
```

## 参数说明

- `width`: 宽度数值
- `height`: 高度数值  
- `unit`: 单位，支持 'mm'（毫米）、'px'（像素）、'in'（英寸），默认为 'mm'

## 横向纵向处理

系统会自动根据页面配置的方向设置处理尺寸：

- **纵向模式（portrait）**: 使用传入的宽高
- **横向模式（landscape）**: 自动交换宽高

例如：
```javascript
// 如果页面设置为横向模式
// 传入 300x400mm 会自动变成 400x300mm
await this.exportAsHTML(300, 400, 'mm');
```

## 服务端支持

服务端已经支持接收和处理自定义尺寸参数：

1. **前端传递参数**: 通过 `exportOptions.width` 和 `exportOptions.height` 传递
2. **服务端接收**: 在 `server/routes/export.js` 中通过 `...options` 接收所有参数
3. **尺寸处理**: 在 `server/services/PDFExportService.js` 的 `handlePageFormat` 方法中处理自定义尺寸

## 实现细节

### 前端处理逻辑

```javascript
// 1. 检查是否传入自定义尺寸
if (customWidth !== null && customHeight !== null) {
  finalWidth = customWidth;
  finalHeight = customHeight;
} else {
  // 使用页面配置尺寸并智能调整高度
  finalWidth = pageConfig.pageSize.width;
  finalHeight = pageConfig.pageSize.height + extraHeight;
}

// 2. 应用横向纵向设置
if (orientation === "landscape") {
  [finalWidth, finalHeight] = [finalHeight, finalWidth];
}

// 3. 设置导出选项
exportOptions.width = `${finalWidth}${unit}`;
exportOptions.height = `${finalHeight}${unit}`;
```

### 服务端处理逻辑

```javascript
// 检查自定义尺寸参数
if (options.width && options.height) {
  const unit = options.unit || "mm";
  
  // 单位转换处理
  let widthMm, heightMm;
  if (unit === "px") {
    widthMm = options.width / MM_TO_PX;
    heightMm = options.height / MM_TO_PX;
  } else {
    widthMm = parseFloat(options.width);
    heightMm = parseFloat(options.height);
  }
  
  // 返回自定义尺寸配置
  return {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    // ... 其他配置
  };
}
```

## 测试示例

在页面编辑器中添加了测试按钮，可以测试300x400mm的自定义尺寸导出：

```javascript
async exportCustomSizePDF() {
  await this.exportAsHTML(300, 400, "mm");
}
```

## 注意事项

1. **单位支持**: 目前支持 mm、px、in 三种单位
2. **横向处理**: 系统会自动根据页面方向设置交换宽高
3. **向后兼容**: 不传入自定义尺寸时，使用原有的页面配置逻辑
4. **参数验证**: 服务端会验证传入的尺寸参数并进行适当的转换

## 扩展使用

可以在其他组件中调用PageEditor的导出方法：

```javascript
// 在父组件中调用
this.$refs.pageEditor.exportPDFWithCustomSize(210, 297, 'mm');

// 或者通过事件传递参数
this.$emit('export-pdf', { width: 210, height: 297, unit: 'mm' });
```
