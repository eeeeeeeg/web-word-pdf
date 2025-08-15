/**
 * 服务端Schema转HTML统一工具类
 * 与前端版本保持一致的转换逻辑
 */

/**
 * Schema转HTML转换器 (服务端版本)
 */
class SchemaToHtmlConverter {
  /**
   * 将完整的Schema转换为HTML文档
   * @param {Object} schema - 页面Schema数据
   * @param {Object} options - 转换选项
   * @returns {string} 完整的HTML文档
   */
  static convertToFullHTML(schema, options = {}) {
    if (!schema || !schema.pages) {
      throw new Error("无效的Schema数据");
    }

    const {
      title = "页面设计导出",
      includeDoctype = true,
      includePageTitles = false,
      customCSS = "",
      environment = "web", // web, pdf, word
    } = options;

    // 生成页面样式
    const pageStyles = this.generatePageStyles(schema.pageConfig, environment);

    // 添加总页数到选项中
    const enhancedOptions = {
      ...options,
      totalPages: schema.pages.length,
    };

    // 生成页面内容
    const pagesHTML = schema.pages
      .map((page, index) =>
        this.generatePageHTML(page, index, schema.pageConfig, enhancedOptions)
      )
      .join("\n");

    const htmlContent = `
      <div class="document-container">
        ${pagesHTML}
      </div>
    `;

    if (!includeDoctype) {
      return htmlContent;
    }

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <style>
        ${pageStyles}
        ${customCSS}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
  }

  /**
   * 生成页面样式
   * @param {Object} pageConfig - 页面配置
   * @param {string} environment - 环境类型 (web, pdf, word)
   * @returns {string} CSS样式
   */
  static generatePageStyles(pageConfig, environment = "web") {
    const { pageSize, margins } = pageConfig;

    // 计算页面尺寸
    const pageWidth =
      pageSize.orientation === "landscape"
        ? Math.max(pageSize.width, pageSize.height)
        : Math.min(pageSize.width, pageSize.height);
    const pageHeight =
      pageSize.orientation === "landscape"
        ? Math.min(pageSize.width, pageSize.height)
        : Math.max(pageSize.width, pageSize.height);

    // 转换边距为像素 (1mm ≈ 3.78px)
    const paddingTop = margins.top * 3.78;
    const paddingRight = margins.right * 3.78;
    const paddingBottom = margins.bottom * 3.78;
    const paddingLeft = margins.left * 3.78;

    // 根据环境调整样式
    const environmentStyles = this.getEnvironmentStyles(environment);

    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            line-height: 1.6;
            font-size: 12pt;
            background: #f5f5f5;
            ${environmentStyles.body}
        }

        .document-container {
            max-width: 100%;
            margin: 0 auto;
            ${environmentStyles.container}
        }

        .page {
            width: ${pageWidth}mm;
            height: ${pageHeight}mm;
            background: white;
            margin: 20px auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-radius: 6px;
            position: relative;
            padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px;
            overflow: hidden;
            ${environmentStyles.page}
            border:1px solid #e0e0e0;
        }

        .page-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            border-bottom: 1px solid #f0f0f0;
            background: transparent;
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            z-index: 10;
        }

        .page-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            border-top: 1px solid #f0f0f0;
            background: transparent;
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            z-index: 10;
        }

        .page-content {
            position: relative;
            height: 100%;
            padding-top: ${
              pageConfig.header?.enabled
                ? Math.round((pageConfig.header.height || 15) * 3.78 * 10) / 10
                : 0
            }px;
            padding-bottom: ${
              pageConfig.footer?.enabled
                ? Math.round((pageConfig.footer.height || 15) * 3.78 * 10) / 10
                : 0
            }px;
            box-sizing: border-box;
            overflow: hidden;
        }

        .component {
            position: absolute;
            box-sizing: border-box;
        }

        .component img {
            max-width: 100%;
            height: auto;
            display: block;
        }

        .layout-component {
            display: flex;
            width: 100%;
            height: 100%;
        }

        .layout-column {
            position: relative;
            box-sizing: border-box;
        }

        /* 自由组件样式 */
        .free-text-component,
        .free-image-component {
            position: absolute;
            box-sizing: border-box;
        }

        .free-text-content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
            overflow: hidden;
            word-wrap: break-word;
            word-break: break-word;
        }

        .free-image-component img {
            display: block;
        }

        .image-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            font-size: 14px;
            background-color: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
        }

        .page-break {
            page-break-before: always;
        }

        ${environmentStyles.additional}
    `;
  }

  /**
   * 根据环境获取特定样式
   * @param {string} environment - 环境类型
   * @returns {Object} 环境特定样式
   */
  static getEnvironmentStyles(environment) {
    switch (environment) {
      case "pdf":
        return {
          body: "background: white; padding: 0;",
          container: "margin: 0;",
          page: "margin: 0; box-shadow: none; border-radius: 0;",
          additional: `
            @media print {
              body { padding: 0; }
              .page { margin: 0; box-shadow: none; page-break-after: always; }
              .page-break { page-break-before: always; }
            }
          `,
        };
      case "word":
        return {
          body: "background: white;",
          container: "",
          page: "margin: 10px auto;",
          additional: `
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .highlight { background-color: yellow; }
            .code {
              font-family: 'Courier New', monospace;
              background-color: #f5f5f5;
              padding: 2px 4px;
            }
          `,
        };
      default: // web
        return {
          body: "",
          container: "",
          page: "",
          additional: `
            @media print {
              .page {
                margin: 0;
                box-shadow: none;
                page-break-after: always;
              }
            }
          `,
        };
    }
  }

  /**
   * 生成单个页面的HTML
   * @param {Object} page - 页面数据
   * @param {number} pageIndex - 页面索引
   * @param {Object} pageConfig - 页面配置
   * @param {Object} options - 转换选项
   * @returns {string} 页面HTML
   */
  static generatePageHTML(page, pageIndex, pageConfig, options = {}) {
    const { includePageTitles = false, includeHeaderFooter = true } = options;

    // 在除第一页之外的每一页之前添加分页符
    let html = "";
    if (pageIndex > 0) {
      html += `<div class="page-break"></div>`;
    }

    // 生成页面背景样式
    let pageBackgroundStyle = "";
    if (page.style) {
      const backgroundStyles = this.generateBackgroundStyles(page.style);
      if (backgroundStyles.length > 0) {
        pageBackgroundStyle = ` style="${backgroundStyles.join("; ")}"`;
      }
    }

    // 生成页眉
    let headerHTML = "";
    if (
      includeHeaderFooter &&
      pageConfig.header?.enabled &&
      pageConfig.header?.components?.length > 0
    ) {
      headerHTML = this.generateHeaderHTML(
        pageConfig.header,
        pageIndex,
        options.totalPages || 1
      );
    }

    // 生成页脚
    let footerHTML = "";
    if (
      includeHeaderFooter &&
      pageConfig.footer?.enabled &&
      pageConfig.footer?.components?.length > 0
    ) {
      footerHTML = this.generateFooterHTML(
        pageConfig.footer,
        pageIndex,
        options.totalPages || 1
      );
    }

    // 生成页面内容
    const contentHTML = page.components
      .map((component) => this.generateComponentHTML(component))
      .join("\n");

    // 添加页面标题（可选）
    let pageTitleHTML = "";
    if (includePageTitles && page.name) {
      pageTitleHTML = `<h1 class="page-title">${this.escapeHtml(
        page.name
      )}</h1>`;
    }

    const pageClass = `page page-${pageIndex + 1}`;

    html += `
      <div class="${pageClass}" data-page="${
      pageIndex + 1
    }"${pageBackgroundStyle}>
        ${headerHTML}
        <div class="page-content">
          ${pageTitleHTML}
          ${contentHTML}
        </div>
        ${footerHTML}
      </div>
    `;

    return html;
  }

  /**
   * 生成背景样式数组
   * @param {Object} style - 样式对象
   * @returns {Array} 背景样式数组
   */
  static generateBackgroundStyles(style) {
    const backgroundStyles = [];

    // 背景色
    if (style.backgroundColor && style.backgroundColor !== "transparent") {
      backgroundStyles.push(`background-color: ${style.backgroundColor}`);
    }

    // 背景图片
    if (style.backgroundImage) {
      backgroundStyles.push(`background-image: url(${style.backgroundImage})`);
      backgroundStyles.push(
        `background-position: ${style.backgroundPosition || "center"}`
      );
      backgroundStyles.push(
        `background-repeat: ${style.backgroundRepeat || "no-repeat"}`
      );

      // 背景尺寸模式
      switch (style.backgroundSize) {
        case "cover":
          backgroundStyles.push("background-size: cover");
          break;
        case "contain":
          backgroundStyles.push("background-size: contain");
          break;
        case "stretch":
          backgroundStyles.push("background-size: 100% 100%");
          break;
        default:
          backgroundStyles.push("background-size: cover");
      }
    }

    return backgroundStyles;
  }

  /**
   * 生成页眉HTML
   * @param {Object} headerConfig - 页眉配置
   * @param {number} pageIndex - 页面索引
   * @param {number} totalPages - 总页数
   * @returns {string} 页眉HTML
   */
  static generateHeaderHTML(headerConfig, pageIndex, totalPages) {
    if (
      !headerConfig.enabled ||
      !headerConfig.components ||
      headerConfig.components.length === 0
    ) {
      return "";
    }

    // 处理页眉组件，替换变量
    const processedComponents = headerConfig.components.map((component) => {
      const processedComponent = JSON.parse(JSON.stringify(component));
      this.replaceVariablesInComponent(
        processedComponent,
        pageIndex + 1,
        totalPages
      );
      return processedComponent;
    });

    const headerComponentsHTML = processedComponents
      .map((component) => this.generateComponentHTML(component, true))
      .join("\n");

    // 生成页眉背景样式
    let headerBackgroundStyle = "background: transparent;";
    if (
      headerConfig.style &&
      headerConfig.style.backgroundColor &&
      headerConfig.style.backgroundColor !== "transparent"
    ) {
      headerBackgroundStyle = `background: ${headerConfig.style.backgroundColor};`;
    }

    return `
      <div class="page-header" style="
        height: ${headerConfig.height * 3.78}px;
        ${headerBackgroundStyle}
      ">
        ${headerComponentsHTML}
      </div>
    `;
  }

  /**
   * 生成页脚HTML
   * @param {Object} footerConfig - 页脚配置
   * @param {number} pageIndex - 页面索引
   * @param {number} totalPages - 总页数
   * @returns {string} 页脚HTML
   */
  static generateFooterHTML(footerConfig, pageIndex, totalPages) {
    if (
      !footerConfig.enabled ||
      !footerConfig.components ||
      footerConfig.components.length === 0
    ) {
      return "";
    }

    // 处理页脚组件，替换变量
    const processedComponents = footerConfig.components.map((component) => {
      const processedComponent = JSON.parse(JSON.stringify(component));
      this.replaceVariablesInComponent(
        processedComponent,
        pageIndex + 1,
        totalPages
      );
      return processedComponent;
    });

    const footerComponentsHTML = processedComponents
      .map((component) => this.generateComponentHTML(component, true))
      .join("\n");

    // 生成页脚背景样式
    let footerBackgroundStyle = "background: transparent;";
    if (
      footerConfig.style &&
      footerConfig.style.backgroundColor &&
      footerConfig.style.backgroundColor !== "transparent"
    ) {
      footerBackgroundStyle = `background: ${footerConfig.style.backgroundColor};`;
    }

    return `
      <div class="page-footer" style="
        height: ${footerConfig.height * 3.78}px;
        ${footerBackgroundStyle}
      ">
        ${footerComponentsHTML}
      </div>
    `;
  }

  /**
   * 替换组件中的变量占位符
   * @param {Object} component - 组件对象
   * @param {number} pageNumber - 当前页码
   * @param {number} totalPages - 总页数
   */
  static replaceVariablesInComponent(component, pageNumber, totalPages) {
    const now = new Date();
    const variables = {
      // 支持双大括号格式
      "{{pageNumber}}": pageNumber.toString(),
      "{{totalPages}}": totalPages.toString(),
      "{{currentDate}}": now.toLocaleDateString("zh-CN"),
      "{{currentTime}}": now.toLocaleTimeString("zh-CN"),
      "{{currentDateTime}}": now.toLocaleString("zh-CN"),
      // 支持单大括号格式（兼容旧版本）
      "{pageNumber}": pageNumber.toString(),
      "{totalPages}": totalPages.toString(),
      "{currentDate}": now.toLocaleDateString("zh-CN"),
      "{currentTime}": now.toLocaleTimeString("zh-CN"),
      "{currentDateTime}": now.toLocaleString("zh-CN"),
      "{date}": now.toLocaleDateString("zh-CN"),
      "{time}": now.toLocaleTimeString("zh-CN"),
    };

    // 替换组件内容中的变量
    if (component.content && typeof component.content === "string") {
      Object.entries(variables).forEach(([placeholder, value]) => {
        component.content = component.content.replace(
          new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
          value
        );
      });
    }

    // 递归处理子组件
    if (component.children && Array.isArray(component.children)) {
      component.children.forEach((child) => {
        this.replaceVariablesInComponent(child, pageNumber, totalPages);
      });
    }
  }

  /**
   * 生成组件HTML
   * @param {Object} component - 组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 组件HTML
   */
  static generateComponentHTML(component, isHeaderFooter = false) {
    if (!component || !component.type) {
      return "";
    }

    switch (component.type) {
      case "layout":
        return this.generateLayoutHTML(component, isHeaderFooter);
      case "text":
        return this.generateTextHTML(component, isHeaderFooter);
      case "image":
        return this.generateImageHTML(component, isHeaderFooter);
      case "free-text":
        return this.generateFreeTextHTML(component, isHeaderFooter);
      case "free-image":
        return this.generateFreeImageHTML(component, isHeaderFooter);
      default:
        return "";
    }
  }

  /**
   * 生成布局组件HTML
   * @param {Object} component - 布局组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 布局组件HTML
   */
  static generateLayoutHTML(component, isHeaderFooter = false) {
    const style = component.style || {};
    const layoutStyle = this.buildLayoutContainerStyle(
      style,
      component,
      isHeaderFooter
    );

    if (component.layoutType === "grid" && component.columns) {
      // 网格布局
      const columnsHTML = component.columns
        .map((column, index) => {
          const columnStyle = this.buildLayoutColumnStyle(
            column,
            isHeaderFooter
          );
          const children = component.children
            ? component.children.filter((child) => child.columnIndex === index)
            : [];
          const childrenHTML = children
            .map((child) => this.generateComponentHTML(child, isHeaderFooter))
            .join("\n");

          return `<div class="layout-column" style="${columnStyle}">${childrenHTML}</div>`;
        })
        .join("\n");

      return `<div class="layout-component" style="${layoutStyle}">${columnsHTML}</div>`;
    }

    // 默认布局
    const childrenHTML = (component.children || [])
      .map((child) => this.generateComponentHTML(child, isHeaderFooter))
      .join("\n");

    return `<div class="layout-component" style="${layoutStyle}">${childrenHTML}</div>`;
  }

  /**
   * 生成文本组件HTML
   * @param {Object} component - 文本组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 文本组件HTML
   */
  static generateTextHTML(component, isHeaderFooter = false) {
    const style = component.style || {};

    // 构建外层容器样式
    const textStyle = this.buildTextContainerStyle(style, isHeaderFooter);

    // 构建内容样式
    const contentStyle = this.buildTextContentStyle(style);

    // 富文本内容不转义HTML标签
    const content = component.content || "";

    return `
      <div class="text-component" style="${textStyle}">
        <div class="text-content" style="${contentStyle}">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * 生成图片组件HTML
   * @param {Object} component - 图片组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 图片组件HTML
   */
  static generateImageHTML(component, isHeaderFooter = false) {
    const style = component.style || {};
    const src = component.content || component.src || "";
    const alt = component.alt || "图片";
    const alignment = component.alignment || "left";

    if (isHeaderFooter) {
      // 页眉页脚中的图片处理
      return this.generateHeaderFooterImageHTML(component);
    }

    // 普通页面中的图片处理
    const containerStyle = this.buildImageContainerStyle(style, alignment);
    const imageStyle = this.buildImageStyle(component);

    if (!src) {
      return `<div class="image-component" style="${containerStyle}">
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #999;">
          暂无图片
        </div>
      </div>`;
    }

    return `<div class="image-component" style="${containerStyle}">
      <img src="${src}" alt="${this.escapeHtml(alt)}" style="${imageStyle}" />
    </div>`;
  }

  /**
   * 生成页眉页脚中的图片HTML
   * @param {Object} component - 图片组件数据
   * @returns {string} 图片HTML
   */
  static generateHeaderFooterImageHTML(component) {
    const style = component.style || {};
    const src = component.content || component.src || "";
    const alt = component.alt || "图片";
    const alignment = component.alignment || "left";

    // 根据对齐方式设置 flexbox 对齐
    let justifyContent = "flex-start";
    if (alignment === "center") {
      justifyContent = "center";
    } else if (alignment === "right") {
      justifyContent = "flex-end";
    }

    const containerStyle = `
      margin: ${style.margin?.top || 0}px ${style.margin?.right || 0}px ${
      style.margin?.bottom || 0
    }px ${style.margin?.left || 0}px;
      padding: ${style.padding?.top || 0}px ${style.padding?.right || 0}px ${
      style.padding?.bottom || 0
    }px ${style.padding?.left || 0}px;
      display: flex;
      justify-content: ${justifyContent};
      align-items: flex-start;
      width: 100%;
    `;

    // 检查是否设置了定高模式
    const useFixedHeight = component.fixedHeight;
    let imageStyle;

    if (useFixedHeight) {
      // 定高模式：设置固定高度，宽度自动，保持纵横比
      imageStyle = `
        height: ${style.height}px;
        width: auto;
        max-height: ${style.height}px;
        max-width: 100%;
        object-fit: contain;
      `;
    } else {
      // 定宽模式：设置固定宽度，高度自动，保持纵横比
      imageStyle = `
        width: ${style.width}px;
        height: auto;
        max-width: ${style.width}px;
        max-height: 100%;
        object-fit: contain;
      `;
    }

    if (!src) {
      return `<div style="${containerStyle}">
        <div style="width: ${style.width}px; height: ${style.height}px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; color: #999;">
          暂无图片
        </div>
      </div>`;
    }

    return `<div style="${containerStyle}">
      <img src="${src}" alt="${this.escapeHtml(alt)}" style="${imageStyle}" />
    </div>`;
  }

  /**
   * 构建文本组件容器样式
   * @param {Object} style - 样式对象
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 样式字符串
   */
  static buildTextContainerStyle(style, isHeaderFooter = false) {
    const styles = [];

    // 位置和尺寸
    if (!isHeaderFooter) {
      if (style.left !== undefined) styles.push(`left: ${style.left}px`);
      if (style.top !== undefined) styles.push(`top: ${style.top}px`);
      if (style.width !== undefined) styles.push(`width: ${style.width}px`);
      if (style.height !== undefined) styles.push(`height: ${style.height}px`);
      styles.push("position: absolute");
    } else {
      // 页眉页脚组件使用相对定位
      if (style.width !== undefined) styles.push(`width: ${style.width}px`);
      if (style.height !== undefined) styles.push(`height: ${style.height}px`);
    }

    // 基础样式
    styles.push("box-sizing: border-box");
    styles.push("display: flex");
    styles.push("align-items: center");
    styles.push("overflow: hidden");

    // 对齐方式 - 在页眉页脚中根据textAlign设置justify-content
    if (isHeaderFooter && style.textAlign) {
      switch (style.textAlign) {
        case "center":
          styles.push("justify-content: center");
          break;
        case "right":
          styles.push("justify-content: flex-end");
          break;
        default:
          styles.push("justify-content: flex-start");
      }
    } else {
      styles.push("justify-content: flex-start");
    }

    // 最小高度
    if (style.minHeight) styles.push(`min-height: ${style.minHeight}px`);

    // 背景样式
    if (style.backgroundColor)
      styles.push(`background-color: ${style.backgroundColor}`);
    if (style.backgroundImage) {
      styles.push(`background-image: url(${style.backgroundImage})`);
      styles.push(
        `background-position: ${style.backgroundPosition || "center"}`
      );
      styles.push(
        `background-repeat: ${style.backgroundRepeat || "no-repeat"}`
      );
      styles.push(`background-size: ${style.backgroundSize || "cover"}`);
    }

    // 边框样式
    if (style.border) styles.push(`border: ${style.border}`);
    if (style.borderRadius)
      styles.push(`border-radius: ${style.borderRadius}px`);

    // 内边距和外边距 - 支持对象格式
    if (style.margin) {
      if (typeof style.margin === "object") {
        const m = style.margin;
        styles.push(
          `margin: ${m.top || 0}px ${m.right || 0}px ${m.bottom || 0}px ${
            m.left || 0
          }px`
        );
      } else {
        styles.push(`margin: ${style.margin}px`);
      }
    }

    if (style.padding) {
      if (typeof style.padding === "object") {
        const p = style.padding;
        styles.push(
          `padding: ${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${
            p.left || 0
          }px`
        );
      } else {
        styles.push(`padding: ${style.padding}px`);
      }
    }

    // 其他样式
    if (style.opacity !== undefined) styles.push(`opacity: ${style.opacity}`);
    if (style.transform) styles.push(`transform: ${style.transform}`);
    if (style.zIndex !== undefined) styles.push(`z-index: ${style.zIndex}`);

    return styles.join("; ");
  }

  /**
   * 构建文本内容样式
   * @param {Object} style - 样式对象
   * @returns {string} 样式字符串
   */
  static buildTextContentStyle(style) {
    const styles = [];

    // 字体样式
    if (style.fontSize) styles.push(`font-size: ${style.fontSize}px`);
    if (style.fontWeight) styles.push(`font-weight: ${style.fontWeight}`);
    if (style.fontFamily) styles.push(`font-family: ${style.fontFamily}`);
    if (style.color) styles.push(`color: ${style.color}`);
    if (style.textAlign) styles.push(`text-align: ${style.textAlign}`);
    if (style.lineHeight) styles.push(`line-height: ${style.lineHeight}`);
    if (style.fontStyle) styles.push(`font-style: ${style.fontStyle}`);
    if (style.textDecoration)
      styles.push(`text-decoration: ${style.textDecoration}`);

    // 基础样式
    styles.push("width: 100%");
    styles.push("min-height: inherit");
    styles.push("word-wrap: break-word");
    styles.push("word-break: break-word");
    styles.push("overflow-wrap: break-word");
    styles.push("background: transparent");
    styles.push("margin: 0");
    styles.push("box-sizing: border-box");

    return styles.join("; ");
  }

  /**
   * 构建组件样式字符串
   * @param {Object} style - 样式对象
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 样式字符串
   */
  static buildComponentStyle(style, isHeaderFooter = false) {
    const styles = [];

    // 位置和尺寸
    if (!isHeaderFooter) {
      if (style.left !== undefined) styles.push(`left: ${style.left}px`);
      if (style.top !== undefined) styles.push(`top: ${style.top}px`);
      if (style.width !== undefined) styles.push(`width: ${style.width}px`);
      if (style.height !== undefined) styles.push(`height: ${style.height}px`);
    } else {
      // 页眉页脚组件使用相对定位
      if (style.width !== undefined) styles.push(`width: ${style.width}px`);
      if (style.height !== undefined) styles.push(`height: ${style.height}px`);
    }

    // 字体样式
    if (style.fontSize) styles.push(`font-size: ${style.fontSize}px`);
    if (style.fontWeight) styles.push(`font-weight: ${style.fontWeight}`);
    if (style.fontFamily) styles.push(`font-family: ${style.fontFamily}`);
    if (style.color) styles.push(`color: ${style.color}`);
    if (style.textAlign) styles.push(`text-align: ${style.textAlign}`);
    if (style.lineHeight) styles.push(`line-height: ${style.lineHeight}`);

    // 背景样式
    if (style.backgroundColor)
      styles.push(`background-color: ${style.backgroundColor}`);
    if (style.backgroundImage) {
      styles.push(`background-image: url(${style.backgroundImage})`);
      styles.push(
        `background-position: ${style.backgroundPosition || "center"}`
      );
      styles.push(
        `background-repeat: ${style.backgroundRepeat || "no-repeat"}`
      );
      styles.push(`background-size: ${style.backgroundSize || "cover"}`);
    }

    // 边框样式
    if (style.border) styles.push(`border: ${style.border}`);
    if (style.borderRadius)
      styles.push(`border-radius: ${style.borderRadius}px`);

    // 内边距和外边距
    if (style.padding) styles.push(`padding: ${style.padding}px`);
    if (style.margin) styles.push(`margin: ${style.margin}px`);

    // 其他样式
    if (style.opacity !== undefined) styles.push(`opacity: ${style.opacity}`);
    if (style.transform) styles.push(`transform: ${style.transform}`);
    if (style.zIndex !== undefined) styles.push(`z-index: ${style.zIndex}`);

    // 布局样式
    if (style.display) styles.push(`display: ${style.display}`);
    if (style.flexDirection)
      styles.push(`flex-direction: ${style.flexDirection}`);
    if (style.justifyContent)
      styles.push(`justify-content: ${style.justifyContent}`);
    if (style.alignItems) styles.push(`align-items: ${style.alignItems}`);

    return styles.join("; ");
  }

  /**
   * 构建图片容器样式
   * @param {Object} style - 样式对象
   * @param {string} alignment - 对齐方式
   * @returns {string} 样式字符串
   */
  static buildImageContainerStyle(style, alignment = "left") {
    const styles = [];

    // 位置和尺寸
    if (style.left !== undefined) styles.push(`left: ${style.left}px`);
    if (style.top !== undefined) styles.push(`top: ${style.top}px`);
    if (style.width !== undefined) styles.push(`width: ${style.width}px`);
    if (style.height !== undefined) styles.push(`height: ${style.height}px`);
    styles.push("position: absolute");

    // 基础样式
    styles.push("box-sizing: border-box");
    styles.push("display: flex");
    styles.push("overflow: hidden");

    // 对齐方式
    if (alignment === "center") {
      styles.push("justify-content: center");
      styles.push("align-items: center");
    } else if (alignment === "right") {
      styles.push("justify-content: flex-end");
      styles.push("align-items: center");
    } else {
      styles.push("justify-content: flex-start");
      styles.push("align-items: center");
    }

    // 背景样式
    if (style.backgroundColor)
      styles.push(`background-color: ${style.backgroundColor}`);
    if (style.backgroundImage) {
      styles.push(`background-image: url(${style.backgroundImage})`);
      styles.push(
        `background-position: ${style.backgroundPosition || "center"}`
      );
      styles.push(
        `background-repeat: ${style.backgroundRepeat || "no-repeat"}`
      );
      styles.push(`background-size: ${style.backgroundSize || "cover"}`);
    }

    // 边框样式
    if (style.border) styles.push(`border: ${style.border}`);
    if (style.borderRadius)
      styles.push(`border-radius: ${style.borderRadius}px`);

    // 内边距和外边距 - 支持对象格式
    if (style.margin) {
      if (typeof style.margin === "object") {
        const m = style.margin;
        styles.push(
          `margin: ${m.top || 0}px ${m.right || 0}px ${m.bottom || 0}px ${
            m.left || 0
          }px`
        );
      } else {
        styles.push(`margin: ${style.margin}px`);
      }
    }

    if (style.padding) {
      if (typeof style.padding === "object") {
        const p = style.padding;
        styles.push(
          `padding: ${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${
            p.left || 0
          }px`
        );
      } else {
        styles.push(`padding: ${style.padding}px`);
      }
    }

    // 其他样式
    if (style.opacity !== undefined) styles.push(`opacity: ${style.opacity}`);
    if (style.transform) styles.push(`transform: ${style.transform}`);
    if (style.zIndex !== undefined) styles.push(`z-index: ${style.zIndex}`);

    return styles.join("; ");
  }

  /**
   * 构建图片样式
   * @param {Object} component - 图片组件数据
   * @returns {string} 样式字符串
   */
  static buildImageStyle(component) {
    const style = component.style || {};
    const styles = [];

    // 检查是否设置了定高模式
    const useFixedHeight = component.fixedHeight;

    if (useFixedHeight) {
      // 定高模式：设置固定高度，宽度自动，保持纵横比
      styles.push(`height: ${style.height}px`);
      styles.push("width: auto");
      styles.push(`max-height: ${style.height}px`);
      styles.push("max-width: 100%");
    } else {
      // 定宽模式：设置固定宽度，高度自动，保持纵横比
      styles.push(`width: ${style.width}px`);
      styles.push("height: auto");
      styles.push(`max-width: ${style.width}px`);
      styles.push("max-height: 100%");
    }

    // 对象适配方式
    const objectFit = style.objectFit || "contain";
    styles.push(`object-fit: ${objectFit}`);
    styles.push("display: block");

    // 边框圆角
    if (style.borderRadius)
      styles.push(`border-radius: ${style.borderRadius}px`);

    // 边框
    if (style.border) styles.push(`border: ${style.border}`);

    return styles.join("; ");
  }

  /**
   * 构建布局容器样式
   * @param {Object} style - 样式对象
   * @param {Object} component - 布局组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 样式字符串
   */
  static buildLayoutContainerStyle(style, component, isHeaderFooter = false) {
    const styles = [];

    // 位置和尺寸
    if (!isHeaderFooter) {
      if (style.left !== undefined) styles.push(`left: ${style.left}px`);
      if (style.top !== undefined) styles.push(`top: ${style.top}px`);
      if (style.width !== undefined) styles.push(`width: ${style.width}px`);
      if (style.height !== undefined) styles.push(`height: ${style.height}px`);
      styles.push("position: absolute");
    } else {
      // 页眉页脚组件使用相对定位
      if (style.width !== undefined) styles.push(`width: ${style.width}px`);
      if (style.height !== undefined) styles.push(`height: ${style.height}px`);
      styles.push("width: 100%");
    }

    // 基础布局样式
    styles.push("box-sizing: border-box");
    styles.push("display: flex");

    // 垂直对齐方式
    const verticalAlignment = component.verticalAlignment || "stretch";
    styles.push(`align-items: ${verticalAlignment}`);

    // 水平对齐方式 - 基于component.alignment
    const alignment = component.alignment || "flex-start";
    styles.push(`justify-content: ${alignment}`);

    // 最小高度
    if (style.minHeight) {
      styles.push(`min-height: ${style.minHeight}px`);
    } else if (isHeaderFooter) {
      styles.push("min-height: 60px");
    }

    // 间距
    if (isHeaderFooter) {
      styles.push("gap: 8px");
    }

    // 内边距和外边距 - 支持对象格式
    if (style.margin) {
      if (typeof style.margin === "object") {
        const m = style.margin;
        styles.push(
          `margin: ${m.top || 0}px ${m.right || 0}px ${m.bottom || 0}px ${
            m.left || 0
          }px`
        );
      } else {
        styles.push(`margin: ${style.margin}px`);
      }
    }

    if (style.padding) {
      if (typeof style.padding === "object") {
        const p = style.padding;
        styles.push(
          `padding: ${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${
            p.left || 0
          }px`
        );
      } else {
        styles.push(`padding: ${style.padding}px`);
      }
    }

    // 背景样式
    if (style.backgroundColor)
      styles.push(`background-color: ${style.backgroundColor}`);
    if (style.backgroundImage) {
      styles.push(`background-image: url(${style.backgroundImage})`);
      styles.push(
        `background-position: ${style.backgroundPosition || "center"}`
      );
      styles.push(
        `background-repeat: ${style.backgroundRepeat || "no-repeat"}`
      );
      styles.push(`background-size: ${style.backgroundSize || "cover"}`);
    }

    // 边框样式
    if (style.border) styles.push(`border: ${style.border}`);
    if (style.borderRadius)
      styles.push(`border-radius: ${style.borderRadius}px`);

    // 其他样式
    if (style.opacity !== undefined) styles.push(`opacity: ${style.opacity}`);
    if (style.transform) styles.push(`transform: ${style.transform}`);
    if (style.zIndex !== undefined) styles.push(`z-index: ${style.zIndex}`);

    return styles.join("; ");
  }

  /**
   * 构建布局列样式
   * @param {Object} column - 列配置
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 样式字符串
   */
  static buildLayoutColumnStyle(column, isHeaderFooter = false) {
    const styles = [];

    // 列宽度
    styles.push(`flex: 0 0 ${column.width}%`);

    // 基础样式
    styles.push("position: relative");
    styles.push("box-sizing: border-box");

    if (isHeaderFooter) {
      styles.push("padding: 8px");
      styles.push("min-height: auto");
    } else {
      styles.push("padding: 8px");
      styles.push("min-height: 60px");
    }

    return styles.join("; ");
  }

  /**
   * 生成自由文本组件HTML
   * @param {Object} component - 自由文本组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 自由文本组件HTML
   */
  static generateFreeTextHTML(component, isHeaderFooter = false) {
    const style = component.style || {};

    // 构建容器样式
    const containerStyle = this.buildFreeComponentContainerStyle(
      component,
      isHeaderFooter
    );

    // 构建文本内容样式
    const textStyle = this.buildFreeTextContentStyle(style);

    // 处理文本内容，支持换行
    const content = component.content || "请输入文本内容";

    return `
      <div class="free-text-component" style="${containerStyle}">
        <div class="free-text-content text-display" style="${textStyle}">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * 生成自由图片组件HTML
   * @param {Object} component - 自由图片组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 自由图片组件HTML
   */
  static generateFreeImageHTML(component, isHeaderFooter = false) {
    const style = component.style || {};

    // 构建容器样式
    const containerStyle = this.buildFreeComponentContainerStyle(
      component,
      isHeaderFooter
    );

    // 构建图片样式
    const imageStyle = this.buildFreeImageStyle(
      style,
      component.keepAspectRatio
    );

    // 如果没有图片源，显示占位符
    if (!component.src) {
      return `
        <div class="free-image-component" style="${containerStyle}">
          <div class="image-placeholder" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px;">
            <span style="color: #6c757d; font-size: 14px;">图片占位符</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="free-image-component" style="${containerStyle}">
        <img src="${this.escapeHtml(component.src)}"
             alt="${this.escapeHtml(component.alt || "")}"
             style="${imageStyle}" />
      </div>
    `;
  }

  /**
   * 构建自由组件容器样式
   * @param {Object} component - 组件数据
   * @param {boolean} isHeaderFooter - 是否为页眉页脚组件
   * @returns {string} 容器样式字符串
   */
  static buildFreeComponentContainerStyle(component, isHeaderFooter = false) {
    const style = component.style || {};
    const transform = component.transform || {};

    // isHeaderFooter参数保留用于未来扩展，目前自由组件在页眉页脚中的样式与普通页面相同

    const x = transform.x || 0;
    const y = transform.y || 0;
    const rotation = transform.rotation || 0;
    const scaleX = transform.scaleX || 1;
    const scaleY = transform.scaleY || 1;
    const width = style.width || 200;
    const height = style.height || 100;
    const zIndex = component.zIndex || 1;

    const transformValue = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;

    return [
      "position: absolute",
      "left: 0px",
      "top: 0px",
      `width: ${width}px`,
      `height: ${height}px`,
      `transform: ${transformValue}`,
      "transform-origin: center center",
      `z-index: ${zIndex}`,
      `background-color: ${style.backgroundColor || "transparent"}`,
      `border-radius: ${style.borderRadius || 0}px`,
    ].join("; ");
  }

  /**
   * 构建自由文本内容样式
   * @param {Object} style - 样式对象
   * @returns {string} 文本内容样式字符串
   */
  static buildFreeTextContentStyle(style) {
    return [
      `font-size: ${style.fontSize || 14}px`,
      `font-family: ${style.fontFamily || "Arial"}`,
      `color: ${style.color || "#333333"}`,
      `line-height: ${style.lineHeight || 1.5}`,
      `text-align: ${style.textAlign || "left"}`,
      `font-weight: ${style.fontWeight || "normal"}`,
      `font-style: ${style.fontStyle || "normal"}`,
      `text-decoration: ${style.textDecoration || "none"}`,
      "width: 100%",
      "height: 100%",
      "display: block",
      "white-space: normal;",
      "padding: 8px",
      "box-sizing: border-box",
      "overflow: hidden",
    ].join("; ");
  }

  /**
   * 构建自由图片样式
   * @param {Object} style - 样式对象
   * @param {boolean} keepAspectRatio - 是否保持纵横比
   * @returns {string} 图片样式字符串
   */
  static buildFreeImageStyle(style, keepAspectRatio = true) {
    const baseStyles = [
      `object-fit: ${style.objectFit || "cover"}`,
      `border-radius: ${style.borderRadius || 0}px`,
      `border: ${style.border || "none"}`,
    ];

    if (keepAspectRatio) {
      baseStyles.push(
        "max-width: 100%",
        "max-height: 100%",
        "width: auto",
        "height: auto"
      );
    } else {
      baseStyles.push("width: 100%", "height: 100%");
    }

    return baseStyles.join("; ");
  }

  /**
   * HTML转义
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  static escapeHtml(text) {
    if (typeof text !== "string") return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

module.exports = SchemaToHtmlConverter;
