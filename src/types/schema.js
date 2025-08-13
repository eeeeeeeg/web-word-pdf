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
    orientation: "portrait", // portrait, landscape
  },

  // 页面边距
  margins: {
    top: 5, // mm
    bottom: 5,
    left: 5,
    right: 5,
  },

  // 页眉页脚
  header: {
    enabled: false,
    height: 15, // mm
    components: [], // 页眉中的组件
    style: {
      backgroundColor: "transparent",
      borderBottom: {
        enabled: false,
        width: 1,
        style: "solid",
        color: "#e0e0e0",
      },
    },
  },

  footer: {
    enabled: false,
    height: 15, // mm
    components: [], // 页脚中的组件
    style: {
      backgroundColor: "transparent",
      borderTop: {
        enabled: false,
        width: 1,
        style: "solid",
        color: "#e0e0e0",
      },
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
        style: {
          ...baseComponent.style,
          backgroundColor: options.backgroundColor || "transparent",
          borderRadius: options.borderRadius || 0,
        },
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
          backgroundColor: options.backgroundColor || "transparent",
          borderRadius: options.borderRadius || 0,
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
        alignment: options.alignment || "center", // 图片对齐方式，默认居中
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
    style: config.style || {
      backgroundColor: "transparent",
      backgroundImage: "",
      backgroundSize: "cover", // cover, contain, stretch
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    },
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
 * 页眉页脚模板
 */
export const HEADER_FOOTER_TEMPLATES = {
  SIMPLE_TEXT: {
    name: "简单文本",
    description: "单行文本，支持页码变量",
    components: [
      {
        type: "layout",
        preset: "single",
        alignment: "center", // 添加布局组件的居中对齐
        columns: [{ width: 100 }],
        children: [
          {
            type: "text",
            content: "第 {pageNumber} 页，共 {totalPages} 页",
            columnIndex: 0,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 4, bottom: 4, left: 8, right: 8 },
              fontSize: 12,
              fontFamily: "Arial",
              color: "#666666",
              lineHeight: 1.2,
              textAlign: "center",
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
        ],
        style: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
    ],
  },

  THREE_COLUMN: {
    name: "三栏布局",
    description: "左中右三栏，可分别设置内容",
    components: [
      {
        type: "layout",
        preset: "three",
        columns: [{ width: 33.33 }, { width: 33.33 }, { width: 33.34 }],
        children: [
          {
            type: "text",
            content: "文档标题",
            columnIndex: 0,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 4, bottom: 4, left: 8, right: 8 },
              fontSize: 12,
              fontFamily: "Arial",
              color: "#333333",
              lineHeight: 1.2,
              textAlign: "left",
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
          {
            type: "text",
            content: "{date}",
            columnIndex: 1,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 4, bottom: 4, left: 8, right: 8 },
              fontSize: 12,
              fontFamily: "Arial",
              color: "#666666",
              lineHeight: 1.2,
              textAlign: "center",
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
          {
            type: "text",
            content: "第 {pageNumber} 页",
            columnIndex: 2,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 4, bottom: 4, left: 8, right: 8 },
              fontSize: 12,
              fontFamily: "Arial",
              color: "#666666",
              lineHeight: 1.2,
              textAlign: "right",
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
        ],
        style: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
    ],
  },

  LOGO_LEFT: {
    name: "Logo + 文本",
    description: "左侧定高Logo，右侧文本信息",
    components: [
      {
        id: "layout_logo_text",
        type: "layout",
        preset: "two",
        columns: [{ width: 25 }, { width: 75 }],
        children: [
          {
            id: "logo_component",
            type: "image",
            src: "",
            alt: "公司Logo",
            columnIndex: 0,
            style: {
              margin: { top: 4, bottom: 4, left: 8, right: 8 },
              padding: { top: 0, bottom: 0, left: 0, right: 0 },
              width: 60,
              height: 35, // 适合页眉的高度
              objectFit: "contain",
              borderRadius: 0,
              border: "none",
            },
            keepAspectRatio: true,
            fixedHeight: true, // 标记为定高显示
            alignment: "center", // 新增：图片对齐方式，默认居中
          },
          {
            id: "text_component",
            type: "text",
            content: "公司名称 - {date}",
            columnIndex: 1,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 12, bottom: 12, left: 16, right: 8 },
              fontSize: 16,
              fontFamily: "Microsoft YaHei",
              color: "#333333",
              lineHeight: 1.4,
              textAlign: "left",
              fontWeight: "600",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
        ],
        style: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          minHeight: 48,
          maxHeight: 56, // 限制最大高度，适合页眉页脚
        },
        alignment: "stretch", // 拉伸对齐，确保高度一致
      },
    ],
  },

  LOGO_CENTER: {
    name: "居中Logo",
    description: "Logo居中显示，下方页码信息",
    components: [
      {
        id: "logo_layout",
        type: "layout",
        preset: "single",
        columns: [{ width: 100 }],
        children: [
          {
            id: "center_logo",
            type: "image",
            src: "",
            alt: "公司Logo",
            columnIndex: 0,
            style: {
              margin: { top: 6, bottom: 6, left: 0, right: 0 },
              padding: { top: 0, bottom: 0, left: 0, right: 0 },
              width: 80,
              height: 50,
              objectFit: "contain",
              borderRadius: 0,
              border: "none",
            },
            keepAspectRatio: true,
            fixedHeight: true,
            alignment: "center", // 新增：图片对齐方式
          },
        ],
        style: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          minHeight: 62,
        },
        alignment: "center",
      },
      {
        id: "page_info_layout",
        type: "layout",
        preset: "single",
        columns: [{ width: 100 }],
        children: [
          {
            id: "page_info_text",
            type: "text",
            content: "第 {pageNumber} 页，共 {totalPages} 页",
            columnIndex: 0,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 4, bottom: 4, left: 8, right: 8 },
              fontSize: 12,
              fontFamily: "Arial",
              color: "#666666",
              lineHeight: 1.2,
              textAlign: "center",
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
        ],
        style: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          minHeight: 24,
        },
        alignment: "center",
      },
    ],
  },

  LOGO_THREE_COLUMN: {
    name: "Logo三栏",
    description: "Logo、标题、页码三栏布局",
    components: [
      {
        id: "three_column_layout",
        type: "layout",
        preset: "three",
        columns: [{ width: 20 }, { width: 60 }, { width: 20 }],
        children: [
          {
            id: "left_logo",
            type: "image",
            src: "",
            alt: "公司Logo",
            columnIndex: 0,
            style: {
              margin: { top: 4, bottom: 4, left: 8, right: 4 },
              padding: { top: 0, bottom: 0, left: 0, right: 0 },
              width: 50,
              height: 35,
              objectFit: "contain",
              borderRadius: 0,
              border: "none",
            },
            keepAspectRatio: true,
            fixedHeight: true,
            alignment: "center", // 新增：图片对齐方式，默认居中
          },
          {
            id: "center_title",
            type: "text",
            content: "文档标题",
            columnIndex: 1,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 10, bottom: 10, left: 16, right: 16 },
              fontSize: 16,
              fontFamily: "Microsoft YaHei",
              color: "#333333",
              lineHeight: 1.4,
              textAlign: "center",
              fontWeight: "600",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
          {
            id: "right_page_number",
            type: "text",
            content: "第 {pageNumber} 页",
            columnIndex: 2,
            style: {
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              padding: { top: 10, bottom: 10, left: 4, right: 8 },
              fontSize: 14,
              fontFamily: "Arial",
              color: "#666666",
              lineHeight: 1.4,
              textAlign: "right",
              fontWeight: "normal",
              fontStyle: "normal",
              textDecoration: "none",
            },
          },
        ],
        style: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          minHeight: 55,
        },
        alignment: "stretch",
      },
    ],
  },
};

/**
 * 创建页眉页脚模板
 */
export function createHeaderFooterFromTemplate(templateKey) {
  const template = HEADER_FOOTER_TEMPLATES[templateKey];
  if (!template) {
    return [];
  }

  // 深拷贝模板并生成新的ID
  return JSON.parse(JSON.stringify(template.components)).map((component) => {
    component.id = generateId();
    if (component.children) {
      component.children.forEach((child) => {
        child.id = generateId();
      });
    }
    return component;
  });
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

  // 兼容旧版本的页眉页脚格式
  if (
    schema.pageConfig.header &&
    typeof schema.pageConfig.header.content === "string"
  ) {
    // 转换为新格式
    const oldContent = schema.pageConfig.header.content;
    schema.pageConfig.header.components = oldContent
      ? createHeaderFooterFromTemplate("SIMPLE_TEXT")
      : [];
    delete schema.pageConfig.header.content;
    delete schema.pageConfig.header.style;
  }

  if (
    schema.pageConfig.footer &&
    typeof schema.pageConfig.footer.content === "string"
  ) {
    // 转换为新格式
    const oldContent = schema.pageConfig.footer.content;
    schema.pageConfig.footer.components = oldContent
      ? createHeaderFooterFromTemplate("SIMPLE_TEXT")
      : [];
    delete schema.pageConfig.footer.content;
    delete schema.pageConfig.footer.style;
  }

  if (!Array.isArray(schema.pages)) {
    return { valid: false, error: "Pages must be an array" };
  }

  return { valid: true };
}
