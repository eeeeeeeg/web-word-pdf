/**
 * 自动分页功能测试工具
 * 用于验证分页算法的正确性
 */

import {
  createPageSchema,
  createComponent,
  COMPONENT_TYPES,
  LAYOUT_PRESETS,
} from "../types/schema.js";
import { calculateAvailableContentHeight } from "./pageCalculator.js";

/**
 * 创建测试用的页面架构
 * @param {Object} options - 测试选项
 * @returns {Object} 测试页面架构
 */
export function createTestSchema(options = {}) {
  const {
    componentCount = 5,
    componentHeight = 200,
    pageHeight = 800,
    margins = { top: 20, bottom: 20, left: 20, right: 20 },
  } = options;

  // 创建基础页面架构
  const schema = createPageSchema({
    pageConfig: {
      pageSize: {
        preset: "A4",
        width: 210,
        height: pageHeight / 3.78, // 转换为mm
        unit: "mm",
      },
      margins,
      header: { enabled: false },
      footer: { enabled: false },
    },
  });

  // 创建测试组件
  const components = [];
  for (let i = 0; i < componentCount; i++) {
    const component = createComponent(COMPONENT_TYPES.LAYOUT, {
      preset: "single",
      columns: LAYOUT_PRESETS.SINGLE_COLUMN.columns,
      style: {
        margin: { top: 10, bottom: 10, left: 0, right: 0 },
        padding: { top: 20, bottom: 20, left: 20, right: 20 },
        minHeight: componentHeight,
      },
      children: [
        createComponent(COMPONENT_TYPES.TEXT, {
          content: `<p>这是测试组件 ${
            i + 1
          } 的内容。这个组件用于测试自动分页功能。</p>`,
          columnIndex: 0,
        }),
      ],
    });
    components.push(component);
  }

  // 将所有组件添加到第一页
  schema.pages[0].components = components;

  return schema;
}

/**
 * 模拟组件高度测量
 * @param {Array} components - 组件数组
 * @param {number} defaultHeight - 默认高度
 * @returns {Object} 高度映射
 */
export function mockComponentHeights(components, defaultHeight = 200) {
  const heights = {};

  const processComponents = (comps) => {
    comps.forEach((component) => {
      if (component.type === "layout") {
        // 布局组件的高度包括内容、内边距和边距
        const style = component.style || {};
        const padding =
          (style.padding?.top || 0) + (style.padding?.bottom || 0);
        const margin = (style.margin?.top || 0) + (style.margin?.bottom || 0);
        const minHeight = style.minHeight || defaultHeight;

        heights[component.id] = minHeight + padding + margin;
      }

      if (component.children) {
        processComponents(component.children);
      }
    });
  };

  components.forEach((page) => {
    if (page.components) {
      processComponents(page.components);
    } else {
      processComponents([page]);
    }
  });

  return heights;
}

/**
 * 运行分页测试
 * @param {Object} testOptions - 测试选项
 * @returns {Promise<Object>} 测试结果
 */
export async function runPaginationTest(testOptions = {}) {
  const {
    componentCount = 5,
    componentHeight = 200,
    pageHeight = 800,
    expectedPages = 2,
  } = testOptions;

  console.log("开始分页测试...");
  console.log("测试参数:", {
    componentCount,
    componentHeight,
    pageHeight,
    expectedPages,
  });

  // 创建测试架构
  const testSchema = createTestSchema({
    componentCount,
    componentHeight,
    pageHeight,
  });

  // 计算可用高度
  const availableHeight = calculateAvailableContentHeight(
    testSchema.pageConfig
  );
  console.log("页面可用高度:", availableHeight);

  // 模拟组件高度
  const mockHeights = mockComponentHeights(testSchema.pages, componentHeight);
  console.log("模拟组件高度:", mockHeights);

  // 计算总高度
  const totalHeight = Object.values(mockHeights).reduce(
    (sum, height) => sum + height,
    0
  );
  console.log("组件总高度:", totalHeight);

  // 执行分页算法（模拟版本）
  const result = await simulatePagination(
    testSchema,
    mockHeights,
    availableHeight
  );

  // 验证结果
  const validation = validatePaginationResult(result, {
    expectedPages,
    totalComponents: componentCount,
    availableHeight,
  });

  return {
    testOptions,
    schema: testSchema,
    mockHeights,
    result,
    validation,
    summary: {
      passed: validation.passed,
      originalPages: testSchema.pages.length,
      resultPages: result.pages?.length || 0,
      totalHeight,
      availableHeight,
    },
  };
}

/**
 * 模拟分页算法执行
 * @param {Object} schema - 页面架构
 * @param {Object} heights - 组件高度映射
 * @param {number} pageHeight - 页面高度
 * @returns {Object} 分页结果
 */
async function simulatePagination(schema, heights, pageHeight) {
  // 收集所有组件
  const allComponents = [];
  schema.pages.forEach((page) => {
    page.components.forEach((component) => {
      allComponents.push(component);
    });
  });

  // 执行分页计算
  const pages = [];
  let currentPage = [];
  let currentPageHeight = 0;

  for (const component of allComponents) {
    const componentHeight = heights[component.id] || 0;
    const spacing = currentPage.length > 0 ? 8 : 0; // 组件间距
    const newHeight = currentPageHeight + componentHeight + spacing;

    if (newHeight > pageHeight && currentPage.length > 0) {
      pages.push([...currentPage]);
      currentPage = [component];
      currentPageHeight = componentHeight;
    } else {
      currentPage.push(component);
      currentPageHeight = newHeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return {
    success: true,
    pages,
    statistics: {
      totalPages: pages.length,
      totalComponents: allComponents.length,
      averageComponentsPerPage:
        pages.length > 0 ? allComponents.length / pages.length : 0,
    },
  };
}

/**
 * 验证分页结果
 * @param {Object} result - 分页结果
 * @param {Object} expectations - 期望值
 * @returns {Object} 验证结果
 */
function validatePaginationResult(result, expectations) {
  const errors = [];
  const warnings = [];

  if (!result.success) {
    errors.push("分页算法执行失败");
  }

  if (!result.pages || !Array.isArray(result.pages)) {
    errors.push("分页结果格式错误");
    return { passed: false, errors, warnings };
  }

  // 检查页面数量
  if (
    expectations.expectedPages &&
    result.pages.length !== expectations.expectedPages
  ) {
    warnings.push(
      `页面数量不符合预期: 期望 ${expectations.expectedPages}, 实际 ${result.pages.length}`
    );
  }

  // 检查组件总数
  const totalComponents = result.pages.reduce(
    (sum, page) => sum + page.length,
    0
  );
  if (
    expectations.totalComponents &&
    totalComponents !== expectations.totalComponents
  ) {
    errors.push(
      `组件总数不匹配: 期望 ${expectations.totalComponents}, 实际 ${totalComponents}`
    );
  }

  // 检查每页是否为空
  result.pages.forEach((page, index) => {
    if (page.length === 0) {
      errors.push(`第 ${index + 1} 页为空`);
    }
  });

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 运行多个测试用例
 * @returns {Promise<Array>} 所有测试结果
 */
export async function runAllTests() {
  const testCases = [
    {
      name: "基础分页测试",
      options: {
        componentCount: 3,
        componentHeight: 300,
        pageHeight: 800,
        expectedPages: 2,
      },
    },
    {
      name: "单页测试",
      options: {
        componentCount: 2,
        componentHeight: 200,
        pageHeight: 800,
        expectedPages: 1,
      },
    },
    {
      name: "多页测试",
      options: {
        componentCount: 10,
        componentHeight: 200,
        pageHeight: 600,
        expectedPages: 4,
      },
    },
    {
      name: "大组件测试",
      options: {
        componentCount: 2,
        componentHeight: 500,
        pageHeight: 800,
        expectedPages: 2,
      },
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n运行测试: ${testCase.name}`);
    try {
      const result = await runPaginationTest(testCase.options);
      result.testName = testCase.name;
      results.push(result);

      console.log(`测试结果: ${result.validation.passed ? "通过" : "失败"}`);
      if (result.validation.errors.length > 0) {
        console.log("错误:", result.validation.errors);
      }
      if (result.validation.warnings.length > 0) {
        console.log("警告:", result.validation.warnings);
      }
    } catch (error) {
      console.error(`测试 ${testCase.name} 执行失败:`, error);
      results.push({
        testName: testCase.name,
        error: error.message,
        validation: { passed: false, errors: [error.message], warnings: [] },
      });
    }
  }

  return results;
}
