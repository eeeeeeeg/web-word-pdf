// 服务器端草稿管理工具
import axios from "axios";

/**
 * 服务器端草稿管理器
 */
export class ServerDraftManager {
  constructor() {
    this.baseURL =
      process.env.VUE_APP_API_BASE_URL || "http://localhost:3002/api";
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 请求拦截器
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log(`API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error("API请求错误:", error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error("API响应错误:", error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取所有草稿
   */
  async getSavedDrafts() {
    try {
      const response = await this.apiClient.get("/drafts");
      return response.data.data || [];
    } catch (error) {
      console.error("获取草稿列表失败:", error);
      throw new Error(
        "获取草稿列表失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 根据ID获取草稿
   */
  async getDraftById(id) {
    try {
      const response = await this.apiClient.get(`/drafts/${id}`);
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error("获取草稿失败:", error);
      throw new Error(
        "获取草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 保存草稿
   */
  async saveDraft(schema, name = "") {
    try {
      const response = await this.apiClient.post("/drafts", {
        schema,
        name,
      });
      return response.data.data.id;
    } catch (error) {
      console.error("保存草稿失败:", error);
      throw new Error(
        "保存草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 更新草稿
   */
  async updateDraft(id, schema, name = null) {
    try {
      const response = await this.apiClient.put(`/drafts/${id}`, {
        schema,
        name,
      });
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("草稿不存在");
      }
      console.error("更新草稿失败:", error);
      throw new Error(
        "更新草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 删除草稿
   */
  async deleteDraft(id) {
    try {
      await this.apiClient.delete(`/drafts/${id}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("草稿不存在");
      }
      console.error("删除草稿失败:", error);
      throw new Error(
        "删除草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 清空所有草稿
   */
  async clearAllDrafts() {
    try {
      await this.apiClient.delete("/drafts");
      return true;
    } catch (error) {
      console.error("清空草稿失败:", error);
      throw new Error(
        "清空草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 将草稿转换为正式版本
   */
  async draftToSchema(draftId, schemaName = null) {
    try {
      const response = await this.apiClient.post(`/drafts/${draftId}/convert`, {
        schemaName,
      });
      return response.data.data.id;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("草稿不存在");
      }
      console.error("转换草稿失败:", error);
      throw new Error(
        "转换草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 获取草稿统计信息
   */
  async getDraftStats() {
    try {
      const response = await this.apiClient.get("/drafts/stats");
      return response.data.data;
    } catch (error) {
      console.error("获取草稿统计失败:", error);
      throw new Error(
        "获取草稿统计失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 备份草稿
   */
  async backupDraft(id) {
    try {
      await this.apiClient.post(`/drafts/${id}/backup`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("草稿不存在");
      }
      console.error("备份草稿失败:", error);
      throw new Error(
        "备份草稿失败: " + (error.response?.data?.message || error.message)
      );
    }
  }

  /**
   * 检查服务器连接状态
   */
  async checkConnection() {
    try {
      const response = await this.apiClient.get("/health");
      return response.status === 200;
    } catch (error) {
      console.warn("服务器连接检查失败:", error);
      return false;
    }
  }
}

// 草稿自动保存功能（服务器版本）
export class ServerDraftAutoSaveManager {
  constructor(saveCallback, interval = 60000) {
    // 默认60秒自动保存草稿
    this.saveCallback = saveCallback;
    this.interval = interval;
    this.timer = null;
    this.enabled = false;
    this.currentDraftId = null;
  }

  /**
   * 启用草稿自动保存
   */
  enable(draftId = null) {
    this.enabled = true;
    this.currentDraftId = draftId;
    this.startTimer();
  }

  /**
   * 禁用草稿自动保存
   */
  disable() {
    this.enabled = false;
    this.currentDraftId = null;
    this.stopTimer();
  }

  /**
   * 设置当前草稿ID
   */
  setCurrentDraftId(draftId) {
    this.currentDraftId = draftId;
  }

  /**
   * 重置定时器
   */
  reset() {
    if (this.enabled) {
      this.stopTimer();
      this.startTimer();
    }
  }

  /**
   * 开始定时器
   */
  startTimer() {
    this.timer = setInterval(() => {
      if (this.saveCallback && this.enabled) {
        this.saveCallback(this.currentDraftId);
      }
    }, this.interval);
  }

  /**
   * 停止定时器
   */
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// 创建全局实例
export const serverDraftManager = new ServerDraftManager();
