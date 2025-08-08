import api from "../request";
import { API_ENDPOINTS } from "../config";

/**
 * 分享相关API接口
 */

/**
 * 创建分享
 * @param {Object} schema - 页面设计数据
 * @param {Object} options - 分享选项
 * @returns {Promise<Object>} 分享结果
 */
export const createShare = (schema, options = {}) => {
  return api.post(API_ENDPOINTS.SHARE.CREATE, {
    schema: schema,
    options: {
      title: options.title || "页面设计分享",
      description: options.description || "",
      expiresIn: options.expiresIn || 7 * 24 * 60 * 60 * 1000, // 默认7天
    },
  });
};

/**
 * 获取分享数据
 * @param {string} shareId - 分享ID
 * @returns {Promise<Object>} 分享数据
 */
export const getShare = (shareId) => {
  return api.get(API_ENDPOINTS.SHARE.GET.replace(":shareId", shareId));
};

/**
 * 获取分享统计信息
 * @param {string} shareId - 分享ID
 * @returns {Promise<Object>} 统计信息
 */
export const getShareStats = (shareId) => {
  return api.get(API_ENDPOINTS.SHARE.STATS.replace(":shareId", shareId));
};

/**
 * 删除分享
 * @param {string} shareId - 分享ID
 * @returns {Promise<boolean>} 是否删除成功
 */
export const deleteShare = (shareId) => {
  return api.delete(API_ENDPOINTS.SHARE.DELETE.replace(":shareId", shareId));
};

/**
 * 清理过期分享
 * @returns {Promise<Object>} 清理结果
 */
export const cleanupExpiredShares = () => {
  return api.post(API_ENDPOINTS.SHARE.CLEANUP);
};

/**
 * 分享错误类型
 */
export const SHARE_ERRORS = {
  INVALID_DATA: "INVALID_DATA",
  SHARE_NOT_FOUND: "SHARE_NOT_FOUND",
  SHARE_EXPIRED: "SHARE_EXPIRED",
  NETWORK_ERROR: "NETWORK_ERROR",
  CREATE_FAILED: "CREATE_FAILED",
  FETCH_FAILED: "FETCH_FAILED",
};

/**
 * 默认分享选项
 */
export const DEFAULT_SHARE_OPTIONS = {
  title: "页面设计分享",
  description: "",
  expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天
};
