/**
 * 自动分页算法核心逻辑
 * 处理流式布局的页面内容自动分页
 */

import { calculateAvailableContentHeight } from "./pageCalculator.js";
import { measureLayoutComponent } from "./componentMeasurer.js";
import { createPage } from "../types/schema.js";

/**
 * 分页结果类型定义
 */
export const PAGINATION_RESULT_TYPES = {
  SUCCESS: "success",
  COMPONENT_TOO_LARGE: "component_too_large",
  MEASUREMENT_FAILED: "measurement_failed",
  INVALID_CONFIG: "invalid_config",
};

/**
 * 分页算法配置
 */
export const PAGINATION_CONFIG = {
  // 组件间的最小间距（像素）
  componentSpacing: 8,
  // 页面底部预留空间（像素）
  pageBottomReserve: 10,
  // 测量超时时间（毫秒）
  measurementTimeout: 2000,
  // 是否允许强制分页（即使组件过大）
  allowForcePagination: false,
};

/**
 * 执行自动分页算法
 * @param {Object} pageSchema - 页面架构对象
 * @param {Object} config - 分页配置
 * @returns {Promise<Object>} 分页结果
 */
export async function executeAutoPagination(
  pageSchema,
  config = PAGINATION_CONFIG
) {
  try {
    // 1. 验证输入参数
    const validation = validatePaginationInput(pageSchema);
    if (!validation.valid) {
      return {
        type: PAGINATION_RESULT_TYPES.INVALID_CONFIG,
        success: false,
        errors: validation.errors,
        originalSchema: pageSchema,
      };
    }

    // 2. 计算页面可用高度
    const availableHeight = calculateAvailableContentHeight(
      pageSchema.pageConfig
    );
    const effectiveHeight = availableHeight - config.pageBottomReserve;

    // 3. 收集所有需要分页的组件
    const allComponents = collectAllComponents(pageSchema.pages);

    // 4. 测量组件高度
    const measurementResult = await measureAllComponents(
      allComponents,
      config.measurementTimeout
    );

    if (!measurementResult.success) {
      return {
        type: PAGINATION_RESULT_TYPES.MEASUREMENT_FAILED,
        success: false,
        errors: measurementResult.errors,
        originalSchema: pageSchema,
      };
    }

    // 5. 执行分页计算
    const paginationResult = calculatePagination(
      allComponents,
      measurementResult.heights,
      effectiveHeight,
      config
    );

    // 6. 应用分页结果
    const newSchema = applyPaginationResult(pageSchema, paginationResult);

    return {
      type: PAGINATION_RESULT_TYPES.SUCCESS,
      success: true,
      originalSchema: pageSchema,
      newSchema,
      statistics: {
        originalPages: pageSchema.pages.length,
        newPages: newSchema.pages.length,
        totalComponents: allComponents.length,
        availableHeight: effectiveHeight,
        ...paginationResult.statistics,
      },
      warnings: paginationResult.warnings,
    };
  } catch (error) {
    return {
      type: PAGINATION_RESULT_TYPES.MEASUREMENT_FAILED,
      success: false,
      errors: [error.message],
      originalSchema: pageSchema,
    };
  }
}

/**
 * 验证分页输入参数
 * @param {Object} pageSchema - 页面架构对象
 * @returns {Object} 验证结果
 */
function validatePaginationInput(pageSchema) {
  const errors = [];

  if (!pageSchema) {
    errors.push("页面架构对象不能为空");
  }

  if (!pageSchema.pageConfig) {
    errors.push("页面配置不能为空");
  }

  if (!pageSchema.pages || !Array.isArray(pageSchema.pages)) {
    errors.push("页面数组不能为空");
  }

  const availableHeight = calculateAvailableContentHeight(
    pageSchema.pageConfig
  );
  if (availableHeight <= 0) {
    errors.push("页面可用高度必须大于0");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 收集所有页面中的组件
 * @param {Array} pages - 页面数组
 * @returns {Array} 所有组件的扁平数组
 */
function collectAllComponents(pages) {
  const allComponents = [];

  pages.forEach((page, pageIndex) => {
    page.components.forEach((component, componentIndex) => {
      allComponents.push({
        ...component,
        originalPageIndex: pageIndex,
        originalComponentIndex: componentIndex,
      });
    });
  });

  return allComponents;
}

/**
 * 测量所有组件的高度
 * @param {Array} components - 组件数组
 * @param {number} timeout - 超时时间
 * @returns {Promise<Object>} 测量结果
 */
async function measureAllComponents(components, timeout) {
  try {
    const layoutComponents = components.filter(
      (comp) => comp.type === "layout"
    );

    if (layoutComponents.length === 0) {
      return {
        success: true,
        heights: {},
        errors: [],
      };
    }

    // 等待一段时间确保DOM渲染完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    const measurementPromises = layoutComponents.map(async (component) => {
      try {
        const result = await measureLayoutComponent(component.id);
        return {
          componentId: component.id,
          success: result.found,
          height: result.height || 0,
          details: result.details,
        };
      } catch (error) {
        return {
          componentId: component.id,
          success: false,
          height: 0,
          error: error.message,
        };
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("测量超时")), timeout);
    });

    const measurements = await Promise.race([
      Promise.all(measurementPromises),
      timeoutPromise,
    ]);

    const heights = {};
    const errors = [];

    measurements.forEach((measurement) => {
      if (measurement.success) {
        heights[measurement.componentId] = measurement.height;
      } else {
        errors.push(
          `组件 ${measurement.componentId} 测量失败: ${
            measurement.error || "未知错误"
          }`
        );
      }
    });

    return {
      success: errors.length === 0,
      heights,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      heights: {},
      errors: [error.message],
    };
  }
}

/**
 * 计算分页方案
 * @param {Array} components - 组件数组
 * @param {Object} heights - 组件高度映射
 * @param {number} pageHeight - 页面可用高度
 * @param {Object} config - 配置对象
 * @returns {Object} 分页方案
 */
function calculatePagination(components, heights, pageHeight, config) {
  const pages = [];
  const warnings = [];
  const oversizedComponents = [];

  let currentPage = [];
  let currentPageHeight = 0;

  for (const component of components) {
    const componentHeight = heights[component.id] || 0;

    // 检查组件是否过大
    if (componentHeight > pageHeight) {
      oversizedComponents.push({
        id: component.id,
        height: componentHeight,
        maxHeight: pageHeight,
      });

      if (!config.allowForcePagination) {
        warnings.push(
          `组件 ${component.id} 高度 (${componentHeight}px) 超过页面可用高度 (${pageHeight}px)`
        );
        continue;
      }
    }

    // 计算添加当前组件后的总高度
    const newHeight =
      currentPageHeight +
      componentHeight +
      (currentPage.length > 0 ? config.componentSpacing : 0);

    // 如果超出页面高度，开始新页面
    if (newHeight > pageHeight && currentPage.length > 0) {
      pages.push([...currentPage]);
      currentPage = [component];
      currentPageHeight = componentHeight;
    } else {
      // 添加到当前页面
      currentPage.push(component);
      currentPageHeight = newHeight;
    }
  }

  // 添加最后一页
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return {
    pages,
    warnings,
    oversizedComponents,
    statistics: {
      totalPages: pages.length,
      averageComponentsPerPage:
        pages.length > 0 ? components.length / pages.length : 0,
      oversizedCount: oversizedComponents.length,
    },
  };
}

/**
 * 应用分页结果到页面架构
 * @param {Object} originalSchema - 原始页面架构
 * @param {Object} paginationResult - 分页结果
 * @returns {Object} 新的页面架构
 */
function applyPaginationResult(originalSchema, paginationResult) {
  const newSchema = {
    ...originalSchema,
    pages: [],
    updatedAt: new Date().toISOString(),
  };

  // 获取原始页面的样式配置作为模板
  const originalPageStyles = originalSchema.pages.map(
    (page) => page.style || {}
  );
  const defaultPageStyle = originalPageStyles[0] || {
    backgroundColor: "transparent",
    backgroundImage: "",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  paginationResult.pages.forEach((pageComponents, index) => {
    // 尝试使用对应原始页面的样式，如果没有则使用第一个页面的样式
    const pageStyle = originalPageStyles[index] || defaultPageStyle;

    const page = createPage({
      name: `页面 ${index + 1}`,
      style: { ...pageStyle }, // 保留原始页面的样式配置
      components: pageComponents.map((comp) => {
        // 移除分页算法添加的临时属性
        // eslint-disable-next-line no-unused-vars
        const { originalPageIndex, originalComponentIndex, ...cleanComponent } =
          comp;
        return cleanComponent;
      }),
    });

    newSchema.pages.push(page);
  });

  // 如果没有页面，创建一个空页面（使用默认样式）
  if (newSchema.pages.length === 0) {
    newSchema.pages.push(createPage({ style: { ...defaultPageStyle } }));
  }

  return newSchema;
}

/**
 * 检查是否需要重新分页
 * 🎯 修改逻辑：只有当独立组件超出布局高度时才进行分页
 * 如果是组件在当前页面的部分超出了高度，则超出部分不展示，不进行分页警告
 * @param {Object} pageSchema - 页面架构
 * @param {Object} config - 配置
 * @returns {Promise<boolean>} 是否需要重新分页
 */
export async function shouldRepaginate(pageSchema, config = PAGINATION_CONFIG) {
  try {
    const availableHeight = calculateAvailableContentHeight(
      pageSchema.pageConfig
    );
    const effectiveHeight = availableHeight - config.pageBottomReserve;

    for (const page of pageSchema.pages) {
      const layoutComponents = page.components.filter(
        (comp) => comp.type === "layout"
      );

      if (layoutComponents.length === 0) continue;

      // 🎯 检查每个独立的布局组件是否超出高度
      for (const component of layoutComponents) {
        const measurementResult = await measureLayoutComponent(component);

        // 只有当单个独立组件的高度超出页面高度时才需要分页
        if (measurementResult.height > effectiveHeight) {
          console.log(
            `🔄 检测到独立组件超出高度: ${component.id}, 高度: ${measurementResult.height}px, 可用高度: ${effectiveHeight}px`
          );
          return true;
        }
      }
    }

    console.log(`✅ 所有独立组件都在可用高度范围内，无需分页`);
    return false;
  } catch (error) {
    console.warn("检查分页需求时出错:", error);
    return false;
  }
}
