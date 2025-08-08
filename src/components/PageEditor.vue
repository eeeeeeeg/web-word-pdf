<template>
  <div class="page-editor">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h1 class="title">页面编辑器</h1>
      </div>
      <div class="toolbar-center">
        <button
          class="btn"
          :class="{ active: mode === 'edit' }"
          @click="setMode('edit')"
        >
          编辑模式
        </button>
        <button
          class="btn"
          :class="{ active: mode === 'preview' }"
          @click="setMode('preview')"
        >
          预览模式
        </button>
      </div>
      <div class="toolbar-right">
        <button class="btn" @click="undo" :disabled="!canUndo" title="撤销">
          ↶
        </button>
        <button class="btn" @click="redo" :disabled="!canRedo" title="重做">
          ↷
        </button>
        <button
          class="btn"
          :class="{ active: autoPaginationEnabled }"
          @click="toggleAutoPagination"
          title="自动分页"
        >
          {{ autoPaginationEnabled ? "自动分页: 开" : "自动分页: 关" }}
        </button>
        <button
          class="btn"
          @click="manualPagination"
          :disabled="paginationInProgress"
          title="手动分页"
        >
          {{ paginationInProgress ? "分页中..." : "手动分页" }}
        </button>
        <button class="btn" @click="saveSchema">保存</button>
        <button class="btn" @click="loadSchema">加载</button>
        <button class="btn btn-share" @click="openShareDialog">分享</button>
        <button
          v-if="mode === 'edit'"
          class="btn test-btn"
          @click="runPaginationTest"
          title="测试分页功能"
        >
          测试分页
        </button>
        <div class="export-dropdown">
          <button class="btn" @click="toggleExportMenu">导出 ▼</button>
          <div v-if="showExportMenu" class="export-menu">
            <button @click="exportAsPDF">导出为 PDF</button>
            <button @click="exportAsImage">导出为图片</button>
            <button @click="exportAsWord">导出为 Word</button>
            <button @click="exportAsHTML">导出为 HTML (Playwright)</button>
            <button @click="printPage">打印</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="editor-content">
      <!-- 左侧组件库 -->
      <div class="sidebar-left" v-if="mode === 'edit'">
        <ComponentLibrary @drag-start="handleDragStart" />
      </div>

      <!-- 中间画布区域 -->
      <div class="canvas-container">
        <div class="canvas-wrapper">
          <!-- 全局属性配置 -->
          <GlobalConfig
            v-if="showGlobalConfig"
            :config="pageSchema.pageConfig"
            @update="updatePageConfig"
            @close="showGlobalConfig = false"
          />

          <!-- 分享对话框 -->
          <ShareDialog
            v-if="showShareDialog"
            :schema="pageSchema"
            @close="closeShareDialog"
          />

          <!-- 分页警告 -->
          <PaginationWarnings
            v-if="paginationWarnings.length > 0"
            :warnings="paginationWarnings"
            @close="paginationWarnings = []"
            @disable-auto-pagination="handleDisableAutoPagination"
            @retry-pagination="manualPagination"
            @select-component="handleSelectComponentFromWarning"
            @split-component="handleSplitComponent"
            @adjust-margins="handleAdjustMargins"
          />

          <!-- 分页警告 -->
          <PaginationWarnings
            v-if="paginationWarnings.length > 0"
            :warnings="paginationWarnings"
            @close="paginationWarnings = []"
            @disable-auto-pagination="handleDisableAutoPagination"
            @retry-pagination="manualPagination"
            @select-component="handleSelectComponentFromWarning"
            @split-component="handleSplitComponent"
            @adjust-margins="handleAdjustMargins"
          />

          <!-- 画布 -->
          <Canvas
            :schema="pageSchema"
            :mode="mode"
            :selected-component="selectedComponent"
            @component-select="handleComponentSelect"
            @component-drop="handleComponentDrop"
            @component-drop-adjacent="handleComponentDropAdjacent"
            @component-update="handleComponentUpdate"
            @component-delete="handleComponentDelete"
            @component-copy="handleComponentCopy"
            @component-sort="handleComponentSort"
            @component-move="handleComponentMove"
            @page-select="switchPage"
            @page-add="addPage"
            @page-copy="copyPage"
            @page-delete="deletePage"
          />
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="sidebar-right" v-if="mode === 'edit'">
        <PropertyPanel
          :component="selectedComponent"
          :page-config="pageSchema.pageConfig"
          @update="handlePropertyUpdate"
          @show-global-config="showGlobalConfig = true"
        />
      </div>
    </div>
  </div>
</template>

<script>
import {
  createPageSchema,
  validateSchema,
  createComponent,
  createPage,
  COMPONENT_TYPES,
  LAYOUT_PRESETS,
} from "../types/schema.js";
import {
  localStorageManager,
  fileManager,
  historyManager,
  AutoSaveManager,
} from "../utils/schemaManager.js";
import {
  PDFExportManager,
  ImageExportManager,
  PrintManager,
} from "../utils/exportManager.js";
import {
  executeAutoPagination,
  shouldRepaginate,
} from "../utils/autoPagination.js";
import { createPageHeightObserver } from "../utils/componentMeasurer.js";
import { runAllTests } from "../utils/paginationTest.js";
import ComponentLibrary from "./ComponentLibrary.vue";
import Canvas from "./Canvas.vue";
import PropertyPanel from "./PropertyPanel.vue";
import GlobalConfig from "./GlobalConfig.vue";
import PaginationWarnings from "./PaginationWarnings.vue";
import ShareDialog from "./ShareDialog.vue";

import { exportPDF, exportWord } from "@/apis/dowload/index.js";

export default {
  name: "PageEditor",
  components: {
    ComponentLibrary,
    Canvas,
    PropertyPanel,
    GlobalConfig,
    PaginationWarnings,
    ShareDialog,
  },
  data() {
    return {
      mode: "edit", // edit | preview
      pageSchema: createPageSchema(),
      selectedComponent: null,
      draggedComponent: null,
      showGlobalConfig: false,
      showShareDialog: false,
      autoSaveManager: null,
      hasUnsavedChanges: false,
      showExportMenu: false,
      // 自动分页相关状态
      autoPaginationEnabled: true,
      heightObserver: null,
      paginationInProgress: false,
      paginationWarnings: [],
      paginationDebounceTimer: null,
    };
  },

  mounted() {
    // 初始化自动保存
    this.autoSaveManager = new AutoSaveManager(() => {
      this.autoSave();
    });
    this.autoSaveManager.enable();

    // 尝试加载上次的工作
    this.loadLastSession();

    // 添加页面关闭前的提示
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // 添加点击外部关闭菜单的监听
    document.addEventListener("click", this.handleDocumentClick);

    // 初始化自动分页监听器
    this.initializeAutoPagination();
  },

  beforeDestroy() {
    if (this.autoSaveManager) {
      this.autoSaveManager.disable();
    }
    if (this.heightObserver) {
      this.heightObserver.disconnect();
    }
    if (this.paginationDebounceTimer) {
      clearTimeout(this.paginationDebounceTimer);
    }
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    document.removeEventListener("click", this.handleDocumentClick);
  },

  computed: {
    canUndo() {
      return historyManager.canUndo();
    },

    canRedo() {
      return historyManager.canRedo();
    },
  },

  methods: {
    setMode(mode) {
      this.mode = mode;
      if (mode === "preview") {
        this.selectedComponent = null;
      }
    },

    handleDragStart(componentData) {
      this.draggedComponent = componentData;
    },

    handleComponentSelect(component) {
      this.selectedComponent = component;
    },

    handleComponentDrop(dropData) {
      // 处理组件拖拽放置
      const { component, targetContainer, position, pageIndex } = dropData;
      const targetPage =
        this.pageSchema.pages[
          pageIndex !== undefined ? pageIndex : this.pageSchema.currentPageIndex
        ];

      if (targetContainer) {
        // 放置到容器中
        if (!targetContainer.children) {
          targetContainer.children = [];
        }
        targetContainer.children.splice(position, 0, component);
      } else {
        // 放置到根级别
        if (component.type === "text" || component.type === "image") {
          // 内容组件需要包装在布局组件中
          const layoutComponent = createComponent(COMPONENT_TYPES.LAYOUT, {
            preset: "single",
            columns: LAYOUT_PRESETS.SINGLE_COLUMN.columns,
            children: [{ ...component, columnIndex: 0 }],
          });
          targetPage.components.push(layoutComponent);
        } else {
          // 布局组件直接添加
          targetPage.components.push(component);
        }
      }

      // 如果拖拽到非当前页面，自动切换到目标页面
      if (
        pageIndex !== undefined &&
        pageIndex !== this.pageSchema.currentPageIndex
      ) {
        this.pageSchema.currentPageIndex = pageIndex;
      }

      this.updateTimestamp();
      this.markAsChanged();
    },

    handleComponentDropAdjacent(dropData) {
      // 处理组件拖拽到布局组件前后位置
      const { component, targetComponentId, position, pageIndex } = dropData;
      const targetPage =
        this.pageSchema.pages[
          pageIndex !== undefined ? pageIndex : this.pageSchema.currentPageIndex
        ];

      // 查找目标组件在页面中的位置
      const targetIndex = targetPage.components.findIndex(
        (c) => c.id === targetComponentId
      );

      if (targetIndex !== -1) {
        // 计算插入位置
        let insertIndex = targetIndex;
        if (position === "after") {
          insertIndex = targetIndex + 1;
        }

        // 内容组件需要包装在布局组件中
        if (component.type === "text" || component.type === "image") {
          const layoutComponent = createComponent(COMPONENT_TYPES.LAYOUT, {
            preset: "single",
            columns: LAYOUT_PRESETS.SINGLE_COLUMN.columns,
            children: [{ ...component, columnIndex: 0 }],
          });
          targetPage.components.splice(insertIndex, 0, layoutComponent);
        } else {
          // 布局组件直接插入
          targetPage.components.splice(insertIndex, 0, component);
        }

        // 如果拖拽到非当前页面，自动切换到目标页面
        if (
          pageIndex !== undefined &&
          pageIndex !== this.pageSchema.currentPageIndex
        ) {
          this.pageSchema.currentPageIndex = pageIndex;
        }

        this.updateTimestamp();
        this.markAsChanged();
      }
    },

    handleComponentUpdate(updatedComponent) {
      console.log(
        "PageEditor111: handleComponentUpdate called with:",
        updatedComponent
      );
      console.log("PageEditor222: handleComponentUpdate called with:", {
        id: updatedComponent.id,
        type: updatedComponent.type,
        src: updatedComponent.src ? "has src" : "no src",
        uploading: updatedComponent.uploading,
        uploadError: updatedComponent.uploadError,
      });

      // 在所有页面中查找并更新组件
      this.updateComponentInPages(updatedComponent);

      // 如果是当前选中的组件，更新选中状态
      if (
        this.selectedComponent &&
        this.selectedComponent.id === updatedComponent.id
      ) {
        this.selectedComponent = updatedComponent;
      }

      // 组件更新后刷新时间戳
      this.updateTimestamp();
      this.markAsChanged();
    },

    updateComponentInPages(updatedComponent) {
      // 递归更新组件
      const updateInList = (components) => {
        for (let i = 0; i < components.length; i++) {
          if (components[i].id === updatedComponent.id) {
            // 找到目标组件，更新它
            console.log("PageEditor: Found component to update:", {
              oldSrc: components[i].src ? "has src" : "no src",
              newSrc: updatedComponent.src ? "has src" : "no src",
            });

            // 使用 Vue.set 或者直接替换数组元素来确保响应式更新
            this.$set(components, i, updatedComponent);

            console.log(
              "PageEditor: Component updated in pages with timestamp"
            );

            // 强制更新视图
            this.$forceUpdate();

            return true;
          }

          // 如果是布局组件，递归查找子组件
          if (components[i].type === "layout" && components[i].children) {
            if (updateInList(components[i].children)) {
              return true;
            }
          }
        }
        return false;
      };

      // 在所有页面中查找并更新
      for (const page of this.pageSchema.pages) {
        if (updateInList(page.components)) {
          break; // 找到并更新后退出
        }
      }
    },

    handleComponentDelete(componentId) {
      // 在所有页面中递归删除组件
      let found = false;
      for (const page of this.pageSchema.pages) {
        if (this.deleteComponentById(page.components, componentId)) {
          found = true;
          break;
        }
      }

      if (
        found &&
        this.selectedComponent &&
        this.selectedComponent.id === componentId
      ) {
        this.selectedComponent = null;
      }
      this.updateTimestamp();
      this.markAsChanged();
    },

    handleComponentCopy(data) {
      const { component, pageIndex } = data;

      // 只允许复制布局组件
      if (component.type !== "layout") {
        console.warn("只有布局组件支持复制功能");
        return;
      }

      // 深度复制布局组件
      const copiedComponent = this.deepCopyComponent(component);

      // 获取目标页面
      const targetPageIndex =
        pageIndex !== undefined ? pageIndex : this.pageSchema.currentPageIndex;
      const targetPage = this.pageSchema.pages[targetPageIndex];

      // 布局组件总是根级别组件，直接添加到页面
      const originalIndex = targetPage.components.findIndex(
        (c) => c.id === component.id
      );
      if (originalIndex !== -1) {
        // 在原布局组件后面插入复制的组件
        targetPage.components.splice(originalIndex + 1, 0, copiedComponent);
      } else {
        // 如果找不到原组件，就添加到末尾
        targetPage.components.push(copiedComponent);
      }

      // 选中新复制的布局组件
      this.selectedComponent = copiedComponent;
      this.updateTimestamp();
      this.markAsChanged();

      console.log(`布局组件已复制: ${component.id} -> ${copiedComponent.id}`);
    },

    handleComponentSort(sortData) {
      const { draggedComponentId, targetComponentId, position, pageIndex } =
        sortData;

      console.log("处理组件排序:", sortData);

      // 在指定页面的根级别组件中查找并移动
      const targetPage =
        this.pageSchema.pages[
          pageIndex !== undefined ? pageIndex : this.pageSchema.currentPageIndex
        ];
      const components = targetPage.components;
      const draggedIndex = components.findIndex(
        (c) => c.id === draggedComponentId
      );
      const targetIndex = components.findIndex(
        (c) => c.id === targetComponentId
      );

      console.log("拖拽索引:", draggedIndex, "目标索引:", targetIndex);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // 移除被拖拽的组件
        const draggedComponent = components.splice(draggedIndex, 1)[0];

        // 计算新的插入位置
        let newIndex = targetIndex;
        if (draggedIndex < targetIndex) {
          newIndex--; // 因为移除了前面的元素，索引需要减1
        }

        if (position === "after") {
          newIndex++;
        }

        console.log("最终插入位置:", newIndex);

        // 插入到新位置
        components.splice(newIndex, 0, draggedComponent);

        this.updateTimestamp();
        this.markAsChanged();
      }
    },

    handleComponentMove(moveData) {
      const { componentId, direction, pageIndex } = moveData;

      // 获取目标页面
      const targetPage =
        this.pageSchema.pages[
          pageIndex !== undefined ? pageIndex : this.pageSchema.currentPageIndex
        ];
      const components = targetPage.components;

      // 查找要移动的组件
      const componentIndex = components.findIndex((c) => c.id === componentId);
      if (componentIndex === -1) return;

      // 计算新位置
      let newIndex;
      if (direction === "up") {
        newIndex = Math.max(0, componentIndex - 1);
      } else if (direction === "down") {
        newIndex = Math.min(components.length - 1, componentIndex + 1);
      } else {
        return;
      }

      // 如果位置没有变化，直接返回
      if (newIndex === componentIndex) return;

      // 移动组件
      const component = components.splice(componentIndex, 1)[0];
      components.splice(newIndex, 0, component);

      this.updateTimestamp();
      this.markAsChanged();
    },

    deleteComponentById(components, id) {
      console.log(
        "wang ---------------- components",
        JSON.stringify(components)
      );
      console.log("wang ---------------- id", id);

      // 首先在所有布局组件的子组件中查找
      for (let i = 0; i < components.length; i++) {
        if (components[i].children && components[i].type === "layout") {
          // 在布局组件的子组件中查找
          for (let j = 0; j < components[i].children.length; j++) {
            if (components[i].children[j].id === id) {
              // 找到要删除的子组件（内容组件）
              const childToDelete = components[i].children[j];

              // 只删除内容组件，保留布局组件
              if (
                childToDelete.type === "text" ||
                childToDelete.type === "image"
              ) {
                console.log(`删除布局组件内的${childToDelete.type}组件:`, id);
                components[i].children.splice(j, 1);
                return true;
              }
            }
          }

          // 继续递归查找（如果有嵌套布局）
          if (this.deleteComponentById(components[i].children, id)) {
            return true;
          }
        }
      }

      // 然后在根级别查找
      for (let i = 0; i < components.length; i++) {
        if (components[i].id === id) {
          // 找到要删除的组件
          const componentToDelete = components[i];
          console.log(`删除根级别组件:`, componentToDelete.type, id);

          // 直接删除根级别组件（布局组件或内容组件）
          components.splice(i, 1);
          return true;
        }
      }

      return false;
    },

    handlePropertyUpdate(updates) {
      if (this.selectedComponent) {
        if (updates._delete) {
          this.handleComponentDelete(this.selectedComponent.id);
        } else {
          Object.assign(this.selectedComponent, updates);
          this.updateTimestamp();
          this.markAsChanged();
        }
      }
    },

    updatePageConfig(config) {
      this.pageSchema.pageConfig = { ...this.pageSchema.pageConfig, ...config };
      this.updateTimestamp();
      this.markAsChanged();
    },

    updateTimestamp() {
      this.pageSchema.updatedAt = new Date().toISOString();
    },

    markAsChanged() {
      this.hasUnsavedChanges = true;
      // 添加到历史记录
      historyManager.addHistory(this.pageSchema);
      // 重置自动保存定时器
      if (this.autoSaveManager) {
        this.autoSaveManager.reset();
      }
    },

    autoSave() {
      if (this.hasUnsavedChanges) {
        localStorageManager.saveCurrentSchema(this.pageSchema);
        console.log("Auto-saved at", new Date().toLocaleTimeString());
      }
    },

    loadLastSession() {
      const lastSchema = localStorageManager.getCurrentSchema();
      if (lastSchema) {
        const validation = validateSchema(lastSchema);
        if (validation.valid) {
          this.pageSchema = lastSchema;
          console.log("Loaded last session");
        }
      }
    },

    handleBeforeUnload(event) {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "您有未保存的更改，确定要离开吗？";
        return event.returnValue;
      }
    },

    handleDocumentClick(event) {
      // 检查点击是否在导出菜单外部
      const exportDropdown = this.$el.querySelector(".export-dropdown");
      if (exportDropdown && !exportDropdown.contains(event.target)) {
        this.showExportMenu = false;
      }
    },

    saveSchema() {
      try {
        fileManager.exportSchemaAsJson(this.pageSchema);
        this.hasUnsavedChanges = false;
      } catch (error) {
        alert("保存失败: " + error.message);
      }
    },

    async loadSchema() {
      try {
        const schema = await fileManager.importSchemaFromJson();
        this.pageSchema = schema;
        this.selectedComponent = null;
        this.hasUnsavedChanges = false;
        // 清空历史记录并添加新的起点
        historyManager.clear();
        historyManager.addHistory(this.pageSchema);
      } catch (error) {
        alert("加载失败: " + error.message);
      }
    },

    // 分享功能
    openShareDialog() {
      this.showShareDialog = true;
    },

    closeShareDialog() {
      this.showShareDialog = false;
    },

    undo() {
      const previousSchema = historyManager.undo();
      if (previousSchema) {
        this.pageSchema = previousSchema;
        this.selectedComponent = null;
        this.hasUnsavedChanges = true;
      }
    },

    redo() {
      const nextSchema = historyManager.redo();
      if (nextSchema) {
        this.pageSchema = nextSchema;
        this.selectedComponent = null;
        this.hasUnsavedChanges = true;
      }
    },

    toggleExportMenu() {
      this.showExportMenu = !this.showExportMenu;
    },

    async exportAsPDF() {
      this.showExportMenu = false;
      try {
        const canvasElement = this.$el.querySelector(".page");
        if (!canvasElement) {
          throw new Error("找不到页面元素");
        }

        const pageConfig = this.pageSchema.pageConfig;
        await PDFExportManager.exportToPDF(canvasElement, {
          filename: `页面设计_${new Date().toLocaleDateString()}.pdf`,
          format: pageConfig.pageSize.preset.toLowerCase(),
          orientation: pageConfig.pageSize.orientation || "portrait",
          margin: Math.max(
            pageConfig.margins.top,
            pageConfig.margins.bottom,
            pageConfig.margins.left,
            pageConfig.margins.right
          ),
          quality: 1,
        });

        alert("PDF 导出成功！");
      } catch (error) {
        alert("PDF 导出失败: " + error.message);
      }
    },

    async exportAsImage() {
      this.showExportMenu = false;
      try {
        const canvasElement = this.$el.querySelector(".page");
        if (!canvasElement) {
          throw new Error("找不到页面元素");
        }

        await ImageExportManager.exportToImage(canvasElement, {
          filename: `页面设计_${new Date().toLocaleDateString()}.png`,
          format: "png",
          quality: 2,
        });

        alert("图片导出成功！");
      } catch (error) {
        alert("图片导出失败: " + error.message);
      }
    },

    async exportAsWord() {
      this.showExportMenu = false;
      try {
        const htmlContent = this.generatePlaywrightHTML();
        exportWord(htmlContent);
        alert("Word 文档导出成功！");
      } catch (error) {
        alert("Word 导出失败: " + error.message);
      }
    },

    exportAsHTML() {
      this.showExportMenu = false;
      try {
        const htmlContent = this.generatePlaywrightHTML();
        console.log(" htmlContent -------------------- ", htmlContent);

        // 从页面配置中获取参数
        const pageConfig = this.pageSchema.pageConfig;
        const margins = pageConfig.margins;

        // 由于页眉页脚已经集成到主HTML中，使用原始边距
        const exportOptions = {
          displayHeaderFooter: false, // 不使用单独的页眉页脚模板
          headerTemplate: "",
          footerTemplate: "",
          format: pageConfig.pageSize.preset || "A4",
          orientation: pageConfig.pageSize.orientation || "portrait",
          margin: {
            top: `${margins.top}mm`,
            bottom: `${margins.bottom}mm`,
            left: `${margins.left}mm`,
            right: `${margins.right}mm`,
          },
          printBackground: true,
          scale: 1,
        };

        exportPDF(htmlContent, exportOptions);
        // 可选：同时导出HTML文件用于调试
        // this.downloadHTML(
        //   htmlContent,
        //   `页面设计_${new Date().toLocaleDateString()}.html`
        // );
        alert("HTML 导出成功！");
      } catch (error) {
        alert("HTML 导出失败: " + error.message);
      }
    },

    printPage() {
      this.showExportMenu = false;
      try {
        const canvasElement = this.$el.querySelector(".page");
        if (!canvasElement) {
          throw new Error("找不到页面元素");
        }

        PrintManager.printPage(canvasElement, {
          title: "页面设计打印",
        });
      } catch (error) {
        alert("打印失败: " + error.message);
      }
    },

    // 页面管理方法
    switchPage(index) {
      if (index >= 0 && index < this.pageSchema.pages.length) {
        this.pageSchema.currentPageIndex = index;
        this.selectedComponent = null;
        this.markAsChanged();
      }
    },

    addPage() {
      const newPage = createPage({
        name: `页面${this.pageSchema.pages.length + 1}`,
      });
      this.pageSchema.pages.push(newPage);
      this.pageSchema.currentPageIndex = this.pageSchema.pages.length - 1;
      this.selectedComponent = null;
      this.markAsChanged();
    },

    copyPage(index) {
      if (index < 0 || index >= this.pageSchema.pages.length) {
        alert("无效的页面索引");
        return;
      }

      const sourcePage = this.pageSchema.pages[index];

      // 深度复制页面数据
      const copiedPage = this.deepCopyPage(sourcePage);

      // 设置新页面的名称
      copiedPage.name = `${sourcePage.name} - 副本`;

      // 在当前页面后插入复制的页面
      this.pageSchema.pages.splice(index + 1, 0, copiedPage);

      // 切换到新复制的页面
      this.pageSchema.currentPageIndex = index + 1;
      this.selectedComponent = null;
      this.markAsChanged();

      console.log(`页面 "${sourcePage.name}" 已复制`);
    },

    // 深度复制页面数据
    deepCopyPage(sourcePage) {
      // 生成新的页面ID
      const newPageId = this.generateId();

      // 复制页面基本信息
      const copiedPage = {
        id: newPageId,
        name: sourcePage.name,
        components: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 深度复制所有组件
      copiedPage.components = sourcePage.components.map((component) =>
        this.deepCopyComponent(component)
      );

      return copiedPage;
    },

    // 深度复制组件数据
    deepCopyComponent(sourceComponent) {
      const newComponentId = this.generateId();

      // 复制组件基本数据
      const copiedComponent = {
        ...sourceComponent,
        id: newComponentId,
      };

      // 如果是布局组件，递归复制子组件
      if (sourceComponent.type === "layout" && sourceComponent.children) {
        copiedComponent.children = sourceComponent.children.map((child) =>
          this.deepCopyComponent(child)
        );
      }

      return copiedComponent;
    },

    // 生成唯一ID的辅助方法
    generateId() {
      return (
        "comp_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now()
      );
    },

    deletePage(index) {
      if (this.pageSchema.pages.length <= 1) {
        alert("至少需要保留一个页面");
        return;
      }

      if (confirm("确定要删除这个页面吗？")) {
        this.pageSchema.pages.splice(index, 1);

        // 调整当前页面索引
        if (this.pageSchema.currentPageIndex >= this.pageSchema.pages.length) {
          this.pageSchema.currentPageIndex = this.pageSchema.pages.length - 1;
        } else if (this.pageSchema.currentPageIndex > index) {
          this.pageSchema.currentPageIndex--;
        }

        this.selectedComponent = null;
        this.markAsChanged();
      }
    },

    // 自动分页相关方法
    initializeAutoPagination() {
      if (!this.autoPaginationEnabled) return;

      // 等待DOM渲染完成后初始化
      this.$nextTick(() => {
        this.setupHeightObserver();
      });
    },

    setupHeightObserver() {
      // 清理现有的观察器
      if (this.heightObserver) {
        this.heightObserver.disconnect();
      }

      // 收集所有页面的组件
      const allComponents = [];
      this.pageSchema.pages.forEach((page) => {
        allComponents.push(...page.components);
      });

      // 创建高度观察器
      this.heightObserver = createPageHeightObserver(allComponents, (data) => {
        this.handleHeightChange(data);
      });
    },

    async handleHeightChange() {
      if (this.paginationInProgress) return;

      // 防抖处理，避免频繁触发
      clearTimeout(this.paginationDebounceTimer);
      this.paginationDebounceTimer = setTimeout(async () => {
        await this.checkAndExecutePagination();
      }, 500);
    },

    async checkAndExecutePagination() {
      if (!this.autoPaginationEnabled || this.paginationInProgress) return;

      try {
        this.paginationInProgress = true;

        // 检查是否需要重新分页
        const needsPagination = await shouldRepaginate(this.pageSchema);

        if (needsPagination) {
          await this.executeAutoPagination();
        }
      } catch (error) {
        console.error("自动分页检查失败:", error);
      } finally {
        this.paginationInProgress = false;
      }
    },

    async executeAutoPagination() {
      try {
        const result = await executeAutoPagination(this.pageSchema);

        if (result.success) {
          // 应用新的页面结构
          this.pageSchema = result.newSchema;
          this.paginationWarnings = result.warnings || [];

          // 重新设置高度观察器
          this.$nextTick(() => {
            this.setupHeightObserver();
          });

          // 标记为已更改
          this.markAsChanged();

          console.log("自动分页完成:", result.statistics);
        } else {
          console.warn("自动分页失败:", result.errors);
          this.paginationWarnings = result.errors || [];
        }
      } catch (error) {
        console.error("执行自动分页时出错:", error);
        this.paginationWarnings = [error.message];
      }
    },

    toggleAutoPagination() {
      this.autoPaginationEnabled = !this.autoPaginationEnabled;

      if (this.autoPaginationEnabled) {
        this.initializeAutoPagination();
      } else if (this.heightObserver) {
        this.heightObserver.disconnect();
        this.heightObserver = null;
      }
    },

    async manualPagination() {
      if (this.paginationInProgress) return;

      try {
        this.paginationInProgress = true;
        await this.executeAutoPagination();
      } finally {
        this.paginationInProgress = false;
      }
    },

    // 警告处理方法
    handleDisableAutoPagination() {
      this.autoPaginationEnabled = false;
      this.paginationWarnings = [];

      if (this.heightObserver) {
        this.heightObserver.disconnect();
        this.heightObserver = null;
      }
    },

    handleSelectComponentFromWarning(componentId) {
      if (!componentId) return;

      // 在所有页面中查找组件
      for (const page of this.pageSchema.pages) {
        const component = this.findComponentById(page.components, componentId);
        if (component) {
          this.selectedComponent = component;
          this.paginationWarnings = [];
          break;
        }
      }
    },

    findComponentById(components, id) {
      for (const component of components) {
        if (component.id === id) {
          return component;
        }

        if (component.children) {
          const found = this.findComponentById(component.children, id);
          if (found) return found;
        }
      }
      return null;
    },

    handleSplitComponent(componentId) {
      // 这里可以实现组件拆分逻辑
      // 暂时显示提示信息
      alert(`组件拆分功能正在开发中。组件ID: ${componentId}`);
    },

    handleAdjustMargins() {
      // 打开全局配置面板，让用户调整页边距
      this.showGlobalConfig = true;
      this.paginationWarnings = [];
    },

    // HTML 导出相关方法
    generatePlaywrightHTML() {
      const config = this.pageSchema.pageConfig;
      const pages = this.pageSchema.pages;

      // 生成页面样式
      const pageStyles = this.generatePageStyles(config);

      // 生成页面内容
      const pagesHTML = pages
        .map((page, index) => this.generatePageHTML(page, index, config))
        .join("\n");

      return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面设计导出</title>
    <style>
        ${pageStyles}
    </style>
</head>
<body>
    <div class="document-container">
        ${pagesHTML}
    </div>
</body>
</html>`;
    },

    // 生成页眉模板
    generateHeaderTemplate() {
      const headerConfig = this.pageSchema.pageConfig.header;
      if (
        !headerConfig.enabled ||
        !headerConfig.components ||
        headerConfig.components.length === 0
      ) {
        return "";
      }

      // 处理占位符替换，但保留Playwright特殊占位符
      const processedComponents = headerConfig.components.map((component) => {
        const processedComponent = JSON.parse(JSON.stringify(component));
        this.replacePlaywrightVariables(processedComponent);
        return processedComponent;
      });

      const headerHTML = processedComponents
        .map((component) => this.generateComponentHTML(component, true))
        .join("");

      const headerHeight = this.pageSchema.pageConfig.header.height || 15; // mm

      return `
        <div style="
          width: 100%;
          height: ${headerHeight}mm;
          padding: 2px 10px;
          margin: 0;
          -webkit-print-color-adjust: exact;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          overflow: hidden;
        ">
          ${headerHTML}
        </div>
      `;
    },

    // 生成页脚模板
    generateFooterTemplate() {
      const footerConfig = this.pageSchema.pageConfig.footer;
      if (
        !footerConfig.enabled ||
        !footerConfig.components ||
        footerConfig.components.length === 0
      ) {
        return "";
      }

      // 处理占位符替换，但保留Playwright特殊占位符
      const processedComponents = footerConfig.components.map((component) => {
        const processedComponent = JSON.parse(JSON.stringify(component));
        this.replacePlaywrightVariables(processedComponent);
        return processedComponent;
      });

      const footerHTML = processedComponents
        .map((component) => this.generateComponentHTML(component, true))
        .join("");

      const footerHeight = this.pageSchema.pageConfig.footer.height || 15; // mm

      return `
        <div style="
          width: 100%;
          height: ${footerHeight}mm;
          padding: 2px 10px;
          margin: 0;
          -webkit-print-color-adjust: exact;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
        ">
          ${footerHTML}
          <span style="font-size: 10px; font-family: Arial, sans-serif; color: #333;">第 <span class="pageNumber"></span> 页 / 共 <span class="totalPages"></span> 页</span>
        </div>
      `;
    },

    // 替换组件中的变量占位符
    replaceVariablesInComponent(component, pageNumber, totalPages) {
      const now = new Date();
      const date = now.toLocaleDateString("zh-CN");
      const time = now.toLocaleTimeString("zh-CN");

      // 替换文本组件的内容
      if (component.type === "text" && component.content) {
        component.content = component.content
          .replace(/\{pageNumber\}/g, pageNumber.toString())
          .replace(/\{totalPages\}/g, totalPages.toString())
          .replace(/\{date\}/g, date)
          .replace(/\{time\}/g, time);
      }

      // 递归处理子组件
      if (component.children && Array.isArray(component.children)) {
        component.children.forEach((child) => {
          this.replaceVariablesInComponent(child, pageNumber, totalPages);
        });
      }
    },

    // 替换Playwright页眉页脚中的变量占位符
    replacePlaywrightVariables(component) {
      const now = new Date();
      const date = now.toLocaleDateString("zh-CN");
      const time = now.toLocaleTimeString("zh-CN");

      // 替换文本组件的内容，使用Playwright特殊CSS类
      if (component.type === "text" && component.content) {
        component.content = component.content
          .replace(/\{pageNumber\}/g, '<span class="pageNumber"></span>')
          .replace(/\{totalPages\}/g, '<span class="totalPages"></span>')
          .replace(/\{date\}/g, `<span class="date">${date}</span>`)
          .replace(/\{time\}/g, time);
      }

      // 递归处理子组件
      if (component.children && Array.isArray(component.children)) {
        component.children.forEach((child) => {
          this.replacePlaywrightVariables(child);
        });
      }
    },

    generatePageStyles(config) {
      const size = config.pageSize;
      let width, height;

      // 转换尺寸到像素 - 与Canvas.vue保持一致
      if (size.unit === "mm") {
        width = size.width * 3.78; // 1mm ≈ 3.78px at 96dpi
        height = size.height * 3.78;
      } else if (size.unit === "in") {
        width = size.width * 96; // 1in = 96px at 96dpi
        height = size.height * 96;
      } else {
        width = size.width;
        height = size.height;
      }

      // 计算页面内边距 - 与Canvas.vue的pageStyle保持一致
      const paddingTop = config.margins.top * 3.78;
      const paddingRight = config.margins.right * 3.78;
      const paddingBottom = config.margins.bottom * 3.78;
      const paddingLeft = config.margins.left * 3.78;

      return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }

        .document-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
        }

        .page {
            width: ${width}px;
            height: ${height}px;
            background: white;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border-radius: 6px;
            position: relative;
            padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px;
        }

 

        .page-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: ${
              config.header.enabled ? config.header.height * 3.78 : 0
            }px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #f0f0f0;
            background: rgba(248, 248, 248, 0.8);
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            padding: 8px 16px;
            z-index: 10;
        }

        .page-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${
              config.footer.enabled ? config.footer.height * 3.78 : 0
            }px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid #f0f0f0;
            background: rgba(248, 248, 248, 0.8);
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            padding: 8px 16px;
            z-index: 10;
        }

        .page-content {
            position: relative;
            height: 100%;
            ${
              config.header.enabled
                ? `padding-top: ${config.header.height * 3.78}px;`
                : ""
            }
            ${
              config.footer.enabled
                ? `padding-bottom: ${config.footer.height * 3.78}px;`
                : ""
            }
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-height: calc(100% - ${
              (config.header.enabled ? config.header.height * 3.78 : 0) +
              (config.footer.enabled ? config.footer.height * 3.78 : 0)
            }px);
        }

        .layout-component {
            display: flex;
            align-items: stretch;
            min-height: 60px;
            gap: 8px;
        }

        .layout-column {
            padding: 8px;
            position: relative;
            box-sizing: border-box;
        }

        .text-component {
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
            min-height: 24px;
            padding: 8px;
        }

        .text-content {
            width: 100%;
            min-height: inherit;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: inherit;
            background: transparent;
            margin: 0;
        }

        /* 文本内容样式 - 与text-display.css保持一致 */
        .text-content p {
            margin: 0 0 6px 0;
        }

        .text-content p:last-child {
            margin-bottom: 0;
        }

        .text-content h1, .text-content h2, .text-content h3,
        .text-content h4, .text-content h5, .text-content h6 {
            margin: 8px 0;
            color: inherit;
        }

        .text-content ul, .text-content ol {
            margin: 8px 0;
            padding-left: 20px;
        }

        .text-content li {
            margin: 2px 0;
            line-height: 1.5;
        }

        .image-component {
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
        }

        .image-component img {
            max-width: 100%;
            height: auto;
            display: block;
            border-radius: 4px;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .document-container {
                gap: 0;
            }

            .page {
                box-shadow: none;
                border-radius: 0;
                margin: 0;
            }

            .page:last-child {
            }
        }
      `;
    },

    generatePageHTML(page, pageIndex, config) {
      const pageClass = `page page-${pageIndex + 1}`;

      // 生成页眉 - 直接集成到主HTML中
      let headerHTML = "";
      if (
        config.header.enabled &&
        config.header.components &&
        config.header.components.length > 0
      ) {
        // 处理页眉组件，替换变量
        const processedHeaderComponents = config.header.components.map(
          (component) => {
            const processedComponent = JSON.parse(JSON.stringify(component));
            this.replaceVariablesInComponent(
              processedComponent,
              pageIndex + 1,
              this.pageSchema.pages.length
            );
            return processedComponent;
          }
        );

        const headerComponentsHTML = processedHeaderComponents
          .map((component) => this.generateComponentHTML(component, true))
          .join("\n");

        headerHTML = `
          <div class="page-header" style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: ${config.header.height * 3.78}px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #f0f0f0;
            background: rgba(248, 248, 248, 0.8);
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            padding: 8px 16px;
            z-index: 10;
          ">
            ${headerComponentsHTML}
          </div>
        `;
      }

      // 生成页脚 - 直接集成到主HTML中
      let footerHTML = "";
      if (
        config.footer.enabled &&
        config.footer.components &&
        config.footer.components.length > 0
      ) {
        // 处理页脚组件，替换变量
        const processedFooterComponents = config.footer.components.map(
          (component) => {
            const processedComponent = JSON.parse(JSON.stringify(component));
            this.replaceVariablesInComponent(
              processedComponent,
              pageIndex + 1,
              this.pageSchema.pages.length
            );
            return processedComponent;
          }
        );

        const footerComponentsHTML = processedFooterComponents
          .map((component) => this.generateComponentHTML(component, true))
          .join("\n");

        footerHTML = `
          <div class="page-footer" style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${config.footer.height * 3.78}px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid #f0f0f0;
            background: rgba(248, 248, 248, 0.8);
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            padding: 8px 16px;
            z-index: 10;
          ">
            ${footerComponentsHTML}
            <div style="font-size: 10px; font-family: Arial, sans-serif; color: #333; margin-left: auto;">
              第 ${pageIndex + 1} 页 / 共 ${this.pageSchema.pages.length} 页
            </div>
          </div>
        `;
      }

      // 生成页面内容
      const contentHTML = page.components
        .map((component) => this.generateComponentHTML(component))
        .join("\n");

      return `
        <div class="${pageClass}">
          ${headerHTML}
          <div class="page-content">
            ${contentHTML}
          </div>
          ${footerHTML}
        </div>
      `;
    },

    generateComponentHTML(component, isHeaderFooter = false) {
      switch (component.type) {
        case "layout":
          return this.generateLayoutHTML(component, isHeaderFooter);
        case "text":
          return this.generateTextHTML(component, isHeaderFooter);
        case "image":
          return this.generateImageHTML(component, isHeaderFooter);
        default:
          return "";
      }
    },

    generateLayoutHTML(component, isHeaderFooter = false) {
      const style = component.style;

      if (isHeaderFooter) {
        // 为页眉页脚生成内联样式的布局
        const layoutStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${
          style.margin.bottom
        }px ${style.margin.left}px;
          padding: ${style.padding.top}px ${style.padding.right}px ${
          style.padding.bottom
        }px ${style.padding.left}px;
          display: flex;
          justify-content: ${component.alignment || "flex-start"};
          align-items: center;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          flex: 1;
        `;

        const columnsHTML = component.columns
          .map((column, index) => {
            const columnStyle = `
              flex: 0 0 ${column.width}%;
              padding: 2px 4px;
              box-sizing: border-box;
              display: flex;
              align-items: center;
              height: 100%;
            `;
            const children = component.children
              ? component.children.filter(
                  (child) => child.columnIndex === index
                )
              : [];
            const childrenHTML = children
              .map((child) => this.generateComponentHTML(child, true))
              .join("");

            return `<div style="${columnStyle}">${childrenHTML}</div>`;
          })
          .join("");

        return `<div style="${layoutStyle}">${columnsHTML}</div>`;
      } else {
        // 普通页面内容的布局 - 与CanvasComponent.vue的layoutStyle保持一致
        const layoutStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${
          style.margin.bottom
        }px ${style.margin.left}px;
          padding: ${style.padding.top}px ${style.padding.right}px ${
          style.padding.bottom
        }px ${style.padding.left}px;
          display: flex;
          align-items: stretch;
          justify-content: ${component.alignment || "flex-start"};
          min-height: ${style.minHeight || 60}px;
          gap: 8px;
        `;

        const columnsHTML = component.columns
          .map((column, index) => {
            const columnStyle = `
              flex: 0 0 ${column.width}%;
              padding: 8px;
              position: relative;
              box-sizing: border-box;
            `;
            const children = component.children
              ? component.children.filter(
                  (child) => child.columnIndex === index
                )
              : [];
            const childrenHTML = children
              .map((child) => this.generateComponentHTML(child))
              .join("\n");

            return `<div class="layout-column" style="${columnStyle}">${childrenHTML}</div>`;
          })
          .join("\n");

        return `<div class="layout-component" style="${layoutStyle}">${columnsHTML}</div>`;
      }
    },

    generateTextHTML(component, isHeaderFooter = false) {
      const style = component.style;

      if (isHeaderFooter) {
        // 为页眉页脚生成完全内联的样式
        const inlineStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px;
          padding: ${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px;
          font-size: ${style.fontSize}px;
          font-family: ${style.fontFamily};
          color: ${style.color};
          line-height: ${style.lineHeight};
          text-align: ${style.textAlign};
          font-weight: ${style.fontWeight};
          font-style: ${style.fontStyle};
          text-decoration: ${style.textDecoration};
          display: flex;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `;

        return `<div style="${inlineStyle}">${component.content || ""}</div>`;
      } else {
        // 普通页面内容的样式 - 与CanvasComponent.vue的textStyle保持一致
        const textStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px;
          padding: 8px;
          min-height: 24px;
        `;

        const contentStyle = `
          font-size: ${style.fontSize}px;
          font-family: ${style.fontFamily};
          color: ${style.color};
          line-height: ${style.lineHeight};
          text-align: ${style.textAlign};
          font-weight: ${style.fontWeight};
          font-style: ${style.fontStyle};
          text-decoration: ${style.textDecoration};
          width: 100%;
          min-height: inherit;
          word-wrap: break-word;
          word-break: break-word;
          overflow-wrap: break-word;
          background: transparent;
          margin: 0;
          box-sizing: border-box;
        `;

        return `
          <div class="text-component" style="${textStyle}">
            <div class="text-content" style="${contentStyle}">
              ${component.content || ""}
            </div>
          </div>
        `;
      }
    },

    generateImageHTML(component, isHeaderFooter = false) {
      const style = component.style;
      const alignment = component.alignment || "left";

      if (isHeaderFooter) {
        // 页眉页脚中的图片需要特殊处理
        const headerFooterHeight = isHeaderFooter
          ? (this.pageSchema.pageConfig.header.enabled
              ? this.pageSchema.pageConfig.header.height
              : this.pageSchema.pageConfig.footer.height) || 15
          : 15;

        // 限制图片最大高度为页眉页脚高度的80%
        const maxHeight = Math.floor(headerFooterHeight * 3.78 * 0.8);
        const maxWidth = Math.min(style.width, 100); // 限制最大宽度为100px

        const containerStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px;
          padding: ${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px;
          display: flex;
          align-items: center;
          height: 100%;
          box-sizing: border-box;
        `;

        const imageStyle = `
          max-width: ${maxWidth}px;
          max-height: ${maxHeight}px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: ${style.borderRadius}px;
          border: ${style.border};
          display: block;
        `;

        if (!component.src) {
          return `<div style="${containerStyle}"><span style="color: #999; font-size: 10px;">图片未加载</span></div>`;
        }

        return `<div style="${containerStyle}"><img src="${
          component.src
        }" alt="${component.alt || ""}" style="${imageStyle}" /></div>`;
      } else {
        // 普通页面内容的图片处理 - 与CanvasComponent.vue的imageContainerStyle保持一致
        // 根据对齐方式设置 flexbox 对齐
        let justifyContent = "flex-start";
        if (alignment === "left") {
          justifyContent = "flex-start";
        } else if (alignment === "right") {
          justifyContent = "flex-end";
        } else if (alignment === "center") {
          justifyContent = "center";
        }

        const containerStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px;
          padding: ${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px;
          display: flex;
          justify-content: ${justifyContent};
          align-items: flex-start;
          width: 100%;
          border-radius: 4px;
          box-sizing: border-box;
        `;

        // 与CanvasComponent.vue的imageStyle保持一致
        let imageStyle = `
          max-width: 100%;
          object-fit: ${style.objectFit};
          border-radius: ${style.borderRadius}px;
          border: ${style.border};
          display: block;
        `;

        // 检查是否使用固定高度模式
        const useFixedHeight = component.fixedHeight;
        if (useFixedHeight) {
          imageStyle += `
            height: ${style.height}px;
            width: auto;
            max-height: ${style.height}px;
          `;
        } else {
          imageStyle += `
            width: ${style.width}px;
            ${
              component.keepAspectRatio
                ? "height: auto;"
                : `height: ${style.height}px;`
            }
          `;
        }

        if (!component.src) {
          return `
            <div class="image-component" style="${containerStyle}">
              <div style="border: 2px dashed #d0d0d0; padding: 20px; text-align: center; color: #999; min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px;">
                <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.6;">🖼️</div>
                <div style="font-size: 14px; color: #666;">图片未加载</div>
              </div>
            </div>
          `;
        }

        return `
          <div class="image-component" style="${containerStyle}">
            <img src="${component.src}" alt="${
          component.alt || ""
        }" style="${imageStyle}" />
          </div>
        `;
      }
    },

    downloadHTML(content, filename) {
      const blob = new Blob([content], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // 测试方法
    async runPaginationTest() {
      try {
        console.log("开始运行分页测试...");
        const results = await runAllTests();

        const passedTests = results.filter((r) => r.validation?.passed).length;
        const totalTests = results.length;

        const message = `分页测试完成！\n通过: ${passedTests}/${totalTests}\n\n详细结果请查看控制台。`;
        alert(message);

        console.log("分页测试结果汇总:", results);
      } catch (error) {
        console.error("分页测试失败:", error);
        alert("分页测试失败: " + error.message);
      }
    },
  },
};
</script>

<style scoped>
.page-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.toolbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left .title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.toolbar-center {
  display: flex;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f0f0f0;
}

.btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn.test-btn {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
}

.btn.test-btn:hover {
  background: #73d13d;
  border-color: #73d13d;
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar-left {
  width: 280px;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.canvas-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  overflow: auto;
  background: #f5f5f5;
}

.canvas-wrapper {
  position: relative;
}

.sidebar-right {
  width: 320px;
  background: white;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
}

.export-dropdown {
  position: relative;
  display: inline-block;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
}

.export-menu button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.export-menu button:hover {
  background: #f0f0f0;
}

.export-menu button:first-child {
  border-radius: 4px 4px 0 0;
}

.export-menu button:last-child {
  border-radius: 0 0 4px 4px;
}
</style>
