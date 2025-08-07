const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { promisify } = require("util");
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

/**
 * 🚀 基于Pandoc的Word导出服务
 * 使用Pandoc进行高质量的HTML到Word转换
 */
class PandocWordExportService {
  constructor() {
    this.tempDir = path.join(__dirname, "../temp");
    this.ensureTempDir();
  }

  /**
   * 确保临时目录存在
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 检查Pandoc是否已安装
   */
  async checkPandoc() {
    return new Promise((resolve) => {
      const pandoc = spawn("pandoc", ["--version"], { shell: true });

      pandoc.on("close", (code) => {
        resolve(code === 0);
      });

      pandoc.on("error", () => {
        resolve(false);
      });
    });
  }

  /**
   * 从HTML内容导出Word文档
   */
  async exportFromHTML(htmlContent, options = {}, taskId = "unknown") {
    try {
      console.log(`[${taskId}] 🚀 开始基于Pandoc的Word导出...`);

      // 检查Pandoc是否可用
      const pandocAvailable = await this.checkPandoc();
      if (!pandocAvailable) {
        console.log(`[${taskId}] ⚠️ Pandoc未安装，使用备用方案...`);
        return await this.fallbackExport(htmlContent, options, taskId);
      }

      // 使用Pandoc进行转换
      const buffer = await this.convertWithPandoc(htmlContent, options, taskId);

      console.log(
        `[${taskId}] ✅ Pandoc Word导出成功，大小: ${buffer.length} bytes`
      );
      return buffer;
    } catch (error) {
      console.error(`[${taskId}] ❌ Pandoc导出失败:`, error.message);
      console.log(`[${taskId}] 🔄 尝试备用方案...`);

      try {
        return await this.fallbackExport(htmlContent, options, taskId);
      } catch (fallbackError) {
        console.error(`[${taskId}] ❌ 备用方案也失败:`, fallbackError.message);
        throw new Error(`Word导出失败: ${error.message}`);
      }
    }
  }

  /**
   * 使用Pandoc进行转换
   */
  async convertWithPandoc(htmlContent, options, taskId) {
    const timestamp = Date.now();
    const inputFile = path.join(this.tempDir, `input_${timestamp}.html`);
    const outputFile = path.join(this.tempDir, `output_${timestamp}.docx`);

    try {
      // 预处理HTML内容
      const processedHTML = this.preprocessHTML(htmlContent);

      // 写入临时HTML文件
      await writeFile(inputFile, processedHTML, "utf8");

      // 构建Pandoc命令
      const pandocArgs = this.buildPandocArgs(inputFile, outputFile, options);

      // 执行Pandoc转换
      await this.executePandoc(pandocArgs, taskId);

      // 读取生成的Word文档
      const buffer = await readFile(outputFile);

      return buffer;
    } finally {
      // 清理临时文件
      await this.cleanupFiles([inputFile, outputFile]);
    }
  }

  /**
   * 预处理HTML内容
   */
  preprocessHTML(htmlContent) {
    let processedHTML = htmlContent;

    // 添加基础HTML结构
    if (!processedHTML.includes("<html")) {
      processedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <style>
    body {
      font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      margin: 1in;
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: #2c3e50;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    
    h1 { font-size: 18pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    h4 { font-size: 13pt; }
    h5 { font-size: 12pt; }
    h6 { font-size: 11pt; }
    
    p {
      margin-bottom: 0.5em;
      text-align: justify;
    }
    
    img {
      width: 64px !important;
      height: 64px !important;
      object-fit: contain;
      display: block;
      margin: 0.5em auto;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    
    ul, ol {
      margin: 0.5em 0;
      padding-left: 2em;
    }
    
    li {
      margin-bottom: 0.25em;
    }
    
    blockquote {
      margin: 1em 0;
      padding: 0.5em 1em;
      border-left: 4px solid #3498db;
      background-color: #f8f9fa;
      font-style: italic;
    }
    
    code {
      font-family: 'Courier New', monospace;
      background-color: #f1f1f1;
      padding: 2px 4px;
      border-radius: 3px;
    }
    
    pre {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 1em;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
${processedHTML}
</body>
</html>`;
    }

    // 处理图片尺寸 - 强制设置为64x64px以匹配编辑器
    processedHTML = processedHTML.replace(/<img([^>]*?)>/gi, (match, attrs) => {
      if (attrs.includes("src=")) {
        // 移除现有的width/height属性，强制使用CSS
        let cleanAttrs = attrs.replace(
          /\s*(width|height|style)\s*=\s*["'][^"']*["']/gi,
          ""
        );
        return `<img${cleanAttrs} style="width: 64px !important; height: 64px !important; object-fit: contain;">`;
      }
      return match;
    });

    // 处理表格 - 确保表格有边框
    processedHTML = processedHTML.replace(
      /<table(?![^>]*border)/gi,
      '<table border="1"'
    );

    return processedHTML;
  }

  /**
   * 构建Pandoc命令参数
   */
  buildPandocArgs(inputFile, outputFile, options) {
    const args = [
      inputFile,
      "-o",
      outputFile,
      "--from",
      "html",
      "--to",
      "docx",
      "--standalone",
    ];

    // 添加参考文档模板（如果有的话）
    if (options.referenceDoc) {
      args.push("--reference-doc", options.referenceDoc);
    }

    // 添加其他选项
    if (options.toc) {
      args.push("--toc");
    }

    if (options.tocDepth) {
      args.push("--toc-depth", options.tocDepth.toString());
    }

    return args;
  }

  /**
   * 执行Pandoc命令
   */
  async executePandoc(args, taskId) {
    return new Promise((resolve, reject) => {
      console.log(`[${taskId}] 🔄 执行Pandoc命令: pandoc ${args.join(" ")}`);

      const pandoc = spawn("pandoc", args, {
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";

      pandoc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pandoc.on("close", (code) => {
        if (code === 0) {
          console.log(`[${taskId}] ✅ Pandoc转换完成`);
          resolve();
        } else {
          console.error(`[${taskId}] ❌ Pandoc转换失败，退出码: ${code}`);
          console.error(`[${taskId}] 错误信息: ${stderr}`);
          reject(new Error(`Pandoc转换失败: ${stderr || "未知错误"}`));
        }
      });

      pandoc.on("error", (error) => {
        console.error(`[${taskId}] ❌ Pandoc执行错误:`, error.message);
        reject(new Error(`Pandoc执行失败: ${error.message}`));
      });
    });
  }

  /**
   * 清理临时文件
   */
  async cleanupFiles(files) {
    for (const file of files) {
      try {
        if (fs.existsSync(file)) {
          await unlink(file);
        }
      } catch (error) {
        console.warn(`清理临时文件失败: ${file}`, error.message);
      }
    }
  }

  /**
   * 备用导出方案 - 使用docx库，更稳定的实现
   */
  async fallbackExport(htmlContent, options, taskId) {
    try {
      console.log(`[${taskId}] 🔄 使用备用方案导出Word...`);

      // 动态导入docx库
      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        ImageRun,
        HeadingLevel,
        AlignmentType,
      } = require("docx");
      const { JSDOM } = require("jsdom");

      // 解析HTML
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const body = document.querySelector("body") || document;

      const elements = [];

      // 添加一个默认段落，确保文档不为空
      elements.push(
        new Paragraph({
          children: [new TextRun("文档内容")],
          spacing: { after: 200 },
        })
      );

      // 简单的HTML到Word转换
      this.processElementForFallback(body, elements);

      // 如果没有内容，添加默认内容
      if (elements.length <= 1) {
        elements.push(
          new Paragraph({
            children: [new TextRun("暂无内容")],
            spacing: { after: 200 },
          })
        );
      }

      // 创建Word文档，使用更安全的配置
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 720, // 0.5 inch
                  right: 720,
                  bottom: 720,
                  left: 720,
                },
              },
            },
            children: elements,
          },
        ],
        styles: {
          paragraphStyles: [
            {
              id: "normal",
              name: "Normal",
              basedOn: "Normal",
              next: "Normal",
              run: {
                size: 24, // 12pt
                font: "Microsoft YaHei",
              },
              paragraph: {
                spacing: {
                  after: 120,
                },
              },
            },
          ],
        },
      });

      const buffer = await Packer.toBuffer(doc);
      console.log(
        `[${taskId}] ✅ 备用方案导出成功，大小: ${buffer.length} bytes`
      );

      return buffer;
    } catch (error) {
      console.error(`[${taskId}] ❌ 备用方案失败:`, error.message);
      console.error(`[${taskId}] 错误堆栈:`, error.stack);
      throw new Error(`备用导出失败: ${error.message}`);
    }
  }

  /**
   * 处理HTML元素 - 备用方案，更安全的实现
   */
  processElementForFallback(element, elements) {
    const { Paragraph, TextRun, ImageRun, HeadingLevel } = require("docx");

    for (const child of element.childNodes) {
      if (child.nodeType === 3) {
        // 文本节点
        const text = child.textContent.trim();
        if (text) {
          elements.push(
            new Paragraph({
              children: [new TextRun(text)],
              spacing: { after: 120 },
            })
          );
        }
      } else if (child.nodeType === 1) {
        // 元素节点
        const tagName = child.tagName.toLowerCase();
        const text = child.textContent.trim();

        try {
          switch (tagName) {
            case "h1":
              if (text) {
                elements.push(
                  new Paragraph({
                    children: [new TextRun({ text, bold: true, size: 32 })],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 240, after: 120 },
                  })
                );
              }
              break;

            case "h2":
              if (text) {
                elements.push(
                  new Paragraph({
                    children: [new TextRun({ text, bold: true, size: 28 })],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 120 },
                  })
                );
              }
              break;

            case "h3":
              if (text) {
                elements.push(
                  new Paragraph({
                    children: [new TextRun({ text, bold: true, size: 26 })],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 160, after: 120 },
                  })
                );
              }
              break;

            case "p":
            case "div":
              if (text) {
                elements.push(
                  new Paragraph({
                    children: [new TextRun(text)],
                    spacing: { after: 120 },
                  })
                );
              }
              break;

            case "img":
              // 暂时跳过图片处理，避免文档损坏
              console.log("跳过图片处理，避免文档损坏");
              elements.push(
                new Paragraph({
                  children: [new TextRun("[图片]")],
                  spacing: { after: 120 },
                })
              );
              break;

            case "br":
              elements.push(
                new Paragraph({
                  children: [new TextRun("")],
                  spacing: { after: 120 },
                })
              );
              break;

            case "ul":
            case "ol":
              // 处理列表
              const listItems = child.querySelectorAll("li");
              listItems.forEach((item, index) => {
                const itemText = item.textContent.trim();
                if (itemText) {
                  const bullet = tagName === "ul" ? "•" : `${index + 1}.`;
                  elements.push(
                    new Paragraph({
                      children: [new TextRun(`${bullet} ${itemText}`)],
                      spacing: { after: 100 },
                      indent: { left: 720 }, // 0.5 inch
                    })
                  );
                }
              });
              break;

            default:
              // 递归处理子元素
              this.processElementForFallback(child, elements);
          }
        } catch (error) {
          console.warn(`处理元素 ${tagName} 时出错:`, error.message);
          // 如果处理失败，至少添加文本内容
          if (text) {
            elements.push(
              new Paragraph({
                children: [new TextRun(text)],
                spacing: { after: 120 },
              })
            );
          }
        }
      }
    }
  }
}

module.exports = PandocWordExportService;
