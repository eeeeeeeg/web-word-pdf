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
        <!-- <button
          class="btn"
          :class="{ active: autoPaginationEnabled }"
          @click="toggleAutoPagination"
          :title="
            autoPaginationEnabled
              ? '自动分页已开启：独立组件超出高度时自动分页'
              : '自动分页已关闭：超出页面的内容将被隐藏'
          "
        >
          {{ autoPaginationEnabled ? "自动分页: 开" : "自动分页: 关" }}
        </button> -->

        <!-- 🎯 调试按钮：测试内容裁剪效果 -->
        <button
          class="btn"
          @click="manualPagination"
          :disabled="paginationInProgress"
          :title="
            autoPaginationEnabled
              ? '手动执行分页算法'
              : '手动分页（不影响内容裁剪模式）'
          "
        >
          {{ paginationInProgress ? "分页中..." : "手动分页" }}
        </button>
        <!-- 草稿快速操作 -->
        <div class="draft-quick-actions">
          <button class="btn btn-draft" @click="openDraftManager">
            草稿管理
          </button>
          <button
            class="btn btn-draft-save"
            @click="quickSaveDraft"
            title="快速保存草稿"
          >
            💾
          </button>
          <button
            class="btn btn-draft-auto"
            @click="toggleAutoSave"
            :class="{ active: draftAutoSaveEnabled }"
            :title="draftAutoSaveEnabled ? '关闭自动保存' : '开启自动保存'"
          >
            {{ draftAutoSaveEnabled ? "🔄" : "⏸️" }}
          </button>
        </div>

        <button class="btn btn-share" @click="openShareDialog">分享</button>
        <div class="export-dropdown">
          <button class="btn" @click="toggleExportMenu">导出 ▼</button>
          <div v-if="showExportMenu" class="export-menu">
            <button @click="exportAsImage">导出为图片</button>
            <!-- <button @click="exportAsWord">导出为 Word</button> -->
            <button @click="exportAsHTML">导出为 PDF</button>
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

          <!-- 草稿管理对话框 -->
          <DraftManager
            v-if="showDraftManager"
            :current-schema="pageSchema"
            @close="closeDraftManager"
            @load-draft="handleLoadDraft"
            @draft-saved="handleDraftSaved"
            @schema-created="handleSchemaCreated"
          />

          <!-- 🎯 分页警告 - 只在独立组件超出高度时显示 -->
          <PaginationWarnings
            v-if="paginationWarnings.length > 0 && autoPaginationEnabled"
            :warnings="paginationWarnings"
            @close="paginationWarnings = []"
            @disable-auto-pagination="handleDisableAutoPagination"
            @retry-pagination="manualPagination"
            @select-component="handleSelectComponentFromWarning"
            @split-component="handleSplitComponent"
            @adjust-margins="handleAdjustMargins"
          />

          <!-- 🎯 内容处理模式提示 -->
          <div
            v-if="
              !autoPaginationEnabled && mode === 'edit' && !paginationInProgress
            "
            class="content-mode-indicator"
            title="当前模式：超出页面高度的内容将被隐藏，不会显示分页警告。手动分页不会改变此模式。"
          >
            <span class="indicator-icon">📄</span>
            <span class="indicator-text">内容裁剪模式</span>
            <span class="indicator-desc">超出部分隐藏</span>
          </div>

          <!-- 画布 -->
          <Canvas
            :schema="pageSchema"
            :mode="mode"
            :selected-component="selectedComponent"
            :style-update-trigger="styleUpdateTrigger"
            @component-select="handleComponentSelect"
            @component-drop="handleComponentDrop"
            @component-drop-adjacent="handleComponentDropAdjacent"
            @component-update="handleComponentUpdate"
            @component-delete="handleComponentDelete"
            @component-copy="handleComponentCopy"
            @page-click="handlePageClick"
            @page-style-config="openPageStyleConfig"
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
          :schema="pageSchema"
          @update="handlePropertyUpdate"
          @show-global-config="showGlobalConfig = true"
          @arrange="handleComponentArrange"
          @component-select="handleComponentSelect"
        />
      </div>
    </div>

    <!-- 页面样式配置弹窗 -->
    <PageStyleConfig
      v-if="showPageStyleConfig"
      :page="pageSchema.pages[currentPageIndex]"
      :page-config="pageSchema.pageConfig"
      @update="handlePageStyleUpdate"
      @update-realtime="handlePageStyleUpdateRealtime"
      @close="showPageStyleConfig = false"
    />
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
  historyManager,
  AutoSaveManager,
} from "../utils/schemaManager.js";
import {
  serverDraftManager,
  ServerDraftAutoSaveManager,
} from "../utils/serverDraftManager.js";
import { ImageExportManager, PrintManager } from "../utils/exportManager.js";
import {
  executeAutoPagination,
  shouldRepaginate,
} from "../utils/autoPagination.js";
import { createPageHeightObserver } from "../utils/componentMeasurer.js";
import ComponentLibrary from "./ComponentLibrary.vue";
import Canvas from "./Canvas.vue";
import PropertyPanel from "./PropertyPanel.vue";
import GlobalConfig from "./GlobalConfig.vue";
import PaginationWarnings from "./PaginationWarnings.vue";
import ShareDialog from "./ShareDialog.vue";
import PageStyleConfig from "./PageStyleConfig.vue";
import DraftManager from "./DraftManager.vue";

import { exportPDF, exportWord } from "@/apis";
import SchemaToHtmlConverter from "@/utils/schemaToHtml";

export default {
  name: "PageEditor",
  components: {
    ComponentLibrary,
    Canvas,
    PropertyPanel,
    GlobalConfig,
    PaginationWarnings,
    ShareDialog,
    PageStyleConfig,
    DraftManager,
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
      autoPaginationEnabled: false, // 🎯 默认关闭自动分页，避免意外创建多页
      heightObserver: null,
      paginationInProgress: false,
      paginationWarnings: [],
      paginationDebounceTimer: null,
      // 页面样式配置
      showPageStyleConfig: false,
      currentPageIndex: 0,
      // 样式更新触发器，用于强制Vue重新渲染
      styleUpdateTrigger: 0,
      // 草稿相关状态
      showDraftManager: false,
      draftAutoSaveManager: null,
      currentDraftId: null,
      draftAutoSaveEnabled: true,
    };
  },

  async mounted() {
    // 初始化自动保存
    this.autoSaveManager = new AutoSaveManager(() => {
      this.autoSave();
    });
    this.autoSaveManager.enable();

    // 初始化草稿自动保存
    this.draftAutoSaveManager = new ServerDraftAutoSaveManager((draftId) => {
      this.autosaveDraft(draftId);
    });

    // 尝试加载上次的工作
    this.loadLastSession();

    // 初始化自动保存草稿ID
    await this.initializeAutoSaveDraft();

    // 添加页面关闭前的提示
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // 添加点击外部关闭菜单的监听
    document.addEventListener("click", this.handleDocumentClick);

    // 初始化自动分页监听器
    this.initializeAutoPagination();

    // 监听分享数据导入事件
    window.addEventListener("importShareData", this.handleImportShareData);
  },

  beforeDestroy() {
    if (this.autoSaveManager) {
      this.autoSaveManager.disable();
    }
    if (this.draftAutoSaveManager) {
      this.draftAutoSaveManager.disable();
    }
    if (this.heightObserver) {
      this.heightObserver.disconnect();
    }
    if (this.paginationDebounceTimer) {
      clearTimeout(this.paginationDebounceTimer);
    }
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    document.removeEventListener("click", this.handleDocumentClick);
    window.removeEventListener("importShareData", this.handleImportShareData);
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

    // 处理页面点击事件
    handlePageClick(pageIndex, event) {
      // 检查是否是双击事件
      if (event.detail === 2) {
        this.openPageStyleConfig(pageIndex);
      }
    },

    // 打开页面样式配置
    openPageStyleConfig(pageIndex) {
      this.currentPageIndex = pageIndex;
      this.showPageStyleConfig = true;
    },

    // 处理页面样式更新（保存时）
    handlePageStyleUpdate(updatedPage) {
      // 更新页面数据
      this.pageSchema.pages[this.currentPageIndex] = updatedPage;

      // 更新时间戳
      this.updateTimestamp();

      // 标记有未保存的更改
      this.markAsChanged();
    },

    // 处理页面样式实时更新（预览时）
    handlePageStyleUpdateRealtime(updatedPage) {
      // 使用Vue.set确保响应式更新
      this.$set(this.pageSchema.pages, this.currentPageIndex, updatedPage);

      // 增加触发器值，强制重新渲染
      this.styleUpdateTrigger++;
    },

    handleDragStart(componentData) {
      this.draggedComponent = componentData;
    },

    handleComponentSelect(component) {
      console.log("选中组件:", component);
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

    handleComponentArrange(data) {
      const { componentId, action } = data;

      // 找到组件所在的页面和位置
      let targetComponents = null;
      let componentIndex = -1;
      let component = null;

      for (const page of this.pageSchema.pages) {
        const index = page.components.findIndex(
          (comp) => comp.id === componentId
        );
        if (index !== -1) {
          targetComponents = page.components;
          componentIndex = index;
          component = page.components[index];
          break;
        }
      }

      if (!targetComponents || componentIndex === -1 || !component) return;

      // 对于自由组件，使用z-index控制层级
      if (component.type === "free-text" || component.type === "free-image") {
        this.handleFreeComponentArrange(component, targetComponents, action);
      } else {
        // 对于普通组件，使用数组位置控制层级
        this.handleNormalComponentArrange(
          component,
          targetComponents,
          componentIndex,
          action
        );
      }

      this.updateTimestamp();
      this.markAsChanged();
    },

    handleFreeComponentArrange(component, allComponents, action) {
      // 获取当前页面所有自由组件的z-index值
      const freeComponents = allComponents.filter(
        (comp) => comp.type === "free-text" || comp.type === "free-image"
      );

      const currentZIndex = component.zIndex || 1;

      switch (action) {
        case "move-forward":
          // 前移一层：z-index + 1
          component.zIndex = currentZIndex + 1;
          break;

        case "move-backward":
          // 后移一层：z-index - 1，但不能小于1
          component.zIndex = Math.max(1, currentZIndex - 1);
          break;

        case "bring-to-front":
          {
            // 移至最前：找到最大的z-index，然后+1
            const maxZIndex = Math.max(
              ...freeComponents.map((comp) => comp.zIndex || 1)
            );
            component.zIndex = maxZIndex + 1;
          }
          break;
        case "send-to-back":
          // 移至最后：设置为1，其他组件的z-index都+1
          freeComponents.forEach((comp) => {
            if (comp.id !== component.id && (comp.zIndex || 1) >= 1) {
              comp.zIndex = (comp.zIndex || 1) + 1;
            }
          });
          component.zIndex = 1;
          break;
      }
    },

    handleNormalComponentArrange(
      component,
      targetComponents,
      componentIndex,
      action
    ) {
      switch (action) {
        case "move-forward":
          // 前移一层
          if (componentIndex < targetComponents.length - 1) {
            targetComponents.splice(componentIndex, 1);
            targetComponents.splice(componentIndex + 1, 0, component);
          }
          break;

        case "move-backward":
          // 后移一层
          if (componentIndex > 0) {
            targetComponents.splice(componentIndex, 1);
            targetComponents.splice(componentIndex - 1, 0, component);
          }
          break;

        case "bring-to-front":
          // 移至最前
          targetComponents.splice(componentIndex, 1);
          targetComponents.push(component);
          break;

        case "send-to-back":
          // 移至最后
          targetComponents.splice(componentIndex, 1);
          targetComponents.unshift(component);
          break;
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
      // 重置草稿自动保存定时器
      if (this.draftAutoSaveManager) {
        this.draftAutoSaveManager.reset();
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
        // 从页面配置中获取参数
        const pageConfig = this.pageSchema.pageConfig;

        // 调试信息：显示页面数量和尺寸
        console.log("📄 页面数据调试信息:");
        console.log("总页面数:", this.pageSchema.pages?.length || 0);
        console.log("页面配置:", {
          preset: pageConfig.pageSize.preset,
          width: pageConfig.pageSize.width,
          height: pageConfig.pageSize.height,
          orientation: pageConfig.pageSize.orientation,
          margins: pageConfig.margins,
        });
        console.log(
          "页面列表:",
          this.pageSchema.pages?.map((page, index) => ({
            index,
            id: page.id,
            componentsCount: page.components?.length || 0,
          }))
        );

        const htmlContent = this.generatePlaywrightHTML();
        console.log(" htmlContent -------------------- ", htmlContent);
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

        // 🎯 始终设置自定义尺寸，增加高度避免分页精度问题
        const originalWidth = pageConfig.pageSize.width;
        const originalHeight = pageConfig.pageSize.height;

        // 智能计算额外高度：基础50mm + 根据组件数量动态调整
        const componentCount =
          this.pageSchema.pages[0]?.components?.length || 0;
        const baseExtraHeight = 50; // 基础额外高度
        const dynamicExtraHeight = Math.min(componentCount * 5, 30); // 每个组件增加5mm，最多30mm
        const extraHeight = baseExtraHeight + dynamicExtraHeight;

        exportOptions.width = `${originalWidth}mm`;
        exportOptions.height = `${originalHeight + extraHeight}mm`;

        console.log(
          `📏 导出尺寸调整: 原始 ${originalWidth}×${originalHeight}mm → 导出 ${originalWidth}×${
            originalHeight + extraHeight
          }mm (组件数: ${componentCount}, 额外高度: ${extraHeight}mm)`
        );

        // 移除format选项，使用自定义尺寸
        delete exportOptions.format;

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
      // 创建空白页面，使用默认样式（不继承当前页面样式）
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

          // 🎯 只在有严重问题时显示警告（如独立组件过大）
          const criticalWarnings = (result.warnings || []).filter(
            (warning) =>
              warning.type === "COMPONENT_TOO_LARGE" ||
              warning.severity === "critical"
          );
          this.paginationWarnings = criticalWarnings;

          // 重新设置高度观察器
          this.$nextTick(() => {
            this.setupHeightObserver();
          });

          // 标记为已更改
          this.markAsChanged();

          console.log("自动分页完成:", result.statistics);
          if (criticalWarnings.length === 0) {
            console.log("✅ 页面内容已优化，超出部分将被隐藏");
          }
        } else {
          console.warn("自动分页失败:", result.errors);
          // 只显示关键错误
          const criticalErrors = (result.errors || []).filter(
            (error) => error.includes("组件过大") || error.includes("无法分页")
          );
          this.paginationWarnings = criticalErrors;
        }
      } catch (error) {
        console.error("执行自动分页时出错:", error);
        // 只有真正的错误才显示警告
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

        // 🎯 保存当前的自动分页状态
        const originalAutoPaginationState = this.autoPaginationEnabled;

        // 临时启用自动分页以执行分页逻辑
        this.autoPaginationEnabled = true;

        await this.executeAutoPagination();

        // 🎯 恢复原始的自动分页状态，保持内容裁剪行为不变
        this.autoPaginationEnabled = originalAutoPaginationState;

        console.log(
          `📄 手动分页完成，自动分页状态已恢复为: ${
            originalAutoPaginationState ? "开启" : "关闭"
          }`
        );
        if (!originalAutoPaginationState) {
          console.log("✂️ 内容裁剪模式保持激活，超出部分将继续被隐藏");
        }
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

    // 页面管理方法
    cleanupExtraPages() {
      if (this.pageSchema.pages && this.pageSchema.pages.length > 1) {
        console.log(
          `🧹 清理多余页面: 从 ${this.pageSchema.pages.length} 页减少到 1 页`
        );
        this.pageSchema.pages = [this.pageSchema.pages[0]];
        this.saveToLocalStorage();
      }
    },

    // 测试高度调整计算
    testHeightAdjustment() {
      const pageConfig = this.pageSchema.pageConfig;
      const originalWidth = pageConfig.pageSize.width;
      const originalHeight = pageConfig.pageSize.height;
      const componentCount = this.pageSchema.pages[0]?.components?.length || 0;
      const baseExtraHeight = 50;
      const dynamicExtraHeight = Math.min(componentCount * 5, 30);
      const extraHeight = baseExtraHeight + dynamicExtraHeight;

      console.group("🧮 高度调整计算测试");
      console.log("原始尺寸:", `${originalWidth}×${originalHeight}mm`);
      console.log("组件数量:", componentCount);
      console.log("基础额外高度:", baseExtraHeight + "mm");
      console.log("动态额外高度:", dynamicExtraHeight + "mm");
      console.log("总额外高度:", extraHeight + "mm");
      console.log(
        "最终尺寸:",
        `${originalWidth}×${originalHeight + extraHeight}mm`
      );
      console.log(
        "高度增加比例:",
        `${((extraHeight / originalHeight) * 100).toFixed(1)}%`
      );
      console.groupEnd();

      return {
        original: { width: originalWidth, height: originalHeight },
        adjusted: {
          width: originalWidth,
          height: originalHeight + extraHeight,
        },
        extra: extraHeight,
        components: componentCount,
      };
    },

    // 智能清理空白页面
    cleanupEmptyPages() {
      if (!this.pageSchema.pages || this.pageSchema.pages.length <= 1) return;

      const nonEmptyPages = this.pageSchema.pages.filter((page, index) => {
        // 保留第一页
        if (index === 0) return true;

        // 检查页面是否有实际内容
        return page.components && page.components.length > 0;
      });

      if (nonEmptyPages.length !== this.pageSchema.pages.length) {
        console.log(
          `🧹 智能清理: 从 ${this.pageSchema.pages.length} 页减少到 ${nonEmptyPages.length} 页`
        );
        this.pageSchema.pages = nonEmptyPages;

        // 调整当前页面索引
        if (this.pageSchema.currentPageIndex >= nonEmptyPages.length) {
          this.pageSchema.currentPageIndex = Math.max(
            0,
            nonEmptyPages.length - 1
          );
        }

        this.saveToLocalStorage();
        this.markAsChanged();
      }
    },

    // HTML 导出相关方法
    generatePlaywrightHTML() {
      // 使用统一的转换器
      return SchemaToHtmlConverter.convertToFullHTML(this.pageSchema, {
        title: "页面设计导出",
        environment: "web",
        includeHeaderFooter: true,
        singlePageOnly: true, // 只导出第一页，避免多页分页
      });
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
      console.log("export 页眉 内容:", headerHTML);

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

      // 转换尺寸到像素 - 使用统一的精确转换系数
      if (size.unit === "mm") {
        width = size.width * 3.7795275591; // 精确转换系数 (96/25.4)
        height = size.height * 3.7795275591;
      } else if (size.unit === "in") {
        width = size.width * 96; // 1in = 96px at 96dpi
        height = size.height * 96;
      } else {
        width = size.width;
        height = size.height;
      }

      // 计算页面内边距 - 使用统一的精确转换系数
      const paddingTop = config.margins.top * 3.7795275591;
      const paddingRight = config.margins.right * 3.7795275591;
      const paddingBottom = config.margins.bottom * 3.7795275591;
      const paddingLeft = config.margins.left * 3.7795275591;

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
            flex-direction: column;
            border-bottom: 1px solid #f0f0f0;
            background: transparent;
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
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
            flex-direction: column;
            border-top: 1px solid #f0f0f0;
            background: transparent;
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
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

        // 生成页眉背景样式
        let headerBackgroundStyle = "background: transparent;";
        if (
          config.header.style &&
          config.header.style.backgroundColor &&
          config.header.style.backgroundColor !== "transparent"
        ) {
          headerBackgroundStyle = `background: ${config.header.style.backgroundColor};`;
        }

        headerHTML = `
          <div class="page-header" style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: ${config.header.height * 3.78}px;
            display: flex;
            flex-direction: column;
            border-bottom: 1px solid #f0f0f0;
            ${headerBackgroundStyle}
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
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

        // 生成页脚背景样式
        let footerBackgroundStyle = "background: transparent;";
        if (
          config.footer.style &&
          config.footer.style.backgroundColor &&
          config.footer.style.backgroundColor !== "transparent"
        ) {
          footerBackgroundStyle = `background: ${config.footer.style.backgroundColor};`;
        }

        footerHTML = `
          <div class="page-footer" style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${config.footer.height * 3.78}px;
            display: flex;
            flex-direction: column;
            border-top: 1px solid #f0f0f0;
            ${footerBackgroundStyle}
            width: 100%;
            overflow: hidden;
            box-sizing: border-box;
            z-index: 10;
          ">
            ${footerComponentsHTML}
          </div>
        `;
      }

      // 生成页面内容
      const contentHTML = page.components
        .map((component) => this.generateComponentHTML(component))
        .join("\n");

      // 生成页面背景样式
      let pageBackgroundStyle = "";
      if (page.style) {
        const style = page.style;
        const backgroundStyles = [];

        // 背景色
        if (style.backgroundColor && style.backgroundColor !== "transparent") {
          backgroundStyles.push(`background-color: ${style.backgroundColor}`);
        }

        // 背景图片
        if (style.backgroundImage) {
          backgroundStyles.push(
            `background-image: url(${style.backgroundImage})`
          );
          backgroundStyles.push(
            `background-position: ${style.backgroundPosition || "center"}`
          );
          backgroundStyles.push(
            `background-repeat: ${style.backgroundRepeat || "no-repeat"}`
          );

          // 背景尺寸模式
          switch (style.backgroundSize) {
            case "cover":
              backgroundStyles.push("background-size: cover");
              break;
            case "contain":
              backgroundStyles.push("background-size: contain");
              break;
            case "stretch":
              backgroundStyles.push("background-size: 100% 100%");
              break;
            default:
              backgroundStyles.push("background-size: cover");
          }
        }

        if (backgroundStyles.length > 0) {
          pageBackgroundStyle = ` style="${backgroundStyles.join("; ")}"`;
        }
      }

      return `
        <div class="${pageClass}"${pageBackgroundStyle}>
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
        // 为页眉页脚生成内联样式的布局 - 与Canvas.vue中的预览样式保持一致
        const layoutStyle = `
          margin: ${style.margin.top}px ${style.margin.right}px ${
          style.margin.bottom
        }px ${style.margin.left}px;
          padding: ${style.padding.top}px ${style.padding.right}px ${
          style.padding.bottom
        }px ${style.padding.left}px;
          display: flex;
          align-items: ${component.verticalAlignment || "stretch"};
          justify-content: ${component.alignment || "flex-start"};
          min-height: ${style.minHeight || 60}px;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
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
          align-items: ${component.verticalAlignment || "stretch"};
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
        // 为页眉页脚生成与CanvasComponent.vue一致的样式
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
          <div style="${textStyle}">
            <div style="${contentStyle}">
              ${component.content || ""}
            </div>
          </div>
        `;
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
        // 页眉页脚中的图片处理 - 与CanvasComponent.vue的imageContainerStyle保持一致
        const alignment = component.alignment || "left";

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
        `;

        // 检查是否设置了定高模式
        const useFixedHeight = component.fixedHeight;
        let imageStyle;

        if (useFixedHeight) {
          // 定高模式：设置固定高度，宽度自动，保持纵横比
          imageStyle = `
            height: ${style.height}px;
            width: auto;
            max-height: ${style.height}px;
            max-width: 100%;
            object-fit: ${style.objectFit};
            border-radius: ${style.borderRadius}px;
            border: ${style.border};
          `;
        } else {
          // 原有逻辑：根据keepAspectRatio决定
          imageStyle = `
            width: ${style.width}px;
            height: ${component.keepAspectRatio ? "auto" : `${style.height}px`};
            max-width: 100%;
            object-fit: ${style.objectFit};
            border-radius: ${style.borderRadius}px;
            border: ${style.border};
          `;
        }

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

    // 处理导入分享数据
    handleImportShareData() {
      try {
        const shareDataStr = localStorage.getItem("importShareData");
        if (shareDataStr) {
          const shareSchema = JSON.parse(shareDataStr);

          // 验证数据格式
          if (shareSchema && shareSchema.pages && shareSchema.pageConfig) {
            // 导入分享的设计数据
            this.pageSchema = shareSchema;

            // 清除localStorage中的数据
            localStorage.removeItem("importShareData");

            // 重置选中状态
            this.selectedComponent = null;

            // 提示用户
            alert("分享内容已成功导入到编辑器中！");
          } else {
            throw new Error("分享数据格式无效");
          }
        }
      } catch (error) {
        console.error("导入分享数据失败:", error);
        alert("导入分享数据失败: " + error.message);
        // 清除可能损坏的数据
        localStorage.removeItem("importShareData");
      }
    },

    // 草稿管理相关方法
    openDraftManager() {
      this.showDraftManager = true;
    },

    closeDraftManager() {
      this.showDraftManager = false;
    },

    async handleLoadDraft(draft) {
      try {
        // 验证草稿数据
        const validation = validateSchema(draft.schema);
        if (validation.valid) {
          this.pageSchema = draft.schema;
          this.selectedComponent = null;
          this.hasUnsavedChanges = true;

          // 注意：加载草稿不改变自动保存草稿的ID
          // 自动保存草稿保持独立，继续使用原有的自动保存草稿ID

          // 清空历史记录并添加新的起点
          historyManager.clear();
          historyManager.addHistory(this.pageSchema);

          console.log(`草稿 "${draft.name}" 已加载`);
        } else {
          throw new Error("草稿数据格式无效");
        }
      } catch (error) {
        alert("加载草稿失败: " + error.message);
      }
    },

    handleDraftSaved(draftId) {
      // 注意：手动保存草稿不改变自动保存草稿的ID
      // 自动保存草稿保持独立
      console.log(`草稿已保存，ID: ${draftId}`);
    },

    handleSchemaCreated(schemaId) {
      console.log(`草稿已转换为正式版本，ID: ${schemaId}`);
      // 可以在这里添加其他处理逻辑，比如显示成功消息
    },

    // 初始化自动保存草稿
    async initializeAutoSaveDraft() {
      try {
        // 检查是否已有自动保存草稿ID（从localStorage获取）
        const savedAutoSaveDraftId = localStorage.getItem("autoSaveDraftId");

        if (savedAutoSaveDraftId) {
          // 验证草稿是否仍然存在
          try {
            await serverDraftManager.getDraftById(savedAutoSaveDraftId);
            this.currentDraftId = savedAutoSaveDraftId;
            console.log(`使用现有自动保存草稿，ID: ${savedAutoSaveDraftId}`);
          } catch (error) {
            // 草稿不存在，创建新的
            console.log("现有自动保存草稿不存在，创建新的");
            await this.createAutoSaveDraft();
          }
        } else {
          // 创建新的自动保存草稿
          await this.createAutoSaveDraft();
        }

        // 设置自动保存管理器的草稿ID并启用
        this.draftAutoSaveManager.setCurrentDraftId(this.currentDraftId);
        this.draftAutoSaveManager.enable();
      } catch (error) {
        console.error("初始化自动保存草稿失败:", error);
      }
    },

    // 创建自动保存草稿
    async createAutoSaveDraft() {
      try {
        const autoSaveDraftId = await serverDraftManager.saveDraft(
          this.pageSchema,
          "自动保存草稿"
        );
        this.currentDraftId = autoSaveDraftId;

        // 保存到localStorage以便下次使用
        localStorage.setItem("autoSaveDraftId", autoSaveDraftId);

        console.log(`创建自动保存草稿成功，ID: ${autoSaveDraftId}`);
        return autoSaveDraftId;
      } catch (error) {
        console.error("创建自动保存草稿失败:", error);
        throw error;
      }
    },

    // 草稿自动保存
    async autosaveDraft(draftId) {
      if (!this.hasUnsavedChanges) return;

      try {
        if (draftId && this.currentDraftId) {
          // 更新现有的自动保存草稿
          await serverDraftManager.updateDraft(
            this.currentDraftId,
            this.pageSchema
          );
          console.log(
            `自动保存草稿更新成功，ID: ${
              this.currentDraftId
            }，时间: ${new Date().toLocaleTimeString()}`
          );
        } else {
          // 如果没有自动保存草稿ID，创建一个
          await this.createAutoSaveDraft();
          this.draftAutoSaveManager.setCurrentDraftId(this.currentDraftId);
          console.log(
            `创建并保存自动草稿，ID: ${
              this.currentDraftId
            }，时间: ${new Date().toLocaleTimeString()}`
          );
        }
      } catch (error) {
        console.error("草稿自动保存失败:", error);
      }
    },

    // 快速保存草稿
    async quickSaveDraft() {
      try {
        const draftName = `快速保存_${new Date().toLocaleTimeString()}`;
        const draftId = await serverDraftManager.saveDraft(
          this.pageSchema,
          draftName
        );

        // 注意：快速保存不改变自动保存草稿的ID
        // 自动保存草稿保持独立，快速保存创建新的草稿

        // 显示成功提示
        this.showQuickMessage("草稿保存成功！", "success");
        console.log(`快速保存草稿成功，ID: ${draftId}`);
      } catch (error) {
        this.showQuickMessage("保存草稿失败", "error");
        console.error("快速保存草稿失败:", error);
      }
    },

    // 切换自动保存状态
    toggleAutoSave() {
      this.draftAutoSaveEnabled = !this.draftAutoSaveEnabled;

      if (this.draftAutoSaveEnabled) {
        this.draftAutoSaveManager.enable(this.currentDraftId);
        this.showQuickMessage("自动保存已开启", "info");
      } else {
        this.draftAutoSaveManager.disable();
        this.showQuickMessage("自动保存已关闭", "warning");
      }
    },

    // 显示快速消息提示
    showQuickMessage(message, type = "info") {
      // 创建临时提示元素
      const toast = document.createElement("div");
      toast.className = `quick-toast quick-toast-${type}`;
      toast.textContent = message;

      // 添加到页面
      document.body.appendChild(toast);

      // 显示动画
      setTimeout(() => {
        toast.classList.add("show");
      }, 10);

      // 自动移除
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 2000);
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
  gap: 12px;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 统一按钮基础样式 */
.btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  user-select: none;
  touch-action: manipulation;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.015);
}

.btn:hover {
  background: #f5f5f5;
  border-color: #40a9ff;
  color: #40a9ff;
}

.btn:focus {
  outline: none;
  border-color: #40a9ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.btn:active {
  background: #f5f5f5;
  border-color: #096dd9;
}

.btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn.active:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

/* 主要按钮样式 */
.btn.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}

/* 成功按钮样式 */
.btn.btn-success,
.btn.test-btn {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
}

.btn.btn-success:hover,
.btn.test-btn:hover {
  background: #73d13d;
  border-color: #73d13d;
  color: white;
}

/* 草稿按钮样式 */
.btn.btn-draft {
  background: #722ed1;
  color: white;
  border-color: #722ed1;
}

.btn.btn-draft:hover {
  background: #9254de;
  border-color: #9254de;
  color: white;
}

/* 分享按钮样式 */
.btn.btn-share {
  background: #13c2c2;
  color: white;
  border-color: #13c2c2;
}

.btn.btn-share:hover {
  background: #36cfc9;
  border-color: #36cfc9;
  color: white;
}

/* 草稿快速操作工具栏 */
.draft-quick-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 6px;
  background: rgba(114, 46, 209, 0.08);
  border-radius: 6px;
  border: 1px solid rgba(114, 46, 209, 0.15);
}

.draft-quick-actions .btn {
  height: 28px;
  padding: 4px 12px;
  font-size: 13px;
  min-width: auto;
}

.btn.btn-draft-save {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
}

.btn.btn-draft-save:hover {
  background: #73d13d;
  border-color: #73d13d;
  color: white;
}

.btn.btn-draft-auto {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
  transition: all 0.3s ease;
}

.btn.btn-draft-auto:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}

.btn.btn-draft-auto.active {
  background: #52c41a;
  border-color: #52c41a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(82, 196, 26, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
  }
}

/* 快速提示样式 */
:global(.quick-toast) {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  z-index: 10000;
  transform: translateX(100%);
  opacity: 0;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:global(.quick-toast.show) {
  transform: translateX(0);
  opacity: 1;
}

:global(.quick-toast-success) {
  background: linear-gradient(135deg, #52c41a, #73d13d);
}

:global(.quick-toast-error) {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
}

:global(.quick-toast-info) {
  background: linear-gradient(135deg, #1890ff, #40a9ff);
}

:global(.quick-toast-warning) {
  background: linear-gradient(135deg, #faad14, #ffc53d);
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
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  min-width: 160px;
  padding: 4px 0;
}

.export-menu button {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  color: #262626;
  transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
  line-height: 1.5;
}

.export-menu button:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.export-menu button:active {
  background: #e6f7ff;
}

/* 🎯 内容处理模式指示器样式 */
.content-mode-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  z-index: 1000;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  cursor: pointer;
}

.content-mode-indicator:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.indicator-icon {
  font-size: 14px;
}

.indicator-text {
  font-weight: 500;
  color: #fff;
}

.indicator-desc {
  color: #ccc;
  font-size: 11px;
}
</style>
