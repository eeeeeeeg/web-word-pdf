const fs = require("fs-extra");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

class DraftService {
  constructor() {
    this.draftsDir = path.join(__dirname, "../temp/drafts");
    this.schemasDir = path.join(__dirname, "../temp/schemas");
    this.backupDir = path.join(__dirname, "../temp/drafts-backup");
    this.historyDir = path.join(__dirname, "../temp/drafts-history");
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  async ensureDirectories() {
    await fs.ensureDir(this.draftsDir);
    await fs.ensureDir(this.schemasDir);
    await fs.ensureDir(this.backupDir);
    await fs.ensureDir(this.historyDir);
  }

  /**
   * 生成草稿名称，格式：yyyy-mm-dd_{名字}
   */
  generateDraftName(customName = "") {
    const now = new Date();

    if (customName.trim()) {
      return `${customName.trim()}`;
    } else {
      return `草稿`;
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return "draft_" + uuidv4().replace(/-/g, "") + "_" + Date.now();
  }

  /**
   * 验证Schema数据
   */
  validateSchema(schema) {
    if (!schema || typeof schema !== "object") {
      return { valid: false, error: "Schema必须是一个对象" };
    }

    if (!schema.pages || !Array.isArray(schema.pages)) {
      return { valid: false, error: "Schema必须包含pages数组" };
    }

    if (!schema.pageConfig || typeof schema.pageConfig !== "object") {
      return { valid: false, error: "Schema必须包含pageConfig对象" };
    }

    return { valid: true };
  }

  /**
   * 获取所有草稿
   */
  async getAllDrafts() {
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(this.draftsDir);
      const drafts = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = path.join(this.draftsDir, file);
            const content = await fs.readJson(filePath);
            drafts.push(content);
          } catch (error) {
            console.warn(`读取草稿文件失败: ${file}`, error);
          }
        }
      }

      // 按更新时间排序
      return drafts.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } catch (error) {
      console.error("获取草稿列表失败:", error);
      throw new Error("获取草稿列表失败");
    }
  }

  /**
   * 根据ID获取草稿
   */
  async getDraftById(id) {
    try {
      const filePath = path.join(this.draftsDir, `${id}.json`);
      const exists = await fs.pathExists(filePath);

      if (!exists) {
        return null;
      }

      return await fs.readJson(filePath);
    } catch (error) {
      console.error("获取草稿失败:", error);
      throw new Error("获取草稿失败");
    }
  }

  /**
   * 创建草稿
   */
  async createDraft(schema, name = "") {
    try {
      const validation = this.validateSchema(schema);
      if (!validation.valid) {
        throw new Error(`无效的Schema: ${validation.error}`);
      }

      const draftData = {
        id: this.generateId(),
        name: this.generateDraftName(name),
        schema: schema,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.ensureDirectories();
      const filePath = path.join(this.draftsDir, `${draftData.id}.json`);
      await fs.writeJson(filePath, draftData, { spaces: 2 });

      return draftData;
    } catch (error) {
      console.error("创建草稿失败:", error);
      throw error;
    }
  }

  /**
   * 更新草稿
   */
  async updateDraft(id, schema, name = null) {
    try {
      const existingDraft = await this.getDraftById(id);
      if (!existingDraft) {
        return null;
      }

      // 保存历史版本
      if (schema) {
        await this.saveHistoryVersion(existingDraft);
      }

      if (schema) {
        const validation = this.validateSchema(schema);
        if (!validation.valid) {
          throw new Error(`无效的Schema: ${validation.error}`);
        }
        existingDraft.schema = schema;
      }

      const updateTime = new Date();
      existingDraft.updatedAt = updateTime.toISOString();

      if (name) {
        existingDraft.name = this.generateDraftName(name);
      } else if (schema) {
        // 如果没有提供新名称但更新了schema，更新现有名称以显示更新时间
        const updateDateStr =
          updateTime.getFullYear() +
          "-" +
          String(updateTime.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(updateTime.getDate()).padStart(2, "0");

        // 提取原名称中的自定义部分（去掉日期前缀）
        const originalName = existingDraft.name;
        const customPart = originalName.replace(/^\d{4}-\d{2}-\d{2}_/, "");

        // 生成新的名称，格式：yyyy-mm-dd_{原名称} (更新时间yyyy-mm-dd)
        existingDraft.name = `${customPart}`;
      }

      const filePath = path.join(this.draftsDir, `${id}.json`);
      await fs.writeJson(filePath, existingDraft, { spaces: 2 });

      return existingDraft;
    } catch (error) {
      console.error("更新草稿失败:", error);
      throw error;
    }
  }

  /**
   * 删除草稿
   */
  async deleteDraft(id) {
    try {
      const filePath = path.join(this.draftsDir, `${id}.json`);
      const exists = await fs.pathExists(filePath);

      if (!exists) {
        return false;
      }

      await fs.remove(filePath);
      return true;
    } catch (error) {
      console.error("删除草稿失败:", error);
      throw new Error("删除草稿失败");
    }
  }

  /**
   * 清空所有草稿
   */
  async clearAllDrafts() {
    try {
      await fs.emptyDir(this.draftsDir);
    } catch (error) {
      console.error("清空草稿失败:", error);
      throw new Error("清空草稿失败");
    }
  }

  /**
   * 将草稿转换为正式保存的Schema
   */
  async convertDraftToSchema(draftId, schemaName = null) {
    try {
      const draft = await this.getDraftById(draftId);
      if (!draft) {
        return null;
      }

      const name =
        schemaName ||
        draft.name
          .replace(/^\d{4}-\d{2}-\d{2}_/, "正式版_")
          .replace(/\s*\(更新时间\d{4}-\d{2}-\d{2}\)$/, "");

      const schemaData = {
        id: this.generateId().replace("draft_", "schema_"),
        name: name,
        schema: draft.schema,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.ensureDirectories();
      const filePath = path.join(this.schemasDir, `${schemaData.id}.json`);
      await fs.writeJson(filePath, schemaData, { spaces: 2 });

      return schemaData;
    } catch (error) {
      console.error("转换草稿失败:", error);
      throw error;
    }
  }

  /**
   * 备份草稿
   */
  async backupDraft(draftId) {
    try {
      const draft = await this.getDraftById(draftId);
      if (!draft) {
        return false;
      }

      const backupData = {
        ...draft,
        backupAt: new Date().toISOString(),
        originalId: draftId,
      };

      await this.ensureDirectories();
      const backupFileName = `${draftId}_backup_${Date.now()}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);
      await fs.writeJson(backupPath, backupData, { spaces: 2 });

      return true;
    } catch (error) {
      console.error("备份草稿失败:", error);
      throw new Error("备份草稿失败");
    }
  }

  /**
   * 获取草稿统计信息
   */
  async getDraftStats() {
    try {
      const drafts = await this.getAllDrafts();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: drafts.length,
        createdToday: 0,
        createdThisWeek: 0,
        totalPages: 0,
        totalComponents: 0,
        avgComponentsPerDraft: 0,
      };

      drafts.forEach((draft) => {
        const createdAt = new Date(draft.createdAt);

        if (createdAt >= today) {
          stats.createdToday++;
        }

        if (createdAt >= thisWeek) {
          stats.createdThisWeek++;
        }

        if (draft.schema?.pages) {
          stats.totalPages += draft.schema.pages.length;

          draft.schema.pages.forEach((page) => {
            if (page.components) {
              stats.totalComponents += page.components.length;
            }
          });
        }
      });

      if (stats.total > 0) {
        stats.avgComponentsPerDraft = Math.round(
          stats.totalComponents / stats.total
        );
      }

      return stats;
    } catch (error) {
      console.error("获取草稿统计失败:", error);
      throw new Error("获取草稿统计失败");
    }
  }

  /**
   * 保存历史版本
   */
  async saveHistoryVersion(draft) {
    try {
      const historyData = {
        ...draft,
        historyId: `${draft.id}_${Date.now()}`,
        savedAt: new Date().toISOString(),
        originalId: draft.id,
      };

      await this.ensureDirectories();
      const historyFileName = `${historyData.historyId}.json`;
      const historyPath = path.join(this.historyDir, historyFileName);
      await fs.writeJson(historyPath, historyData, { spaces: 2 });

      return true;
    } catch (error) {
      console.error("保存历史版本失败:", error);
      // 不抛出错误，避免影响主要功能
      return false;
    }
  }

  /**
   * 获取草稿历史版本
   */
  async getDraftHistory(draftId) {
    try {
      await this.ensureDirectories();
      const files = await fs.readdir(this.historyDir);
      const historyVersions = [];

      for (const file of files) {
        if (file.endsWith(".json") && file.includes(draftId)) {
          try {
            const filePath = path.join(this.historyDir, file);
            const content = await fs.readJson(filePath);
            if (content.originalId === draftId) {
              historyVersions.push(content);
            }
          } catch (error) {
            console.warn(`读取历史文件失败: ${file}`, error);
          }
        }
      }

      // 按保存时间排序
      return historyVersions.sort(
        (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
      );
    } catch (error) {
      console.error("获取草稿历史失败:", error);
      throw new Error("获取草稿历史失败");
    }
  }

  /**
   * 恢复历史版本
   */
  async restoreHistoryVersion(draftId, historyId) {
    try {
      const historyPath = path.join(this.historyDir, `${historyId}.json`);
      const historyExists = await fs.pathExists(historyPath);

      if (!historyExists) {
        return null;
      }

      const historyData = await fs.readJson(historyPath);

      // 创建恢复的草稿数据
      const restoredDraft = {
        id: draftId,
        name: historyData.name + " (已恢复)",
        schema: historyData.schema,
        createdAt: historyData.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const filePath = path.join(this.draftsDir, `${draftId}.json`);
      await fs.writeJson(filePath, restoredDraft, { spaces: 2 });

      return restoredDraft;
    } catch (error) {
      console.error("恢复历史版本失败:", error);
      throw new Error("恢复历史版本失败");
    }
  }

  /**
   * 清理历史版本（保留最近N个版本）
   */
  async cleanupHistory(draftId, keepCount = 10) {
    try {
      const historyVersions = await this.getDraftHistory(draftId);

      if (historyVersions.length <= keepCount) {
        return 0; // 无需清理
      }

      const toDelete = historyVersions.slice(keepCount);
      let deletedCount = 0;

      for (const version of toDelete) {
        try {
          const historyPath = path.join(
            this.historyDir,
            `${version.historyId}.json`
          );
          await fs.remove(historyPath);
          deletedCount++;
        } catch (error) {
          console.warn(`删除历史版本失败: ${version.historyId}`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("清理历史版本失败:", error);
      throw new Error("清理历史版本失败");
    }
  }
}

module.exports = new DraftService();
