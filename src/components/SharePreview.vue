<template>
  <div class="share-preview">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载分享内容...</div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <div class="error-title">加载失败</div>
      <div class="error-message">{{ error }}</div>
      <div class="error-actions">
        <button class="btn btn-primary" @click="retry">重试</button>
        <button class="btn btn-secondary" @click="goHome">返回首页</button>
      </div>
    </div>

    <!-- 分享内容 -->
    <div v-else-if="shareData" class="share-content">
      <!-- 分享信息头部 -->
      <div class="share-header">
        <div class="share-title">{{ shareData.options.title }}</div>
        <div class="share-description" v-if="shareData.options.description">
          {{ shareData.options.description }}
        </div>
        <div class="share-meta">
          <span class="share-time"
            >分享时间: {{ formatTime(shareData.timestamp) }}</span
          >
          <span class="share-stats">
            {{ shareStats.pageCount }} 页 ·
            {{ shareStats.componentCount }} 个组件
          </span>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <div class="view-info">
            <span class="view-label">📖 只读预览</span>
            <span class="view-desc">查看最终设计效果</span>
          </div>
        </div>
        <div class="toolbar-right">
          <button class="tool-btn" @click="downloadPDF" :disabled="isExporting">
            {{ isExporting ? "📄 导出中..." : "📄 导出PDF" }}
          </button>
          <button
            class="tool-btn"
            @click="downloadWord"
            :disabled="isExporting"
          >
            {{ isExporting ? "📝 导出中..." : "📝 导出Word" }}
          </button>
          <button class="tool-btn" @click="printPage">🖨️ 打印</button>
          <button class="tool-btn btn-primary" @click="goHome">
            ✨ 创建我的设计
          </button>
        </div>
      </div>

      <!-- 页面内容 -->
      <div class="preview-content">
        <div class="content-layout">
          <!-- 缩略图侧边栏 -->
          <!-- <div class="thumbnail-sidebar" v-if="showThumbnails">
            <div class="sidebar-header">
              <h4>页面导航</h4>
              <button class="close-sidebar-btn" @click="toggleThumbnails">
                ×
              </button>
            </div>
            <div class="thumbnail-list">
              <div
                v-for="(page, index) in shareData.schema.pages"
                :key="page.id"
                class="thumbnail-item"
                :class="{ active: currentPageIndex === index }"
                @click="scrollToPage(index)"
              >
                <div class="thumbnail-preview">
                  <div class="thumbnail-page" :style="getThumbnailStyle()">
                    <div
                      class="thumbnail-canvas-container"
                      :style="getThumbnailCanvasStyle()"
                    >
                      <Canvas
                        :schema="{
                          pages: [page],
                          pageConfig: shareData.schema.pageConfig,
                          currentPageIndex: 0,
                        }"
                        :mode="'preview'"
                        :selected-component="null"
                        @component-select="() => {}"
                        @component-update="() => {}"
                        @component-delete="() => {}"
                        @component-drop="() => {}"
                        @component-sort="() => {}"
                        @page-select="() => {}"
                        @page-delete="() => {}"
                      />
                    </div>
                  </div>
                </div>
                <div class="thumbnail-label">第 {{ index + 1 }} 页</div>
              </div>
            </div>
          </div> -->

          <!-- 主内容区域 -->
          <div class="main-content" :class="{ 'with-sidebar': showThumbnails }">
            <!-- 缩略图切换按钮 -->
            <div
              class="thumbnail-toggle"
              v-if="!showThumbnails && canShowThumbnails"
            >
              <button
                class="toggle-btn"
                @click="toggleThumbnails"
                title="显示页面导航"
              >
                📄 页面导航
              </button>
            </div>

            <Canvas
              :schema="shareData.schema"
              :mode="'preview'"
              :selected-component="null"
              @component-select="() => {}"
              @component-update="() => {}"
              @component-delete="() => {}"
              @component-drop="() => {}"
              @component-sort="() => {}"
              @page-select="handlePageSelect"
              @page-delete="() => {}"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 移除了缩略图查看器，现在直接定位到页面 -->
  </div>
</template>

<script>
import { ShareManager } from "../utils/shareManager.js";
import { ServerShareManager } from "../utils/serverShareManager.js";
import { exportPDF, exportWord } from "../apis";
import Canvas from "./Canvas.vue";

export default {
  name: "SharePreview",
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
      error: "",
      shareData: null,
      showThumbnails: false,
      currentPageIndex: 0,
      windowWidth: window.innerWidth,
      isExporting: false,
      isServerShare: false, // 标识是否为服务器分享
    };
  },
  computed: {
    shareStats() {
      if (!this.shareData) return { pageCount: 0, componentCount: 0 };
      return ShareManager.getShareStats(this.shareData.schema);
    },

    // 是否可以显示缩略图（屏幕宽度足够）
    canShowThumbnails() {
      return (
        this.windowWidth >= 1200 &&
        this.shareData &&
        this.shareData.schema.pages.length > 1
      );
    },
  },
  mounted() {
    this.loadShareData();
    this.initWindowResize();
    this.initScrollListener();

    // 如果屏幕足够宽且有多页，自动显示缩略图
    this.$nextTick(() => {
      if (this.canShowThumbnails) {
        this.showThumbnails = true;
      }
    });
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.handleWindowResize);
    if (this.mainContentElement) {
      this.mainContentElement.removeEventListener("scroll", this.handleScroll);
    }
  },
  methods: {
    async loadShareData() {
      this.loading = true;
      this.error = "";

      try {
        // 检测是否为服务器分享（32位十六进制字符串）
        const serverSharePattern = /^[a-f0-9]{32}$/i;
        this.isServerShare = serverSharePattern.test(this.shareId);

        if (this.isServerShare) {
          // 服务器分享：从服务器获取数据
          console.log("加载服务器分享数据:", this.shareId);
          this.shareData = await ServerShareManager.getShare(this.shareId);
        } else {
          // URL 参数分享：从 URL 解析数据
          console.log("解析 URL 参数分享数据:", this.shareId);
          this.shareData = ShareManager.parseShareLink(this.shareId);
        }

        // 设置页面标题
        if (this.shareData.options && this.shareData.options.title) {
          document.title = `${this.shareData.options.title} - 页面设计分享`;
        }

        // 数据加载完成后重新初始化滚动监听和缩略图
        this.$nextTick(() => {
          this.initScrollListener();
          if (this.canShowThumbnails) {
            this.showThumbnails = true;
          }
        });
      } catch (error) {
        this.error = this.getErrorMessage(error.message);
        console.error("加载分享数据失败:", error);
      } finally {
        this.loading = false;
      }
    },

    getErrorMessage(errorMsg) {
      if (errorMsg.includes("过期")) {
        return "分享链接已过期，请联系分享者重新生成链接";
      } else if (errorMsg.includes("无效")) {
        return "分享链接无效，请检查链接是否完整";
      } else if (errorMsg.includes("格式错误")) {
        return "分享数据格式错误，可能是链接损坏";
      } else {
        return "加载分享内容失败，请稍后重试";
      }
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleString();
    },

    retry() {
      this.loadShareData();
    },

    goHome() {
      // 清除hash，返回主页
      window.location.hash = "";
    },

    async downloadPDF() {
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

    async downloadWord() {
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

    printPage() {
      if (!this.shareData) return;

      try {
        // 触发浏览器打印功能
        window.print();
      } catch (error) {
        console.error("打印失败:", error);
        alert("打印失败，请稍后重试");
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
          return this.generatePageHTML(page, index, pageConfig);
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
    generatePageHTML(page, pageIndex, pageConfig) {
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

    // 缩略图相关方法
    initWindowResize() {
      this.handleWindowResize = () => {
        this.windowWidth = window.innerWidth;

        // 如果屏幕变小，自动隐藏缩略图
        if (!this.canShowThumbnails && this.showThumbnails) {
          this.showThumbnails = false;
        }
      };

      window.addEventListener("resize", this.handleWindowResize);
    },

    initScrollListener() {
      // 移除之前的监听器
      if (this.mainContentElement && this.handleScroll) {
        this.mainContentElement.removeEventListener(
          "scroll",
          this.handleScroll
        );
      }

      this.$nextTick(() => {
        // 等待DOM更新后再查找元素
        setTimeout(() => {
          this.mainContentElement = document.querySelector(".main-content");
          if (this.mainContentElement) {
            this.handleScroll = this.throttle(() => {
              this.updateCurrentPageIndex();
            }, 100);

            this.mainContentElement.addEventListener(
              "scroll",
              this.handleScroll
            );

            // 初始化当前页面索引
            this.updateCurrentPageIndex();
          }
        }, 100);
      });
    },

    // 节流函数
    throttle(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // 根据滚动位置更新当前页面索引
    updateCurrentPageIndex() {
      if (!this.shareData || !this.mainContentElement) return;

      const pageElements =
        this.mainContentElement.querySelectorAll(".page-wrapper");
      if (pageElements.length === 0) return;

      const scrollTop = this.mainContentElement.scrollTop;
      const containerHeight = this.mainContentElement.clientHeight;
      const viewportCenter = scrollTop + containerHeight / 2;

      let newPageIndex = 0;
      let minDistance = Infinity;

      pageElements.forEach((pageElement, index) => {
        const pageTop = pageElement.offsetTop;
        const pageHeight = pageElement.offsetHeight;
        const pageCenter = pageTop + pageHeight / 2;

        const distance = Math.abs(viewportCenter - pageCenter);

        if (distance < minDistance) {
          minDistance = distance;
          newPageIndex = index;
        }
      });

      if (newPageIndex !== this.currentPageIndex) {
        this.currentPageIndex = newPageIndex;
      }
    },

    toggleThumbnails() {
      this.showThumbnails = !this.showThumbnails;
    },

    scrollToPage(pageIndex) {
      // 滚动到对应页面，使其居于顶部
      this.$nextTick(() => {
        if (!this.mainContentElement) {
          this.mainContentElement = document.querySelector(".main-content");
        }

        const pageElements =
          this.mainContentElement?.querySelectorAll(".page-wrapper");
        if (pageElements && pageElements[pageIndex]) {
          const targetPage = pageElements[pageIndex];
          const targetTop = targetPage.offsetTop;

          // 平滑滚动到目标页面，使其居于顶部
          this.mainContentElement.scrollTo({
            top: targetTop - 10, // 留少量边距，让页面居于顶部
            behavior: "smooth",
          });

          // 立即更新当前页面索引
          this.currentPageIndex = pageIndex;
        }
      });
    },

    handlePageSelect(pageIndex) {
      this.currentPageIndex = pageIndex;
    },

    getThumbnailStyle() {
      if (!this.shareData) return {};

      const pageConfig = this.shareData.schema.pageConfig;
      const aspectRatio =
        pageConfig.pageSize.height / pageConfig.pageSize.width;

      // 计算缩略图尺寸
      const baseWidth = 120;
      const height = baseWidth * aspectRatio;

      return {
        width: `${baseWidth}px`,
        height: `${height}px`,
        backgroundColor: "white",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        position: "relative",
      };
    },

    getThumbnailCanvasStyle() {
      if (!this.shareData) return {};

      const pageConfig = this.shareData.schema.pageConfig;

      // 计算原始页面尺寸（以像素为单位）
      let originalWidth, originalHeight;
      if (pageConfig.pageSize.unit === "mm") {
        originalWidth = pageConfig.pageSize.width * 3.78; // 1mm ≈ 3.78px at 96dpi
        originalHeight = pageConfig.pageSize.height * 3.78;
      } else if (pageConfig.pageSize.unit === "in") {
        originalWidth = pageConfig.pageSize.width * 96; // 1in = 96px at 96dpi
        originalHeight = pageConfig.pageSize.height * 96;
      } else {
        originalWidth = pageConfig.pageSize.width;
        originalHeight = pageConfig.pageSize.height;
      }

      // 计算缩放比例，让页面适配120px宽度的缩略图
      const targetWidth = 120;
      const scale = targetWidth / originalWidth;

      return {
        position: "absolute",
        top: "0",
        left: "0",
        width: `${originalWidth}px`,
        height: `${originalHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        overflow: "hidden",
        pointerEvents: "none",
        background: "white",
      };
    },

    getComponentPreviewText(component) {
      if (!component.content) return "";

      // 移除HTML标签，只保留文本
      const text = component.content.replace(/<[^>]*>/g, "");
      return text.length > 20 ? text.substring(0, 20) + "..." : text;
    },

    // 移除了缩略图查看器相关方法，现在直接定位到页面
  },
};
</script>

<style scoped>
.share-preview {
  min-height: 100vh;
  background: #f5f5f5;
  overflow-y: auto;
  height: 100vh;
  /* 优化滚动效果 */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
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

.loading-text {
  font-size: 16px;
  color: #666;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.error-message {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
  max-width: 400px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
}

.share-content {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.share-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 24px;
  text-align: center;
}

.share-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.share-description {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 16px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.share-meta {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
  opacity: 0.8;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.view-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.view-label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.view-desc {
  font-size: 12px;
  color: #666;
}

.tool-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.tool-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.tool-btn.btn-primary {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
  font-weight: 600;
}

.tool-btn.btn-primary:hover {
  background: #73d13d;
  border-color: #73d13d;
}

.tool-btn:disabled {
  background: #f5f5f5;
  color: #bbb;
  border-color: #ddd;
  cursor: not-allowed;
}

.tool-btn:disabled:hover {
  background: #f5f5f5;
  color: #bbb;
  border-color: #ddd;
}

.preview-content {
  background: #f5f5f5;
  flex: 1;
  overflow: hidden;
}

.content-layout {
  display: flex;
  height: 100%;
  position: relative;
}

/* 缩略图侧边栏 */
.thumbnail-sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.sidebar-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.close-sidebar-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 2px;
}

.close-sidebar-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.thumbnail-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.thumbnail-list::-webkit-scrollbar {
  width: 6px;
}

.thumbnail-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.thumbnail-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.thumbnail-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.thumbnail-item {
  margin-bottom: 16px;
  cursor: pointer;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.2s;
}

.thumbnail-item:hover {
  background: #f0f8ff;
}

.thumbnail-item.active {
  background: #e6f7ff;
  border: 2px solid #1890ff;
}

.thumbnail-preview {
  margin-bottom: 8px;
}

.thumbnail-page {
  width: 100%;
  max-width: 120px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 缩略图Canvas容器样式现在通过getThumbnailCanvasStyle()动态计算 */

/* 调整缩略图中Canvas的样式 */
.thumbnail-canvas-container .canvas {
  background: white;
}

.thumbnail-canvas-container .pages-container {
  padding: 0;
  gap: 0;
}

.thumbnail-canvas-container .page-wrapper {
  margin: 0;
  box-shadow: none;
}

.thumbnail-canvas-container .page-title-bar {
  display: none;
}

.thumbnail-canvas-container .add-page-section {
  display: none;
}

/* 移除了缩略图悬停效果，现在直接点击定位 */

/* 移除了简化预览的样式，现在直接使用Canvas渲染 */

.thumbnail-label {
  text-align: center;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
  padding: 20px 0;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.main-content.with-sidebar {
  padding-left: 0;
}

/* 缩略图切换按钮 */
.thumbnail-toggle {
  position: fixed;
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  z-index: 5;
}

.toggle-btn {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.toggle-btn:hover {
  background: #f0f8ff;
  border-color: #1890ff;
  color: #1890ff;
}

/* 移除了缩略图查看器相关样式 */

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #1890ff;
  color: white;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .thumbnail-sidebar {
    display: none;
  }

  .main-content.with-sidebar {
    margin-left: 0;
  }

  .thumbnail-toggle {
    display: none;
  }
}

@media (max-width: 768px) {
  .share-meta {
    flex-direction: column;
    gap: 8px;
  }

  .preview-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: center;
  }

  .thumbnail-sidebar {
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: white;
    box-shadow: none;
  }

  .main-content {
    padding: 10px 0;
    margin-left: 0;
  }

  .main-content.with-sidebar {
    margin-left: 0;
  }
}
</style>
