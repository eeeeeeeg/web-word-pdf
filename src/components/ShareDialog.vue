<template>
  <div class="share-dialog-overlay" @click.self="$emit('close')">
    <div class="share-dialog">
      <div class="dialog-header">
        <h3>分享页面设计</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-content">
        <!-- 分享信息 -->
        <div class="share-info">
          <div class="info-item">
            <span class="label">页面数量:</span>
            <span class="value">{{ shareStats.pageCount }} 页</span>
          </div>
          <div class="info-item">
            <span class="label">组件数量:</span>
            <span class="value">{{ shareStats.componentCount }} 个</span>
          </div>
          <div class="info-item">
            <span class="label">页面尺寸:</span>
            <span class="value">{{ shareStats.pageSize }}</span>
          </div>
          <div class="info-item" v-if="shareStats.hasHeader">
            <span class="label">页眉:</span>
            <span class="value">已启用</span>
          </div>
          <div class="info-item" v-if="shareStats.hasFooter">
            <span class="label">页脚:</span>
            <span class="value">已启用</span>
          </div>
        </div>

        <!-- 分享选项 -->
        <div class="share-options">
          <div class="form-group">
            <label>分享标题:</label>
            <input
              type="text"
              v-model="shareTitle"
              placeholder="请输入分享标题"
              maxlength="50"
            />
          </div>
          <div class="form-group">
            <label>分享描述:</label>
            <textarea
              v-model="shareDescription"
              placeholder="请输入分享描述（可选）"
              maxlength="200"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label>有效期:</label>
            <select v-model="expiresIn">
              <option :value="1 * 24 * 60 * 60 * 1000">1天</option>
              <option :value="3 * 24 * 60 * 60 * 1000">3天</option>
              <option :value="7 * 24 * 60 * 60 * 1000">7天</option>
              <option :value="30 * 24 * 60 * 60 * 1000">30天</option>
            </select>
          </div>
        </div>

        <!-- 生成的分享链接 -->
        <div class="share-link-section" v-if="shareUrl">
          <label>分享链接:</label>
          <div class="link-container">
            <input
              type="text"
              :value="shareUrl"
              readonly
              ref="linkInput"
              class="share-link-input"
            />
            <button class="copy-btn" @click="copyLink" :disabled="copying">
              {{ copying ? "复制中..." : copied ? "已复制" : "复制" }}
            </button>
          </div>
          <div class="link-info">
            <small>链接有效期至: {{ expirationDate }}</small>
          </div>
        </div>

        <!-- 错误信息 -->
        <div class="error-message" v-if="error">
          {{ error }}
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button
          class="btn btn-primary"
          @click="generateShareLink"
          :disabled="generating"
        >
          {{ generating ? "生成中..." : "生成分享链接" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ServerShareManager } from "../utils/serverShareManager.js";

export default {
  name: "ShareDialog",
  props: {
    schema: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      shareTitle: "我的页面设计",
      shareDescription: "",
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 默认7天
      shareUrl: "",
      generating: false,
      copying: false,
      copied: false,
      error: "",
    };
  },
  computed: {
    shareStats() {
      return (
        ServerShareManager.calculateShareStats(this.schema) || {
          pageCount: 0,
          componentCount: 0,
          hasHeader: false,
          hasFooter: false,
          pageSize: "Unknown",
        }
      );
    },
    expirationDate() {
      if (!this.shareUrl) return "";
      const expireTime = Date.now() + this.expiresIn;
      return new Date(expireTime).toLocaleString();
    },
  },
  methods: {
    async generateShareLink() {
      this.generating = true;
      this.error = "";

      try {
        // 验证数据
        if (!ServerShareManager.validateSchema(this.schema)) {
          throw new Error("页面设计数据无效");
        }

        // 生成分享链接
        const options = {
          title: this.shareTitle,
          description: this.shareDescription,
          expiresIn: this.expiresIn,
        };

        const result = await ServerShareManager.createShare(
          this.schema,
          options
        );

        if (result.success) {
          // 生成前端访问链接
          this.shareUrl = ServerShareManager.generateFrontendShareUrl(
            result.shareId
          );
        } else {
          throw new Error("创建分享失败");
        }

        // 重置复制状态
        this.copied = false;
      } catch (error) {
        this.error = error.message || "生成分享链接失败";
        console.error("生成分享链接失败:", error);
      } finally {
        this.generating = false;
      }
    },

    async copyLink() {
      if (!this.shareUrl) return;

      this.copying = true;

      try {
        const success = await ServerShareManager.copyToClipboard(this.shareUrl);

        if (success) {
          this.copied = true;
          setTimeout(() => {
            this.copied = false;
          }, 3000);
        } else {
          this.error = "复制到剪贴板失败，请手动复制";
        }
      } catch (error) {
        this.error = "复制失败: " + error.message;
      } finally {
        this.copying = false;
      }
    },
  },
};
</script>

<style scoped>
.share-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.share-dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
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

.dialog-content {
  padding: 24px;
}

.share-info {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  color: #333;
}

.share-options {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.share-link-section {
  background: #f0f8ff;
  border: 1px solid #d6e7ff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.share-link-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.link-container {
  display: flex;
  gap: 8px;
}

.share-link-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.copy-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.copy-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.copy-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.link-info {
  margin-top: 8px;
  color: #666;
}

.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel {
  background: white;
  color: #666;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
  border-color: #40a9ff;
}

.btn-primary:disabled {
  background: #ccc;
  border-color: #ccc;
  cursor: not-allowed;
}
</style>
