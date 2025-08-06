const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
} = require("docx");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

class WordExportService {
  /**
   * 从HTML内容导出Word文档
   * @param {string} htmlContent - HTML内容
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} Word文档缓冲区
   */
  static async exportFromHTML(htmlContent, options = {}, taskId = "unknown") {
    try {
      console.log(`[${taskId}] 从HTML生成Word文档...`);

      // 使用cheerio解析HTML
      const $ = cheerio.load(htmlContent);
      const elements = [];

      // 遍历HTML的直接子元素
      $("body")
        .children()
        .each((index, element) => {
          const wordElements = this.parseHTMLElement($, $(element), options);
          elements.push(...wordElements);
        });

      // 如果没有body标签，则解析根级元素
      if (elements.length === 0) {
        $.root()
          .children()
          .each((index, element) => {
            const wordElements = this.parseHTMLElement($, $(element), options);
            elements.push(...wordElements);
          });
      }

      // 如果还是没有内容，使用原来的简单解析方法作为后备
      if (elements.length === 0) {
        const paragraphs = this.parseHTMLToParagraphs(htmlContent);
        elements.push(...paragraphs);
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation:
                    options.orientation === "landscape"
                      ? "landscape"
                      : "portrait",
                },
                margin: options.margins || {
                  top: 720, // 1英寸 = 720 twips
                  right: 720,
                  bottom: 720,
                  left: 720,
                },
              },
            },
            children:
              elements.length > 0
                ? elements
                : [
                    new Paragraph({
                      children: [new TextRun({ text: "文档内容为空" })],
                    }),
                  ],
          },
        ],
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
   * 解析HTML元素为Word元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @param {Object} options - 选项
   * @returns {Array} Word元素数组
   */
  static parseHTMLElement($, element, options = {}) {
    const tagName = element.prop("tagName")?.toLowerCase();
    const elements = [];

    if (!tagName) return elements;

    switch (tagName) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        elements.push(...this.parseHeading($, element, tagName));
        break;

      case "p":
        elements.push(...this.parseParagraph($, element));
        break;

      case "div":
        elements.push(...this.parseDiv($, element, options));
        break;

      case "span":
        elements.push(...this.parseSpan($, element));
        break;

      case "table":
        elements.push(...this.parseTable($, element));
        break;

      case "ul":
      case "ol":
        elements.push(...this.parseList($, element, tagName));
        break;

      case "img":
        if (options.includeImages !== false) {
          elements.push(...this.parseImage($, element));
        }
        break;

      case "br":
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: "" })],
            spacing: { after: 120 },
          })
        );
        break;

      case "hr":
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: "────────────────────────" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          })
        );
        break;

      default:
        // 对于其他标签，递归解析子元素
        element.children().each((index, child) => {
          const childElements = this.parseHTMLElement($, $(child), options);
          elements.push(...childElements);
        });

        // 如果没有子元素，但有文本内容
        if (element.children().length === 0) {
          const text = element.text().trim();
          if (text) {
            elements.push(
              new Paragraph({
                children: [new TextRun({ text })],
                spacing: { after: 120 },
              })
            );
          }
        }
        break;
    }

    return elements;
  }

  /**
   * 解析标题元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @param {string} tagName - 标签名
   * @returns {Array} Word段落数组
   */
  static parseHeading($, element, tagName) {
    const text = element.text().trim();
    if (!text) return [];

    const headingLevels = {
      h1: HeadingLevel.HEADING_1,
      h2: HeadingLevel.HEADING_2,
      h3: HeadingLevel.HEADING_3,
      h4: HeadingLevel.HEADING_4,
      h5: HeadingLevel.HEADING_5,
      h6: HeadingLevel.HEADING_6,
    };

    const style = this.parseElementStyle(element);

    return [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: this.getHeadingSize(tagName),
            bold: true,
            font: style.fontFamily || "Arial",
            color: style.color ? style.color.replace("#", "") : undefined,
          }),
        ],
        heading: headingLevels[tagName],
        alignment: this.getWordAlignment(style.textAlign),
        spacing: { before: 240, after: 120 },
      }),
    ];
  }

  /**
   * 解析段落元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @returns {Array} Word段落数组
   */
  static parseParagraph($, element) {
    const textRuns = this.parseTextRuns($, element);
    if (textRuns.length === 0) return [];

    const style = this.parseElementStyle(element);

    return [
      new Paragraph({
        children: textRuns,
        alignment: this.getWordAlignment(style.textAlign),
        spacing: { after: 120 },
      }),
    ];
  }

  /**
   * 解析div元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @param {Object} options - 选项
   * @returns {Array} Word元素数组
   */
  static parseDiv($, element, options) {
    const elements = [];

    // 如果div有直接的文本内容
    const directText = element
      .contents()
      .filter(function () {
        return this.nodeType === 3; // Text node
      })
      .text()
      .trim();

    if (directText) {
      const style = this.parseElementStyle(element);
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: directText,
              font: style.fontFamily || "Arial",
              size: style.fontSize ? style.fontSize * 2 : 24,
              color: style.color ? style.color.replace("#", "") : undefined,
              bold:
                style.fontWeight === "bold" ||
                parseInt(style.fontWeight) >= 600,
              italics: style.fontStyle === "italic",
            }),
          ],
          alignment: this.getWordAlignment(style.textAlign),
          spacing: { after: 120 },
        })
      );
    }

    // 递归处理子元素
    element.children().each((index, child) => {
      const childElements = this.parseHTMLElement($, $(child), options);
      elements.push(...childElements);
    });

    return elements;
  }

  /**
   * 解析span元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @returns {Array} Word段落数组
   */
  static parseSpan($, element) {
    const text = element.text().trim();
    if (!text) return [];

    const style = this.parseElementStyle(element);

    return [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: style.fontFamily || "Arial",
            size: style.fontSize ? style.fontSize * 2 : 24,
            color: style.color ? style.color.replace("#", "") : undefined,
            bold:
              style.fontWeight === "bold" || parseInt(style.fontWeight) >= 600,
            italics: style.fontStyle === "italic",
            underline: style.textDecoration === "underline" ? {} : undefined,
          }),
        ],
        alignment: this.getWordAlignment(style.textAlign),
        spacing: { after: 120 },
      }),
    ];
  }

  /**
   * 解析表格元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @returns {Array} Word表格数组
   */
  static parseTable($, element) {
    const rows = [];

    element.find("tr").each((index, row) => {
      const cells = [];
      $(row)
        .find("td, th")
        .each((cellIndex, cell) => {
          const cellText = $(cell).text().trim();
          const isHeader = $(cell).is("th");

          cells.push(
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText,
                      bold: isHeader,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                }),
              ],
              margins: {
                top: 100,
                bottom: 100,
                left: 100,
                right: 100,
              },
            })
          );
        });

      if (cells.length > 0) {
        rows.push(
          new TableRow({
            children: cells,
          })
        );
      }
    });

    if (rows.length === 0) return [];

    return [
      new Table({
        rows,
        width: {
          size: 100,
          type: "pct", // 100% width
        },
      }),
    ];
  }

  /**
   * 解析列表元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @param {string} listType - 列表类型 (ul/ol)
   * @returns {Array} Word段落数组
   */
  static parseList($, element, listType) {
    const elements = [];
    let counter = 1;

    element.find("li").each((index, item) => {
      const text = $(item).text().trim();
      if (!text) return;

      const bullet = listType === "ol" ? `${counter}.` : "•";
      counter++;

      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${bullet} ${text}`,
            }),
          ],
          spacing: { after: 120 },
          indent: { left: 360 }, // 0.25 inch indent
        })
      );
    });

    return elements;
  }

  /**
   * 解析图片元素
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @returns {Array} Word段落数组
   */
  static parseImage($, element) {
    const src = element.attr("src");
    const alt = element.attr("alt") || "";
    const style = this.parseElementStyle(element);
    const elements = [];

    // 检查 src 是否为 base64 数据 URI
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|bmp);base64,/;
    if (src && base64Regex.test(src)) {
      try {
        const base64Data = src.replace(base64Regex, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        // 尝试从 style 或属性中获取图片尺寸
        const width =
          parseInt(style.width) || parseInt(element.attr("width")) || 400; // 默认宽度
        const height =
          parseInt(style.height) || parseInt(element.attr("height")) || 300; // 默认高度

        const imageRun = new ImageRun({
          data: imageBuffer,
          transformation: {
            width: width,
            height: height,
          },
        });

        elements.push(
          new Paragraph({
            children: [imageRun],
            alignment: this.getWordAlignment(style.textAlign || "center"), // 默认居中对齐
          })
        );
      } catch (error) {
        console.warn("Base64图片解析失败:", error.message);
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[图片加载失败: ${alt}]`,
                italics: true,
                color: "FF0000",
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    } else {
      // 非base64图片，保持现有处理方式
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[图片: ${alt}${src ? ` - ${src}` : ""}]`,
              italics: true,
              color: "666666",
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
    return elements;
  }

  /**
   * 解析文本运行
   * @param {Object} $ - cheerio实例
   * @param {Object} element - cheerio元素
   * @returns {Array} TextRun数组
   */
  static parseTextRuns($, element) {
    const runs = [];
    const style = this.parseElementStyle(element);

    element.contents().each((index, node) => {
      if (node.nodeType === 3) {
        // Text node
        const text = $(node).text();
        if (text.trim()) {
          runs.push(
            new TextRun({
              text,
              font: style.fontFamily || "Arial",
              size: style.fontSize ? style.fontSize * 2 : 24,
              color: style.color ? style.color.replace("#", "") : undefined,
              bold:
                style.fontWeight === "bold" ||
                parseInt(style.fontWeight) >= 600,
              italics: style.fontStyle === "italic",
              underline: style.textDecoration === "underline" ? {} : undefined,
            })
          );
        }
      } else {
        // Element node
        const childElement = $(node);
        const childTagName = childElement.prop("tagName")?.toLowerCase();
        const childText = childElement.text().trim();

        if (childText) {
          const childStyle = this.parseElementStyle(childElement);
          runs.push(
            new TextRun({
              text: childText,
              font: childStyle.fontFamily || style.fontFamily || "Arial",
              size: childStyle.fontSize
                ? childStyle.fontSize * 2
                : style.fontSize
                ? style.fontSize * 2
                : 24,
              color: childStyle.color
                ? childStyle.color.replace("#", "")
                : style.color
                ? style.color.replace("#", "")
                : undefined,
              bold:
                childTagName === "strong" ||
                childTagName === "b" ||
                childStyle.fontWeight === "bold" ||
                parseInt(childStyle.fontWeight) >= 600 ||
                style.fontWeight === "bold",
              italics:
                childTagName === "em" ||
                childTagName === "i" ||
                childStyle.fontStyle === "italic" ||
                style.fontStyle === "italic",
              underline:
                childTagName === "u" ||
                childStyle.textDecoration === "underline" ||
                style.textDecoration === "underline"
                  ? {}
                  : undefined,
            })
          );
        }
      }
    });

    // 如果没有找到文本运行，但元素有文本，创建一个默认的文本运行
    if (runs.length === 0) {
      const text = element.text().trim();
      if (text) {
        runs.push(
          new TextRun({
            text,
            font: style.fontFamily || "Arial",
            size: style.fontSize ? style.fontSize * 2 : 24,
            color: style.color ? style.color.replace("#", "") : undefined,
            bold:
              style.fontWeight === "bold" || parseInt(style.fontWeight) >= 600,
            italics: style.fontStyle === "italic",
            underline: style.textDecoration === "underline" ? {} : undefined,
          })
        );
      }
    }

    return runs;
  }

  /**
   * 解析元素样式
   * @param {Object} element - cheerio元素
   * @returns {Object} 样式对象
   */
  static parseElementStyle(element) {
    const style = {};
    const styleAttr = element.attr("style");

    if (styleAttr) {
      const styleDeclarations = styleAttr.split(";");
      styleDeclarations.forEach((declaration) => {
        const [property, value] = declaration.split(":").map((s) => s.trim());
        if (property && value) {
          switch (property) {
            case "font-size":
              const fontSize = parseInt(value);
              if (!isNaN(fontSize)) {
                style.fontSize = fontSize;
              }
              break;
            case "font-family":
              style.fontFamily = value.replace(/['"]/g, "");
              break;
            case "font-weight":
              style.fontWeight = value;
              break;
            case "font-style":
              style.fontStyle = value;
              break;
            case "color":
              style.color = this.normalizeHexColor(value);
              break;
            case "text-align":
              style.textAlign = value;
              break;
            case "text-decoration":
              style.textDecoration = value;
              break;
            case "line-height":
              const lineHeight = parseFloat(value);
              if (!isNaN(lineHeight)) {
                style.lineHeight = lineHeight;
              }
              break;
          }
        }
      });
    }

    return style;
  }

  /**
   * 获取标题字体大小
   * @param {string} tagName - 标签名
   * @returns {number} 字体大小（半点单位）
   */
  static getHeadingSize(tagName) {
    const sizes = {
      h1: 32, // 16pt
      h2: 28, // 14pt
      h3: 26, // 13pt
      h4: 24, // 12pt
      h5: 22, // 11pt
      h6: 20, // 10pt
    };
    return sizes[tagName] || 24;
  }

  /**
   * 从Schema数据导出Word文档
   * @param {Object} schema - 页面Schema数据
   * @param {Object} options - 导出选项
   * @param {string} taskId - 任务ID
   * @returns {Buffer} Word文档缓冲区
   */
  static async exportFromSchema(schema, options = {}, taskId = "unknown") {
    try {
      console.log(`[${taskId}] 从Schema生成Word文档...`);

      if (!schema || !schema.pages) {
        throw new Error("无效的Schema数据");
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
          page.components.forEach((component) => {
            const componentElements = this.convertComponentToWord(
              component,
              options
            );
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
                orientation:
                  options.orientation === "landscape"
                    ? "landscape"
                    : "portrait",
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
      case "text":
        elements.push(...this.convertTextComponent(component));
        break;

      case "image":
        if (options.includeImages !== false) {
          elements.push(...this.convertImageComponent(component));
        }
        break;

      case "layout":
        elements.push(...this.convertLayoutComponent(component, options));
        break;

      default:
        // 默认作为文本处理
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: this.stripHTML(component.content || ""),
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
    const content = component.content || "";
    const style = component.style || {};

    // 如果内容包含HTML，使用HTML解析
    if (content.includes("<") && content.includes(">")) {
      try {
        const $ = cheerio.load(content);
        const elements = [];
        $.root()
          .children()
          .each((index, element) => {
            const wordElements = this.parseHTMLElement($, $(element), {});
            elements.push(...wordElements);
          });
        return elements;
      } catch (error) {
        console.warn("HTML解析失败，使用简单文本处理:", error.message);
      }
    }

    // 简单处理：分割为段落
    const paragraphs = content.split(/\n/).filter((p) => p.trim());

    return paragraphs
      .map((paragraphText) => {
        const cleanText = this.stripHTML(paragraphText);
        if (!cleanText.trim()) return null;

        const textRun = new TextRun({
          text: cleanText,
          size: style.fontSize ? style.fontSize * 2 : 24, // Word使用半点单位
          font: style.fontFamily || "Arial",
          color: style.color ? style.color.replace("#", "") : undefined,
          bold: style.fontWeight === "bold" || style.fontWeight >= 600,
          italics: style.fontStyle === "italic",
          underline: style.textDecoration === "underline" ? {} : undefined,
        });

        return new Paragraph({
          children: [textRun],
          alignment: this.getWordAlignment(style.textAlign),
          spacing: {
            after: 120, // 6pt spacing after
            line: style.lineHeight
              ? Math.round(style.lineHeight * 240)
              : undefined,
          },
        });
      })
      .filter((p) => p !== null);
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
                text: "[图片]",
                italics: true,
                color: "666666",
              }),
            ],
            spacing: { after: 120 },
          }),
        ];
      }

      // 这里简化处理，实际应用中需要处理图片下载和格式转换
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `[图片: ${imagePath}]`,
              italics: true,
              color: "666666",
            }),
          ],
          spacing: { after: 120 },
        }),
      ];
    } catch (error) {
      console.warn("图片处理失败:", error.message);
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: "[图片加载失败]",
              italics: true,
              color: "FF0000",
            }),
          ],
          spacing: { after: 120 },
        }),
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
      component.children.forEach((child) => {
        const childElements = this.convertComponentToWord(child, options);
        elements.push(...childElements);
      });
    }

    return elements;
  }

  /**
   * 解析HTML为段落（简化版本，作为后备方法）
   * @param {string} htmlContent - HTML内容
   * @returns {Array} Word段落数组
   */
  static parseHTMLToParagraphs(htmlContent) {
    // 移除HTML标签，分割为段落
    const cleanText = this.stripHTML(htmlContent);
    const paragraphs = cleanText.split("\n").filter((p) => p.trim());

    return paragraphs.map(
      (text) =>
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

  static normalizeHexColor(color) {
    if (/^#[0-9a-fA-F]{3}$/.test(color)) {
      // 扩展成 #rrggbb 格式
      return (
        "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      );
    }
    return color;
  }

  /**
   * 移除HTML标签
   * @param {string} html - HTML字符串
   * @returns {string} 纯文本
   */
  static stripHTML(html) {
    if (typeof html !== "string") return "";
    return html
      .replace(/<[^>]*>/g, "") // 移除HTML标签
      .replace(/&nbsp;/g, " ") // 替换空格实体
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, "...")
      .replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–")
      .trim();
  }

  /**
   * 获取Word对齐方式
   * @param {string} textAlign - CSS文本对齐
   * @returns {string} Word对齐方式
   */
  static getWordAlignment(textAlign) {
    switch (textAlign) {
      case "center":
        return AlignmentType.CENTER;
      case "right":
        return AlignmentType.RIGHT;
      case "justify":
        return AlignmentType.JUSTIFIED;
      default:
        return AlignmentType.LEFT;
    }
  }
}

module.exports = WordExportService;
