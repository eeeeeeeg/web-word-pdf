const { chromium } = require("playwright");
const fs = require("fs-extra");
const path = require("path");
const SchemaToHtmlConverter = require("../utils/schemaToHtml");

class PDFExportService {
  /**
   * 从HTML内容导出PDF
   * @param {string} htmlContent - HTML内容
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} PDF文件缓冲区
   */
  static async exportToPDF(htmlContent, options = {}, taskId = "unknown") {
    let browser = null;
    let page = null;

    try {
      console.log(`[${taskId}] 启动浏览器...`);

      // 启动浏览器
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      page = await browser.newPage();

      // 设置视口
      await page.setViewportSize({
        width: options.viewportWidth || 1200,
        height: options.viewportHeight || 800,
      });

      console.log(`[${taskId}] 加载HTML内容...`);

      // 处理HTML内容，确保包含完整的文档结构
      const fullHtml = this.wrapHTMLContent(htmlContent, options);

      // 加载HTML内容
      await page.setContent(fullHtml, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      // 等待字体加载
      await page.waitForTimeout(1000);

      console.log(`[${taskId}] 生成PDF...`);

      // PDF生成选项
      const pdfOptions = {
        landscape: options.orientation === "landscape",
        margin: options.margin || {
          top: "1cm",
          right: "1cm",
          bottom: "1cm",
          left: "1cm",
        },
        printBackground: this.parseBoolean(options.printBackground, true),
        displayHeaderFooter: this.parseBoolean(
          options.displayHeaderFooter,
          false
        ),
        headerTemplate: options.headerTemplate || "",
        footerTemplate: options.footerTemplate || "",
        scale: parseFloat(options.scale) || 1,
        preferCSSPageSize: this.parseBoolean(options.preferCSSPageSize, false),
      };

      // 处理页面格式 - 支持标准格式和自定义尺寸
      const formatResult = this.handlePageFormat(
        options.format || "A4",
        options
      );
      Object.assign(pdfOptions, formatResult);

      // 生成PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      console.log(`[${taskId}] PDF生成成功，大小: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error(`[${taskId}] PDF导出失败:`, error);
      throw new Error(`PDF导出失败: ${error.message}`);
    } finally {
      // 清理资源
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.warn(`[${taskId}] 关闭页面失败:`, e.message);
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.warn(`[${taskId}] 关闭浏览器失败:`, e.message);
        }
      }
    }
  }

  /**
   * 从Schema数据导出PDF
   * @param {Object} schema - 页面Schema数据
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} PDF文件缓冲区
   */
  static async exportFromSchema(schema, options = {}, taskId = "unknown") {
    try {
      console.log(`[${taskId}] 从Schema生成HTML...`);

      // 将Schema转换为HTML
      const htmlContent = this.convertSchemaToHTML(schema, options);

      // 导出PDF
      return await this.exportToPDF(htmlContent, options, taskId);
    } catch (error) {
      console.error(`[${taskId}] 从Schema导出PDF失败:`, error);
      throw new Error(`从Schema导出PDF失败: ${error.message}`);
    }
  }

  /**
   * 包装HTML内容，确保完整的文档结构
   * @param {string} htmlContent - 原始HTML内容
   * @param {Object} options - 选项
   * @returns {string} 完整的HTML文档
   */
  static wrapHTMLContent(htmlContent, options = {}) {
    // 检查是否已经是完整的HTML文档
    if (htmlContent.includes("<!DOCTYPE") || htmlContent.includes("<html")) {
      return htmlContent;
    }

    // 基础样式
    const baseStyles = `
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        .page {
          max-width: 100%;
          margin: 0 auto;
          background: white;
          min-height: 100vh;
          position: relative;
        }
        .page[style*="background"] {
          background: white; /* 默认背景，会被内联样式覆盖 */
        }
        .component {
          margin-bottom: 16px;
        }
        .text-component {
          word-wrap: break-word;
        }
        .image-component img {
          max-width: 100%;
          height: auto;
        }
        .layout-component {
          display: flex;
          gap: 16px;
        }
        .layout-column {
          flex: 1;
        }
        @media print {
          body {
            padding: 0;
          }
          /* 移除 .page 的 page-break-after 样式 */
          .page-break { /* 新增的 page-break 样式 */
            page-break-before: always;
          }
        }
        ${options.customCSS || ""}
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.title || "Document"}</title>
        ${baseStyles}
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
  }

  /**
   * 将Schema数据转换为HTML
   * @param {Object} schema - Schema数据
   * @param {Object} options - 转换选项
   * @returns {string} HTML内容
   */
  static convertSchemaToHTML(schema, options = {}) {
    // 使用统一的转换器，设置为PDF环境
    return SchemaToHtmlConverter.convertToFullHTML(schema, {
      ...options,
      environment: "pdf",
      includeDoctype: false, // PDF导出不需要完整的HTML文档结构
    });
  }

  /**
   * 处理页面格式 - 支持标准格式和自定义尺寸
   * @param {string} format - 页面格式
   * @param {Object} options - 导出选项
   * @returns {Object} 格式配置对象
   */
  static handlePageFormat(format, options = {}) {
    // // 标准Puppeteer支持的格式
    // const standardFormats = [
    //   "A0",
    //   "A1",
    //   "A2",
    //   "A3",
    //   "A4",
    //   "A5",
    //   "A6",
    //   "Letter",
    //   "Legal",
    //   "Tabloid",
    //   "Ledger",
    // ];

    // // 如果是标准格式，直接使用
    // if (standardFormats.includes(format)) {
    //   return { format: format };
    // }

    // 统一的mm转px转换系数 (96dpi标准)
    const MM_TO_PX = 3.7795275591; // 96/25.4

    // 标准页面尺寸定义 (毫米)
    const standardSizes = {
      A4: { width: 221, height: 308 },
      A3: { width: 298, height: 421 },
      A5: { width: 149, height: 211 },
      Letter: { width: 216.9, height: 280.4 },
      Legal: { width: 216.9, height: 356.6 },
      PPT_16_9: { width: 255, height: 144 },
      PPT_4_3: { width: 255, height: 191 },
    };

    // 自定义格式映射 - 使用统一算法计算所有尺寸
    const customFormats = {};

    // 为所有标准格式生成精确的mm和px格式
    Object.keys(standardSizes).forEach((formatName) => {
      const size = standardSizes[formatName];
      customFormats[formatName] = {
        width: `${size.width}mm`,
        height: `${size.height}mm`,
        // 同时提供像素值供参考
        widthPx: Math.round(size.width * MM_TO_PX),
        heightPx: Math.round(size.height * MM_TO_PX),
      };
    });

    // 添加自定义格式支持
    customFormats.Custom = null; // 自定义格式需要通过options传递尺寸

    // 调试信息：输出所有支持的格式
    console.log(
      "PDF导出支持的页面格式:",
      Object.keys(customFormats).filter((key) => key !== "Custom")
    );

    // 如果是已知的自定义格式
    if (customFormats[format]) {
      console.log(`使用格式 ${format}:`, customFormats[format]);
      return customFormats[format];
    }

    // 如果提供了自定义尺寸
    if (options.width && options.height) {
      const unit = options.unit || "mm";

      // 使用统一的转换算法处理自定义尺寸
      let widthMm, heightMm;

      if (unit === "px") {
        // px转mm
        widthMm = options.width / MM_TO_PX;
        heightMm = options.height / MM_TO_PX;
      } else {
        // 默认为mm或其他单位直接使用
        widthMm = parseFloat(options.width);
        heightMm = parseFloat(options.height);
      }

      const customSize = {
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        widthPx: Math.round(widthMm * MM_TO_PX),
        heightPx: Math.round(heightMm * MM_TO_PX),
        unit: unit,
        original: { width: options.width, height: options.height },
      };

      console.log(`使用自定义尺寸:`, customSize);
      return customSize;
    }

    // 默认使用A4
    console.warn(`未知的页面格式: ${format}，使用默认A4格式`);
    return { format: "A4" };
  }

  /**
   * 格式化尺寸，确保包含正确的单位
   * @param {number|string} dimension - 尺寸值
   * @param {string} unit - 单位 ('mm', 'px', 'in', 'cm')
   * @returns {string} 格式化后的尺寸字符串
   */
  formatDimension(dimension, unit = "mm") {
    // 如果已经是字符串且包含单位，直接返回
    if (
      typeof dimension === "string" &&
      /\d+(mm|px|in|cm|pt)$/.test(dimension)
    ) {
      return dimension;
    }

    // 如果是数字，添加单位
    if (typeof dimension === "number") {
      return `${dimension}${unit}`;
    }

    // 如果是字符串数字，添加单位
    const numValue = parseFloat(dimension);
    if (!isNaN(numValue)) {
      return `${numValue}${unit}`;
    }

    // 默认返回原值
    return dimension;
  }

  /**
   * 解析布尔值，处理字符串形式的布尔值
   * @param {any} value - 要解析的值
   * @param {boolean} defaultValue - 默认值
   * @returns {boolean} 解析后的布尔值
   */
  static parseBoolean(value, defaultValue = false) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return defaultValue;
  }
}

module.exports = PDFExportService;
