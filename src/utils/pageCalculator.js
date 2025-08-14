/**
 * 页面高度计算工具
 * 用于自动分页算法中的页面尺寸和可用高度计算
 */

/**
 * 单位转换常量 (基于96dpi)
 * 注意：这些转换系数需要与PDF导出保持一致
 */
const UNIT_CONVERSION = {
  mm: 3.7795275591, // 1mm = 3.7795275591px (精确值: 96/25.4)
  in: 96, // 1in = 96px
  px: 1, // 1px = 1px
  cm: 37.795275591, // 1cm = 37.795275591px (10mm)
  pt: 1.3333333333, // 1pt = 1.3333333333px (1/72 inch)
};

/**
 * 计算页面的总高度（像素）
 * @param {Object} pageConfig - 页面配置对象
 * @returns {number} 页面总高度（像素）
 */
export function calculatePageTotalHeight(pageConfig) {
  const { pageSize } = pageConfig;
  const conversionFactor = UNIT_CONVERSION[pageSize.unit] || UNIT_CONVERSION.px;

  return pageSize.height * conversionFactor;
}

/**
 * 计算页面的总宽度（像素）
 * @param {Object} pageConfig - 页面配置对象
 * @returns {number} 页面总宽度（像素）
 */
export function calculatePageTotalWidth(pageConfig) {
  const { pageSize } = pageConfig;
  const conversionFactor = UNIT_CONVERSION[pageSize.unit] || UNIT_CONVERSION.px;

  return pageSize.width * conversionFactor;
}

/**
 * 计算页面边距（像素）
 * @param {Object} pageConfig - 页面配置对象
 * @returns {Object} 边距对象 {top, bottom, left, right}
 */
export function calculatePageMargins(pageConfig) {
  const { margins } = pageConfig;
  const conversionFactor = UNIT_CONVERSION.mm; // 边距通常以mm为单位

  return {
    top: margins.top * conversionFactor,
    bottom: margins.bottom * conversionFactor,
    left: margins.left * conversionFactor,
    right: margins.right * conversionFactor,
  };
}

/**
 * 计算页眉高度（像素）
 * @param {Object} pageConfig - 页面配置对象
 * @returns {number} 页眉高度（像素）
 */
export function calculateHeaderHeight(pageConfig) {
  const { header } = pageConfig;
  if (!header.enabled) return 0;

  const conversionFactor = UNIT_CONVERSION.mm; // 页眉高度通常以mm为单位
  return header.height * conversionFactor;
}

/**
 * 计算页脚高度（像素）
 * @param {Object} pageConfig - 页面配置对象
 * @returns {number} 页脚高度（像素）
 */
export function calculateFooterHeight(pageConfig) {
  const { footer } = pageConfig;
  if (!footer.enabled) return 0;

  const conversionFactor = UNIT_CONVERSION.mm; // 页脚高度通常以mm为单位
  return footer.height * conversionFactor;
}

/**
 * 计算页面内容区域的可用高度（像素）
 * 这是用于放置组件的实际可用高度
 * @param {Object} pageConfig - 页面配置对象
 * @returns {number} 可用高度（像素）
 */
export function calculateAvailableContentHeight(pageConfig) {
  const totalHeight = calculatePageTotalHeight(pageConfig);
  const margins = calculatePageMargins(pageConfig);
  const headerHeight = calculateHeaderHeight(pageConfig);
  const footerHeight = calculateFooterHeight(pageConfig);

  // 可用高度 = 总高度 - 上边距 - 下边距 - 页眉高度 - 页脚高度
  const availableHeight =
    totalHeight - margins.top - margins.bottom - headerHeight - footerHeight;

  return Math.max(0, availableHeight); // 确保不返回负值
}

/**
 * 计算页面内容区域的可用宽度（像素）
 * @param {Object} pageConfig - 页面配置对象
 * @returns {number} 可用宽度（像素）
 */
export function calculateAvailableContentWidth(pageConfig) {
  const totalWidth = calculatePageTotalWidth(pageConfig);
  const margins = calculatePageMargins(pageConfig);

  // 可用宽度 = 总宽度 - 左边距 - 右边距
  const availableWidth = totalWidth - margins.left - margins.right;

  return Math.max(0, availableWidth); // 确保不返回负值
}

/**
 * 获取页面尺寸信息的完整对象
 * @param {Object} pageConfig - 页面配置对象
 * @returns {Object} 包含所有尺寸信息的对象
 */
export function getPageDimensions(pageConfig) {
  return {
    total: {
      width: calculatePageTotalWidth(pageConfig),
      height: calculatePageTotalHeight(pageConfig),
    },
    margins: calculatePageMargins(pageConfig),
    header: {
      height: calculateHeaderHeight(pageConfig),
      enabled: pageConfig.header.enabled,
    },
    footer: {
      height: calculateFooterHeight(pageConfig),
      enabled: pageConfig.footer.enabled,
    },
    available: {
      width: calculateAvailableContentWidth(pageConfig),
      height: calculateAvailableContentHeight(pageConfig),
    },
  };
}

/**
 * 验证页面配置的有效性
 * @param {Object} pageConfig - 页面配置对象
 * @returns {Object} 验证结果 {valid: boolean, errors: string[]}
 */
export function validatePageConfig(pageConfig) {
  const errors = [];

  // 检查页面尺寸
  if (
    !pageConfig.pageSize ||
    pageConfig.pageSize.width <= 0 ||
    pageConfig.pageSize.height <= 0
  ) {
    errors.push("页面尺寸必须大于0");
  }

  // 检查边距
  const margins = pageConfig.margins;
  if (
    margins.top < 0 ||
    margins.bottom < 0 ||
    margins.left < 0 ||
    margins.right < 0
  ) {
    errors.push("页面边距不能为负值");
  }

  // 检查可用空间
  const availableHeight = calculateAvailableContentHeight(pageConfig);
  const availableWidth = calculateAvailableContentWidth(pageConfig);

  if (availableHeight <= 0) {
    errors.push("页面可用高度不足，请减少边距或页眉页脚高度");
  }

  if (availableWidth <= 0) {
    errors.push("页面可用宽度不足，请减少左右边距");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 格式化尺寸信息为可读字符串
 * @param {number} pixels - 像素值
 * @param {string} unit - 目标单位 ('px', 'mm', 'in', 'cm', 'pt')
 * @returns {string} 格式化后的字符串
 */
export function formatDimension(pixels, unit = "px") {
  // 处理 undefined、null 或 NaN 值
  if (pixels == null || isNaN(pixels)) {
    return "0";
  }

  const conversionFactor = UNIT_CONVERSION[unit] || UNIT_CONVERSION.px;
  const value = pixels / conversionFactor;

  return value.toFixed(1);
}

/**
 * 将像素转换为指定单位
 * @param {number} pixels - 像素值
 * @param {string} unit - 目标单位
 * @returns {number} 转换后的数值
 */
export function pixelsToUnit(pixels, unit = "px") {
  const conversionFactor = UNIT_CONVERSION[unit] || UNIT_CONVERSION.px;
  return pixels / conversionFactor;
}

/**
 * 将指定单位转换为像素
 * @param {number} value - 数值
 * @param {string} unit - 源单位
 * @returns {number} 像素值
 */
export function unitToPixels(value, unit = "px") {
  const conversionFactor = UNIT_CONVERSION[unit] || UNIT_CONVERSION.px;
  return value * conversionFactor;
}

/**
 * 标准页面尺寸定义（毫米）- 与服务器端保持一致
 */
const STANDARD_PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
  PPT_16_9: { width: 254, height: 143 },
  PPT_4_3: { width: 254, height: 190 },
};

/**
 * 获取标准页面尺寸（毫米）
 * @param {string} preset - 页面预设 (A4, A3, Letter等)
 * @returns {Object} {width, height} 毫米单位
 */
export function getStandardPageSize(preset) {
  return STANDARD_PAGE_SIZES[preset] || STANDARD_PAGE_SIZES.A4;
}

/**
 * 获取所有支持的页面格式
 * @returns {Array} 支持的格式列表
 */
export function getSupportedPageFormats() {
  return Object.keys(STANDARD_PAGE_SIZES);
}

/**
 * 计算页面格式的像素尺寸
 * @param {string} preset - 页面预设
 * @returns {Object} {width, height, widthPx, heightPx}
 */
export function getPageFormatDimensions(preset) {
  const size = getStandardPageSize(preset);
  return {
    width: size.width,
    height: size.height,
    widthPx: Math.round(size.width * UNIT_CONVERSION.mm),
    heightPx: Math.round(size.height * UNIT_CONVERSION.mm),
  };
}

/**
 * 验证页面尺寸与PDF导出的一致性
 * @param {Object} pageConfig - 页面配置
 * @returns {Object} 验证结果和建议
 */
export function validatePageSizeConsistency(pageConfig) {
  const { pageSize } = pageConfig;
  const standardSize = getStandardPageSize(pageSize.preset);

  const issues = [];
  const suggestions = [];

  // 检查自定义尺寸是否与标准尺寸匹配
  if (pageSize.preset !== "Custom") {
    const tolerance = 1; // 1mm容差

    if (Math.abs(pageSize.width - standardSize.width) > tolerance) {
      issues.push(
        `页面宽度 ${pageSize.width}mm 与标准 ${pageSize.preset} 宽度 ${standardSize.width}mm 不匹配`
      );
      suggestions.push(`建议将宽度设置为 ${standardSize.width}mm`);
    }

    if (Math.abs(pageSize.height - standardSize.height) > tolerance) {
      issues.push(
        `页面高度 ${pageSize.height}mm 与标准 ${pageSize.preset} 高度 ${standardSize.height}mm 不匹配`
      );
      suggestions.push(`建议将高度设置为 ${standardSize.height}mm`);
    }
  }

  return {
    isConsistent: issues.length === 0,
    issues,
    suggestions,
    standardSize,
    currentSize: { width: pageSize.width, height: pageSize.height },
  };
}

/**
 * 获取所有页面格式的详细信息（用于调试和显示）
 * @returns {Object} 所有格式的详细信息
 */
export function getAllPageFormatsInfo() {
  const formatsInfo = {};

  Object.keys(STANDARD_PAGE_SIZES).forEach((format) => {
    const dimensions = getPageFormatDimensions(format);
    formatsInfo[format] = {
      ...dimensions,
      description: getFormatDescription(format),
      aspectRatio: (dimensions.width / dimensions.height).toFixed(3),
    };
  });

  return formatsInfo;
}

/**
 * 获取格式描述
 * @param {string} format - 格式名称
 * @returns {string} 格式描述
 */
function getFormatDescription(format) {
  const descriptions = {
    A4: "国际标准A4纸张",
    A3: "国际标准A3纸张",
    A5: "国际标准A5纸张",
    Letter: "美国标准信纸",
    Legal: "美国法律文件纸",
    PPT_16_9: "PowerPoint 16:9 宽屏",
    PPT_4_3: "PowerPoint 4:3 标准",
  };

  return descriptions[format] || format;
}

/**
 * 调试函数：在控制台输出所有格式信息
 */
export function debugPageFormats() {
  const allFormats = getAllPageFormatsInfo();
  console.group("📄 支持的页面格式信息");

  Object.keys(allFormats).forEach((format) => {
    const info = allFormats[format];
    console.log(`${format} (${info.description}):`);
    console.log(`  尺寸: ${info.width}mm × ${info.height}mm`);
    console.log(`  像素: ${info.widthPx}px × ${info.heightPx}px`);
    console.log(`  宽高比: ${info.aspectRatio}`);
    console.log("---");
  });

  console.groupEnd();
  return allFormats;
}
