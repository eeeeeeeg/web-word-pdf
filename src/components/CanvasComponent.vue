<template>
  <div
    class="canvas-component"
    :class="{
      selected: selected && mode === 'edit',
      'preview-mode': mode === 'preview',
      dragging: isDragging,
      'layout-component-wrapper': component.type === 'layout',
    }"
    :data-drag-position="dragOverPosition"
    :data-component-id="component.id"
    :data-component-type="component.type"
    @click="component.type === 'layout' ? handleComponentClick : null"
    @dragstart="component.type !== 'text' ? handleDragStart : null"
    @dragend="
      component.type !== 'text' ? handleDragEnd : (dragOverPosition = null)
    "
    @dragover="handleSortDragOver"
    @drop="handleSortDrop"
    @dragenter="handleSortDragEnter"
    @dragleave="handleSortDragLeave"
  >
    <!-- 布局组件 -->
    <div
      v-if="component.type === 'layout'"
      class="layout-component"
      :style="layoutStyle"
    >
      <div
        v-for="(column, index) in component.columns"
        :key="index"
        class="layout-column"
        :style="getColumnStyle(column)"
        :data-column-index="index"
        @drop="handleColumnDrop($event, index)"
        @dragover="(e) => handleDragOver(e, index)"
        @dragenter="(e) => handleDragEnter(e, index)"
        @dragleave="(e) => handleDragLeave(e, index)"
      >
        <CanvasComponent
          v-for="child in getColumnChildren(index)"
          :key="child.id"
          :component="child"
          :selected="selectedComponent && selectedComponent.id === child.id"
          :selected-component="selectedComponent"
          :mode="mode"
          @select="$emit('select', $event)"
          @update="$emit('update', $event)"
          @delete="$emit('delete', $event)"
          @drop="$emit('drop', $event)"
        />

        <div
          v-if="getColumnChildren(index).length === 0"
          class="column-placeholder"
        >
          拖拽组件到此列
        </div>
        <!-- <div v-else-if="mode === 'edit'" class="column-full-indicator">
          此列已满 (每列限一个组件)
        </div> -->
      </div>
    </div>

    <!-- 文本组件 -->
    <div
      v-else-if="component.type === 'text'"
      class="text-component content-component"
      :style="textStyle"
      :data-component-id="component.id"
      :data-component-type="component.type"
      @click="handleTextComponentClick"
    >
      <RichTextEditor
        v-if="mode === 'edit'"
        :value="component.content"
        @input="handleRichTextInput"
        @blur="handleRichTextBlur"
        :show-toolbar="true"
        :min-height="'60px'"
        :max-height="'400px'"
        placeholder="请输入文本内容..."
        class="rich-text-wrapper"
      />
      <div
        v-else
        class="text-display"
        v-html="component.content"
        :style="textDisplayStyle"
      ></div>
    </div>

    <!-- 图片组件 -->
    <div
      v-else-if="component.type === 'image'"
      class="image-component content-component"
      :style="imageContainerStyle"
      :data-component-id="component.id"
      :data-component-type="component.type"
      @click="handleImageComponentClick"
    >
      <!-- 显示上传的图片 -->
      <img
        v-if="component.src && !component.uploading && !component.uploadError"
        :src="component.src"
        :alt="component.alt"
        :style="imageStyle"
        @load="handleImageLoad"
        @error="handleImageError"
      />

      <!-- 上传中状态 -->
      <div v-else-if="component.uploading" class="image-uploading">
        <div class="uploading-spinner">⏳</div>
        <div class="uploading-text">上传中...</div>
      </div>

      <!-- 上传错误状态 -->
      <div
        v-else-if="component.uploadError"
        class="image-error"
        @click="handleImageUpload"
      >
        <div class="error-icon">❌</div>
        <div class="error-text">{{ component.uploadError }}</div>
        <div class="retry-text">点击重试</div>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageChange"
        />
      </div>

      <!-- 默认上传占位符 -->
      <div v-else class="image-placeholder" @click="handleImageUpload">
        <div class="placeholder-icon">🖼️</div>
        <div class="placeholder-text">点击上传图片</div>
        <div class="placeholder-hint">支持 JPG、PNG、GIF 格式，最大 5MB</div>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageChange"
        />
      </div>
    </div>

    <!-- 选中状态的操作按钮 -->
    <div v-if="selected && mode === 'edit'" class="component-actions">
      <!-- 布局组件的排序按钮和复制按钮（仅布局组件显示） -->
      <template v-if="component.type === 'layout'">
        <button
          class="action-btn sort-btn"
          @click.stop="handleMoveUp"
          title="向上移动"
          :disabled="!canMoveUp"
        >
          ↑
        </button>
        <button
          class="action-btn sort-btn"
          @click.stop="handleMoveDown"
          title="向下移动"
          :disabled="!canMoveDown"
        >
          ↓
        </button>
        <button
          class="action-btn layout-copy-btn"
          @click.stop="handleCopy"
          title="复制布局组件"
        >
          📋
        </button>
      </template>

      <button
        class="action-btn delete-btn"
        @click.stop="handleDelete"
        title="删除"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script>
import RichTextEditor from "./RichTextEditor.vue";

export default {
  name: "CanvasComponent",
  components: {
    RichTextEditor,
  },
  props: {
    component: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: "edit",
    },
    selectedComponent: {
      type: Object,
      default: null,
    },
    // 组件在父容器中的索引
    index: {
      type: Number,
      default: 0,
    },
    // 父容器中的总组件数
    total: {
      type: Number,
      default: 1,
    },
    // 页面配置（用于获取全局样式设置）
    pageConfig: {
      type: Object,
      default: null,
    },
  },
  watch: {
    component: {
      handler(newVal) {
        if (newVal.type === "image") {
          console.log("Component prop changed:", {
            id: newVal.id,
            src: !!newVal.src,
            uploading: !!newVal.uploading,
            uploadError: !!newVal.uploadError,
          });
        }
      },
      deep: true,
      immediate: true,
    },
  },
  data() {
    return {
      isDragging: false,
      dragOverPosition: null,
    };
  },
  computed: {
    layoutStyle() {
      const style = this.component.style;
      const baseStyle = {
        display: "flex",
        alignItems: "stretch",
        justifyContent: this.component.alignment || "flex-start",
        margin: `${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px`,
        padding: `${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px`,
        minHeight: "60px",
      };

      // 如果设置了最小高度，应用它
      if (style.minHeight) {
        baseStyle.minHeight = `${style.minHeight}px`;
      }

      // 预览模式下去除边框和背景色，但保持高度控制
      if (this.mode === "preview") {
        return {
          ...baseStyle,
          border: "none",
          background: "transparent",
          // 在页眉页脚中，限制最大高度以避免溢出
          maxHeight: style.maxHeight ? `${style.maxHeight}px` : undefined,
          overflow: "hidden",
        };
      }

      return baseStyle;
    },

    textStyle() {
      const style = this.component.style;
      return {
        margin: `${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px`,
        // padding: `${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px`,
        padding: `8px`,
        minHeight: "24px",
      };
    },

    textContentStyle() {
      const style = this.component.style;

      // 获取全局段落间距设置
      const paragraphSpacing = this.globalParagraphSpacing || 6;

      return {
        fontSize: `${style.fontSize}px`,
        fontFamily: style.fontFamily,
        color: style.color,
        lineHeight: style.lineHeight,
        textAlign: style.textAlign,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecoration,
        width: "100%",
        minHeight: "inherit",
        "--text-color": style.color,
        "--paragraph-spacing": `${paragraphSpacing}px`,
      };
    },

    // 计算全局段落间距
    globalParagraphSpacing() {
      // 从页面配置中获取段落间距
      if (
        this.pageConfig &&
        this.pageConfig.defaultStyles &&
        this.pageConfig.defaultStyles.paragraphSpacing
      ) {
        return this.pageConfig.defaultStyles.paragraphSpacing;
      }
      return 6; // 默认值
    },

    textDisplayStyle() {
      return {
        width: "100%",
        minHeight: "60px",
        padding: "0px",
        lineHeight: "1.5",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "inherit",
        background: "transparent",
        wordWrap: "break-word",
        wordBreak: "break-word",
        overflowWrap: "break-word",
        boxSizing: "border-box",
        margin: "0",
      };
    },

    imageContainerStyle() {
      const style = this.component.style;
      const alignment = this.component.alignment || "left";

      // 根据对齐方式设置 flexbox 对齐
      let justifyContent = "flex-start";
      if (alignment === "left") {
        justifyContent = "flex-start";
      } else if (alignment === "right") {
        justifyContent = "flex-end";
      } else if (alignment === "center") {
        justifyContent = "center";
      }

      return {
        margin: `${style.margin.top}px ${style.margin.right}px ${style.margin.bottom}px ${style.margin.left}px`,
        padding: `${style.padding.top}px ${style.padding.right}px ${style.padding.bottom}px ${style.padding.left}px`,
        display: "flex",
        justifyContent: justifyContent,
        alignItems: "flex-start",
        width: "100%",
      };
    },

    imageStyle() {
      const style = this.component.style;

      // 检查是否在页眉页脚中，并且设置了定高模式
      const isInHeaderFooter = this.mode === "preview" || this.mode === "edit";
      const useFixedHeight = this.component.fixedHeight && isInHeaderFooter;

      let imageStyles = {
        maxWidth: "100%",
        objectFit: style.objectFit,
        borderRadius: `${style.borderRadius}px`,
        border: style.border,
      };

      if (useFixedHeight) {
        // 定高模式：设置固定高度，宽度自动，保持纵横比
        imageStyles.height = `${style.height}px`;
        imageStyles.width = "auto";
        imageStyles.maxHeight = `${style.height}px`;
      } else {
        // 原有逻辑：根据keepAspectRatio决定
        imageStyles.width = `${style.width}px`;
        imageStyles.height = this.component.keepAspectRatio
          ? "auto"
          : `${style.height}px`;
      }

      return imageStyles;
    },

    // 判断是否可以向上移动
    canMoveUp() {
      return this.component.type === "layout" && this.componentIndex > 0;
    },

    // 判断是否可以向下移动
    canMoveDown() {
      return (
        this.component.type === "layout" &&
        this.componentIndex < this.totalComponents - 1
      );
    },

    // 当前组件在父容器中的索引
    componentIndex() {
      // 这个值需要从父组件传递过来
      return this.index || 0;
    },

    // 父容器中的总组件数
    totalComponents() {
      // 这个值需要从父组件传递过来
      return this.total || 1;
    },
  },
  methods: {
    handleComponentClick(event) {
      // 阻止事件冒泡，避免选中父组件
      event.stopPropagation();

      // 只在编辑模式下处理点击选择
      if (this.mode === "edit") {
        console.log("点击组件:", this.component.type, this.component.id);
        this.$emit("select", this.component);
      }
    },

    handleTextComponentClick(event) {
      // 文本组件的特殊点击处理
      console.log("🔥 文本组件点击:", this.component.id);

      // 阻止事件冒泡
      event.stopPropagation();
      event.preventDefault();

      // 强制选中组件
      if (this.mode === "edit") {
        console.log("🎯 发出选中事件:", this.component);
        this.$emit("select", this.component);
      }
    },

    handleImageComponentClick(event) {
      // 图片组件的点击处理
      console.log("🔥 图片组件点击:", this.component.id);

      // 阻止事件冒泡
      event.stopPropagation();
      event.preventDefault();

      // 强制选中组件
      if (this.mode === "edit") {
        console.log("🎯 发出选中事件:", this.component);
        this.$emit("select", this.component);
      }
    },

    handleDelete() {
      this.$emit("delete", this.component.id);
    },

    handleCopy() {
      this.$emit("copy", this.component);
    },

    // 向上移动组件
    handleMoveUp() {
      if (this.canMoveUp) {
        this.$emit("move", {
          componentId: this.component.id,
          direction: "up",
          currentIndex: this.componentIndex,
        });
      }
    },

    // 向下移动组件
    handleMoveDown() {
      if (this.canMoveDown) {
        this.$emit("move", {
          componentId: this.component.id,
          direction: "down",
          currentIndex: this.componentIndex,
        });
      }
    },

    getColumnStyle(column) {
      const baseStyle = {
        flex: `0 0 ${column.width}%`,
        minHeight: "60px",
        padding: "8px",
        position: "relative",
      };

      // 预览模式下完全去除边框
      if (this.mode === "preview") {
        return {
          ...baseStyle,
          border: "none",
          minHeight: "auto",
          padding: "8px",
        };
      }

      // 编辑模式下显示虚线边框
      return {
        ...baseStyle,
        border: "1px dashed #e0e0e0",
      };
    },

    getColumnChildren(columnIndex) {
      if (!this.component.children) return [];
      return this.component.children.filter(
        (child) => child.columnIndex === columnIndex
      );
    },

    handleColumnDrop(event, columnIndex) {
      event.preventDefault();
      event.stopPropagation();
      event.target.classList.remove("drag-over");

      try {
        const componentData = JSON.parse(
          event.dataTransfer.getData("application/json")
        );
        if (componentData) {
          // 检查是否尝试将布局组件拖拽到布局组件内部
          if (componentData.type === "layout") {
            console.warn("不允许将布局组件拖拽到布局组件内部");
            return;
          }

          // 检查该列是否已经有组件
          const existingChildren = this.getColumnChildren(columnIndex);
          if (existingChildren.length > 0) {
            console.warn("每列只能添加一个组件");
            return;
          }

          componentData.columnIndex = columnIndex;

          // 不直接修改 prop，而是通过事件通知父组件
          this.$emit("drop", {
            component: componentData,
            targetContainer: this.component,
            position: 0, // 由于每列只能有一个组件，位置总是0
            columnIndex,
          });
        }
      } catch (error) {
        console.error("Failed to parse dropped component data:", error);
      }
    },

    handleDragOver(event, columnIndex) {
      event.preventDefault();
      event.stopPropagation();

      // 检查该列是否已经有组件
      const existingChildren = this.getColumnChildren(columnIndex);
      if (existingChildren.length > 0) {
        // 如果列已满，不允许拖拽
        event.dataTransfer.dropEffect = "none";
        return;
      }

      event.dataTransfer.dropEffect = "copy";
    },

    handleDragEnter(event, columnIndex) {
      event.preventDefault();
      event.stopPropagation();

      if (event.target.classList.contains("layout-column")) {
        // 检查该列是否已经有组件
        const existingChildren = this.getColumnChildren(columnIndex);
        if (existingChildren.length === 0) {
          // 只有当列为空时才显示拖拽悬停效果
          event.target.classList.add("drag-over");
        }
      }
    },

    handleDragLeave(event, columnIndex) {
      columnIndex;
      if (event.target.classList.contains("layout-column")) {
        event.target.classList.remove("drag-over");
      }
    },

    handleTextInput(event) {
      const updatedComponent = {
        ...this.component,
        content: event.target.innerHTML,
      };

      this.$emit("update", updatedComponent);
    },

    handleTextBlur() {
      this.$emit("update", this.component);
    },

    handleRichTextInput(content) {
      const updatedComponent = {
        ...this.component,
        content: content,
      };
      this.$emit("update", updatedComponent);
    },

    handleRichTextBlur() {
      // 富文本编辑器失焦时的处理
      this.$emit("update", this.component);
    },

    handleImageUpload() {
      if (this.mode === "edit") {
        this.$refs.imageInput.click();
      }
    },

    handleImageChange(event) {
      const file = event.target.files[0];
      if (file) {
        // 验证文件类型
        if (!file.type.startsWith("image/")) {
          alert("请选择图片文件！");
          return;
        }

        // 验证文件大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("图片文件不能超过 5MB！");
          return;
        }

        // // 显示上传状态
        // const updatedComponent = {
        //   ...this.component,
        //   uploading: true,
        //   src: null,
        // };
        // this.$emit("update", updatedComponent);

        const reader = new FileReader();
        reader.onload = (e) => {
          e;
          // 上传成功，更新组件 - 使用当前组件状态
          const finalComponent = {
            ...this.component, // 改回使用 this.component
            src: e.target.result,
            alt: file.name,
            uploading: false,
            uploadError: null,
          };
          console.log("Final component to emit:", {
            id: finalComponent.id,
            type: finalComponent.type,
            hasSrc: !!finalComponent.src,
            srcLength: finalComponent.src ? finalComponent.src.length : 0,
          });

          this.$emit("update", finalComponent);
          // 清空文件输入，允许重新选择同一文件
          event.target.value = "";
        };

        reader.onerror = (e) => {
          console.log("Image uploaded error:", e.target.result);

          console.error("FileReader error:", e);
          // 上传失败
          const errorComponent = {
            ...this.component,
            uploading: false,
            uploadError: "图片上传失败，请重试",
          };
          this.$emit("update", errorComponent);
        };

        reader.readAsDataURL(file);
      }
    },

    handleImageLoad() {
      console.log("wangc --------- handleImageLoad:");
      this.$emit("update", this.component);
    },

    handleImageError() {
      console.error("Failed to load image:", this.component.src);
    },

    // 排序拖拽相关方法
    handleDragStart(event) {
      if (this.mode !== "edit") return;

      console.log("拖拽开始:", this.component.id, this.component.type);
      this.isDragging = true;
      // 使用专门的数据类型来区分排序拖拽和组件库拖拽
      event.dataTransfer.setData("text/sort-component-id", this.component.id);
      event.dataTransfer.effectAllowed = "move";
    },

    handleDragEnd() {
      this.isDragging = false;
      this.dragOverPosition = null;
    },

    handleSortDragOver(event) {
      // 只在编辑模式下处理拖拽
      if (this.mode !== "edit") return;

      event.preventDefault();
      event.stopPropagation();

      // 检查是否是排序拖拽
      const sortType = event.dataTransfer.types.includes(
        "text/sort-component-id"
      );

      // 检查是否是组件库拖拽
      const libraryDragType =
        event.dataTransfer.types.includes("application/json");

      if (sortType && this.component.type !== "text") {
        // 对于排序拖拽，允许在任何非文本组件上显示拖拽位置
        event.dataTransfer.dropEffect = "move";

        // 计算拖拽位置
        const rect = event.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const newPosition = event.clientY < midY ? "before" : "after";

        console.log("拖拽悬停:", this.component.id, newPosition);
        this.dragOverPosition = newPosition;
      } else if (libraryDragType && this.component.type === "layout") {
        // 允许从组件库拖拽到布局组件的前后位置
        event.dataTransfer.dropEffect = "copy";

        // 计算拖拽位置
        const rect = event.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        this.dragOverPosition = event.clientY < midY ? "before" : "after";
      }
    },

    handleSortDrop(event) {
      // 只在编辑模式下处理拖拽
      if (this.mode !== "edit") return;

      event.preventDefault();
      event.stopPropagation();

      // 检查是否是排序拖拽
      const sortType = event.dataTransfer.types.includes(
        "text/sort-component-id"
      );

      // 检查是否是组件库拖拽
      const libraryDragType =
        event.dataTransfer.types.includes("application/json");

      if (sortType && this.component.type !== "text") {
        const draggedId = event.dataTransfer.getData("text/sort-component-id");
        console.log(
          "拖拽放置:",
          draggedId,
          "到",
          this.component.id,
          "位置:",
          this.dragOverPosition
        );

        if (draggedId && draggedId !== this.component.id) {
          this.$emit("sort", {
            draggedComponentId: draggedId,
            targetComponentId: this.component.id,
            position: this.dragOverPosition,
          });
        }
      } else if (libraryDragType && this.component.type === "layout") {
        // 处理从组件库拖拽到布局组件前后位置
        try {
          const componentData = JSON.parse(
            event.dataTransfer.getData("application/json")
          );
          if (componentData) {
            // 检查是否尝试将布局组件拖拽到布局组件前后位置
            if (componentData.type === "layout") {
              console.warn("不允许将布局组件拖拽到布局组件前后位置");
              this.dragOverPosition = null;
              return;
            }

            this.$emit("drop-adjacent", {
              component: componentData,
              targetComponentId: this.component.id,
              position: this.dragOverPosition,
            });
          }
        } catch (error) {
          console.error("Failed to parse dropped component data:", error);
        }
      }

      this.dragOverPosition = null;
    },

    handleSortDragEnter(event) {
      // 只在编辑模式下处理拖拽
      if (this.mode !== "edit") return;

      event.preventDefault();
      event.stopPropagation();
    },

    handleSortDragLeave(event) {
      // 只在编辑模式下处理拖拽
      if (this.mode !== "edit") return;

      // 只有当离开当前元素时才清除位置
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.dragOverPosition = null;
      }
    },
  },
};
</script>

<style scoped>
.canvas-component {
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.canvas-component:hover {
  outline: 1px solid #d0d0d0;
}

.canvas-component.selected {
  outline: 2px solid #1890ff;
  outline-offset: 2px;
}

/* 预览模式下禁用hover和选中效果 */
.canvas-component.preview-mode:hover {
  outline: none;
}

.canvas-component.preview-mode.selected {
  outline: none;
}

/* 布局组件选中时的特殊样式 */
.canvas-component.layout-component-wrapper.selected .layout-component {
  background-color: rgba(24, 144, 255, 0.05);
  border: 1px dashed #1890ff;
}

.canvas-component.layout-component-wrapper.selected .layout-column {
  border-color: #1890ff;
}

/* 预览模式下禁用布局组件的选中样式 */
.canvas-component.layout-component-wrapper.preview-mode.selected
  .layout-component {
  background-color: transparent !important;
  border: none !important;
}

.canvas-component.layout-component-wrapper.preview-mode.selected
  .layout-column {
  border: none !important;
}

.canvas-component.preview-mode {
  cursor: default;
}

.canvas-component.preview-mode:hover {
  outline: none;
}

.canvas-component.preview-mode.selected {
  outline: none;
}

.canvas-component.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.canvas-component[data-drag-position="before"]::before {
  content: "";
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #1890ff;
  border-radius: 2px;
  z-index: 1000;
}

.canvas-component[data-drag-position="after"]::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 4px;
  background: #1890ff;
  border-radius: 2px;
  z-index: 1000;
}

.layout-component {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  background: rgba(248, 248, 248, 0.3);
}

/* 预览模式下的布局组件样式 */
.canvas-component.preview-mode .layout-component {
  border: none !important;
  background: transparent !important;
  border-radius: 0;
}

.canvas-component.preview-mode .layout-column {
  border: none !important;
  background: transparent !important;
}

.layout-column {
  position: relative;
  transition: all 0.2s;
}

.layout-column.drag-over {
  background-color: rgba(24, 144, 255, 0.1);
  border-color: #1890ff !important;
}

.column-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  color: #999;
  font-size: 12px;
  border: 1px dashed #d0d0d0;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
}

.column-full-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  color: #ff4d4f;
  font-size: 11px;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  background: rgba(255, 77, 79, 0.05);
  margin-top: 8px;
}

.text-component {
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

.text-editor {
  outline: none;
  min-height: 20px;
  word-wrap: break-word;
  word-break: break-all;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  width: 100%;
  box-sizing: border-box;
  background: transparent !important;
}

.text-editor:focus {
  background: rgba(24, 144, 255, 0.05);
  outline: none;
}

/* 确保文字颜色不被覆盖 */
.canvas-component .text-component .text-editor,
.canvas-component .text-component .text-display {
  color: var(--text-color) !important;
}

.canvas-component .text-component .text-editor *,
.canvas-component .text-component .text-display * {
  color: var(--text-color) !important;
}

/* 强制覆盖所有可能的颜色样式 */
.text-editor[contenteditable="true"],
.text-editor[contenteditable="true"] *,
.text-display,
.text-display * {
  color: var(--text-color) !important;
}

/* 文本组件特殊处理 - 禁用拖拽，允许文本选择 */
.canvas-component[data-component-type="text"] {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

.canvas-component[data-component-type="text"] .text-component {
  cursor: text;
}

.canvas-component[data-component-type="text"] .rich-text-editor-wrapper {
  cursor: text;
}

.canvas-component[data-component-type="text"] .text-display {
  cursor: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

/* 确保富文本编辑器可以正常选择文字 */
.rich-text-editor-wrapper * {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

/* 富文本内容预览样式统一 */
.text-display {
  font-family: Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: inherit;
  background: transparent;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
}

/* 防止文本组件的拖拽动画 */
.canvas-component[data-component-type="text"]:not([draggable="true"]) {
  pointer-events: auto;
}

.canvas-component[data-component-type="text"] .text-component,
.canvas-component[data-component-type="text"] .rich-text-editor-wrapper,
.canvas-component[data-component-type="text"] .text-display {
  pointer-events: auto;
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

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 2px dashed #d0d0d0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.image-placeholder:hover {
  border-color: #1890ff;
  background: rgba(24, 144, 255, 0.05);
}

.placeholder-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.placeholder-hint {
  color: #999;
  font-size: 12px;
  opacity: 0.8;
}

/* 上传中状态样式 */
.image-uploading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 2px solid #1890ff;
  border-radius: 8px;
  background: rgba(24, 144, 255, 0.05);
}

.uploading-spinner {
  font-size: 32px;
  margin-bottom: 8px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.uploading-text {
  color: #1890ff;
  font-size: 14px;
  font-weight: 500;
}

/* 上传错误状态样式 */
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 2px dashed #ff4d4f;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 77, 79, 0.05);
}

.image-error:hover {
  border-color: #ff7875;
  background: rgba(255, 77, 79, 0.1);
}

.error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.error-text {
  color: #ff4d4f;
  font-size: 14px;
  margin-bottom: 4px;
}

.retry-text {
  color: #999;
  font-size: 12px;
  opacity: 0.8;
}

.component-actions {
  position: absolute;
  top: -12px;
  right: -12px;
  display: flex;
  gap: 4px;
  z-index: 1000;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.layout-copy-btn {
  background: #52c41a;
  color: white;
  font-size: 12px;
}

.layout-copy-btn:hover {
  background: #73d13d;
}

.delete-btn {
  background: #ff4d4f;
  color: white;
}

.delete-btn:hover {
  background: #ff7875;
}

.sort-btn {
  background: #1890ff;
  color: white;
  font-size: 12px;
}

.sort-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.sort-btn:disabled {
  background: #d9d9d9;
  color: #bfbfbf;
  cursor: not-allowed;
}
</style>
