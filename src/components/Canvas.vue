<template>
  <div class="canvas">
    <div class="pages-container">
      <!-- 渲染所有页面 -->
      <div
        v-for="(page, pageIndex) in schema.pages"
        :key="page.id"
        class="page-wrapper"
        :class="{
          'current-page':
            pageIndex === schema.currentPageIndex && mode === 'edit',
          'preview-mode': mode === 'preview',
        }"
      >
        <!-- 页面标题栏 -->
        <div class="page-title-bar" v-if="mode === 'edit'">
          <span class="page-title">{{ page.name }}</span>
          <div class="page-actions">
            <button
              class="page-action-btn"
              @click="$emit('page-select', pageIndex)"
              :class="{ active: pageIndex === schema.currentPageIndex }"
              title="选择此页面"
            >
              选择
            </button>
            <button
              class="page-action-btn style-btn"
              @click="$emit('page-style-config', pageIndex)"
              title="页面样式设置"
            >
              样式
            </button>
            <button
              class="page-action-btn copy-btn"
              @click="$emit('page-copy', pageIndex)"
              title="复制页面"
            >
              复制
            </button>
            <button
              v-if="schema.pages.length > 1"
              class="page-action-btn delete-btn"
              @click="$emit('page-delete', pageIndex)"
              title="删除页面"
            >
              删除
            </button>
          </div>
        </div>

        <!-- 页面内容 -->
        <div
          class="page"
          :style="pageStyle(pageIndex)"
          @drop="(e) => handleDrop(e, pageIndex)"
          @dragover="handleDragOver"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @click="(e) => handlePageClick(e, pageIndex)"
        >
          <!-- 页眉 -->
          <div
            v-if="schema.pageConfig.header.enabled"
            class="page-header"
            :style="headerStyle"
          >
            <CanvasComponent
              v-for="(component, componentIndex) in schema.pageConfig.header
                .components"
              :key="`header-${component.id}`"
              :component="
                processHeaderFooterComponent(
                  component,
                  pageIndex + 1,
                  schema.pages.length
                )
              "
              :selected="false"
              :mode="mode"
              :index="componentIndex"
              :total="schema.pageConfig.header.components.length"
              :page-config="schema.pageConfig"
            />
          </div>

          <!-- 页面内容区域 -->
          <div class="page-content" :style="contentStyle">
            <CanvasComponent
              v-for="(component, componentIndex) in page.components"
              :key="component.id"
              :component="component"
              :selected="
                selectedComponent && selectedComponent.id === component.id
              "
              :selected-component="selectedComponent"
              :mode="mode"
              :index="componentIndex"
              :total="page.components.length"
              :page-config="schema.pageConfig"
              @select="(_component) => $emit('component-select', _component)"
              @update="update"
              @delete="
                (componentId) => {
                  $emit('component-delete', componentId);
                }
              "
              @copy="(component) => handleComponentCopy(component, pageIndex)"
              @drop="(data) => handleComponentDrop(data, pageIndex)"
              @drop-adjacent="
                (data) => handleComponentDropAdjacent(data, pageIndex)
              "
              @sort="(data) => handleComponentSort(data, pageIndex)"
              @move="(data) => handleComponentMove(data, pageIndex)"
            />

            <!-- 空状态提示 -->
            <div v-if="page.components.length === 0" class="empty-state">
              <div class="empty-icon">📄</div>
              <div class="empty-text">拖拽组件到此处开始设计页面</div>
            </div>
          </div>

          <!-- 页脚 -->
          <div
            v-if="schema.pageConfig.footer.enabled"
            class="page-footer"
            :style="footerStyle"
          >
            <CanvasComponent
              v-for="(component, componentIndex) in schema.pageConfig.footer
                .components"
              :key="`footer-${component.id}-${component._updateTimestamp || 0}`"
              :component="
                processHeaderFooterComponent(
                  component,
                  pageIndex + 1,
                  schema.pages.length
                )
              "
              :selected="false"
              :mode="mode"
              :index="componentIndex"
              :total="schema.pageConfig.footer.components.length"
              :page-config="schema.pageConfig"
            />
          </div>
        </div>
      </div>

      <!-- 添加新页面按钮 -->
      <div class="add-page-section" v-if="mode === 'edit'">
        <button class="add-page-button" @click="$emit('page-add')">
          <div class="add-icon">+</div>
          <div class="add-text">添加新页面</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import CanvasComponent from "./CanvasComponent.vue";

export default {
  name: "PageCanvas",
  components: {
    CanvasComponent,
  },
  props: {
    schema: {
      type: Object,
      required: true,
    },
    selectedComponent: {
      type: Object,
      default: null,
    },
    mode: {
      type: String,
      default: "edit",
    },
    styleUpdateTrigger: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    pageStyle() {
      // 使用styleUpdateTrigger确保样式变化时重新计算
      this.styleUpdateTrigger; // 这会让计算属性依赖于触发器

      return (pageIndex) => {
        const config = this.schema.pageConfig;
        const size = config.pageSize;
        const page = this.schema.pages[pageIndex];

        // 转换尺寸到像素
        let width, height;
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

        const baseStyle = {
          width: `${width}px`,
          height: `${height}px`,
          padding: `${config.margins.top * 3.78}px ${
            config.margins.right * 3.78
          }px ${config.margins.bottom * 3.78}px ${
            config.margins.left * 3.78
          }px`,
          backgroundColor: "white", // 默认白色背景
        };

        // 添加页面背景样式
        if (page) {
          // 确保页面有style属性，如果没有则初始化
          if (!page.style) {
            page.style = {
              backgroundColor: "transparent",
              backgroundImage: "",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            };
          }

          const pageStyle = page.style;

          // 背景色
          if (pageStyle.backgroundColor) {
            if (pageStyle.backgroundColor === "transparent") {
              // 如果设置为透明，则移除背景色
              delete baseStyle.backgroundColor;
            } else {
              // 设置用户指定的背景色
              baseStyle.backgroundColor = pageStyle.backgroundColor;
            }
          }

          // 背景图片
          if (pageStyle.backgroundImage) {
            baseStyle.backgroundImage = `url(${pageStyle.backgroundImage})`;
            baseStyle.backgroundPosition =
              pageStyle.backgroundPosition || "center";
            baseStyle.backgroundRepeat =
              pageStyle.backgroundRepeat || "no-repeat";

            // 背景尺寸模式
            switch (pageStyle.backgroundSize) {
              case "cover":
                baseStyle.backgroundSize = "cover";
                break;
              case "contain":
                baseStyle.backgroundSize = "contain";
                break;
              case "stretch":
                baseStyle.backgroundSize = "100% 100%";
                break;
              default:
                baseStyle.backgroundSize = "cover";
            }
          }
        }

        return baseStyle;
      };
    },

    contentStyle() {
      const config = this.schema.pageConfig;
      let paddingTop = 0;
      let paddingBottom = 0;

      if (config.header.enabled) {
        paddingTop = config.header.height * 3.78;
      }
      if (config.footer.enabled) {
        paddingBottom = config.footer.height * 3.78;
      }

      return {
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
        minHeight: `calc(100% - ${paddingTop + paddingBottom}px)`,
      };
    },

    headerStyle() {
      const header = this.schema.pageConfig.header;
      return {
        minHeight: `${header.height * 3.78}px`,
        maxHeight: `${header.height * 3.78}px`,
        backgroundColor: header.style?.backgroundColor || "transparent",
      };
    },

    footerStyle() {
      const footer = this.schema.pageConfig.footer;
      return {
        minHeight: `${footer.height * 3.78}px`,
        maxHeight: `${footer.height * 3.78}px`,
        backgroundColor: footer.style?.backgroundColor || "transparent",
      };
    },
  },
  methods: {
    update(data) {
      console.log("canvass ---------------- :", data);
      this.$emit("component-update", data);
    },
    handleDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },

    handleDragEnter(event) {
      event.preventDefault();
      if (event.target === event.currentTarget) {
        event.target.classList.add("drag-over");
      }
    },

    handleDragLeave(event) {
      if (event.target === event.currentTarget) {
        event.target.classList.remove("drag-over");
      }
    },

    handleDrop(event, pageIndex) {
      event.preventDefault();
      event.target.classList.remove("drag-over");

      try {
        const componentData = JSON.parse(
          event.dataTransfer.getData("application/json")
        );
        if (componentData) {
          this.$emit("component-drop", {
            component: componentData,
            targetContainer: null,
            position: this.schema.pages[pageIndex].components.length,
            pageIndex: pageIndex,
          });
        }
      } catch (error) {
        console.error("Failed to parse dropped component data:", error);
      }
    },

    handleComponentDrop(dropData, pageIndex) {
      this.$emit("component-drop", { ...dropData, pageIndex });
    },

    handleComponentDropAdjacent(dropData, pageIndex) {
      this.$emit("component-drop-adjacent", { ...dropData, pageIndex });
    },

    handleComponentSort(sortData, pageIndex) {
      this.$emit("component-sort", { ...sortData, pageIndex });
    },

    handleComponentMove(moveData, pageIndex) {
      this.$emit("component-move", { ...moveData, pageIndex });
    },

    handleComponentCopy(component, pageIndex) {
      this.$emit("component-copy", { component, pageIndex });
    },

    formatFooterContent(content, pageNumber) {
      // 替换页码占位符
      return content.replace("{pageNumber}", pageNumber.toString());
    },

    processHeaderFooterComponent(component, pageNumber, totalPages) {
      // 深拷贝组件以避免修改原始数据
      const processedComponent = JSON.parse(JSON.stringify(component));

      // 递归处理组件及其子组件中的变量
      this.replaceVariablesInComponent(
        processedComponent,
        pageNumber,
        totalPages
      );

      return processedComponent;
    },

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

    handlePageClick(event, pageIndex) {
      if (this.mode !== "edit") return;

      // 查找最具体的组件
      const targetComponent = this.findTargetComponent(event.target);

      if (targetComponent) {
        this.$emit("component-select", targetComponent);
      } else {
        // 如果没有点击到组件，则触发页面点击事件
        this.$emit("page-click", pageIndex, event);
      }
    },

    findTargetComponent(element) {
      // 从点击的元素开始，向上查找最近的组件
      let current = element;
      let foundComponents = [];

      while (current && current !== document) {
        const componentId = current.getAttribute("data-component-id");
        const componentType = current.getAttribute("data-component-type");

        if (componentId && componentType) {
          // 查找对应的组件对象
          const component = this.findComponentById(componentId);
          if (component) {
            foundComponents.push({
              element: current,
              component: component,
              type: componentType,
            });
          }
        }

        current = current.parentElement;
      }

      // 返回最具体的组件（优先级：内容组件 > 布局组件）
      if (foundComponents.length > 0) {
        // 优先选择内容组件
        const contentComponent = foundComponents.find(
          (item) => item.type === "text" || item.type === "image"
        );

        if (contentComponent) {
          return contentComponent.component;
        }

        // 如果没有内容组件，选择第一个（最具体的）组件
        return foundComponents[0].component;
      }

      return null;
    },

    findComponentById(componentId) {
      // 在所有页面中递归查找组件
      for (const page of this.schema.pages) {
        const found = this.searchComponentInList(page.components, componentId);
        if (found) return found;
      }
      return null;
    },

    searchComponentInList(components, targetId) {
      for (const component of components) {
        if (component.id === targetId) {
          return component;
        }

        // 如果是布局组件，递归查找子组件
        if (component.type === "layout" && component.children) {
          const found = this.searchComponentInList(
            component.children,
            targetId
          );
          if (found) return found;
        }
      }
      return null;
    },
  },
};
</script>

<style scoped>
.canvas {
  height: 100%;
  overflow-y: auto;
  background: #f5f5f5;
}

.pages-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  gap: 30px;
  min-height: 100%;
}

.page-wrapper {
  position: relative;
  transition: all 0.3s ease;
}

.page-wrapper.current-page {
  transform: scale(1.02);
  z-index: 10;
}

.page-wrapper.current-page .page {
  box-shadow: 0 8px 30px rgba(24, 144, 255, 0.3);
  border: 2px solid #1890ff;
}

/* 预览模式样式 */
.page-wrapper.preview-mode {
  transform: none;
}

.page-wrapper.preview-mode .page {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.page-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 8px 16px;
  border-radius: 6px 6px 0 0;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  font-size: 14px;
}

.page-title {
  font-weight: 500;
  color: #333;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.page-action-btn {
  padding: 4px 8px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.page-action-btn:hover {
  background: #f0f0f0;
}

.page-action-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.page-action-btn.copy-btn {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
}

.page-action-btn.copy-btn:hover {
  background: #73d13d;
  border-color: #73d13d;
}

.page-action-btn.style-btn {
  background: #722ed1;
  color: white;
  border-color: #722ed1;
}

.page-action-btn.style-btn:hover {
  background: #9254de;
  border-color: #9254de;
}

.page-action-btn.delete-btn {
  background: #ff4d4f;
  color: white;
  border-color: #ff4d4f;
}

.page-action-btn.delete-btn:hover {
  background: #ff7875;
  border-color: #ff7875;
}

.page {
  /* 移除固定的背景色，让JavaScript设置的背景样式生效 */
  /* background: white; */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 0 0 6px 6px;
  position: relative;
  min-height: 400px;
  transition: all 0.3s ease;
}

.page.drag-over {
  background-color: rgba(24, 144, 255, 0.05);
  border: 2px dashed #1890ff;
}

.page-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #f0f0f0;
  background: rgba(248, 248, 248, 0.8);
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.page-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #f0f0f0;
  background: rgba(248, 248, 248, 0.8);
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.page-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  margin: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
}

.add-page-section {
  width: 100%;
  max-width: 800px;
  display: flex;
  justify-content: center;
}

.add-page-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 120px;
  border: 2px dashed #d0d0d0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #666;
}

.add-page-button:hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
  color: #1890ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
}

.add-icon {
  font-size: 32px;
  margin-bottom: 8px;
  font-weight: 300;
}

.add-text {
  font-size: 14px;
  font-weight: 500;
}

/* 拖拽相关样式 */
.drag-over {
  background-color: rgba(24, 144, 255, 0.05) !important;
  border: 2px dashed #1890ff !important;
}

/* 滚动条样式 */
.canvas::-webkit-scrollbar {
  width: 8px;
}

.canvas::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.canvas::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.canvas::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
