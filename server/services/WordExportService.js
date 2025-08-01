const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, HeadingLevel } = require('docx');
const fs = require('fs-extra');
const path = require('path');

class WordExportService {
  /**
   * 从HTML内容导出Word文档
   * @param {string} htmlContent - HTML内容
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} Word文档缓冲区
   */
  static async exportFromHTML(htmlContent, options = {}, taskId = 'unknown') {
    try {
      console.log(`[${taskId}] 从HTML生成Word文档...`);
      
      // 简单的HTML到Word转换
      // 这里可以使用更复杂的HTML解析器，如cheerio
      const paragraphs = this.parseHTMLToParagraphs(htmlContent);
      
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
              },
              margin: options.margins || {
                top: 720,    // 1英寸 = 720 twips
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: paragraphs,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      console.log(`[${taskId}] Word文档生成成功，大小: ${buffer.length} bytes`);
      return buffer;

    } catch (error) {
      console.error(`[${taskId}] Word导出失败:`, error);
      throw new Error(`Word导出失败: ${error.message}`);
    }
  }

  /**
   * 从Schema数据导出Word文档
   * @param {Object} schema - 页面Schema数据
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} Word文档缓冲区
   */
  static async exportFromSchema(schema, options = {}, taskId = 'unknown') {
    try {
      console.log(`[${taskId}] 从Schema生成Word文档...`);
      
      if (!schema || !schema.pages) {
        throw new Error('无效的Schema数据');
      }

      const sections = [];

      // 处理每个页面
      schema.pages.forEach((page, pageIndex) => {
        const children = [];

        // 添加页面标题（可选）
        if (options.includePageTitles && page.name) {
          children.push(
            new Paragraph({
              text: page.name,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 240 }, // 12pt spacing after
            })
          );
        }

        // 处理页面组件
        if (page.components && page.components.length > 0) {
          page.components.forEach(component => {
            const componentElements = this.convertComponentToWord(component, options);
            children.push(...componentElements);
          });
        }

        // 添加分页符（除了最后一页）
        if (pageIndex < schema.pages.length - 1) {
          children.push(
            new Paragraph({
              children: [],
              pageBreakBefore: true,
            })
          );
        }

        sections.push({
          properties: {
            page: {
              size: {
                orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
              },
              margin: options.margins || {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: children,
        });
      });

      const doc = new Document({
        sections: sections,
      });

      const buffer = await Packer.toBuffer(doc);
      console.log(`[${taskId}] Word文档生成成功，大小: ${buffer.length} bytes`);
      return buffer;

    } catch (error) {
      console.error(`[${taskId}] 从Schema导出Word失败:`, error);
      throw new Error(`从Schema导出Word失败: ${error.message}`);
    }
  }

  /**
   * 将组件转换为Word元素
   * @param {Object} component - 组件数据
   * @param {Object} options - 转换选项
   * @returns {Array} Word元素数组
   */
  static convertComponentToWord(component, options = {}) {
    if (!component || !component.type) {
      return [];
    }

    const elements = [];

    switch (component.type) {
      case 'text':
        elements.push(...this.convertTextComponent(component));
        break;
      
      case 'image':
        if (options.includeImages !== false) {
          elements.push(...this.convertImageComponent(component));
        }
        break;
      
      case 'layout':
        elements.push(...this.convertLayoutComponent(component, options));
        break;
      
      default:
        // 默认作为文本处理
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: this.stripHTML(component.content || ''),
              }),
            ],
            spacing: { after: 120 }, // 6pt spacing after
          })
        );
        break;
    }

    return elements;
  }

  /**
   * 转换文本组件
   * @param {Object} component - 文本组件
   * @returns {Array} Word段落数组
   */
  static convertTextComponent(component) {
    const content = component.content || '';
    const style = component.style || {};
    
    // 简单处理HTML内容，分割为段落
    const paragraphs = content.split(/<\/p>|<br\s*\/?>|\n/).filter(p => p.trim());
    
    return paragraphs.map(paragraphText => {
      const cleanText = this.stripHTML(paragraphText);
      if (!cleanText.trim()) return null;

      const textRun = new TextRun({
        text: cleanText,
        size: style.fontSize ? style.fontSize * 2 : 24, // Word使用半点单位
        font: style.fontFamily || 'Arial',
        color: style.color ? style.color.replace('#', '') : undefined,
        bold: style.fontWeight === 'bold' || style.fontWeight >= 600,
        italics: style.fontStyle === 'italic',
        underline: style.textDecoration === 'underline' ? {} : undefined,
      });

      return new Paragraph({
        children: [textRun],
        alignment: this.getWordAlignment(style.textAlign),
        spacing: {
          after: 120, // 6pt spacing after
          line: style.lineHeight ? Math.round(style.lineHeight * 240) : undefined,
        },
      });
    }).filter(p => p !== null);
  }

  /**
   * 转换图片组件
   * @param {Object} component - 图片组件
   * @returns {Array} Word段落数组
   */
  static convertImageComponent(component) {
    try {
      // 注意：这里需要处理图片数据
      // 在实际应用中，可能需要下载网络图片或处理base64图片
      const imagePath = component.src || component.content;
      
      if (!imagePath) {
        return [
          new Paragraph({
            children: [
              new TextRun({
                text: '[图片]',
                italics: true,
                color: '666666',
              }),
            ],
            spacing: { after: 120 },
          })
        ];
      }

      // 这里简化处理，实际应用中需要处理图片下载和格式转换
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `[图片: ${imagePath}]`,
              italics: true,
              color: '666666',
            }),
          ],
          spacing: { after: 120 },
        })
      ];

    } catch (error) {
      console.warn('图片处理失败:', error.message);
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: '[图片加载失败]',
              italics: true,
              color: 'FF0000',
            }),
          ],
          spacing: { after: 120 },
        })
      ];
    }
  }

  /**
   * 转换布局组件
   * @param {Object} component - 布局组件
   * @param {Object} options - 转换选项
   * @returns {Array} Word元素数组
   */
  static convertLayoutComponent(component, options = {}) {
    const elements = [];
    
    if (component.children && component.children.length > 0) {
      // 简单处理：将布局组件的子组件依次转换
      component.children.forEach(child => {
        const childElements = this.convertComponentToWord(child, options);
        elements.push(...childElements);
      });
    }

    return elements;
  }

  /**
   * 解析HTML为段落（简化版本）
   * @param {string} htmlContent - HTML内容
   * @returns {Array} Word段落数组
   */
  static parseHTMLToParagraphs(htmlContent) {
    // 移除HTML标签，分割为段落
    const cleanText = this.stripHTML(htmlContent);
    const paragraphs = cleanText.split('\n').filter(p => p.trim());

    return paragraphs.map(text => 
      new Paragraph({
        children: [
          new TextRun({
            text: text.trim(),
          }),
        ],
        spacing: { after: 120 },
      })
    );
  }

  /**
   * 移除HTML标签
   * @param {string} html - HTML字符串
   * @returns {string} 纯文本
   */
  static stripHTML(html) {
    if (typeof html !== 'string') return '';
    return html
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ') // 替换空格实体
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * 获取Word对齐方式
   * @param {string} textAlign - CSS文本对齐
   * @returns {string} Word对齐方式
   */
  static getWordAlignment(textAlign) {
    switch (textAlign) {
      case 'center': return 'center';
      case 'right': return 'right';
      case 'justify': return 'justified';
      default: return 'left';
    }
  }
}

module.exports = WordExportService;
