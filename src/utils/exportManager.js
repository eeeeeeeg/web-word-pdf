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
      // 暂时使用简单的文本导出
      const content = this.convertSchemaToText(schema);
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(".docx", ".txt");
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
   * 转换 Schema 为文本
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

    // 添加组件内容
    text += "页面内容:\n";
    text += this.convertComponentsToText(schema.components, 0);

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
