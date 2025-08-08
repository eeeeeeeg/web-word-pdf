# API 接口管理

本目录统一管理项目中所有的 API 接口调用。

## 目录结构

```
src/apis/
├── index.js          # API 统一入口文件
├── config.js         # API 配置文件
├── request.js        # 基础请求工具
├── share/            # 分享相关接口
│   └── index.js
├── dowload/          # 下载导出相关接口
│   └── index.js
└── README.md         # 说明文档
```

## 使用方式

### 1. 基础请求工具

```javascript
import api from "@/apis/request";

// GET 请求
const data = await api.get("/endpoint", { params });

// POST 请求
const result = await api.post("/endpoint", data);

// 文件下载
await api.download("/export/pdf", { htmlContent, options });
```

### 2. 分享接口

```javascript
// 推荐：使用统一入口
import { createShare, getShare, deleteShare } from "@/apis";

// 或者：直接从模块导入
import { createShare, getShare, deleteShare } from "@/apis/share";

// 创建分享
const shareResult = await createShare(schema, options);

// 获取分享数据
const shareData = await getShare(shareId);

// 删除分享
const success = await deleteShare(shareId);
```

### 3. 导出接口

```javascript
// 推荐：使用统一入口
import { exportPDF, exportWord } from "@/apis";

// 或者：直接从模块导入
import { exportPDF, exportWord } from "@/apis/dowload";

// 导出PDF
await exportPDF(htmlContent, options, taskId);

// 导出Word
await exportWord(htmlContent, options, taskId);
```

### 4. 统一入口

```javascript
// 从统一入口导入所有接口
import { api, createShare, exportPDF } from "@/apis";
```

## 配置管理

所有的 API 配置都在 `config.js` 文件中统一管理：

- `API_BASE_URL`: API 基础地址
- `API_ENDPOINTS`: 所有端点配置
- `REQUEST_CONFIG`: 请求配置（超时、重试等）
- `ERROR_CODES`: 错误码映射

## 特性

1. **统一管理**: 所有接口调用都通过统一的入口管理
2. **配置化**: 端点、超时等配置都可以在配置文件中修改
3. **错误处理**: 统一的错误处理和状态码映射
4. **类型安全**: 完整的 JSDoc 注释
5. **可扩展**: 易于添加新的接口模块

## 迁移说明

原有的接口调用方式已经迁移到新的管理结构：

- `ServerShareManager` 现在使用 `apis/share` 中的接口
- 直接的 axios 调用已经替换为统一的 api 工具
- 所有端点都使用配置文件中的定义

## 开发指南

### 添加新的接口模块

1. 在 `apis/` 目录下创建新的模块目录
2. 创建 `index.js` 文件并导出接口函数
3. 在 `config.js` 中添加相应的端点配置
4. 在 `apis/index.js` 中导出新模块

### 接口函数规范

```javascript
/**
 * 接口描述
 * @param {Type} param - 参数描述
 * @returns {Promise<Type>} 返回值描述
 */
export const apiFunction = (param) => {
  return api.method(API_ENDPOINTS.MODULE.ENDPOINT, param);
};
```
