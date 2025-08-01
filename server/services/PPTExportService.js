const PptxGenJS = require('pptxgenjs');
const fs = require('fs-extra');
const path = require('path');

class PPTExportService {
  /**
   * 从Schema数据导出PPT演示文稿
   * @param {Object} schema - 页面Schema数据
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} PPT文件缓冲区
   */
  static async exportFromSchema(schema, options = {}, taskId = 'unknown') {
    try {
      console.log(`[${taskId}] 从Schema生成PPT演示文稿...`);
      
      if (!schema || !schema.pages) {
        throw new Error('无效的Schema数据');
      }

      // 创建PPT实例
      const pptx = new PptxGenJS();

      // 设置演示文稿属性
      pptx.author = options.author || 'Web Word PDF';
      pptx.company = options.company || 'Web Word PDF';
      pptx.title = options.title || '演示文稿';
      pptx.subject = options.subject || '由Web Word PDF生成';

      // 设置幻灯片尺寸
      const slideSize = options.slideSize || 'LAYOUT_16x9';
      pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });

      // 处理每个页面作为幻灯片
      schema.pages.forEach((page, pageIndex) => {
        this.convertPageToSlide(pptx, page, pageIndex, options);
      });

      // 生成PPT文件
      const pptBuffer = await pptx.write('nodebuffer');
      
      console.log(`[${taskId}] PPT演示文稿生成成功，大小: ${pptBuffer.length} bytes`);
      return pptBuffer;

    } catch (error) {
      console.error(`[${taskId}] PPT导出失败:`, error);
      throw new Error(`PPT导出失败: ${error.message}`);
    }
  }

  /**
   * 将页面转换为幻灯片
   * @param {PptxGenJS} pptx - PPT实例
   * @param {Object} page - 页面数据
   * @param {number} pageIndex - 页面索引
   * @param {Object} options - 转换选项
   */
  static convertPageToSlide(pptx, page, pageIndex, options = {}) {
    const slide = pptx.addSlide();

    // 设置幻灯片背景
    if (options.backgroundColor) {
      slide.background = { color: options.backgroundColor };
    }

    // 添加页面标题（如果启用）
    let currentY = 0.5;
    if (options.includePageTitles && page.name) {
      slide.addText(page.name, {
        x: 0.5,
        y: currentY,
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: '333333',
        align: 'center'
      });
      currentY += 1.2;
    }

    // 处理页面组件
    if (page.components && page.components.length > 0) {
      page.components.forEach((component, componentIndex) => {
        const elementHeight = this.addComponentToSlide(slide, component, currentY, options);
        currentY += elementHeight + 0.2; // 组件间距
      });
    }

    // 添加页码（如果启用）
    if (options.includePageNumbers) {
      slide.addText(`${pageIndex + 1}`, {
        x: 9,
        y: 5,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: '666666',
        align: 'right'
      });
    }
  }

  /**
   * 将组件添加到幻灯片
   * @param {Object} slide - 幻灯片对象
   * @param {Object} component - 组件数据
   * @param {number} y - Y坐标
   * @param {Object} options - 选项
   * @returns {number} 组件高度
   */
  static addComponentToSlide(slide, component, y, options = {}) {
    if (!component || !component.type) {
      return 0;
    }

    switch (component.type) {
      case 'text':
        return this.addTextComponent(slide, component, y);
      
      case 'image':
        if (options.includeImages !== false) {
          return this.addImageComponent(slide, component, y);
        }
        return 0;
      
      case 'layout':
        return this.addLayoutComponent(slide, component, y, options);
      
      default:
        // 默认作为文本处理
        return this.addTextComponent(slide, component, y);
    }
  }

  /**
   * 添加文本组件到幻灯片
   * @param {Object} slide - 幻灯片对象
   * @param {Object} component - 文本组件
   * @param {number} y - Y坐标
   * @returns {number} 组件高度
   */
  static addTextComponent(slide, component, y) {
    const content = component.content || '';
    const style = component.style || {};
    
    // 清理HTML内容
    const cleanText = this.stripHTML(content);
    
    if (!cleanText.trim()) {
      return 0;
    }

    // 估算文本高度
    const lineCount = Math.ceil(cleanText.length / 80); // 粗略估算
    const fontSize = style.fontSize || 14;
    const height = Math.max(0.4, (lineCount * fontSize * 0.02));

    // 添加文本到幻灯片
    slide.addText(cleanText, {
      x: 0.5,
      y: y,
      w: 9,
      h: height,
      fontSize: fontSize,
      fontFace: style.fontFamily || 'Arial',
      color: style.color ? style.color.replace('#', '') : '333333',
      bold: style.fontWeight === 'bold' || style.fontWeight >= 600,
      italic: style.fontStyle === 'italic',
      underline: style.textDecoration === 'underline',
      align: this.getPPTAlignment(style.textAlign),
      valign: 'top',
      lineSpacing: style.lineHeight ? Math.round(style.lineHeight * 100) : undefined,
    });

    return height;
  }

  /**
   * 添加图片组件到幻灯片
   * @param {Object} slide - 幻灯片对象
   * @param {Object} component - 图片组件
   * @param {number} y - Y坐标
   * @returns {number} 组件高度
   */
  static addImageComponent(slide, component, y) {
    try {
      const imagePath = component.src || component.content;
      
      if (!imagePath) {
        // 添加占位符文本
        slide.addText('[图片]', {
          x: 0.5,
          y: y,
          w: 9,
          h: 0.4,
          fontSize: 12,
          color: '666666',
          italic: true,
          align: 'center'
        });
        return 0.4;
      }

      // 简化处理：添加图片占位符
      // 在实际应用中，需要处理图片下载和格式转换
      slide.addText(`[图片: ${imagePath}]`, {
        x: 0.5,
        y: y,
        w: 9,
        h: 0.6,
        fontSize: 12,
        color: '666666',
        italic: true,
        align: 'center'
      });

      return 0.6;

    } catch (error) {
      console.warn('PPT图片处理失败:', error.message);
      
      // 添加错误占位符
      slide.addText('[图片加载失败]', {
        x: 0.5,
        y: y,
        w: 9,
        h: 0.4,
        fontSize: 12,
        color: 'FF0000',
        italic: true,
        align: 'center'
      });

      return 0.4;
    }
  }

  /**
   * 添加布局组件到幻灯片
   * @param {Object} slide - 幻灯片对象
   * @param {Object} component - 布局组件
   * @param {number} y - Y坐标
   * @param {Object} options - 选项
   * @returns {number} 组件高度
   */
  static addLayoutComponent(slide, component, y, options = {}) {
    if (!component.children || component.children.length === 0) {
      return 0;
    }

    const columnCount = component.children.length;
    const columnWidth = 9 / columnCount;
    let maxHeight = 0;

    // 处理每一列
    component.children.forEach((child, columnIndex) => {
      const x = 0.5 + (columnIndex * columnWidth);
      
      // 临时创建一个子幻灯片来计算高度
      const tempSlide = { addText: () => {} };
      const childHeight = this.addComponentToSlide(tempSlide, child, 0, options);
      
      // 实际添加到幻灯片
      this.addComponentToSlideAtPosition(slide, child, x, y, columnWidth - 0.1, options);
      
      maxHeight = Math.max(maxHeight, childHeight);
    });

    return maxHeight;
  }

  /**
   * 在指定位置添加组件到幻灯片
   * @param {Object} slide - 幻灯片对象
   * @param {Object} component - 组件数据
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {Object} options - 选项
   */
  static addComponentToSlideAtPosition(slide, component, x, y, width, options = {}) {
    if (component.type === 'text') {
      const content = this.stripHTML(component.content || '');
      const style = component.style || {};
      
      if (content.trim()) {
        slide.addText(content, {
          x: x,
          y: y,
          w: width,
          h: 0.8,
          fontSize: style.fontSize || 14,
          fontFace: style.fontFamily || 'Arial',
          color: style.color ? style.color.replace('#', '') : '333333',
          bold: style.fontWeight === 'bold' || style.fontWeight >= 600,
          italic: style.fontStyle === 'italic',
          align: this.getPPTAlignment(style.textAlign),
          valign: 'top',
        });
      }
    }
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
   * 获取PPT对齐方式
   * @param {string} textAlign - CSS文本对齐
   * @returns {string} PPT对齐方式
   */
  static getPPTAlignment(textAlign) {
    switch (textAlign) {
      case 'center': return 'center';
      case 'right': return 'right';
      case 'justify': return 'justify';
      default: return 'left';
    }
  }
}

module.exports = PPTExportService;
