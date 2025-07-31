// 页面编辑器的 Schema 定义

/**
 * 页面全局配置
 */
export const DEFAULT_PAGE_CONFIG = {
  // 页面尺寸
  pageSize: {
    preset: "A4", // A4, A3, Letter, Custom
    width: 210, // mm
    height: 297, // mm
    unit: "mm", // px, mm, in
  },

  // 页面边距
  margins: {
    top: 20, // mm
    bottom: 20,
    left: 20,
    right: 20,
  },

  // 页眉页脚
  header: {
    enabled: false,
    content: "",
    height: 15, // mm
    style: {
      fontSize: 12,
      fontFamily: "Arial",
      color: "#333333",
      textAlign: "center",
    },
  },

  footer: {
    enabled: false,
    content: "",
    height: 15, // mm
    style: {
      fontSize: 12,
      fontFamily: "Arial",
      color: "#333333",
      textAlign: "center",
    },
  },

  // 默认样式
  defaultStyles: {
    fontFamily: "Arial",
    fontSize: 14,
    color: "#333333",
    lineHeight: 1.5,
    paragraphSpacing: 6,
  },
};

/**
 * 组件类型定义
 */
export const COMPONENT_TYPES = {
  LAYOUT: "layout",
  TEXT: "text",
  IMAGE: "image",
};

/**
 * 布局组件预设
 */
export const LAYOUT_PRESETS = {
  SINGLE_COLUMN: {
    type: "single",
    columns: [{ width: 100 }],
  },
  TWO_COLUMNS: {
    type: "two",
    columns: [{ width: 50 }, { width: 50 }],
  },
  THREE_COLUMNS: {
    type: "three",
    columns: [{ width: 33.33 }, { width: 33.33 }, { width: 33.34 }],
  },
  CUSTOM: {
    type: "custom",
    columns: [],
  },
};

/**
 * 创建默认组件
 */
export function createComponent(type, options = {}) {
  const baseComponent = {
    id: generateId(),
    type,
    style: {
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      padding: { top: 8, bottom: 8, left: 8, right: 8 },
    },
    ...options,
  };

  switch (type) {
    case COMPONENT_TYPES.LAYOUT:
      return {
        ...baseComponent,
        preset: options.preset || "single",
        columns: options.columns || LAYOUT_PRESETS.SINGLE_COLUMN.columns,
        alignment: options.alignment || "left",
        children: options.children || [],
      };

    case COMPONENT_TYPES.TEXT:
      return {
        ...baseComponent,
        content: options.content || "请输入文本内容",
        style: {
          ...baseComponent.style,
          fontSize: options.fontSize || 14,
          fontFamily: options.fontFamily || "Arial",
          color: options.color || "#333333",
          lineHeight: options.lineHeight || 1.5,
          textAlign: options.textAlign || "left",
          fontWeight: options.fontWeight || "normal",
          fontStyle: options.fontStyle || "normal",
          textDecoration: options.textDecoration || "none",
        },
      };

    case COMPONENT_TYPES.IMAGE:
      return {
        ...baseComponent,
        src: options.src || "",
        alt: options.alt || "",
        style: {
          ...baseComponent.style,
          width: options.width || 200,
          height: options.height || 150,
          objectFit: options.objectFit || "cover",
          borderRadius: options.borderRadius || 0,
          border: options.border || "none",
        },
        keepAspectRatio: options.keepAspectRatio !== false,
      };

    default:
      return baseComponent;
  }
}

/**
 * 生成唯一ID
 */
function generateId() {
  return (
    "comp_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now()
  );
}

/**
 * 创建单个页面
 */
export function createPage(config = {}) {
  return {
    id: generateId(),
    name: config.name || "页面1",
    components: config.components || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 页面 Schema 结构
 */
export function createPageSchema(config = {}) {
  return {
    version: "1.0.0",
    pageConfig: { ...DEFAULT_PAGE_CONFIG, ...config.pageConfig },
    pages: config.pages || [createPage()],
    currentPageIndex: config.currentPageIndex || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 验证 Schema 结构
 */
export function validateSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return { valid: false, error: "Schema must be an object" };
  }

  if (!schema.version) {
    return { valid: false, error: "Schema version is required" };
  }

  if (!schema.pageConfig) {
    return { valid: false, error: "Page config is required" };
  }

  // 兼容旧版本的 components 字段
  if (schema.components && Array.isArray(schema.components)) {
    // 转换为新的多页面格式
    schema.pages = [createPage({ components: schema.components })];
    schema.currentPageIndex = 0;
    delete schema.components;
  }

  if (!Array.isArray(schema.pages)) {
    return { valid: false, error: "Pages must be an array" };
  }

  return { valid: true };
}
