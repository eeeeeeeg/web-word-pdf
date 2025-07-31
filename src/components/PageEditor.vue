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
        <button class="btn" @click="saveSchema">保存</button>
        <button class="btn" @click="loadSchema">加载</button>
        <div class="export-dropdown">
          <button class="btn" @click="toggleExportMenu">导出 ▼</button>
          <div v-if="showExportMenu" class="export-menu">
            <button @click="exportAsPDF">导出为 PDF</button>
            <button @click="exportAsImage">导出为图片</button>
            <button @click="exportAsWord">导出为 Word</button>
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

          <!-- 画布 -->
          <Canvas
            :schema="pageSchema"
            :mode="mode"
            :selected-component="selectedComponent"
            @component-select="handleComponentSelect"
            @component-drop="handleComponentDrop"
            @component-update="handleComponentUpdate"
            @component-delete="handleComponentDelete"
            @component-sort="handleComponentSort"
            @component-move="handleComponentMove"
            @page-select="switchPage"
            @page-add="addPage"
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
  WordExportManager,
  PrintManager,
} from "../utils/exportManager.js";
import ComponentLibrary from "./ComponentLibrary.vue";
import Canvas from "./Canvas.vue";
import PropertyPanel from "./PropertyPanel.vue";
import GlobalConfig from "./GlobalConfig.vue";

export default {
  name: "PageEditor",
  components: {
    ComponentLibrary,
    Canvas,
    PropertyPanel,
    GlobalConfig,
  },
  data() {
    return {
      mode: "edit", // edit | preview
      pageSchema: createPageSchema(),
      selectedComponent: null,
      draggedComponent: null,
      showGlobalConfig: false,
      autoSaveManager: null,
      hasUnsavedChanges: false,
      showExportMenu: false,
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
  },

  beforeDestroy() {
    if (this.autoSaveManager) {
      this.autoSaveManager.disable();
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
            const updatedComponentWithTimestamp = {
              ...updatedComponent,
              _updateTimestamp: Date.now(),
            };
            this.$set(components, i, updatedComponentWithTimestamp);

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

    handleComponentSort(sortData) {
      const { draggedComponentId, targetComponentId, position, pageIndex } =
        sortData;

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
      for (let i = 0; i < components.length; i++) {
        if (components[i].id === id) {
          components.splice(i, 1);
          return true;
        }
        if (
          components[i].children &&
          this.deleteComponentById(components[i].children, id)
        ) {
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

        await PDFExportManager.exportToPDF(canvasElement, {
          filename: `页面设计_${new Date().toLocaleDateString()}.pdf`,
          format: this.pageSchema.pageConfig.pageSize.preset.toLowerCase(),
          orientation:
            this.pageSchema.pageConfig.pageSize.width >
            this.pageSchema.pageConfig.pageSize.height
              ? "landscape"
              : "portrait",
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
        await WordExportManager.exportToWord(this.pageSchema, {
          filename: `页面设计_${new Date().toLocaleDateString()}.docx`,
        });

        alert("Word 文档导出成功！");
      } catch (error) {
        alert("Word 导出失败: " + error.message);
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
