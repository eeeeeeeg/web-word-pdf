const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');

class PDFExportService {
  /**
   * 从HTML内容导出PDF
   * @param {string} htmlContent - HTML内容
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} PDF文件缓冲区
   */
  static async exportToPDF(htmlContent, options = {}, taskId = 'unknown') {
    let browser = null;
    let page = null;

    try {
      console.log(`[${taskId}] 启动浏览器...`);
      
      // 启动浏览器
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      page = await browser.newPage();

      // 设置视口
      await page.setViewportSize({
        width: options.viewportWidth || 1200,
        height: options.viewportHeight || 800
      });

      console.log(`[${taskId}] 加载HTML内容...`);

      // 处理HTML内容，确保包含完整的文档结构
      const fullHtml = this.wrapHTMLContent(htmlContent, options);

      // 加载HTML内容
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待字体加载
      await page.waitForTimeout(1000);

      console.log(`[${taskId}] 生成PDF...`);

      // PDF生成选项
      const pdfOptions = {
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        margin: options.margin || {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        printBackground: options.printBackground !== false,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
        scale: options.scale || 1,
        preferCSSPageSize: options.preferCSSPageSize || false
      };

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
  static async exportFromSchema(schema, options = {}, taskId = 'unknown') {
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
    if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
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
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: auto;
          }
        }
        ${options.customCSS || ''}
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.title || 'Document'}</title>
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
    if (!schema || !schema.pages) {
      throw new Error('无效的Schema数据');
    }

    let html = '';

    // 处理每个页面
    schema.pages.forEach((page, pageIndex) => {
      html += `<div class="page" data-page="${pageIndex + 1}">`;
      
      // 添加页面标题（可选）
      if (options.includePageTitles && page.name) {
        html += `<h1 class="page-title">${this.escapeHtml(page.name)}</h1>`;
      }

      // 处理页面组件
      if (page.components && page.components.length > 0) {
        page.components.forEach(component => {
          html += this.convertComponentToHTML(component);
        });
      }

      html += '</div>';
    });

    return html;
  }

  /**
   * 将组件转换为HTML
   * @param {Object} component - 组件数据
   * @returns {string} HTML内容
   */
  static convertComponentToHTML(component) {
    if (!component || !component.type) {
      return '';
    }

    const style = this.buildComponentStyle(component.style || {});
    const className = `component ${component.type}-component`;

    switch (component.type) {
      case 'text':
        return `<div class="${className}" style="${style}">${component.content || ''}</div>`;
      
      case 'image':
        const imgSrc = component.src || component.content || '';
        const imgAlt = component.alt || 'Image';
        return `<div class="${className}" style="${style}"><img src="${imgSrc}" alt="${this.escapeHtml(imgAlt)}" /></div>`;
      
      case 'layout':
        let layoutHtml = `<div class="${className}" style="${style}">`;
        if (component.children && component.children.length > 0) {
          component.children.forEach(child => {
            layoutHtml += `<div class="layout-column">${this.convertComponentToHTML(child)}</div>`;
          });
        }
        layoutHtml += '</div>';
        return layoutHtml;
      
      default:
        return `<div class="${className}" style="${style}">${component.content || ''}</div>`;
    }
  }

  /**
   * 构建组件样式字符串
   * @param {Object} style - 样式对象
   * @returns {string} CSS样式字符串
   */
  static buildComponentStyle(style) {
    const styles = [];

    if (style.fontSize) styles.push(`font-size: ${style.fontSize}px`);
    if (style.fontFamily) styles.push(`font-family: ${style.fontFamily}`);
    if (style.color) styles.push(`color: ${style.color}`);
    if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
    if (style.textAlign) styles.push(`text-align: ${style.textAlign}`);
    if (style.lineHeight) styles.push(`line-height: ${style.lineHeight}`);
    if (style.fontWeight) styles.push(`font-weight: ${style.fontWeight}`);
    if (style.fontStyle) styles.push(`font-style: ${style.fontStyle}`);
    if (style.textDecoration) styles.push(`text-decoration: ${style.textDecoration}`);

    // 处理边距和内边距
    if (style.margin) {
      const m = style.margin;
      styles.push(`margin: ${m.top || 0}px ${m.right || 0}px ${m.bottom || 0}px ${m.left || 0}px`);
    }
    if (style.padding) {
      const p = style.padding;
      styles.push(`padding: ${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`);
    }

    return styles.join('; ');
  }

  /**
   * HTML转义
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  static escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = PDFExportService;
