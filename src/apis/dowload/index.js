import api from "../request";
import { API_ENDPOINTS } from "../config";

/**
 * 导出相关API接口
 */

/**
 * 导出PDF
 * @param {string} htmlContent - HTML内容
 * @param {Object} options - 导出选项
 * @param {string} taskId - 任务ID
 * @returns {Promise} 导出结果
 */
export const exportPDF = (htmlContent, options = {}, taskId = "unknown") => {
  return api.download(API_ENDPOINTS.EXPORT.PDF, {
    htmlContent,
    options,
    taskId,
  });
};

/**
 * 导出Word
 * @param {string} htmlContent - HTML内容
 * @param {Object} options - 导出选项
 * @param {string} taskId - 任务ID
 * @returns {Promise} 导出结果
 */
export const exportWord = (htmlContent, options = {}, taskId = "unknown") => {
  return api.download(API_ENDPOINTS.EXPORT.WORD, {
    htmlContent,
    options,
    taskId,
  });
};
