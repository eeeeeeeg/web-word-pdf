<template>
  <div
    class="transform-controller"
    :style="containerStyle"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <!-- 组件内容插槽 -->
    <div
      class="transform-content"
      :style="contentStyle"
      :class="{ 'dragging-ghost': isDragging || isResizing || isRotating }"
    >
      <slot></slot>
    </div>

    <!-- 拖拽时的轮廓预览 -->
    <div
      v-if="isDragging || isResizing || isRotating"
      class="drag-ghost-outline"
    >
      <div class="ghost-border"></div>
      <div class="ghost-label">{{ getGhostLabel() }}</div>
    </div>

    <!-- Canva 风格的选中状态控制 -->
    <div v-if="selected && mode === 'edit'" class="canva-controls">
      <!-- 主边框 -->
      <div class="canva-border"></div>

      <!-- 拖拽手柄（顶部中央） -->
      <div
        class="canva-drag-handle"
        @mousedown="handleDragStart"
        title="拖拽移动"
      >
        <div class="drag-dots">
          <span></span><span></span><span></span> <span></span><span></span
          ><span></span>
        </div>
      </div>

      <!-- 四个角的缩放控制点 -->
      <div
        class="canva-resize-handle corner nw"
        @mousedown="handleCornerMouseDown($event, 'top-left')"
      ></div>
      <div
        class="canva-resize-handle corner ne"
        @mousedown="handleCornerMouseDown($event, 'top-right')"
      ></div>
      <div
        class="canva-resize-handle corner sw"
        @mousedown="handleCornerMouseDown($event, 'bottom-left')"
      ></div>
      <div
        class="canva-resize-handle corner se"
        @mousedown="handleCornerMouseDown($event, 'bottom-right')"
      ></div>

      <!-- 四条边的缩放控制点 -->
      <div
        class="canva-resize-handle edge n"
        @mousedown="handleEdgeMouseDown($event, 'top')"
      ></div>
      <div
        class="canva-resize-handle edge e"
        @mousedown="handleEdgeMouseDown($event, 'right')"
      ></div>
      <div
        class="canva-resize-handle edge s"
        @mousedown="handleEdgeMouseDown($event, 'bottom')"
      ></div>
      <div
        class="canva-resize-handle edge w"
        @mousedown="handleEdgeMouseDown($event, 'left')"
      ></div>

      <!-- 旋转控制点 -->
      <div
        class="canva-rotate-handle"
        @mousedown="handleRotateMouseDown"
        title="旋转"
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path
            d="M8 2a6 6 0 0 1 6 6h-2a4 4 0 0 0-4-4V2z"
            fill="currentColor"
          />
          <path d="M2 8a6 6 0 0 1 6-6v2a4 4 0 0 0-4 4H2z" fill="currentColor" />
        </svg>
      </div>

      <!-- 工具栏 -->
      <div class="canva-toolbar">
        <button class="toolbar-btn" @click="handleEdit" title="编辑内容">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M11 2L12 3L5 10L2 10L2 7L9 0L11 2Z" fill="currentColor" />
          </svg>
        </button>
        <button class="toolbar-btn" @click="handleCopy" title="复制">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect
              x="2"
              y="2"
              width="8"
              height="8"
              rx="1"
              fill="none"
              stroke="currentColor"
            />
            <rect
              x="4"
              y="4"
              width="8"
              height="8"
              rx="1"
              fill="none"
              stroke="currentColor"
            />
          </svg>
        </button>
        <button class="toolbar-btn delete" @click="handleDelete" title="删除">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M10 3V1a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v2H1v2h1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5h1V3h-3zM6 2h2v1H6V2zm4 10H4V5h6v7z"
              fill="currentColor"
            />
            <path d="M6 6v4M8 6v4" stroke="currentColor" stroke-width="1" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TransformController",
  props: {
    // 组件数据
    component: {
      type: Object,
      required: true,
    },
    // 是否选中
    selected: {
      type: Boolean,
      default: false,
    },
    // 模式：edit 或 preview
    mode: {
      type: String,
      default: "edit",
    },
  },
  data() {
    return {
      isDragging: false,
      isResizing: false,
      isRotating: false,
      dragStartPos: { x: 0, y: 0 },
      initialTransform: null,
      initialSize: null,
      resizeType: null,
      // 性能优化相关
      rafId: null,
      tempTransform: null, // 临时变换状态，用于流畅拖拽
      latestMouseEvent: null, // 最新的鼠标事件
    };
  },
  computed: {
    containerStyle() {
      // 使用临时变换状态（拖拽时）或组件状态
      const transform = this.tempTransform || this.component.transform || {};
      const style = this.component.style || {};

      const x = transform.x || 0;
      const y = transform.y || 0;
      const width = style.width || 200;
      const height = style.height || 100;

      return {
        position: "absolute",
        left: "0px", // 使用 transform 来定位，避免重排
        top: "0px",
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${
          transform.rotation || 0
        }deg) scale(${transform.scaleX || 1}, ${transform.scaleY || 1})`,
        transformOrigin: "center center",
        zIndex: this.component.zIndex || 1,
        cursor: this.isDragging
          ? "grabbing"
          : this.mode === "edit"
          ? "grab"
          : "default",
        // 性能优化
        willChange:
          this.isDragging || this.isResizing || this.isRotating
            ? "transform"
            : "auto",
      };
    },
    contentStyle() {
      return {
        width: "100%",
        height: "100%",
        pointerEvents: this.mode === "edit" ? "auto" : "auto",
      };
    },
  },
  watch: {
    component: {
      handler() {
        // 强制更新组件以确保样式变化立即生效
        this.$forceUpdate();
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    // 获取拖拽时显示的标签文本
    getGhostLabel() {
      if (this.isDragging) {
        return "拖拽中...";
      } else if (this.isResizing) {
        return "调整大小...";
      } else if (this.isRotating) {
        return "旋转中...";
      }
      return "";
    },
    // 处理点击选中
    handleClick(event) {
      if (this.mode !== "edit") return;

      // 如果点击的是控制元素，不处理选中
      if (event.target.closest(".canva-controls")) return;

      event.stopPropagation();
      this.$emit("select", this.component);
    },

    // 处理双击编辑
    handleDoubleClick(event) {
      if (this.mode !== "edit" || !this.selected) return;

      // 如果点击的是控制元素，不处理双击
      if (event.target.closest(".canva-controls")) return;

      event.stopPropagation();
      this.handleEdit();
    },

    // 处理拖拽开始（从拖拽手柄触发）
    handleDragStart(event) {
      if (this.mode !== "edit" || !this.selected) return;

      event.preventDefault();
      event.stopPropagation();

      this.isDragging = true;
      this.dragStartPos = {
        x: event.clientX,
        y: event.clientY,
      };
      this.initialTransform = { ...this.component.transform };

      // 初始化临时变换状态
      this.tempTransform = { ...this.initialTransform };

      document.addEventListener("mousemove", this.handleMouseMoveOptimized);
      document.addEventListener("mouseup", this.handleMouseUp);

      // 添加性能优化类
      document.body.style.userSelect = "none";
      document.body.style.pointerEvents = "none";
      this.$el.style.pointerEvents = "auto";
    },

    // 处理编辑
    handleEdit() {
      this.$emit("edit", this.component);
    },

    // 处理复制
    handleCopy() {
      this.$emit("copy", this.component);
    },

    // 优化的鼠标移动处理（使用 RAF 确保流畅动画）
    handleMouseMoveOptimized(event) {
      if (!this.isDragging && !this.isResizing && !this.isRotating) return;

      // 存储最新的事件，供 RAF 使用
      this.latestMouseEvent = event;

      // 如果已经有待处理的动画帧，直接返回
      if (this.rafId) return;

      // 使用 requestAnimationFrame 确保流畅动画
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;

        if (this.latestMouseEvent) {
          if (this.isDragging) {
            this.handleDragMoveOptimized(this.latestMouseEvent);
          } else if (this.isResizing) {
            this.handleResizeMove(this.latestMouseEvent);
          } else if (this.isRotating) {
            this.handleRotateMove(this.latestMouseEvent);
          }
        }
      });
    },

    // 传统的鼠标移动处理（用于缩放和旋转）
    handleMouseMove(event) {
      if (!this.isDragging && !this.isResizing && !this.isRotating) return;

      event.preventDefault();

      if (this.isDragging) {
        this.handleDragMove(event);
      } else if (this.isResizing) {
        this.handleResizeMove(event);
      } else if (this.isRotating) {
        this.handleRotateMove(event);
      }
    },

    // 优化的拖拽移动（更新临时状态，实时跟随鼠标）
    handleDragMoveOptimized(event) {
      if (!this.isDragging) return;

      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      // 更新临时变换状态，Vue 的响应式系统会自动更新视图
      this.tempTransform = {
        ...this.initialTransform,
        x: this.initialTransform.x + deltaX,
        y: this.initialTransform.y + deltaY,
      };
    },

    // 传统的拖拽移动（用于缩放和旋转时的实时更新）
    handleDragMove(event) {
      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      const newTransform = {
        ...this.component.transform,
        x: this.initialTransform.x + deltaX,
        y: this.initialTransform.y + deltaY,
      };

      this.updateComponent({ transform: newTransform });
    },

    // 处理鼠标释放
    handleMouseUp() {
      // 如果是拖拽结束，提交最终状态
      if (this.isDragging && this.tempTransform) {
        this.updateComponent({ transform: this.tempTransform });
      }

      // 清理状态
      this.isDragging = false;
      this.isResizing = false;
      this.isRotating = false;
      this.resizeType = null;
      this.tempTransform = null;
      this.latestMouseEvent = null;

      // 取消动画帧
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      // 恢复页面交互
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
      this.$el.style.pointerEvents = "";

      document.removeEventListener("mousemove", this.handleMouseMoveOptimized);
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", this.handleMouseUp);
    },

    // 处理角落缩放
    handleCornerMouseDown(event, corner) {
      event.preventDefault();
      event.stopPropagation();

      this.isResizing = true;
      this.resizeType = corner;
      this.dragStartPos = {
        x: event.clientX,
        y: event.clientY,
      };
      this.initialTransform = { ...this.component.transform };
      this.initialSize = {
        width: this.component.style.width,
        height: this.component.style.height,
      };

      // 使用优化的事件监听器
      document.addEventListener("mousemove", this.handleMouseMoveOptimized);
      document.addEventListener("mouseup", this.handleMouseUp);

      // 添加性能优化
      document.body.style.userSelect = "none";
    },

    // 处理边缘缩放
    handleEdgeMouseDown(event, edge) {
      event.preventDefault();
      event.stopPropagation();

      this.isResizing = true;
      this.resizeType = edge;
      this.dragStartPos = {
        x: event.clientX,
        y: event.clientY,
      };
      this.initialTransform = { ...this.component.transform };
      this.initialSize = {
        width: this.component.style.width,
        height: this.component.style.height,
      };

      // 使用优化的事件监听器
      document.addEventListener("mousemove", this.handleMouseMoveOptimized);
      document.addEventListener("mouseup", this.handleMouseUp);

      // 添加性能优化
      document.body.style.userSelect = "none";
    },

    // 处理缩放移动
    handleResizeMove(event) {
      const deltaX = event.clientX - this.dragStartPos.x;
      const deltaY = event.clientY - this.dragStartPos.y;

      let newWidth = this.initialSize.width;
      let newHeight = this.initialSize.height;
      let newX = this.initialTransform.x;
      let newY = this.initialTransform.y;

      switch (this.resizeType) {
        case "top-left":
          newWidth = Math.max(20, this.initialSize.width - deltaX);
          newHeight = Math.max(20, this.initialSize.height - deltaY);
          newX = this.initialTransform.x + (this.initialSize.width - newWidth);
          newY =
            this.initialTransform.y + (this.initialSize.height - newHeight);
          break;
        case "top-right":
          newWidth = Math.max(20, this.initialSize.width + deltaX);
          newHeight = Math.max(20, this.initialSize.height - deltaY);
          newY =
            this.initialTransform.y + (this.initialSize.height - newHeight);
          break;
        case "bottom-left":
          newWidth = Math.max(20, this.initialSize.width - deltaX);
          newHeight = Math.max(20, this.initialSize.height + deltaY);
          newX = this.initialTransform.x + (this.initialSize.width - newWidth);
          break;
        case "bottom-right":
          newWidth = Math.max(20, this.initialSize.width + deltaX);
          newHeight = Math.max(20, this.initialSize.height + deltaY);
          break;
        case "top":
          newHeight = Math.max(20, this.initialSize.height - deltaY);
          newY =
            this.initialTransform.y + (this.initialSize.height - newHeight);
          break;
        case "bottom":
          newHeight = Math.max(20, this.initialSize.height + deltaY);
          break;
        case "left":
          newWidth = Math.max(20, this.initialSize.width - deltaX);
          newX = this.initialTransform.x + (this.initialSize.width - newWidth);
          break;
        case "right":
          newWidth = Math.max(20, this.initialSize.width + deltaX);
          break;
      }

      this.updateComponent({
        style: {
          ...this.component.style,
          width: newWidth,
          height: newHeight,
        },
        transform: {
          ...this.component.transform,
          x: newX,
          y: newY,
        },
      });
    },

    // 处理旋转
    handleRotateMouseDown(event) {
      event.preventDefault();
      event.stopPropagation();

      this.isRotating = true;
      this.dragStartPos = {
        x: event.clientX,
        y: event.clientY,
      };
      this.initialTransform = { ...this.component.transform };

      // 使用优化的事件监听器
      document.addEventListener("mousemove", this.handleMouseMoveOptimized);
      document.addEventListener("mouseup", this.handleMouseUp);

      // 添加性能优化
      document.body.style.userSelect = "none";
    },

    // 处理旋转移动
    handleRotateMove(event) {
      const rect = this.$el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const startAngle = Math.atan2(
        this.dragStartPos.y - centerY,
        this.dragStartPos.x - centerX
      );
      const currentAngle = Math.atan2(
        event.clientY - centerY,
        event.clientX - centerX
      );

      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
      const newRotation = this.initialTransform.rotation + deltaAngle;

      this.updateComponent({
        transform: {
          ...this.component.transform,
          rotation: newRotation,
        },
      });
    },

    // 更新组件数据
    updateComponent(updates) {
      const updatedComponent = {
        ...this.component,
        ...updates,
      };
      this.$emit("update", updatedComponent);
    },

    // 删除组件
    handleDelete(event) {
      event.preventDefault();
      event.stopPropagation();
      this.$emit("delete", this.component.id);
    },
  },
  beforeDestroy() {
    // 清理动画帧和事件监听器
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    // 恢复页面状态
    document.body.style.userSelect = "";
    document.body.style.pointerEvents = "";

    // 移除事件监听器
    document.removeEventListener("mousemove", this.handleMouseMoveOptimized);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
  },
};
</script>

<style scoped>
.transform-controller {
  position: absolute;
  user-select: none;
  /* 性能优化 */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.transform-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 性能优化 */
  contain: layout style paint;
}

/* Canva 风格的控制器 */
.canva-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 主边框 */
.canva-border {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border: 1px solid #1890ff;
  border-radius: 2px;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.2);
}

/* 拖拽手柄 */
.canva-drag-handle {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 16px;
  background: #1890ff;
  border-radius: 8px;
  cursor: move;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.drag-dots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  width: 12px;
  height: 8px;
}

.drag-dots span {
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
}

/* 缩放控制点 */
.canva-resize-handle {
  position: absolute;
  background: #1890ff;
  border: 2px solid white;
  border-radius: 2px;
  pointer-events: auto;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  width: 8px;
  height: 8px;
}

/* 角落控制点 */
.canva-resize-handle.corner.nw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.canva-resize-handle.corner.ne {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.canva-resize-handle.corner.sw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.canva-resize-handle.corner.se {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

/* 边缘控制点 */
.canva-resize-handle.edge.n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.canva-resize-handle.edge.e {
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  cursor: e-resize;
}

.canva-resize-handle.edge.s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.canva-resize-handle.edge.w {
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  cursor: w-resize;
}

/* 旋转控制点 */
.canva-rotate-handle {
  position: absolute;
  top: -40px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #52c41a;
  border: 2px solid white;
  border-radius: 50%;
  cursor: grab;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.canva-rotate-handle:active {
  cursor: grabbing;
}

/* 工具栏 */
.canva-toolbar {
  position: absolute;
  top: -50px;
  left: 0;
  display: flex;
  gap: 4px;
  background: white;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.toolbar-btn.delete:hover {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 悬停效果 */
.canva-resize-handle:hover,
.canva-rotate-handle:hover {
  transform: scale(1.2);
  transition: transform 0.1s ease;
}

.canva-resize-handle.edge:hover {
  transform: scale(1.2);
}

.canva-resize-handle.edge.n:hover,
.canva-resize-handle.edge.s:hover {
  transform: translateX(-50%) scale(1.2);
}

.canva-resize-handle.edge.w:hover,
.canva-resize-handle.edge.e:hover {
  transform: translateY(-50%) scale(1.2);
}
</style>
