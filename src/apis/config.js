/**
 * API 配置文件
 * 统一管理 API 相关的配置
 */

// API基础URL
export const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3001/api';

// API 端点配置
export const API_ENDPOINTS = {
  // 分享相关
  SHARE: {
    CREATE: '/share/create',
    GET: '/share/:shareId',
    STATS: '/share/:shareId/stats',
    DELETE: '/share/:shareId',
    CLEANUP: '/share/cleanup'
  },
  
  // 导出相关
  EXPORT: {
    PDF: '/export/pdf',
    WORD: '/export/word',
    PPT: '/export/ppt'
  },
  
  // 健康检查
  HEALTH: '/health'
};

// 请求配置
export const REQUEST_CONFIG = {
  TIMEOUT: 10000, // 10秒超时
  RETRY_COUNT: 3, // 重试次数
  RETRY_DELAY: 1000 // 重试延迟（毫秒）
};

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  CHUNK_SIZE: 1024 * 1024 // 1MB 分片大小
};

// 错误码映射
export const ERROR_CODES = {
  // 通用错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  
  // 分享相关错误
  SHARE_NOT_FOUND: 'SHARE_NOT_FOUND',
  SHARE_EXPIRED: 'SHARE_EXPIRED',
  SHARE_INVALID: 'SHARE_INVALID',
  
  // 权限相关错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // 服务器错误
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};
