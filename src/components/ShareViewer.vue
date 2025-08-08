<template>
  <div class="share-viewer">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在加载分享内容...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>{{ errorTitle }}</h2>
      <p>{{ error }}</p>
      <div class="error-actions">
        <button @click="retry" class="retry-btn">重试</button>
        <button @click="goHome" class="home-btn">返回首页</button>
      </div>
    </div>

    <!-- 分享内容 -->
    <div v-else-if="shareData" class="share-content">
      <!-- 分享信息头部 -->
      <div class="share-header">
        <div class="share-info">
          <h1>{{ shareData.options.title }}</h1>
          <p v-if="shareData.options.description" class="share-description">
            {{ shareData.options.description }}
          </p>
          <div class="share-meta">
            <span class="share-date">
              分享于 {{ formatDate(shareData.createdAt) }}
            </span>
            <span v-if="shareData.expiresAt" class="share-expires">
              过期时间 {{ formatDate(shareData.expiresAt) }}
            </span>
          </div>
        </div>
        <div class="share-actions">
          <button @click="openInEditor" class="edit-btn">在编辑器中打开</button>
          <!-- <button @click="exportPDF" class="export-btn" :disabled="isExporting">
            {{ isExporting ? "导出中..." : "导出PDF" }}
          </button>
          <button
            @click="exportWord"
            class="export-btn"
            :disabled="isExporting"
          >
            {{ isExporting ? "导出中..." : "导出Word" }}
          </button> -->
        </div>
      </div>

      <!-- 分享统计 -->
      <div class="share-stats">
        <div class="stat-item">
          <span class="stat-label">页面数</span>
          <span class="stat-value">{{ stats.pageCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">组件数</span>
          <span class="stat-value">{{ stats.componentCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">页面尺寸</span>
          <span class="stat-value">{{ stats.pageSize }}</span>
        </div>
        <div class="stat-item" v-if="stats.hasHeader">
          <span class="stat-label">页眉</span>
          <span class="stat-value">✓</span>
        </div>
        <div class="stat-item" v-if="stats.hasFooter">
          <span class="stat-label">页脚</span>
          <span class="stat-value">✓</span>
        </div>
      </div>

      <!-- 页面预览 -->
      <div class="page-preview">
        <h3>页面预览</h3>
        <div class="preview-container">
          <Canvas
            :schema="shareData.schema"
            :mode="'preview'"
            :show-toolbar="false"
            class="preview-canvas"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ServerShareManager } from "../utils/serverShareManager.js";
import { exportPDF, exportWord } from "../apis";
import Canvas from "./Canvas.vue";

export default {
  name: "ShareViewer",
  components: {
    Canvas,
  },
  props: {
    shareId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      loading: true,
      error: null,
      errorTitle: "加载失败",
      shareData: null,
      stats: {},
      isExporting: false,
    };
  },
  async mounted() {
    await this.loadShare();
  },
  methods: {
    async loadShare() {
      this.loading = true;
      this.error = null;

      try {
        if (!this.shareId) {
          throw new Error("分享ID无效");
        }

        // 获取分享数据
        this.shareData = await ServerShareManager.getShare(this.shareId);

        // 获取统计信息
        try {
          this.stats = await ServerShareManager.getShareStats(this.shareId);
        } catch (error) {
          // 如果获取统计失败，使用客户端计算
          this.stats = ServerShareManager.calculateShareStats(
            this.shareData.schema
          );
        }
      } catch (error) {
        console.error("加载分享失败:", error);
        this.error = error.message;

        if (error.message.includes("不存在")) {
          this.errorTitle = "分享不存在";
        } else if (error.message.includes("过期")) {
          this.errorTitle = "分享已过期";
        } else if (error.message.includes("网络")) {
          this.errorTitle = "网络连接失败";
        } else {
          this.errorTitle = "加载失败";
        }
      } finally {
        this.loading = false;
      }
    },

    async retry() {
      await this.loadShare();
    },

    goHome() {
      window.location.hash = "";
    },

    openInEditor() {
      if (!this.shareData) return;

      // 将分享数据存储到localStorage，然后跳转到编辑器
      localStorage.setItem(
        "importShareData",
        JSON.stringify(this.shareData.schema)
      );
      window.location.hash = "";

      // 触发编辑器导入数据
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("importShareData"));
      }, 100);
    },

    async exportPDF() {
      if (!this.shareData || this.isExporting) return;

      this.isExporting = true;
      try {
        console.log("开始导出 PDF...");

        // 生成 HTML 内容
        const htmlContent = this.generateHTMLContent();

        // 调用服务端导出 API
        await exportPDF(
          htmlContent,
          {
            format: "A4",
            orientation: "portrait",
            margin: {
              top: "20mm",
              bottom: "20mm",
              left: "20mm",
              right: "20mm",
            },
          },
          `share-${this.shareId}`
        );

        console.log("PDF 导出成功");
      } catch (error) {
        console.error("PDF导出失败:", error);
        alert(`PDF导出失败: ${error.message}`);
      } finally {
        this.isExporting = false;
      }
    },

    async exportWord() {
      if (!this.shareData || this.isExporting) return;

      this.isExporting = true;
      try {
        console.log("开始导出 Word...");

        // 调用服务端导出 API
        await exportWord(
          JSON.stringify(this.shareData.schema),
          {
            pageSize: "A4",
            orientation: "portrait",
            includePageTitles: true,
          },
          `share-${this.shareId}`
        );

        console.log("Word 导出成功");
      } catch (error) {
        console.error("Word导出失败:", error);
        alert(`Word导出失败: ${error.message}`);
      } finally {
        this.isExporting = false;
      }
    },

    // 生成 HTML 内容用于导出
    generateHTMLContent() {
      if (!this.shareData) return "";

      const { schema } = this.shareData;
      const { pageConfig, pages } = schema;

      // 生成页面样式
      const pageStyles = this.generatePageStyles(pageConfig);

      // 生成页面内容
      const pagesHTML = pages
        .map((page, index) => {
          return this.generatePageHTML(page, index);
        })
        .join("\n");

      return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.shareData.options?.title || "页面设计"}</title>
    <style>
        ${pageStyles}
    </style>
</head>
<body>
    <div class="document">
        ${pagesHTML}
    </div>
</body>
</html>`;
    },

    // 生成页面样式
    generatePageStyles(pageConfig) {
      const { pageSize, margins } = pageConfig;

      return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .document {
            width: 100%;
        }

        .page {
            width: ${pageSize.width}${pageSize.unit};
            height: ${pageSize.height}${pageSize.unit};
            margin: 0 auto 20px;
            padding: ${margins.top}${pageSize.unit} ${margins.right}${pageSize.unit} ${margins.bottom}${pageSize.unit} ${margins.left}${pageSize.unit};
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            page-break-after: always;
            position: relative;
        }

        .page:last-child {
            margin-bottom: 0;
        }

        .component {
            position: absolute;
            word-wrap: break-word;
        }

        .component img {
            max-width: 100%;
            height: auto;
        }

        @media print {
            .page {
                margin: 0;
                box-shadow: none;
                page-break-after: always;
            }
        }
      `;
    },

    // 生成单个页面的 HTML
    generatePageHTML(page, pageIndex) {
      const componentsHTML = page.components
        .map((component) => {
          return this.generateComponentHTML(component);
        })
        .join("\n");

      return `
        <div class="page" data-page="${pageIndex + 1}">
            ${componentsHTML}
        </div>
      `;
    },

    // 生成组件 HTML
    generateComponentHTML(component) {
      const { style = {}, content = "", type } = component;

      // 构建样式字符串
      const styleStr = Object.entries(style)
        .map(([key, value]) => {
          // 转换驼峰命名为CSS命名
          const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
          return `${cssKey}: ${value}`;
        })
        .join("; ");

      // 根据组件类型生成不同的 HTML
      switch (type) {
        case "text":
          return `<div class="component" style="${styleStr}">${content}</div>`;
        case "image":
          return `<div class="component" style="${styleStr}"><img src="${content}" alt="图片" /></div>`;
        case "layout": {
          // 布局组件需要特殊处理
          const childrenHTML = (component.children || [])
            .map((child) => this.generateComponentHTML(child))
            .join("\n");
          return `<div class="component layout" style="${styleStr}">${childrenHTML}</div>`;
        }
        default:
          return `<div class="component" style="${styleStr}">${content}</div>`;
      }
    },

    formatDate(timestamp) {
      if (!timestamp) return "";
      return new Date(timestamp).toLocaleString("zh-CN");
    },
  },
};
</script>

<style scoped>
.share-viewer {
  min-height: 100vh;
  background: #f5f5f5;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  padding: 40px 20px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-container h2 {
  color: #dc3545;
  margin-bottom: 8px;
}

.error-container p {
  color: #666;
  margin-bottom: 24px;
}

.error-actions {
  display: flex;
  gap: 12px;
}

.retry-btn,
.home-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn {
  background: #007bff;
  color: white;
}

.home-btn {
  background: #6c757d;
  color: white;
}

.share-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.share-header {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.share-info h1 {
  margin: 0 0 8px 0;
  color: #333;
}

.share-description {
  color: #666;
  margin: 0 0 12px 0;
}

.share-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #888;
}

.share-actions {
  display: flex;
  gap: 12px;
}

.edit-btn,
.export-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.edit-btn {
  background: #28a745;
  color: white;
}

.export-btn {
  background: #007bff;
  color: white;
}

.edit-btn:disabled,
.export-btn:disabled {
  background: #6c757d;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.6;
}

.edit-btn:disabled:hover,
.export-btn:disabled:hover {
  background: #6c757d;
}

.share-stats {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  gap: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.page-preview {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-preview h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.preview-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.preview-canvas {
  width: 100%;
  min-height: 600px;
}
</style>
