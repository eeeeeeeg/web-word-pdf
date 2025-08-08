/**
 * 基于服务器的分享管理器
 * 用于与后端API交互，解决base64图片导致URL过长的问题
 */

import axios from 'axios';

// API基础URL
const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3001/api';

/**
 * 服务器端分享管理器
 */
export class ServerShareManager {
  /**
   * 创建分享
   * @param {Object} schema - 页面设计数据
   * @param {Object} options - 分享选项
   * @returns {Promise<Object>} 分享结果
   */
  static async createShare(schema, options = {}) {
    try {
      // 验证数据
      if (!this.validateSchema(schema)) {
        throw new Error('页面设计数据无效');
      }

      const response = await axios.post(`${API_BASE_URL}/share/create`, {
        schema: schema,
        options: {
          title: options.title || '页面设计分享',
          description: options.description || '',
          expiresIn: options.expiresIn || 7 * 24 * 60 * 60 * 1000, // 默认7天
        }
      });

      if (response.data.success) {
        return {
          success: true,
          shareId: response.data.shareId,
          shareUrl: response.data.shareUrl,
          expiresAt: response.data.expiresAt,
          expirationDate: response.data.expirationDate
        };
      } else {
        throw new Error(response.data.message || '创建分享失败');
      }
    } catch (error) {
      console.error('创建分享失败:', error);
      
      if (error.response) {
        // 服务器返回错误
        throw new Error(error.response.data.message || '服务器错误');
      } else if (error.request) {
        // 网络错误
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        // 其他错误
        throw new Error(error.message || '创建分享失败');
      }
    }
  }

  /**
   * 获取分享数据
   * @param {string} shareId - 分享ID
   * @returns {Promise<Object>} 分享数据
   */
  static async getShare(shareId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/share/${shareId}`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取分享数据失败');
      }
    } catch (error) {
      console.error('获取分享数据失败:', error);
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data.message;
        
        if (status === 404) {
          throw new Error('分享不存在或已被删除');
        } else if (status === 410) {
          throw new Error('分享已过期');
        } else {
          throw new Error(message || '获取分享数据失败');
        }
      } else if (error.request) {
        throw new Error('网络连接失败，请检查网络连接');
      } else {
        throw new Error(error.message || '获取分享数据失败');
      }
    }
  }

  /**
   * 获取分享统计信息
   * @param {string} shareId - 分享ID
   * @returns {Promise<Object>} 统计信息
   */
  static async getShareStats(shareId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/share/${shareId}/stats`);

      if (response.data.success) {
        return response.data.stats;
      } else {
        throw new Error(response.data.message || '获取统计信息失败');
      }
    } catch (error) {
      console.error('获取分享统计失败:', error);
      throw new Error(error.response?.data?.message || '获取统计信息失败');
    }
  }

  /**
   * 删除分享
   * @param {string} shareId - 分享ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  static async deleteShare(shareId) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/share/${shareId}`);
      return response.data.success;
    } catch (error) {
      console.error('删除分享失败:', error);
      return false;
    }
  }

  /**
   * 验证页面设计数据
   * @param {Object} schema - 页面设计数据
   * @returns {boolean} 是否有效
   */
  static validateSchema(schema) {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    // 检查必要的属性
    if (!schema.pages || !Array.isArray(schema.pages) || schema.pages.length === 0) {
      return false;
    }

    if (!schema.pageConfig || typeof schema.pageConfig !== 'object') {
      return false;
    }

    // 检查页面配置
    const pageConfig = schema.pageConfig;
    if (!pageConfig.pageSize || !pageConfig.margins) {
      return false;
    }

    return true;
  }

  /**
   * 生成前端分享链接
   * @param {string} shareId - 分享ID
   * @returns {string} 前端分享链接
   */
  static generateFrontendShareUrl(shareId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/share/${shareId}`;
  }

  /**
   * 从URL中提取分享ID
   * @param {string} url - 分享URL
   * @returns {string|null} 分享ID
   */
  static extractShareIdFromUrl(url) {
    try {
      const match = url.match(/#\/share\/([a-f0-9]{32})/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('提取分享ID失败:', error);
      return null;
    }
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
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const result = document.execCommand('copy');
        textArea.remove();
        return result;
      }
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      return false;
    }
  }

  /**
   * 计算分享统计信息（客户端版本）
   * @param {Object} schema - 页面设计数据
   * @returns {Object} 统计信息
   */
  static calculateShareStats(schema) {
    if (!this.validateSchema(schema)) {
      return {
        pageCount: 0,
        componentCount: 0,
        hasHeader: false,
        hasFooter: false,
        pageSize: 'Unknown'
      };
    }

    const stats = {
      pageCount: schema.pages.length,
      componentCount: 0,
      hasHeader: schema.pageConfig.header.enabled,
      hasFooter: schema.pageConfig.footer.enabled,
      pageSize: `${schema.pageConfig.pageSize.width}×${schema.pageConfig.pageSize.height}${schema.pageConfig.pageSize.unit}`
    };

    // 统计组件数量
    schema.pages.forEach(page => {
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
 * 分享错误类型
 */
export const SHARE_ERRORS = {
  INVALID_DATA: 'INVALID_DATA',
  SHARE_NOT_FOUND: 'SHARE_NOT_FOUND',
  SHARE_EXPIRED: 'SHARE_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CREATE_FAILED: 'CREATE_FAILED',
  FETCH_FAILED: 'FETCH_FAILED'
};

/**
 * 默认分享选项
 */
export const DEFAULT_SHARE_OPTIONS = {
  title: '页面设计分享',
  description: '',
  expiresIn: 7 * 24 * 60 * 60 * 1000 // 7天
};
