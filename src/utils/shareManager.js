/**
 * 页面分享管理器
 * 用于生成和解析分享链接
 */

// 简单的数据压缩工具（避免外部依赖）
const SimpleCompress = {
  compress(str) {
    try {
      return btoa(encodeURIComponent(str));
    } catch (error) {
      console.error("压缩失败:", error);
      return str;
    }
  },

  decompress(str) {
    try {
      return decodeURIComponent(atob(str));
    } catch (error) {
      console.error("解压失败:", error);
      throw new Error("数据解压失败");
    }
  },
};

/**
 * 分享链接管理器
 */
export class ShareManager {
  /**
   * 生成分享链接
   * @param {Object} schema - 页面设计数据
   * @param {Object} options - 分享选项
   * @returns {string} 分享链接
   */
  static generateShareLink(schema, options = {}) {
    try {
      // 准备分享数据
      const shareData = {
        schema: schema,
        timestamp: Date.now(),
        version: "1.0",
        options: {
          title: options.title || "页面设计分享",
          description: options.description || "",
          expiresIn: options.expiresIn || 7 * 24 * 60 * 60 * 1000, // 默认7天过期
        },
      };

      // 压缩数据
      const compressedData = SimpleCompress.compress(JSON.stringify(shareData));

      // 生成分享链接
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}#/share/${compressedData}`;

      return shareUrl;
    } catch (error) {
      console.error("生成分享链接失败:", error);
      throw new Error("生成分享链接失败");
    }
  }

  /**
   * 解析分享链接
   * @param {string} shareId - 分享ID（压缩后的数据）
   * @returns {Object} 解析后的数据
   */
  static parseShareLink(shareId) {
    try {
      // 解压数据
      const decompressedData = SimpleCompress.decompress(shareId);

      if (!decompressedData) {
        throw new Error("无效的分享链接");
      }

      const shareData = JSON.parse(decompressedData);

      // 检查数据格式
      if (!shareData.schema || !shareData.timestamp) {
        throw new Error("分享数据格式错误");
      }

      // 检查是否过期
      const now = Date.now();
      const expiresAt = shareData.timestamp + shareData.options.expiresIn;

      if (now > expiresAt) {
        throw new Error("分享链接已过期");
      }

      return shareData;
    } catch (error) {
      console.error("解析分享链接失败:", error);
      throw error;
    }
  }

  /**
   * 生成短链接ID（用于服务器存储方案）
   * @returns {string} 短链接ID
   */
  static generateShortId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * 复制链接到剪贴板
   * @param {string} url - 要复制的链接
   * @returns {Promise<boolean>} 是否复制成功
   */
  static async copyToClipboard(url) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        return true;
      } else {
        // 降级方案
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand("copy");
        textArea.remove();
        return result;
      }
    } catch (error) {
      console.error("复制到剪贴板失败:", error);
      return false;
    }
  }

  /**
   * 验证分享数据
   * @param {Object} schema - 页面设计数据
   * @returns {boolean} 是否有效
   */
  static validateSchema(schema) {
    try {
      return (
        schema &&
        schema.pages &&
        Array.isArray(schema.pages) &&
        schema.pageConfig
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取分享统计信息
   * @param {Object} schema - 页面设计数据
   * @returns {Object} 统计信息
   */
  static getShareStats(schema) {
    if (!this.validateSchema(schema)) {
      return null;
    }

    const stats = {
      pageCount: schema.pages.length,
      componentCount: 0,
      hasHeader: schema.pageConfig.header.enabled,
      hasFooter: schema.pageConfig.footer.enabled,
      pageSize: `${schema.pageConfig.pageSize.width}×${schema.pageConfig.pageSize.height}${schema.pageConfig.pageSize.unit}`,
    };

    // 统计组件数量
    schema.pages.forEach((page) => {
      stats.componentCount += page.components.length;
    });

    if (stats.hasHeader) {
      stats.componentCount += schema.pageConfig.header.components.length;
    }

    if (stats.hasFooter) {
      stats.componentCount += schema.pageConfig.footer.components.length;
    }

    return stats;
  }
}

/**
 * 分享选项默认值
 */
export const DEFAULT_SHARE_OPTIONS = {
  title: "页面设计分享",
  description: "",
  expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天
};

/**
 * 分享错误类型
 */
export const SHARE_ERRORS = {
  INVALID_DATA: "INVALID_DATA",
  EXPIRED: "EXPIRED",
  NETWORK_ERROR: "NETWORK_ERROR",
  COPY_FAILED: "COPY_FAILED",
};
