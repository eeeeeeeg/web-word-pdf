<template>
  <div class="component-library">
    <div class="library-header">
      <h3>组件库</h3>
    </div>

    <div class="library-content">
      <!-- 布局组件 -->
      <div class="component-category">
        <h4>布局组件</h4>
        <div class="component-list">
          <div
            v-for="layout in layoutComponents"
            :key="layout.id"
            class="component-item"
            draggable="true"
            @dragstart="handleDragStart($event, layout)"
            @dragend="handleDragEnd"
          >
            <div class="component-icon">
              <div :class="layout.iconClass"></div>
            </div>
            <div class="component-info">
              <div class="component-name">{{ layout.name }}</div>
              <div class="component-desc">{{ layout.description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 内容组件 -->
      <div class="component-category">
        <h4>内容组件</h4>
        <div class="component-list">
          <div
            v-for="content in contentComponents"
            :key="content.type"
            class="component-item"
            draggable="true"
            @dragstart="handleDragStart($event, content)"
            @dragend="handleDragEnd"
          >
            <div class="component-icon">
              <div :class="content.iconClass"></div>
            </div>
            <div class="component-info">
              <div class="component-name">{{ content.name }}</div>
              <div class="component-desc">{{ content.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  createComponent,
  COMPONENT_TYPES,
  LAYOUT_PRESETS,
} from "../types/schema.js";

export default {
  name: "ComponentLibrary",
  data() {
    return {
      layoutComponents: [
        {
          id: "layout-single",
          type: "layout",
          name: "单列布局",
          description: "创建一个单列容器",
          iconClass: "layout-icon single-column",
          preset: "single",
          columns: LAYOUT_PRESETS.SINGLE_COLUMN.columns,
        },
        {
          id: "layout-two",
          type: "layout",
          name: "两列布局",
          description: "创建一个两列容器",
          iconClass: "layout-icon two-columns",
          preset: "two",
          columns: LAYOUT_PRESETS.TWO_COLUMNS.columns,
        },
        {
          id: "layout-three",
          type: "layout",
          name: "三列布局",
          description: "创建一个三列容器",
          iconClass: "layout-icon three-columns",
          preset: "three",
          columns: LAYOUT_PRESETS.THREE_COLUMNS.columns,
        },
      ],
      contentComponents: [
        {
          type: "text",
          name: "文本组件",
          description: "添加可编辑的文本内容",
          iconClass: "content-icon text-icon",
        },
        {
          type: "image",
          name: "图片组件",
          description: "添加图片内容",
          iconClass: "content-icon image-icon",
        },
      ],
    };
  },
  methods: {
    handleDragStart(event, componentData) {
      // 创建组件实例
      let component;
      if (componentData.type === "layout") {
        component = createComponent(COMPONENT_TYPES.LAYOUT, {
          preset: componentData.preset,
          columns: componentData.columns,
        });
      } else if (componentData.type === "text") {
        component = createComponent(COMPONENT_TYPES.TEXT);
      } else if (componentData.type === "image") {
        component = createComponent(COMPONENT_TYPES.IMAGE);
      }

      // 设置拖拽数据
      event.dataTransfer.setData("application/json", JSON.stringify(component));
      event.dataTransfer.effectAllowed = "copy";

      // 添加拖拽样式
      event.target.classList.add("dragging");

      // 通知父组件
      this.$emit("drag-start", component);
    },

    handleDragEnd(event) {
      event.target.classList.remove("dragging");
    },
  },
};
</script>

<style scoped>
.component-library {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.library-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.library-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.library-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.component-category {
  margin-bottom: 24px;
}

.component-category h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.component-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: grab;
  background: white;
  transition: all 0.2s;
}

.component-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.component-item.dragging {
  opacity: 0.5;
  transform: rotate(5deg);
}

.component-item:active {
  cursor: grabbing;
}

.component-icon {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 4px;
}

.layout-icon {
  width: 24px;
  height: 18px;
  border: 2px solid #1890ff;
  border-radius: 2px;
  position: relative;
}

.layout-icon.single-column {
  background: rgba(24, 144, 255, 0.1);
}

.layout-icon.two-columns::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: #1890ff;
  transform: translateX(-50%);
}

.layout-icon.three-columns::before,
.layout-icon.three-columns::after {
  content: "";
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: #1890ff;
}

.layout-icon.three-columns::before {
  left: 33.33%;
}

.layout-icon.three-columns::after {
  left: 66.67%;
}

.content-icon {
  width: 24px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #52c41a;
}

.text-icon::before {
  content: "T";
  font-weight: bold;
}

.image-icon::before {
  content: "🖼";
  font-size: 14px;
}

.component-info {
  flex: 1;
}

.component-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.component-desc {
  font-size: 12px;
  color: #999;
}

/* 拖拽时的全局样式 */
:global(.drag-over) {
  background-color: rgba(24, 144, 255, 0.1) !important;
  border: 2px dashed #1890ff !important;
}
</style>
