const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

// 导入导出服务
const PDFExportService = require("../services/PDFExportService");
const PandocWordExportService = require("../services/PandocWordExportService");
const PPTExportService = require("../services/PPTExportService");
const SchemaToHtmlConverter = require("../utils/schemaToHtml");

const router = express.Router();

/**
 * 将Schema转换为HTML
 */
function convertSchemaToHTML(schema) {
  // 使用统一的转换器，设置为Word环境
  return SchemaToHtmlConverter.convertToFullHTML(schema, {
    environment: "word",
    includeDoctype: true,
  });
}

/**
 * 解析布尔值，处理字符串形式的布尔值
 * @param {any} value - 要解析的值
 * @param {boolean} defaultValue - 默认值
 * @returns {boolean} 解析后的布尔值
 */
function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return defaultValue;
}

// 配置文件上传
const upload = multer({
  dest: path.join(__dirname, "../temp/uploads"),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = ["text/html", "application/json", "text/plain"];
    if (
      allowedTypes.includes(file.mimetype) ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  },
});

/**
 * PDF导出接口
 */
router.post("/pdf", upload.single("htmlFile"), async (req, res) => {
  const taskId = uuidv4();
  console.log(`[${taskId}] 开始PDF导出任务`);

  try {
    const { htmlContent, options = {} } = req.body;
    let html = htmlContent;

    // 如果上传了HTML文件，使用文件内容
    if (req.file) {
      html = await fs.readFile(req.file.path, "utf-8");
      await fs.remove(req.file.path); // 清理临时文件
    }

    if (!html) {
      return res.status(400).json({
        error: "Missing HTML content",
        message: "请提供HTML内容或上传HTML文件",
      });
    }

    // 解析导出选项
    const exportOptions = {
      format: options.format || "A4",
      orientation: options.orientation || "portrait",
      margin: options.margin || {
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm",
      },
      printBackground: parseBoolean(options.printBackground, true),
      displayHeaderFooter: parseBoolean(options.displayHeaderFooter, false),
      headerTemplate: options.headerTemplate || "",
      footerTemplate: options.footerTemplate || "",
      scale: parseFloat(options.scale) || 1,
      ...options,
    };

    console.log(`[${taskId}] 导出选项:`, exportOptions);

    // 执行PDF导出
    const pdfBuffer = await PDFExportService.exportToPDF(
      html,
      exportOptions,
      taskId
    );

    // 设置响应头
    const filename = options.filename || `document_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    console.log(`[${taskId}] PDF导出成功，文件大小: ${pdfBuffer.length} bytes`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(`[${taskId}] PDF导出失败:`, error);
    res.status(500).json({
      error: "PDF Export Failed",
      message: error.message,
      taskId,
    });
  }
});

/**
 * Word导出接口
 */
router.post("/word", upload.single("htmlFile"), async (req, res) => {
  const taskId = uuidv4();
  console.log(`[${taskId}] 开始Word导出任务`);

  try {
    const { htmlContent, schemaData, options = {} } = req.body;
    let html = htmlContent;

    // 如果上传了HTML文件，使用文件内容
    if (req.file) {
      html = await fs.readFile(req.file.path, "utf-8");
      await fs.remove(req.file.path);
    }

    if (!html && !schemaData) {
      return res.status(400).json({
        error: "Missing Content",
        message: "请提供HTML内容或Schema数据",
      });
    }

    // 解析导出选项
    const exportOptions = {
      pageSize: options.pageSize || "A4",
      orientation: options.orientation || "portrait",
      margins: options.margins || {
        top: 720,
        right: 720,
        bottom: 720,
        left: 720,
      }, // 1英寸 = 720 twips
      includeImages: options.includeImages !== false,
      ...options,
    };

    console.log(`[${taskId}] Word导出选项:`, exportOptions);

    // 执行Word导出
    let wordBuffer;
    if (schemaData) {
      // 从Schema数据生成Word文档
      const pandocService = new PandocWordExportService();
      const htmlContent = convertSchemaToHTML(JSON.parse(schemaData));
      wordBuffer = await pandocService.exportFromHTML(
        htmlContent,
        exportOptions,
        taskId
      );
    } else {
      // 从HTML生成Word文档
      // 如果有Schema数据，尝试从中提取页面配置
      let htmlExportOptions = exportOptions;
      if (schemaData) {
        try {
          const schema = JSON.parse(schemaData);
          if (schema.pageConfig) {
            htmlExportOptions = {
              ...exportOptions,
              pageConfig: schema.pageConfig,
            };
          }
        } catch (e) {
          // 忽略Schema解析错误，使用默认配置
        }
      }

      const pandocService = new PandocWordExportService();
      wordBuffer = await pandocService.exportFromHTML(
        html,
        htmlExportOptions,
        taskId
      );
    }

    // 设置响应头
    const filename = options.filename || `document_${Date.now()}.docx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", wordBuffer.length);

    console.log(
      `[${taskId}] Word导出成功，文件大小: ${wordBuffer.length} bytes`
    );
    res.send(wordBuffer);
  } catch (error) {
    console.error(`[${taskId}] Word导出失败:`, error);
    res.status(500).json({
      error: "Word Export Failed",
      message: error.message,
      taskId,
    });
  }
});

/**
 * PPT导出接口
 */
router.post("/ppt", upload.single("htmlFile"), async (req, res) => {
  const taskId = uuidv4();
  console.log(`[${taskId}] 开始PPT导出任务`);

  try {
    const { schemaData, options = {} } = req.body;

    if (!schemaData) {
      return res.status(400).json({
        error: "Missing Schema Data",
        message: "请提供Schema数据用于PPT导出",
      });
    }

    // 解析导出选项
    const exportOptions = {
      slideSize: options.slideSize || "LAYOUT_16x9",
      theme: options.theme || "default",
      includeImages: options.includeImages !== false,
      slidesPerPage: options.slidesPerPage || 1,
      ...options,
    };

    console.log(`[${taskId}] PPT导出选项:`, exportOptions);

    // 执行PPT导出
    const pptBuffer = await PPTExportService.exportFromSchema(
      JSON.parse(schemaData),
      exportOptions,
      taskId
    );

    // 设置响应头
    const filename = options.filename || `presentation_${Date.now()}.pptx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pptBuffer.length);

    console.log(`[${taskId}] PPT导出成功，文件大小: ${pptBuffer.length} bytes`);
    res.send(pptBuffer);
  } catch (error) {
    console.error(`[${taskId}] PPT导出失败:`, error);
    res.status(500).json({
      error: "PPT Export Failed",
      message: error.message,
      taskId,
    });
  }
});

/**
 * 批量导出接口
 */
router.post("/batch", upload.single("dataFile"), async (req, res) => {
  const taskId = uuidv4();
  console.log(`[${taskId}] 开始批量导出任务`);

  try {
    const { formats, schemaData, options = {} } = req.body;

    if (!formats || !Array.isArray(formats) || formats.length === 0) {
      return res.status(400).json({
        error: "Missing Formats",
        message: "请指定要导出的格式数组",
      });
    }

    if (!schemaData) {
      return res.status(400).json({
        error: "Missing Schema Data",
        message: "请提供Schema数据",
      });
    }

    const schema = JSON.parse(schemaData);
    const results = {};

    // 并行导出多种格式
    const exportPromises = formats.map(async (format) => {
      try {
        let buffer;
        const formatOptions = options[format] || {};

        switch (format.toLowerCase()) {
          case "pdf":
            buffer = await PDFExportService.exportFromSchema(
              schema,
              formatOptions,
              `${taskId}-pdf`
            );
            break;
          case "word":
          case "docx":
            const pandocService = new PandocWordExportService();
            const htmlContent = convertSchemaToHTML(schema);
            buffer = await pandocService.exportFromHTML(
              htmlContent,
              formatOptions,
              `${taskId}-word`
            );
            break;
          case "ppt":
          case "pptx":
            buffer = await PPTExportService.exportFromSchema(
              schema,
              formatOptions,
              `${taskId}-ppt`
            );
            break;
          default:
            throw new Error(`不支持的导出格式: ${format}`);
        }

        results[format] = {
          success: true,
          size: buffer.length,
          data: buffer.toString("base64"),
        };
      } catch (error) {
        results[format] = {
          success: false,
          error: error.message,
        };
      }
    });

    await Promise.all(exportPromises);

    console.log(`[${taskId}] 批量导出完成`);
    res.json({
      taskId,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error(`[${taskId}] 批量导出失败:`, error);
    res.status(500).json({
      error: "Batch Export Failed",
      message: error.message,
      taskId,
    });
  }
});

module.exports = router;
