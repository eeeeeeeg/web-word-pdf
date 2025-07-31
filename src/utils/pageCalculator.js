/**
 * 页面高度计算工具
 * 用于自动分页算法中的页面尺寸和可用高度计算
 */

/**
 * 单位转换常量 (基于96dpi)
 */
const UNIT_CONVERSION = {
  mm: 3.78, // 1mm ≈ 3.78px
  in: 96,   // 1in = 96px
  px: 1,    // 1px = 1px
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
  const availableHeight = totalHeight - margins.top - margins.bottom - headerHeight - footerHeight;
  
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
  if (!pageConfig.pageSize || pageConfig.pageSize.width <= 0 || pageConfig.pageSize.height <= 0) {
    errors.push('页面尺寸必须大于0');
  }
  
  // 检查边距
  const margins = pageConfig.margins;
  if (margins.top < 0 || margins.bottom < 0 || margins.left < 0 || margins.right < 0) {
    errors.push('页面边距不能为负值');
  }
  
  // 检查可用空间
  const availableHeight = calculateAvailableContentHeight(pageConfig);
  const availableWidth = calculateAvailableContentWidth(pageConfig);
  
  if (availableHeight <= 0) {
    errors.push('页面可用高度不足，请减少边距或页眉页脚高度');
  }
  
  if (availableWidth <= 0) {
    errors.push('页面可用宽度不足，请减少左右边距');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 格式化尺寸信息为可读字符串
 * @param {number} pixels - 像素值
 * @param {string} unit - 目标单位 ('px', 'mm', 'in')
 * @returns {string} 格式化后的字符串
 */
export function formatDimension(pixels, unit = 'px') {
  const conversionFactor = UNIT_CONVERSION[unit] || UNIT_CONVERSION.px;
  const value = pixels / conversionFactor;
  
  return `${value.toFixed(1)}${unit}`;
}
