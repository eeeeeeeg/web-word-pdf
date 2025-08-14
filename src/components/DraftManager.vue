<template>
  <div class="draft-manager-overlay" @click="handleOverlayClick">
    <div class="draft-manager" @click.stop>
      <div class="draft-manager-header">
        <h2>草稿管理</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="draft-manager-content">
        <!-- 新建草稿区域 -->
        <div class="new-draft-section">
          <div class="input-group">
            <input
              v-model="newDraftName"
              type="text"
              placeholder="输入草稿名称（可选）"
              class="draft-name-input"
              @keyup.enter="saveDraft"
            />
            <button class="btn btn-primary" @click="saveDraft">
              保存当前内容为草稿
            </button>
          </div>
        </div>

        <!-- 搜索和过滤 -->
        <div class="search-section">
          <div class="search-input-group">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索草稿名称..."
              class="search-input"
            />
            <button
              class="btn btn-secondary btn-sm"
              @click="clearSearch"
              v-if="searchQuery"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="stats-section" v-if="draftStats">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ draftStats.total }}</span>
              <span class="stat-label">总草稿</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ draftStats.createdToday }}</span>
              <span class="stat-label">今日新增</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ draftStats.totalPages }}</span>
              <span class="stat-label">总页面</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ draftStats.totalComponents }}</span>
              <span class="stat-label">总组件</span>
            </div>
          </div>
        </div>

        <!-- 草稿列表 -->
        <div class="drafts-list">
          <div class="list-header">
            <h3>
              已保存的草稿 ({{ filteredDrafts.length }}/{{ drafts.length }})
            </h3>
            <div class="list-actions">
              <button
                class="btn btn-secondary btn-sm"
                @click="refreshDrafts"
                title="刷新列表"
              >
                🔄
              </button>
              <button
                class="btn btn-secondary btn-sm"
                @click="toggleSelectAll"
                :disabled="filteredDrafts.length === 0"
                title="全选/取消全选"
              >
                {{ isAllSelected ? "取消全选" : "全选" }}
              </button>
              <button
                class="btn btn-info btn-sm"
                @click="exportSelectedDrafts"
                :disabled="selectedDrafts.length === 0"
                title="导出选中草稿"
              >
                📤 导出选中 ({{ selectedDrafts.length }})
              </button>
              <button
                class="btn btn-success btn-sm"
                @click="triggerImport"
                title="导入草稿"
              >
                📥 导入
              </button>
              <button
                class="btn btn-danger btn-sm"
                @click="clearAllDrafts"
                :disabled="drafts.length === 0"
                title="清空所有草稿"
              >
                清空
              </button>
            </div>

            <!-- 隐藏的文件输入 -->
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              multiple
              style="display: none"
              @change="handleFileImport"
            />
          </div>

          <div v-if="drafts.length === 0" class="empty-state">
            <p>暂无草稿</p>
          </div>

          <div v-else-if="filteredDrafts.length === 0" class="empty-state">
            <p>没有找到匹配的草稿</p>
          </div>

          <div v-else class="draft-items">
            <div
              v-for="draft in filteredDrafts"
              :key="draft.id"
              class="draft-item"
              :class="{
                editing: editingDraftId === draft.id,
                selected: selectedDrafts.includes(draft.id),
              }"
            >
              <div class="draft-select">
                <input
                  type="checkbox"
                  :value="draft.id"
                  v-model="selectedDrafts"
                  class="draft-checkbox"
                />
              </div>

              <div class="draft-info">
                <div class="draft-name">
                  <input
                    v-if="editingDraftId === draft.id"
                    v-model="editingDraftName"
                    type="text"
                    class="edit-name-input"
                    @keyup.enter="saveEditedName(draft.id)"
                    @keyup.esc="cancelEdit"
                    ref="editInput"
                  />
                  <span v-else class="name-text">{{ draft.name }}</span>
                </div>
                <div class="draft-meta">
                  <span class="created-time">
                    创建: {{ formatTime(draft.createdAt) }}
                  </span>
                  <span class="updated-time">
                    更新: {{ formatTime(draft.updatedAt) }}
                  </span>
                  <span class="page-count">
                    页面: {{ draft.schema?.pages?.length || 0 }}
                  </span>
                  <span class="component-count">
                    组件: {{ countComponents(draft.schema) }}
                  </span>
                </div>
              </div>

              <div class="draft-actions">
                <button
                  class="btn btn-sm btn-info"
                  @click="previewDraft(draft)"
                  title="预览草稿"
                >
                  预览
                </button>
                <button
                  class="btn btn-sm btn-primary"
                  @click="loadDraft(draft)"
                  title="加载草稿"
                >
                  加载
                </button>
                <button
                  v-if="editingDraftId !== draft.id"
                  class="btn btn-sm btn-secondary"
                  @click="startEdit(draft)"
                  title="重命名"
                >
                  重命名
                </button>
                <button
                  v-if="editingDraftId === draft.id"
                  class="btn btn-sm btn-success"
                  @click="saveEditedName(draft.id)"
                  title="保存"
                >
                  保存
                </button>
                <button
                  v-if="editingDraftId === draft.id"
                  class="btn btn-sm btn-secondary"
                  @click="cancelEdit"
                  title="取消"
                >
                  取消
                </button>
                <button
                  class="btn btn-sm btn-success"
                  @click="convertToSchema(draft)"
                  title="转为正式版本"
                >
                  转正式
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  @click="deleteDraft(draft.id)"
                  title="删除草稿"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { serverDraftManager } from "@/utils/serverDraftManager.js";

export default {
  name: "DraftManager",
  props: {
    currentSchema: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      drafts: [],
      newDraftName: "",
      editingDraftId: null,
      editingDraftName: "",
      searchQuery: "",
      draftStats: null,
      selectedDrafts: [],
    };
  },
  computed: {
    sortedDrafts() {
      return [...this.drafts].sort((a, b) => {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    },

    filteredDrafts() {
      if (!this.searchQuery.trim()) {
        return this.sortedDrafts;
      }

      const query = this.searchQuery.toLowerCase();
      return this.sortedDrafts.filter((draft) =>
        draft.name.toLowerCase().includes(query)
      );
    },

    isAllSelected() {
      return (
        this.filteredDrafts.length > 0 &&
        this.filteredDrafts.every((draft) =>
          this.selectedDrafts.includes(draft.id)
        )
      );
    },
  },
  mounted() {
    this.loadDrafts();
  },
  methods: {
    handleOverlayClick() {
      this.$emit("close");
    },

    async loadDrafts() {
      try {
        this.drafts = await serverDraftManager.getSavedDrafts();
        await this.loadDraftStats();
      } catch (error) {
        this.showError("加载草稿列表失败: " + error.message);
      }
    },

    async loadDraftStats() {
      try {
        this.draftStats = await serverDraftManager.getDraftStats();
      } catch (error) {
        console.warn("加载草稿统计失败:", error);
        this.draftStats = null;
      }
    },

    async refreshDrafts() {
      await this.loadDrafts();
    },

    async saveDraft() {
      try {
        const draftId = await serverDraftManager.saveDraft(
          this.currentSchema,
          this.newDraftName
        );
        this.newDraftName = "";
        await this.loadDrafts();
        this.$emit("draft-saved", draftId);
        this.showMessage("草稿保存成功！");
      } catch (error) {
        this.showError("保存草稿失败: " + error.message);
      }
    },

    loadDraft(draft) {
      this.$emit("load-draft", draft);
      this.$emit("close");
    },

    previewDraft(draft) {
      // 创建预览信息
      const previewInfo = {
        name: draft.name,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        pageCount: draft.schema?.pages?.length || 0,
        componentCount: this.countComponents(draft.schema),
        hasGlobalConfig: !!draft.schema?.pageConfig,
      };

      const message = `草稿预览信息：
名称: ${previewInfo.name}
创建时间: ${this.formatTime(previewInfo.createdAt)}
更新时间: ${this.formatTime(previewInfo.updatedAt)}
页面数量: ${previewInfo.pageCount}
组件数量: ${previewInfo.componentCount}
全局配置: ${previewInfo.hasGlobalConfig ? "是" : "否"}

是否要加载此草稿？`;

      if (confirm(message)) {
        this.loadDraft(draft);
      }
    },

    countComponents(schema) {
      if (!schema?.pages) return 0;

      let count = 0;
      schema.pages.forEach((page) => {
        if (page.components) {
          count += page.components.length;
        }
      });
      return count;
    },

    startEdit(draft) {
      this.editingDraftId = draft.id;
      this.editingDraftName = draft.name;
      this.$nextTick(() => {
        const input = this.$refs.editInput?.[0];
        if (input) {
          input.focus();
          input.select();
        }
      });
    },

    async saveEditedName(draftId) {
      if (!this.editingDraftName.trim()) {
        this.showError("草稿名称不能为空");
        return;
      }

      try {
        // 提取原名称中的自定义部分（去掉日期前缀和更新时间后缀）
        const customName = this.editingDraftName
          .replace(/^\d{4}-\d{2}-\d{2}_/, "")
          .replace(/\s*\(更新时间\d{4}-\d{2}-\d{2}\)$/, "");
        await serverDraftManager.updateDraft(draftId, null, customName);
        await this.loadDrafts();
        this.cancelEdit();
        this.showMessage("重命名成功！");
      } catch (error) {
        this.showError("重命名失败: " + error.message);
      }
    },

    cancelEdit() {
      this.editingDraftId = null;
      this.editingDraftName = "";
    },

    async deleteDraft(draftId) {
      if (confirm("确定要删除这个草稿吗？")) {
        try {
          await serverDraftManager.deleteDraft(draftId);
          await this.loadDrafts();
          this.showMessage("草稿删除成功！");
        } catch (error) {
          this.showError("删除草稿失败: " + error.message);
        }
      }
    },

    async convertToSchema(draft) {
      if (confirm("确定要将此草稿转换为正式版本吗？")) {
        try {
          const schemaId = await serverDraftManager.draftToSchema(draft.id);
          this.showMessage("转换成功！已保存为正式版本");
          this.$emit("schema-created", schemaId);
        } catch (error) {
          this.showError("转换失败: " + error.message);
        }
      }
    },

    async clearAllDrafts() {
      if (confirm("确定要清空所有草稿吗？此操作不可恢复！")) {
        try {
          await serverDraftManager.clearAllDrafts();
          await this.loadDrafts();
          this.showMessage("所有草稿已清空！");
        } catch (error) {
          this.showError("清空失败: " + error.message);
        }
      }
    },

    formatTime(timeString) {
      const date = new Date(timeString);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    showMessage(message) {
      // 简单的消息提示，可以后续替换为更好的UI组件
      alert(message);
    },

    showError(message) {
      // 简单的错误提示，可以后续替换为更好的UI组件
      alert(message);
    },

    clearSearch() {
      this.searchQuery = "";
    },

    // 导出选中的草稿
    async exportSelectedDrafts() {
      try {
        if (this.selectedDrafts.length === 0) {
          this.showMessage("请先选择要导出的草稿");
          return;
        }

        // 获取选中的草稿数据
        const selectedDraftData = this.drafts.filter((draft) =>
          this.selectedDrafts.includes(draft.id)
        );

        const exportData = {
          version: "1.0",
          exportTime: new Date().toISOString(),
          totalDrafts: selectedDraftData.length,
          drafts: selectedDraftData,
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(dataBlob);
        link.download = `草稿备份_选中${selectedDraftData.length}个_${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage(`成功导出 ${selectedDraftData.length} 个选中草稿！`);

        // 导出后清空选择
        this.selectedDrafts = [];
      } catch (error) {
        this.showError("导出草稿失败: " + error.message);
      }
    },

    // 全选/取消全选
    toggleSelectAll() {
      if (this.isAllSelected) {
        // 取消全选
        this.selectedDrafts = [];
      } else {
        // 全选当前过滤的草稿
        this.selectedDrafts = this.filteredDrafts.map((draft) => draft.id);
      }
    },

    // 触发文件导入
    triggerImport() {
      this.$refs.fileInput.click();
    },

    // 处理文件导入
    async handleFileImport(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      let successCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          const content = await this.readFileAsText(file);
          const importData = JSON.parse(content);

          // 验证导入数据格式
          if (this.validateImportData(importData)) {
            // 导入草稿数据
            for (const draft of importData.drafts) {
              try {
                await serverDraftManager.saveDraft(draft.schema, draft.name);
                successCount++;
              } catch (error) {
                console.error("导入单个草稿失败:", error);
                errorCount++;
              }
            }
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error("处理导入文件失败:", error);
          errorCount++;
        }
      }

      // 清空文件输入
      event.target.value = "";

      // 刷新草稿列表
      await this.loadDrafts();

      // 显示导入结果
      if (successCount > 0) {
        this.showMessage(
          `成功导入 ${successCount} 个草稿${
            errorCount > 0 ? `，失败 ${errorCount} 个` : ""
          }！`
        );
      } else {
        this.showError("导入失败，请检查文件格式");
      }
    },

    // 读取文件内容
    readFileAsText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    },

    // 验证导入数据格式
    validateImportData(data) {
      if (!data || typeof data !== "object") return false;
      if (!data.drafts || !Array.isArray(data.drafts)) return false;

      // 检查每个草稿的基本结构
      return data.drafts.every(
        (draft) =>
          draft &&
          typeof draft === "object" &&
          draft.schema &&
          typeof draft.schema === "object" &&
          draft.name &&
          typeof draft.name === "string"
      );
    },
  },
};
</script>

<style scoped>
.draft-manager-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.draft-manager {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  position: relative;
}

.draft-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.draft-manager-header h2 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.draft-manager-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.new-draft-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
}

.search-section {
  margin-bottom: 20px;
  padding: 15px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.search-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.stats-section {
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}

.stat-item {
  text-align: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 12px;
  opacity: 0.9;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.draft-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-header h3 {
  margin: 0;
  color: #333;
}

.list-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.draft-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draft-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
  background: white;
  transition: all 0.2s;
  gap: 12px;
}

.draft-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.draft-item.editing {
  border-color: #28a745;
  background: #f8fff9;
}

.draft-item.selected {
  border-color: #007bff;
  background: #f0f8ff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.draft-select {
  flex-shrink: 0;
}

.draft-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.draft-info {
  flex: 1;
  min-width: 0;
}

.draft-actions {
  flex-shrink: 0;
}

.draft-info {
  flex: 1;
}

.draft-name {
  margin-bottom: 5px;
}

.name-text {
  font-weight: 500;
  color: #333;
  font-size: 16px;
}

.edit-name-input {
  padding: 4px 8px;
  border: 1px solid #28a745;
  border-radius: 3px;
  font-size: 16px;
  font-weight: 500;
  width: 100%;
  max-width: 300px;
}

.draft-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

.draft-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #1e7e34;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
}
</style>
