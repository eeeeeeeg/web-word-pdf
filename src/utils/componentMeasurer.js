/**
 * 组件高度测量服务
 * 用于动态测量布局组件的实际渲染高度
 */

/**
 * 测量单个DOM元素的完整高度（包括margin）
 * @param {HTMLElement} element - 要测量的DOM元素
 * @returns {Object} 高度信息对象
 */
export function measureElementHeight(element) {
  if (!element) {
    return {
      content: 0,
      padding: 0,
      border: 0,
      margin: 0,
      total: 0,
    };
  }

  const computedStyle = window.getComputedStyle(element);
  
  // 获取各种高度值
  const contentHeight = element.clientHeight;
  const borderHeight = parseFloat(computedStyle.borderTopWidth) + parseFloat(computedStyle.borderBottomWidth);
  const paddingHeight = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
  const marginHeight = parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom);
  
  // 内容高度（不包括padding和border）
  const actualContentHeight = contentHeight - paddingHeight;
  
  // 总高度（包括所有）
  const totalHeight = contentHeight + borderHeight + marginHeight;

  return {
    content: Math.max(0, actualContentHeight),
    padding: paddingHeight,
    border: borderHeight,
    margin: marginHeight,
    total: totalHeight,
    // 额外信息
    clientHeight: contentHeight,
    offsetHeight: element.offsetHeight,
    scrollHeight: element.scrollHeight,
  };
}

/**
 * 测量布局组件的高度
 * @param {string} componentId - 组件ID
 * @returns {Promise<Object>} 高度测量结果
 */
export function measureLayoutComponent(componentId) {
  return new Promise((resolve) => {
    // 使用 requestAnimationFrame 确保DOM已经渲染完成
    requestAnimationFrame(() => {
      const element = document.querySelector(`[data-component-id="${componentId}"]`);
      
      if (!element) {
        resolve({
          found: false,
          componentId,
          height: 0,
          error: 'Component element not found',
        });
        return;
      }

      const heightInfo = measureElementHeight(element);
      
      resolve({
        found: true,
        componentId,
        height: heightInfo.total,
        details: heightInfo,
        element: {
          tagName: element.tagName,
          className: element.className,
          rect: element.getBoundingClientRect(),
        },
      });
    });
  });
}

/**
 * 批量测量多个组件的高度
 * @param {string[]} componentIds - 组件ID数组
 * @returns {Promise<Object[]>} 所有组件的高度测量结果
 */
export async function measureMultipleComponents(componentIds) {
  const promises = componentIds.map(id => measureLayoutComponent(id));
  return Promise.all(promises);
}

/**
 * 测量页面中所有布局组件的高度
 * @param {Array} components - 组件数组
 * @returns {Promise<Object>} 测量结果映射
 */
export async function measurePageComponents(components) {
  const layoutComponents = components.filter(comp => comp.type === 'layout');
  const componentIds = layoutComponents.map(comp => comp.id);
  
  const measurements = await measureMultipleComponents(componentIds);
  
  // 转换为映射对象
  const heightMap = {};
  measurements.forEach(measurement => {
    if (measurement.found) {
      heightMap[measurement.componentId] = measurement;
    }
  });
  
  return {
    total: measurements.length,
    found: measurements.filter(m => m.found).length,
    missing: measurements.filter(m => !m.found).length,
    heights: heightMap,
    totalHeight: Object.values(heightMap).reduce((sum, m) => sum + m.height, 0),
  };
}

/**
 * 创建高度变化监听器
 * @param {string} componentId - 组件ID
 * @param {Function} callback - 高度变化回调函数
 * @returns {Object} 监听器对象，包含 disconnect 方法
 */
export function createHeightObserver(componentId, callback) {
  const element = document.querySelector(`[data-component-id="${componentId}"]`);
  
  if (!element) {
    console.warn(`Component element not found: ${componentId}`);
    return { disconnect: () => {} };
  }

  // 使用 ResizeObserver 监听尺寸变化
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const heightInfo = measureElementHeight(entry.target);
      callback({
        componentId,
        height: heightInfo.total,
        details: heightInfo,
        timestamp: Date.now(),
      });
    }
  });

  // 使用 MutationObserver 监听内容变化
  const mutationObserver = new MutationObserver(() => {
    // 延迟测量，等待DOM更新完成
    setTimeout(() => {
      const heightInfo = measureElementHeight(element);
      callback({
        componentId,
        height: heightInfo.total,
        details: heightInfo,
        timestamp: Date.now(),
        trigger: 'mutation',
      });
    }, 10);
  });

  // 开始观察
  resizeObserver.observe(element);
  mutationObserver.observe(element, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  return {
    disconnect() {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    },
  };
}

/**
 * 创建页面级别的高度监听器
 * @param {Array} components - 组件数组
 * @param {Function} callback - 变化回调函数
 * @returns {Object} 监听器管理对象
 */
export function createPageHeightObserver(components, callback) {
  const observers = new Map();
  
  const layoutComponents = components.filter(comp => comp.type === 'layout');
  
  layoutComponents.forEach(component => {
    const observer = createHeightObserver(component.id, (data) => {
      callback({
        type: 'component-height-changed',
        componentId: component.id,
        ...data,
      });
    });
    
    observers.set(component.id, observer);
  });

  return {
    addComponent(component) {
      if (component.type === 'layout' && !observers.has(component.id)) {
        const observer = createHeightObserver(component.id, (data) => {
          callback({
            type: 'component-height-changed',
            componentId: component.id,
            ...data,
          });
        });
        observers.set(component.id, observer);
      }
    },
    
    removeComponent(componentId) {
      const observer = observers.get(componentId);
      if (observer) {
        observer.disconnect();
        observers.delete(componentId);
      }
    },
    
    disconnect() {
      observers.forEach(observer => observer.disconnect());
      observers.clear();
    },
    
    getObservedComponents() {
      return Array.from(observers.keys());
    },
  };
}

/**
 * 等待组件渲染完成后测量高度
 * @param {string} componentId - 组件ID
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Object>} 测量结果
 */
export function waitAndMeasure(componentId, timeout = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = timeout / 50; // 每50ms检查一次
    
    const checkAndMeasure = () => {
      attempts++;
      
      measureLayoutComponent(componentId).then(result => {
        if (result.found) {
          resolve(result);
        } else if (attempts >= maxAttempts) {
          reject(new Error(`Component ${componentId} not found after ${timeout}ms`));
        } else {
          setTimeout(checkAndMeasure, 50);
        }
      });
    };
    
    checkAndMeasure();
  });
}
