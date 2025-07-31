// 导出管理工具

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * PDF 导出管理器
 */
export class PDFExportManager {
  /**
   * 将页面导出为 PDF
   */
  static async exportToPDF(element, options = {}) {
    const {
      filename = "page-export.pdf",
      format = "a4",
      orientation = "portrait",
      margin = 10,
      quality = 1,
    } = options;

    try {
      // 使用 html2canvas 将 DOM 转换为图片
      const canvas = await html2canvas(element, {
        scale: quality,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // 创建 PDF 文档
      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: format,
      });

      // 获取 PDF 页面尺寸
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // 计算图片在 PDF 中的尺寸
      const imgWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 如果图片高度超过页面高度，需要分页
      if (imgHeight <= pdfHeight - margin * 2) {
        // 单页
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          margin,
          margin,
          imgWidth,
          imgHeight
        );
      } else {
        // 多页处理
        let position = 0;
        const pageHeight = pdfHeight - margin * 2;

        while (position < canvas.height) {
          // 创建临时 canvas 用于分页
          const pageCanvas = document.createElement("canvas");
          const pageCtx = pageCanvas.getContext("2d");

          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(
            (pageHeight * canvas.width) / imgWidth,
            canvas.height - position
          );

          // 绘制当前页面部分
          pageCtx.drawImage(
            canvas,
            0,
            position,
            canvas.width,
            pageCanvas.height,
            0,
            0,
            canvas.width,
            pageCanvas.height
          );

          // 添加到 PDF
          if (position > 0) {
            pdf.addPage();
          }

          const pageImgHeight =
            (pageCanvas.height * imgWidth) / pageCanvas.width;
          pdf.addImage(
            pageCanvas.toDataURL("image/png"),
            "PNG",
            margin,
            margin,
            imgWidth,
            pageImgHeight
          );

          position += pageCanvas.height;
        }
      }

      // 保存 PDF
      pdf.save(filename);
      return true;
    } catch (error) {
      console.error("PDF export failed:", error);
      throw new Error("PDF 导出失败: " + error.message);
    }
  }
}

/**
 * 图片导出管理器
 */
export class ImageExportManager {
  /**
   * 将页面导出为图片
   */
  static async exportToImage(element, options = {}) {
    const {
      filename = "page-export.png",
      format = "png",
      quality = 1,
      backgroundColor = "#ffffff",
    } = options;

    try {
      const canvas = await html2canvas(element, {
        scale: quality,
        useCORS: true,
        allowTaint: true,
        backgroundColor: backgroundColor,
        logging: false,
      });

      // 创建下载链接
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL(`image/${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (error) {
      console.error("Image export failed:", error);
      throw new Error("图片导出失败: " + error.message);
    }
  }
}

/**
 * Word 导出管理器 (使用现有的 docx 库)
 */
export class WordExportManager {
  /**
   * 将页面内容导出为 Word 文档
   */
  static async exportToWord(schema, options = {}) {
    const { filename = "page-export.docx" } = options;

    try {
      // 动态导入docx库
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
        await import("docx");

      // 创建Word文档
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: this.convertSchemaToDocxElements(schema, {
              Paragraph,
              TextRun,
              HeadingLevel,
            }),
          },
        ],
      });

      // 生成文档 - 使用浏览器兼容的方式
      const blob = await Packer.toBlob(doc);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error("Word export failed:", error);
      throw new Error("Word 导出失败: " + error.message);
    }
  }

  /**
   * 转换 Schema 为 docx 元素
   */
  static convertSchemaToDocxElements(
    schema,
    { Paragraph, TextRun, HeadingLevel }
  ) {
    const elements = [];

    // 添加文档标题
    elements.push(
      new Paragraph({
        text: "页面设计导出",
        heading: HeadingLevel.TITLE,
      })
    );

    // 添加页面配置信息
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `页面尺寸: ${schema.pageConfig.pageSize.width} x ${schema.pageConfig.pageSize.height} ${schema.pageConfig.pageSize.unit}`,
            bold: true,
          }),
        ],
      })
    );

    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `页面边距: 上${schema.pageConfig.margins.top} 右${schema.pageConfig.margins.right} 下${schema.pageConfig.margins.bottom} 左${schema.pageConfig.margins.left}`,
            bold: true,
          }),
        ],
      })
    );

    // 添加页眉
    if (schema.pageConfig.header.enabled) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `页眉: ${schema.pageConfig.header.content}`,
              italics: true,
            }),
          ],
        })
      );
    }

    // 添加页面内容
    if (schema.pages && Array.isArray(schema.pages)) {
      schema.pages.forEach((page, pageIndex) => {
        // 页面标题
        elements.push(
          new Paragraph({
            text: `页面 ${pageIndex + 1}: ${
              page.name || `页面${pageIndex + 1}`
            }`,
            heading: HeadingLevel.HEADING_1,
          })
        );

        if (page.components && page.components.length > 0) {
          const pageElements = this.convertComponentsToDocxElements(
            page.components,
            { Paragraph, TextRun, HeadingLevel }
          );
          elements.push(...pageElements);
        } else {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "(空页面)",
                  italics: true,
                }),
              ],
            })
          );
        }
      });
    }

    // 添加页脚
    if (schema.pageConfig.footer.enabled) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `页脚: ${schema.pageConfig.footer.content}`,
              italics: true,
            }),
          ],
        })
      );
    }

    return elements;
  }

  /**
   * 转换组件为 docx 元素
   */
  static convertComponentsToDocxElements(
    components,
    { Paragraph, TextRun, HeadingLevel }
  ) {
    const elements = [];

    if (!components || !Array.isArray(components)) {
      return elements;
    }

    components.forEach((component) => {
      switch (component.type) {
        case "text": {
          // 处理富文本内容
          const textContent = component.content.replace(/<[^>]*>/g, "");
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: textContent,
                }),
              ],
            })
          );
          break;
        }

        case "layout":
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `布局容器 (${component.columns.length}列)`,
                  bold: true,
                }),
              ],
            })
          );

          if (component.children && component.children.length > 0) {
            const childElements = this.convertComponentsToDocxElements(
              component.children,
              { Paragraph, TextRun, HeadingLevel }
            );
            elements.push(...childElements);
          }
          break;

        case "image":
          elements.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `图片: ${component.alt || "无描述"}`,
                  italics: true,
                }),
              ],
            })
          );
          break;
      }
    });

    return elements;
  }

  /**
   * 转换 Schema 为文本 (备用方法)
   */
  static convertSchemaToText(schema) {
    let text = "页面设计导出\n\n";

    // 添加页面配置信息
    text += `页面尺寸: ${schema.pageConfig.pageSize.width} x ${schema.pageConfig.pageSize.height} ${schema.pageConfig.pageSize.unit}\n`;
    text += `页面边距: 上${schema.pageConfig.margins.top} 右${schema.pageConfig.margins.right} 下${schema.pageConfig.margins.bottom} 左${schema.pageConfig.margins.left}\n\n`;

    // 添加页眉
    if (schema.pageConfig.header.enabled) {
      text += `页眉: ${schema.pageConfig.header.content}\n\n`;
    }

    // 添加页面内容
    if (schema.pages && Array.isArray(schema.pages)) {
      schema.pages.forEach((page, pageIndex) => {
        text += `\n页面 ${pageIndex + 1}: ${
          page.name || `页面${pageIndex + 1}`
        }\n`;
        text += "=".repeat(40) + "\n";
        if (page.components && page.components.length > 0) {
          text += this.convertComponentsToText(page.components, 0);
        } else {
          text += "  (空页面)\n";
        }
        text += "\n";
      });
    } else {
      // 兼容旧版本架构
      text += "页面内容:\n";
      if (schema.components) {
        text += this.convertComponentsToText(schema.components, 0);
      } else {
        text += "  (无内容)\n";
      }
    }

    // 添加页脚
    if (schema.pageConfig.footer.enabled) {
      text += `\n页脚: ${schema.pageConfig.footer.content}\n`;
    }

    return text;
  }

  /**
   * 转换组件为文本
   */
  static convertComponentsToText(components, indent = 0) {
    let text = "";
    const indentStr = "  ".repeat(indent);

    // 检查组件数组是否有效
    if (!components || !Array.isArray(components)) {
      return text;
    }

    components.forEach((component) => {
      switch (component.type) {
        case "text":
          text += `${indentStr}文本: ${component.content.replace(
            /<[^>]*>/g,
            ""
          )}\n`;
          break;
        case "layout":
          text += `${indentStr}布局容器 (${component.columns.length}列):\n`;
          if (component.children && component.children.length > 0) {
            text += this.convertComponentsToText(
              component.children,
              indent + 1
            );
          }
          break;
        case "image":
          text += `${indentStr}图片: ${component.alt || "无描述"}\n`;
          break;
      }
    });

    return text;
  }
}

/**
 * 打印管理器
 */
export class PrintManager {
  /**
   * 打印页面
   */
  static printPage(element, options = {}) {
    const { title = "页面打印", styles = "" } = options;

    // 创建打印窗口
    const printWindow = window.open("", "_blank");

    // 获取页面样式
    const styleSheets = Array.from(document.styleSheets);
    let allStyles = styles;

    styleSheets.forEach((styleSheet) => {
      try {
        const rules = Array.from(styleSheet.cssRules || styleSheet.rules);
        rules.forEach((rule) => {
          allStyles += rule.cssText + "\n";
        });
      } catch (e) {
        // 跨域样式表可能无法访问
      }
    });

    // 构建打印页面 HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            ${allStyles}
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // 等待内容加载完成后打印
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
}
